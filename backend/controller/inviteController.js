import crypto from 'crypto';
import db, { supabase } from '../database/db.js';
import { sendSmtpEmail } from '../utils/smtpMailer.js';
import { getSmtpConfig } from '../utils/notificationService.js';
import { checkPlanLimits } from '../utils/planValidator.js';
import { getOrganizerByUserId } from '../utils/organizerData.js';
import { decodeAuthPassword } from '../utils/encryption.js';

// Roles for new signups default to ORGANIZER
const normalizeRole = (role) => {
  const normalized = String(role || '').toUpperCase();
  if (!normalized || normalized === 'USER') return 'ORGANIZER';
  return normalized;
};

// Roles for invitations (staff, admin, etc.)
const normalizeInviteRole = (role) => {
  const normalized = String(role || '').toUpperCase();
  return normalized || 'STAFF'; 
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
  const inviteRole = normalizeInviteRole(role);

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

// Check invite validity and if account already exists
export async function checkInvite(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const normalizedToken = String(token || '').trim().replace(/[?.,;:!]+$/, '');
    console.log(`[checkInvite] 🔍 Checking token: ${normalizedToken.substring(0, 8)}...`);
    
    // First, find the token ANYWAY to see if it even exists
    const { data: allInvites, error: fetchErr } = await db
      .from('invites')
      .select('*')
      .eq('token', normalizedToken);

    if (fetchErr) {
      console.error('[checkInvite] ❌ Fetch Error:', fetchErr.message);
      return res.status(500).json({ error: fetchErr.message });
    }

    if (!allInvites || allInvites.length === 0) {
      console.warn(`[checkInvite] ❌ Token ${normalizedToken.substring(0, 8)}... NOT FOUND in database.`);
      return res.status(404).json({ error: 'Invalid invitation link' });
    }

    const invite = allInvites[0];
    const now = new Date();
    const expiry = new Date(invite.expiresAt);

    if (expiry < now) {
      console.warn(`[checkInvite] ❌ Token found but EXPIRED. (Expiry: ${expiry.toISOString()}, Now: ${now.toISOString()})`);
      return res.status(404).json({ error: 'Invitation has expired' });
    }

    const { data: existingUser } = await db
      .from('users')
      .select('userId, id, email')
      .eq('email', invite.email)
      .maybeSingle();

    console.log(`[checkInvite] ✅ Token Valid. Email: ${invite.email}, Exists: ${!!existingUser}`);
    
    return res.json({
      email: invite.email,
      role: normalizeInviteRole(invite.role),
      accountExists: !!existingUser,
      name: invite.name || ''
    });
  } catch (err) {
    console.error('[checkInvite] 💥 Fatal Exception:', err);
    return res.status(500).json({ error: err.message });
  }
}

// Accept invite and set password
export async function acceptInvite(req, res) {
  try {
    let { token, password, name } = req.body;
    const normalizedToken = String(token || '').trim().replace(/[?.,;:!]+$/, '');
    
    const { data: invites, error } = await db
      .from('invites')
      .select('*')
      .eq('token', normalizedToken)
      .gt('expiresAt', new Date().toISOString());

    if (error || !invites?.length) {
      return res.status(400).json({ error: 'Invalid or expired invite' });
    }

    const invite = invites[0];
    const targetRole = normalizeInviteRole(invite.role);
    console.log(`[invite/acceptInvite] Token matched. Target Role for ${invite.email}: ${targetRole}`);
    const emailToUpdate = String(invite.email || '').trim().toLowerCase();

    // Resolve organization owner early
    const inviterOrg = await getOrganizerByUserId(invite.invitedBy);
    const orgOwnerId = inviterOrg?.ownerUserId || invite.invitedBy || null;

    let userId = null;

    // 1. Check if user already exists in Auth/DB
    const { data: existingUser } = await db
      .from('users')
      .select('userId, id')
      .eq('email', emailToUpdate)
      .maybeSingle();

    if (existingUser) {
      userId = existingUser.userId || existingUser.id;
      console.log(`[invite/acceptInvite] User ${emailToUpdate} already exists (ID: ${userId}). Skipping Auth creation.`);
    } else {
      // 2. Create new user in Auth
      if (!password) {
        return res.status(400).json({ error: 'Password required for new accounts' });
      }
      
      const decodedPassword = decodeAuthPassword(password);
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: invite.email,
        password: decodedPassword,
        email_confirm: true,
      });

      if (authError) {
        // [HEALING] If they already exist in Auth but not in our users table yet
        if (authError.message?.toLowerCase().includes('already')) {
          console.log(`[invite/acceptInvite] User already exists in Auth. Updating password and resolving ID...`);
          const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
          const targetAuth = (authUsers?.users || []).find(u => u.email?.toLowerCase() === emailToUpdate);
          
          if (targetAuth) {
            userId = targetAuth.id;
            console.log(`[invite/acceptInvite] Recovered ID from Auth: ${userId}. Forced password update.`);
            await supabase.auth.admin.updateUserById(userId, { password: decodedPassword });
          } else {
            // Last resort: Check users table again in case of race condition
            const { data: retryFetch } = await db.from('users').select('userId, id').eq('email', emailToUpdate).maybeSingle();
            userId = retryFetch?.userId || retryFetch?.id || null;
            if (userId) {
               await supabase.auth.admin.updateUserById(userId, { password: decodedPassword });
            }
          }
        } else {
          console.error('[invite/acceptInvite] Auth Creation Error:', authError.message);
          return res.status(500).json({ error: authError.message });
        }
      } else {
        userId = authData?.user?.id;
      }
    }

    if (!userId) {
      console.error('[invite/acceptInvite] ❌ FAILED to resolve user ID for', emailToUpdate);
      return res.status(500).json({ error: 'Failed to resolve user ID after Auth check' });
    }

    const finalName = (name || invite.name || '').trim();
    const userPayload = {
      userId,
      email: emailToUpdate,
      role: targetRole,
      name: finalName,
      employerId: orgOwnerId,   
      employerid: orgOwnerId,
      status: 'Active',
      canviewevents: invite.canViewEvents ?? invite.canviewevents ?? true,
      caneditevents: invite.canEditEvents ?? invite.caneditevents ?? false,
      canmanualcheckin: invite.canManualCheckIn ?? invite.canmanualcheckin ?? false,
      canreceivenotifications: invite.canReceiveNotifications ?? invite.canreceivenotifications ?? false
    };

    console.log(`[invite/acceptInvite] [Checkpoint 4] Finalizing links for ${emailToUpdate} as ${targetRole}...`);
    
    // PRIMARY SAVE
    const { error: upsertErr } = await db.from('users').upsert(userPayload, { onConflict: 'userId' });
    
    if (upsertErr) {
      console.warn('[invite/acceptInvite] Primary save error:', upsertErr.message);
      // Fallback for missing employer columns if any
      if (upsertErr.message?.includes('employer')) {
        const strippedPayload = { ...userPayload };
        delete strippedPayload.employerId; delete strippedPayload.employerid;
        await db.from('users').upsert(strippedPayload, { onConflict: 'userId' });
      } else {
        throw upsertErr;
      }
    }

    // [Checkpoint 5] Explicit update to handle casing variances in various envs
    await db.from('users').update({ 
      role: targetRole, 
      employerId: orgOwnerId, 
      employerid: orgOwnerId,
      status: 'Active',
      canviewevents: userPayload.canviewevents,
      caneditevents: userPayload.caneditevents,
      canmanualcheckin: userPayload.canmanualcheckin,
      canreceivenotifications: userPayload.canreceivenotifications
    }).eq('email', emailToUpdate);

    // HEALING ANCHOR: Mark as accepted
    await db.from('invites').update({ accepted: true }).eq('token', normalizedToken);
    
    console.log(`[invite/acceptInvite] Success: ${emailToUpdate} accepted.`);
    return res.json({ message: 'Invitation accepted successfully' });
  } catch (err) {
    console.error('[invite/acceptInvite] Fatal Error:', err);
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
export async function deleteInvite(req, res) {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;
    const requesterRole = normalizeRole(req.user?.role || '');

    // 1. Fetch target invite
    const { data: invite, error: inviteError } = await db
      .from('invites')
      .select('*')
      .or(`inviteId.eq.${id},token.eq.${id}`)
      .maybeSingle();

    if (inviteError) return res.status(500).json({ error: inviteError.message });
    if (!invite) return res.status(404).json({ error: 'Invite not found' });

    // 2. Permission Check
    if (requesterRole !== 'ADMIN') {
      if (String(invite.invitedBy) !== String(requesterId)) {
        return res.status(403).json({ error: 'Forbidden: You did not send this invite' });
      }
    }

    // 3. Delete
    const { error: delErr } = await db
      .from('invites')
      .delete()
      .eq('inviteId', invite.inviteId);

    if (delErr) return res.status(500).json({ error: delErr.message });

    return res.json({ message: 'Invitation revoked successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
