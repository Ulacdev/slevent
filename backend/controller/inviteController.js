import crypto from 'crypto';
import db, { supabase } from '../database/db.js';
import { sendSmtpEmail } from '../utils/smtpMailer.js';
import { getSmtpConfig } from '../utils/notificationService.js';
import { checkPlanLimits } from '../utils/planValidator.js';
import { getOrganizerByUserId } from '../utils/organizerData.js';
import { decodeAuthPassword } from '../utils/encryption.js';

const normalizeRole = (role) => {
  const normalized = String(role || '').toUpperCase();
  if (!normalized || normalized === 'USER') return 'ORGANIZER';
  return normalized;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');


function buildInviteEmailHtml({ recipientName, inviteRole, inviteLink }) {
  const safeName = escapeHtml(recipientName);
  const safeRole = escapeHtml(inviteRole);
  const safeLink = escapeHtml(inviteLink);

  return `
    <div style="font-family: Arial, sans-serif; color:#2E2E2F; line-height:1.6;">
      <h2 style="margin:0 0 12px 0;">You are invited to join StartupLab</h2>
      <p style="margin:0 0 12px 0;">Hi <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 12px 0;">
        You have been invited as <strong>${safeRole}</strong>. Click the button below to accept your invitation.
      </p>
      <p style="margin:18px 0;">
        <a href="${safeLink}" style="display:inline-block;padding:10px 16px;background:#38BDF2;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">
          Accept Invitation
        </a>
      </p>
      <p style="margin:0;color:#666;">If the button does not work, open this link:</p>
      <p style="margin:6px 0 0 0;"><a href="${safeLink}">${safeLink}</a></p>
    </div>
  `;
}

// Generate invite token and send email
export async function inviteUser(req, res) {
  const inviterUserId = req.user?.id || null;
  if (!inviterUserId) return res.status(401).json({ error: 'Unauthorized' });

  const { email, role, name } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return res.status(400).json({ error: 'Email required' });
  const inviteRole = normalizeRole(role);

  // --- CHECK STAFF LIMIT ---
  const organizer = await getOrganizerByUserId(inviterUserId);
  console.log(`[inviteController/inviteUser] Inviter: ${inviterUserId}, Organizer Found: ${organizer?.organizerId}`);

  if (organizer?.organizerId) {
    const limitCheck = await checkPlanLimits(organizer.organizerId, 'max_staff_accounts');
    console.log(`[inviteController/inviteUser] Staff Limit Check:`, limitCheck);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: limitCheck.message,
        code: 'PLAN_LIMIT_REACHED'
      });
    }
  }

  // Resolve SMTP config using professional hierarchy (Organizer -> Staff Owner -> Admin Fallback)
  const smtpConfig = await getSmtpConfig(null, inviterUserId);
  if (!smtpConfig) {
    return res.status(400).json({
      error: 'Invite email sender is not configured. Please ensure Admin or Organizer SMTP settings are set up.'
    });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h expiry

  const { error: inviteError } = await db
    .from('invites')
    .insert({ email: normalizedEmail, token, role: inviteRole, expiresAt, invitedBy: inviterUserId });
  if (inviteError) return res.status(500).json({ error: inviteError.message });

  const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  if (!frontendUrl) {
    await db.from('invites').delete().eq('token', token);
    return res.status(500).json({ error: 'FRONTEND_URL is not set' });
  }
  const inviteLink = `${frontendUrl}/#/accept-invite?token=${token}`;
  const recipientName = String(name || normalizedEmail.split('@')[0] || normalizedEmail).trim();

  const smtpResult = await sendSmtpEmail({
    to: normalizedEmail,
    subject: 'StartupLab Invitation',
    text: `Hi ${recipientName}, you were invited as ${inviteRole}. Accept invitation: ${inviteLink}`,
    html: buildInviteEmailHtml({ recipientName, inviteRole, inviteLink }),
    replyTo: smtpConfig.fromAddress || undefined,
    config: smtpConfig
  });

  if (!smtpResult?.ok) {
    await db.from('invites').delete().eq('token', token);
    return res.status(502).json({
      error: 'Failed to send invite email with your Organizer SMTP settings.',
      details: smtpResult?.error || smtpResult?.reason || 'Unknown SMTP error'
    });
  }

  res.json({ message: 'Invite sent', inviteLink, email: normalizedEmail, role: inviteRole, name: recipientName });
}

// Create invite link and send using inviter-owned SMTP settings
export async function createInviteAndSend(req, res) {
  try {
    const inviterUserId = req.user?.id || null;
    if (!inviterUserId) return res.status(401).json({ error: 'Unauthorized' });

    const { email, role, name } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return res.status(400).json({ error: 'Email required' });
    if (!role) return res.status(400).json({ error: 'Role required' });
    const inviteRole = normalizeRole(role);

    // --- CHECK STAFF LIMIT ---
    const organizer = await getOrganizerByUserId(inviterUserId);
    console.log(`[inviteController] Creating invite. Inviter: ${inviterUserId}, Organizer Found: ${organizer?.organizerId}`);

    if (organizer?.organizerId) {
      const limitCheck = await checkPlanLimits(organizer.organizerId, 'max_staff_accounts');
      console.log(`[inviteController] Staff Limit Check:`, limitCheck);
      if (!limitCheck.allowed) {
        return res.status(403).json({
          error: limitCheck.message,
          code: 'PLAN_LIMIT_REACHED'
        });
      }
    }

    // Resolve SMTP config using professional hierarchy (Organizer -> Staff Owner -> Admin Fallback)
    const smtpConfig = await getSmtpConfig(null, inviterUserId);
    if (!smtpConfig) {
      return res.status(400).json({
        error: 'Invite email sender is not configured. Please ensure Admin or Organizer SMTP settings are set up.'
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const { error: inviteError } = await db
      .from('invites')
      .insert({ email: normalizedEmail, token, role: inviteRole, expiresAt, invitedBy: inviterUserId });
    if (inviteError) return res.status(500).json({ error: inviteError.message });

    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    if (!frontendUrl) {
      await db.from('invites').delete().eq('token', token);
      return res.status(500).json({ error: 'FRONTEND_URL is not set' });
    }
    const inviteLink = `${frontendUrl}/#/accept-invite?token=${token}`;
    const recipientName = String(name || normalizedEmail.split('@')[0] || normalizedEmail).trim();

    const smtpResult = await sendSmtpEmail({
      to: normalizedEmail,
      subject: 'StartupLab Invitation',
      text: `Hi ${recipientName}, you were invited as ${inviteRole}. Accept invitation: ${inviteLink}`,
      html: buildInviteEmailHtml({ recipientName, inviteRole, inviteLink }),
      replyTo: smtpConfig.fromAddress || undefined,
      config: smtpConfig
    });

    if (!smtpResult?.ok) {
      await db.from('invites').delete().eq('token', token);
      return res.status(502).json({
        error: 'Failed to send invite email with your Organizer SMTP settings.',
        details: smtpResult?.error || smtpResult?.reason || 'Unknown SMTP error'
      });
    }

    return res.json({
      inviteLink,
      email: normalizedEmail,
      role: inviteRole,
      name: recipientName,
      sender: smtpConfig.fromAddress || smtpConfig.smtpUser
    });
  } catch (err) {
    return res.status(500).json({ error: 'Invite email error', details: err?.message || err });
  }
}

// Accept invite and set password
export async function acceptInvite(req, res) {
  try {
    let { token, password, name } = req.body;
    password = decodeAuthPassword(password);
    const normalizedToken = String(token || '').trim().replace(/[?.,;:!]+$/, '');
    const { data: invites, error } = await db.from('invites').select('*').eq('token', normalizedToken).gt('expiresAt', new Date().toISOString());
    if (error || !invites.length) return res.status(400).json({ error: 'Invalid or expired invite' });
    const invite = invites[0];
    const normalizedInviteRole = normalizeRole(invite.role);

    let userId;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
    });

    if (!authError && authData?.user?.id) {
      userId = authData.user.id;
    }

    if (!userId) {
      const authErrorMessage = authError?.message || '';
      if (!authErrorMessage.toLowerCase().includes('already')) {
        return res.status(500).json({ error: authErrorMessage || 'Failed to create auth user' });
      }

      const { data: existingUser, error: existingUserError } = await db
        .from('users')
        .select('userId')
        .eq('email', invite.email)
        .maybeSingle();

      if (existingUserError) {
        return res.status(500).json({ error: existingUserError.message });
      }

      if (!existingUser?.userId) {
        return res.status(409).json({ error: 'Account already exists. Please log in.' });
      }

      userId = existingUser.userId;
    }

    const finalName = (name || invite.name || '').trim();
    let userUpsertError = null;

    console.log('[invite/acceptInvite] Attempting upsert for user:', { userId, email: invite.email, finalName });
    let upsertResp = await db
      .from('users')
      .upsert({ userId, email: invite.email, role: normalizedInviteRole, name: finalName, employerId: invite.invitedBy || null }, { onConflict: 'userId' });
    userUpsertError = upsertResp.error;

    if (userUpsertError && userUpsertError.message?.includes('column "userId"')) {
      console.log('[invite/acceptInvite] Retrying upsert by id column');
      upsertResp = await db
        .from('users')
        .upsert({ id: userId, email: invite.email, role: normalizedInviteRole, name: finalName, employerId: invite.invitedBy || null }, { onConflict: 'id' });
      userUpsertError = upsertResp.error;
    }

    // Always update the user's name by email to guarantee it is set
    const emailToUpdate = (invite.email || '').trim().toLowerCase();
    await db
      .from('users')
      .update({ name: finalName })
      .eq('email', emailToUpdate);

    if (userUpsertError && !/duplicate key|unique/i.test(userUpsertError.message || '')) {
      return res.status(500).json({ error: userUpsertError.message });
    }

    await db.from('invites').delete().eq('token', token);
    return res.json({ message: 'Invitation accepted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// List pending invites for an organizer
export async function listInvites(req, res) {
  try {
    const inviterUserId = req.user?.id;
    if (!inviterUserId) return res.status(401).json({ error: 'Unauthorized' });

    const organizer = await getOrganizerByUserId(inviterUserId);
    if (!organizer) return res.status(404).json({ error: 'Organizer not found' });

    // Find all staff IDs to find their invites too
    const { data: staffUsers, error: staffError } = await db
      .from('users')
      .select('userId')
      .eq('employerId', organizer.ownerUserId || 'null-employer');

    const staffIds = (staffUsers || []).map(u => u.userId);
    if (organizer.ownerUserId) {
      staffIds.push(organizer.ownerUserId);
    }

    const safeStaffIds = staffIds.filter(Boolean);
    if (safeStaffIds.length === 0) {
      return res.json([]);
    }

    const { data: invites, error } = await db
      .from('invites')
      .select('*')
      .in('invitedBy', safeStaffIds)
      .gt('expiresAt', new Date().toISOString());

    if (error) {
      console.error('[listInvites] Supabase Query Error:', error);
      throw error;
    }

    return res.json(invites || []);
  } catch (err) {
    console.error('[listInvites] Catch Block Error:', err);
    return res.status(500).json({
      error: err.message || 'Unknown error',
      code: err.code,
      details: err
    });
  }
}

// Check if more staff can be invited
export async function checkStaffLimitEndpoint(req, res) {
  try {
    const inviterUserId = req.user?.id;
    if (!inviterUserId) return res.status(401).json({ error: 'Unauthorized' });

    const organizer = await getOrganizerByUserId(inviterUserId);
    if (!organizer?.organizerId) return res.status(404).json({ error: 'Organizer not found' });

    const limitCheck = await checkPlanLimits(organizer.organizerId, 'max_staff_accounts');
    return res.json(limitCheck);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
