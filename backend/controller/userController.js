import db from "../database/db.js";
import crypto from 'crypto';
import path from 'path';
import { logAudit } from '../utils/auditLogger.js';

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'startuplab-business-ticketing';

const normalizeRole = (role) => {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'USER') return 'ORGANIZER';
  return normalized;
};

export const updateUserAvatar = async (req, res) => {
  try {
    const userId = req.user?.id;
    const file = req.file;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!file) return res.status(400).json({ error: 'Image file is required' });
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image uploads are allowed' });
    }

    const ext = path.extname(file.originalname || '') || '.png';
    const fileName = `${userId}/${crypto.randomUUID()}${ext}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await db.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: publicData } = db.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    const imageUrl = publicData?.publicUrl;
    if (!imageUrl) return res.status(500).json({ error: 'Failed to generate public URL' });

    let { data, error } = await db
      .from('users')
      .update({ imageUrl })
      .eq('userId', userId)
      .select('userId, name, email, role, imageUrl')
      .maybeSingle();

    if ((!data && !error) || (error && error.message?.includes('column "userId"'))) {
      const resp = await db
        .from('users')
        .update({ imageUrl })
        .eq('userId', userId)
        .select('id, name, email, role, imageUrl')
        .maybeSingle();
      data = resp.data; error = resp.error;
    }

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'User not found' });
    return res.json({ imageUrl, user: data, path: filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const getUser = async (req, res) => {
  try {
    console.log("hi")
  } catch (error) {
    console.log(error)
  }
}

export const updateUserName = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    // Try userId column first
    let { data, error } = await db
      .from('users')
      .update({ name })
      .eq('userId', userId)
      .select('userId, name, email, role, imageUrl')
      .maybeSingle();
    // Fallback to id
    if ((!data && !error) || (error && error.message?.includes('column "userId"'))) {
      const resp = await db
        .from('users')
        .update({ name })
        .eq('userId', userId)
        .select('id, name, email, role, imageUrl')
        .maybeSingle();
      data = resp.data; error = resp.error;
    }
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'User not found' });
    return res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, imageUrl } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const updates = {};
    if (name) updates.name = name.trim();
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Try userId column first
    let { data, error } = await db
      .from('users')
      .update(updates)
      .eq('userId', userId)
      .select('userId, name, email, role, imageUrl')
      .maybeSingle();

    // Fallback to id
    if ((!data && !error) || (error && error.message?.includes('column "userId"'))) {
      const resp = await db
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select('id, name, email, role, imageUrl')
        .maybeSingle();
      data = resp.data; error = resp.error;
    }

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'User not found' });
    return res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const getRole = async (req, res) => {
  try {
    const userId = req.user?.id;
    const email = String(req.user?.email || '').toLowerCase().trim();
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let data = null;
    let error = null;

    const byUserId = await db
      .from('users')
      .select('role')
      .eq('userId', userId)
      .maybeSingle();
    data = byUserId.data;
    error = byUserId.error;

    // Fallback to email when auth userId and users.userId drift.
    if (!data && !error && email) {
      const byEmail = await db
        .from('users')
        .select('role')
        .eq('email', email)
        .maybeSingle();
      data = byEmail.data;
      error = byEmail.error;
    }

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'User not found' });

    // Return as an array to maintain compatibility with front-end which expects data?.[0]?.role
    return res.json([{ role: normalizeRole(data.role) }]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const whoAmI = async (req, res) => {
  console.log(`🚀 [whoAmI] Incoming request for ID: ${req.user?.id || 'Unknown'}`);
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Attempt by userId column first
    let data = null;
    let error = null;
    let resp = await db
      .from('users')
      .select("userId, name, email, role, imageUrl, canviewevents, caneditevents, canmanualcheckin, canreceivenotifications, status")
      .eq("userId", userId)
      .maybeSingle();
    data = resp.data; error = resp.error;

    // Fallback: some schemas use id instead of userId
    if ((!data && !error) || (error && error.message?.includes('column "userId"'))) {
      resp = await db
        .from('users')
        .select("id, name, email, role, imageUrl, canviewevents, caneditevents, canmanualcheckin, canreceivenotifications, status")
        .eq("id", userId)
        .maybeSingle();
      data = resp.data; error = resp.error;
    }

    // If permission columns missing, fallback to select minimal with userId
    if (error && error.message?.includes('column')) {
      resp = await db
        .from('users')
        .select("*")
        .eq('userId', userId)
        .maybeSingle();
      data = resp.data; error = resp.error;
    }
    // Fallback with id for minimal select
    if ((!data && !error) || (error && error.message?.includes('column'))) {
      resp = await db
        .from('users')
        .select("*")
        .eq('userId', userId)
        .maybeSingle();
      data = resp.data; error = resp.error;
    }

    if (error) return res.status(500).json({ error: error.message });
    
    if (data && data.status === 'Inactive') {
      return res.status(403).json({ error: 'Your account is currently INACTIVE. Please contact the administrator.' });
    }
    if (!data && req.user) {
      console.log(`[whoAmI] JIT creation for user: ${req.user.email} (${req.user.id})`);
      const authUser = req.user;
      const metadata = authUser.user_metadata || {};
      
      const insertData = {
        userId: authUser.id,
        email: authUser.email.toLowerCase().trim(),
        name: metadata.full_name || metadata.name || authUser.email.split('@')[0],
        role: 'ORGANIZER', // DEFAULT role
        imageUrl: metadata.avatar_url || metadata.picture || null,
        canviewevents: false,
        caneditevents: false,
        canmanualcheckin: false,
        canreceivenotifications: true
      };

      // --- EMAIL RECONCILIATION ---
      // If we don't find this userId but the email exists, it means the user's ID changed (e.g. social login)
      const { data: emailMatch } = await db.from('users').select('*').eq('email', insertData.email).maybeSingle();
      
      if (emailMatch) {
         console.log(`[whoAmI] Linking identity for ${insertData.email} from ${emailMatch.userId} to ${insertData.userId}`);
         const oldId = emailMatch.userId || emailMatch.id;
         
         // Update users table with ID AND social metadata if missing
         const linkUpdates = { userId: insertData.userId };
         if (!emailMatch.name || emailMatch.name === emailMatch.email.split('@')[0]) {
           linkUpdates.name = insertData.name;
         }
         if (!emailMatch.imageUrl) {
           linkUpdates.imageUrl = insertData.imageUrl;
         }

         await db.from('users').update(linkUpdates).eq('email', insertData.email);
         
         // Update organizers table
         await db.from('organizers').update({ ownerUserId: insertData.userId }).eq('ownerUserId', oldId);
         
         // Update events table (Fix createdBy link)
         await db.from('events').update({ createdBy: insertData.userId }).eq('createdBy', oldId);

         data = { ...emailMatch, userId: insertData.userId };
      } else {
        const { data: newData, error: insertError } = await db
          .from('users')
          .insert(insertData)
          .select('*')
          .maybeSingle();

        if (insertError) {
          // If it's a conflict, maybe someone just created it, try to fetch again
          // --- SELF-HEALING: Ensure user and organizer profiles exist ---
          let { data: secondTry } = await db.from('users').select('*').eq('userId', userId).maybeSingle();
          if (secondTry) {
             data = secondTry;
          } else {
              console.error("[whoAmI] JIT creation failed:", insertError.message);
              return res.status(500).json({ error: "Failed to initialize user profile due to security policy" });
          }
        } else {
          data = newData;
          console.log(`[whoAmI] Successfully created JIT user record for ${data.email}`);
        }
      }
    }

    if (!data) return res.status(404).json({ error: 'User not found' });

    // Sync missing profile data for existing users (e.g. newly added SOCIAL LOGIN fields)
    if (data && req.user) {
      const metadata = req.user.user_metadata || {};
      const updates = {};
      const newName = metadata.full_name || metadata.name;
      const newAvatar = metadata.avatar_url || metadata.picture;

      // Update name if currently empty OR if it looks like an email-based fallback (e.g. "john.doe") 
      // and we have a proper Full Name from social login.
      const isEmailFallback = data.name && data.email && (data.name === data.email.split('@')[0]);
      if (newName && (!data.name || isEmailFallback)) {
        if (data.name !== newName) updates.name = newName;
      }

      // Always update avatar if current is empty and new is available
      if (!data.imageUrl && newAvatar) {
        updates.imageUrl = newAvatar;
      }

      if (Object.keys(updates).length > 0) {
        console.log(`[whoAmI] Auto-syncing profile for ${data.email}: ${Object.keys(updates).join(', ')}`);
        const { data: updated } = await db.from('users').update(updates).eq('userId', data.userId || data.id).select('*').maybeSingle();
        if (updated) data = { ...data, ...updated };
      }
    }

    const role = normalizeRole(data.role || '');
    const defaultStaff = role === 'STAFF';

    // If organizer, fetch onboarding status
    let isOnboarded = false;
    let employerLogoUrl = null;
    let employerName = null;

    if (role === 'ORGANIZER') {
      const { data: orgData } = await db
        .from('organizers')
        .select('isOnboarded, organizerName, profileImageUrl')
        .eq('ownerUserId', data.userId || data.id)
        .maybeSingle();
      isOnboarded = !!orgData?.isOnboarded;
      employerLogoUrl = orgData?.profileImageUrl || null;
      employerName = orgData?.organizerName || null;
      
      // 🔥 Fallback: If user name is missing but organizer name exists, sync it
      if (!data.name && orgData?.organizerName) {
        console.log(`[whoAmI] Syncing blank user name from organizer name: ${orgData.organizerName}`);
        data.name = orgData.organizerName;
        await db.from('users').update({ name: data.name }).eq('userId', data.userId || data.id);
      }
    }

    // Standardize the result based on what we've resolved
    const result = {
      userId: data.userId || data.id,
      name: data.name,
      email: data.email,
      role,
      imageUrl: data.imageUrl,
      isOnboarded,
      canViewEvents: data.canviewevents === undefined || data.canviewevents === null ? defaultStaff : !!data.canviewevents,
      canEditEvents: data.caneditevents === undefined || data.caneditevents === null ? defaultStaff : !!data.caneditevents,
      canManualCheckIn: data.canmanualcheckin === undefined || data.canmanualcheckin === null ? defaultStaff : !!data.canmanualcheckin,
      canReceiveNotifications: data.canreceivenotifications === undefined || data.canreceivenotifications === null ? defaultStaff : !!data.canreceivenotifications,
      employerId: data.employerId || data.employerid || null,
      employerLogoUrl: employerLogoUrl || null,
      employerName: employerName || null,
    };

    if (role === 'STAFF') {
      let empId = data.employerId || data.employerid;
      console.log(`[whoAmI] Staff Resolve: Name=${data.name}, ID=${data.userId}, DatabaseEmpID=${empId}`);
      
      // Try to find empId from invites if missing (check both pending and accepted)
      if (!empId) {
        console.log(`[whoAmI] Missing EmpID. Scanning invites for ${result.email}...`);
        const { data: invite } = await db.from('invites').select('invitedBy, role').eq('email', result.email?.toLowerCase()).limit(1).maybeSingle();
        empId = invite?.invitedBy;
        if (empId) {
          console.log(`[whoAmI] Recovered EmpID from Invite: ${empId}`);
          result.role = invite.role || result.role;
        }
      }

      if (empId) {
        result.employerId = empId;
        const { data: org, error: orgErr } = await db.from('organizers').select('organizerName, profileImageUrl').eq('ownerUserId', empId).maybeSingle();
        if (org) {
          result.employerName = org.organizerName || org.organizername;
          result.employerLogoUrl = org.profileImageUrl || org.profileimageurl;
          console.log(`[whoAmI] Branding Resolved: ${result.employerName}`);
          
          // Background healing
          if (!data.employerId && !data.employerid) {
            console.log(`[whoAmI] Persisting recovered link to DB...`);
            db.from('users').update({ employerId: empId }).eq('userId', result.userId).then(() => {});
          }
        } else {
          console.warn(`[whoAmI] No organizer found for ownerUserId=${empId}. Error:`, orgErr?.message);
        }
      } else {
        console.warn(`[whoAmI] No employer link found for staff: ${result.email}`);
      }
    }

    return res.json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const getAllUsers = async (req, res) => {
  try {
    let requesterRole = normalizeRole(req.user?.role || '');
    const requesterId = req.user?.id;
    const requesterEmail = String(req.user?.email || '').toLowerCase().trim();
    const teamOnlyRequested = String(req.query.teamOnly || '').toLowerCase() === 'true';

    if (requesterRole !== 'ADMIN' && requesterRole !== 'ORGANIZER') {
      // Look up role in DB using userId/id/email when token role is generic (e.g. "authenticated")
      let roleRow = null;
      if (requesterId) {
        let resp = await db.from('users').select('role').eq('userId', requesterId).maybeSingle();
        roleRow = resp.data;
        if (!roleRow || resp.error) {
          resp = await db.from('users').select('role').eq('userId', requesterId).maybeSingle();
          roleRow = resp.data;
        }
      }
      if (!roleRow && requesterEmail) {
        const byEmail = await db.from('users').select('role').eq('email', requesterEmail).maybeSingle();
        roleRow = byEmail.data;
      }
      requesterRole = normalizeRole(roleRow?.role || '');
    }

    if (requesterRole !== 'ADMIN' && requesterRole !== 'ORGANIZER' && requesterRole !== 'STAFF') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Scope rules:
    // - ORGANIZER or STAFF: only their own invited team/organizers (employerId = requester auth id)
    // - ADMIN (teamOnly=true): only admin's own scoped team
    // - ADMIN (default): exclude members of other organizations for privacy
    const shouldScopeToRequesterTeam =
      requesterRole === 'ORGANIZER' || requesterRole === 'STAFF' || (requesterRole === 'ADMIN' && teamOnlyRequested);

    const isRequesterRecord = (user) =>
      String(user?.userId || user?.id || '') === String(requesterId || '');

    let query = db
      .from("users")
      .select("*");

    let { data, error } = await query;

    if (error && error.message?.includes('column')) {
      const fallbackQuery = db.from("users").select("*");
      if (shouldScopeToRequesterTeam) {
        let fallback = await fallbackQuery;
        data = fallback.data || [];
        error = fallback.error;
        if (!error && data.length > 0 && !('employerId' in data[0])) {
          // Migration not run: at least keep the requester's own account visible.
          data = data.filter((u) => isRequesterRecord(u));
        } else if (!error) {
          data = data.filter(
            (u) =>
              isRequesterRecord(u) ||
              String(u.employerId || '') === String(requesterId || '')
          );
        }
      } else {
        const fallback = await fallbackQuery;
        data = fallback.data; error = fallback.error;
      }
    }

    if (error) return res.status(500).json({ error: error.message });

    let filtered = Array.isArray(data) ? data : [];

    const organizationOwnerId = requesterRole === 'ORGANIZER' ? requesterId : (await db.from('users').select('employerId').eq('userId', requesterId).maybeSingle()).data?.employerId || requesterId;

    if (shouldScopeToRequesterTeam) {
      filtered = filtered.filter((user) => {
        const userId = user?.userId || user?.id || null;
        const employerId = user?.employerId || null;
        
        // Rules for visibility:
        // 1. It's the user themselves
        // 2. The user has the SAME employer (colleagues)
        // 3. The user IS the employer (the owner/organizer)
        return isRequesterRecord(user) || 
               (organizationOwnerId && String(employerId || '') === String(organizationOwnerId)) ||
               (organizationOwnerId && String(userId || '') === String(organizationOwnerId));
      });
    }

    if (requesterRole === 'ADMIN' && !teamOnlyRequested) {
      // Only apply broad ADMIN privacy filter when NOT in teamOnly mode.
      // When teamOnly=true, shouldScopeToRequesterTeam already scopes to the right users.
      filtered = filtered.filter((user) => {
        const employerId = user?.employerId || null;
        // Keep users not tied to any organizer team, or tied to this admin's own scoped team.
        return !employerId || String(employerId) === String(requesterId || '');
      });
    }

    return res.json(filtered.map(user => ({
      ...user,
      userId: user.userId || user.id || null,
      role: normalizeRole(user.role),
      canViewEvents: user.canviewevents,
      canEditEvents: user.caneditevents,
      canManualCheckIn: user.canmanualcheckin,
      canReceiveNotifications: user.canreceivenotifications,
      employerId: user.employerId || user.employerid || null
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;
    const requesterRole = normalizeRole(req.user?.role || '');

    // 1. Fetch target user
    const { data: target, error: targetError } = await db
      .from('users')
      .select('userId, employerId, role')
      .eq('userId', id)
      .maybeSingle();

    if (targetError) return res.status(500).json({ error: targetError.message });
    if (!target) return res.status(404).json({ error: 'User not found' });

    // 2. Permission Check
    if (requesterRole !== 'ADMIN') {
      const employerId = target.employerId || target.employerid;
      if (String(employerId) !== String(requesterId)) {
        return res.status(403).json({ error: 'Forbidden: You do not own this staff member' });
      }
    }

    // 3. Delete from DB Permanently
    const { error: updErr } = await db
      .from('users')
      .delete()
      .eq('userId', id);

    if (updErr) return res.status(500).json({ error: updErr.message });

    // 4. Force Remove from Supabase Auth
    try {
      if (db.auth && db.auth.admin) {
        await db.auth.admin.deleteUser(id);
      }
    } catch (authError) {
      console.log(`[deleteStaff] Auth deletion error for ${id}:`, authError.message);
    }

    return res.json({ message: 'Staff member removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updatePermissions = async (req, res) => {
  try {
    const requesterId = req.user?.id;
    let requesterRole = normalizeRole(req.user?.role || '');
    if (requesterRole !== 'ADMIN') {
      // Fallback: look up role in DB using userId/id/email
      const requesterEmail = req.user?.email;
      let roleRow = null;
      if (requesterId) {
        const byUserId = await db.from('users').select('role').eq('userId', requesterId).maybeSingle();
        roleRow = byUserId.data;
        if (!roleRow || byUserId.error) {
          const byId = await db.from('users').select('role').eq('userId', requesterId).maybeSingle();
          roleRow = byId.data;
        }
      }
      if (!roleRow && requesterEmail) {
        const byEmail = await db.from('users').select('role').eq('email', requesterEmail).maybeSingle();
        roleRow = byEmail.data;
      }
      requesterRole = normalizeRole(roleRow?.role || '');
    }

    if (requesterRole !== 'ADMIN' && requesterRole !== 'ORGANIZER' && requesterRole !== 'STAFF') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { canViewEvents = false, canEditEvents = false, canManualCheckIn = false, canReceiveNotifications = false } = req.body || {};

    // Resolve target user ownership to enforce privacy boundaries.
    let { data: target, error: targetError } = await db
      .from('users')
      .select('userId, role, employerId')
      .eq('userId', id)
      .maybeSingle();

    if (!target && !targetError) {
      console.log(`[updatePermissions] 🔍 User ${id} not in 'users'. Checking 'invites'...`);
      // Try finding in invites (strip 'pending-' prefix if present)
      const cleanId = id.startsWith('pending-') ? id.replace('pending-', '') : id;
      
      const { data: invite, error: inviteErr } = await db
        .from('invites')
        .select('*')
        .or(`inviteId.eq.${cleanId},token.eq.${cleanId},email.eq.${cleanId}`)
        .maybeSingle();

      if (invite) {
        console.log(`[updatePermissions] 🎫 Found pending invite for ${invite.email}. Updating invite permissions.`);
        const { error: updErr } = await db.from('invites').update({
          canViewEvents,
          canEditEvents,
          canManualCheckIn,
          canReceiveNotifications
        }).eq('inviteId', invite.inviteId);
        
        if (updErr) {
          console.error('[updatePermissions] ❌ Invite Update Error:', updErr.message);
          return res.status(500).json({ error: 'Failed to update invite permissions: ' + updErr.message });
        }
        return res.json({ message: 'Pending invitation permissions updated' });
      }
    }

    if (targetError) {
      console.error('[updatePermissions] ❌ Lookup Error:', targetError.message);
      return res.status(500).json({ error: targetError.message });
    }
    
    if (!target) {
      console.warn(`[updatePermissions] ⚠️ User ${id} not found in database.`);
      return res.status(404).json({ error: 'User or Invitation not found' });
    }

    const targetEmployerId = target.employerId || target.employerid || null;
    const targetRole = normalizeRole(target.role);

    if (requesterRole === 'ORGANIZER' || requesterRole === 'STAFF') {
      if (!targetEmployerId || String(targetEmployerId) !== String(requesterId || '')) {
        return res.status(403).json({ error: 'Forbidden: team scope mismatch' });
      }
      if (targetRole !== 'STAFF' && targetRole !== 'ORGANIZER') {
        return res.status(403).json({ error: 'Forbidden: you cannot manage this role' });
      }
    }

    if (requesterRole === 'ADMIN') {
      if (targetEmployerId && String(targetEmployerId) !== String(requesterId || '')) {
        return res.status(403).json({ error: 'Forbidden: cannot manage another organization team' });
      }
    }

    let { data, error } = await db
      .from('users')
      .update({
        canviewevents: canViewEvents,
        caneditevents: canEditEvents,
        canmanualcheckin: canManualCheckIn,
        canreceivenotifications: canReceiveNotifications
      })
      .eq('userId', id)
      .select('userId, name, email, role, canviewevents, caneditevents, canmanualcheckin, canreceivenotifications')
      .maybeSingle();

    if ((!data && !error) || (error && error.message?.includes('column "userId"'))) {
      const resp = await db
        .from('users')
        .update({
          canviewevents: canViewEvents,
          caneditevents: canEditEvents,
          canmanualcheckin: canManualCheckIn,
          canreceivenotifications: canReceiveNotifications
        })
        .eq('userId', id)
        .select('id, name, email, role, canviewevents, caneditevents, canmanualcheckin, canreceivenotifications')
        .maybeSingle();
      data = resp.data; error = resp.error;
    }

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'User not found' });

    await logAudit({
      actionType: 'USER_PERMISSIONS_UPDATED',
      details: { targetUserId: id, targetEmail: data?.email, permissions: { canViewEvents, canEditEvents, canManualCheckIn, canReceiveNotifications } },
      req
    });

    return res.json({
      ...data,
      canViewEvents: data.canviewevents,
      canEditEvents: data.caneditevents,
      canManualCheckIn: data.canmanualcheckin,
      canReceiveNotifications: data.canreceivenotifications,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getRoleByEmail = async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const { data, error } = await db.from("users").select("role, userId").eq("email", email).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    let userRecord = data;

    if (!userRecord && email) {
      console.log(`[getRoleByEmail] Checking Supabase Auth for missing user: ${email}`);
      const { data: { users }, error: authError } = await db.auth.admin.listUsers();
      const authUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (authUser) {
        console.log(`[getRoleByEmail] Found user in Supabase Auth but not DB. returning default role.`);
        return res.json({ role: 'ORGANIZER', isOnboarded: false });
      }
    }

    if (!userRecord) return res.status(404).json({ error: "User not found" });

    const role = normalizeRole(userRecord.role);
    let isOnboarded = false;
    
    if (role === 'ORGANIZER') {
      const { data: orgData } = await db
        .from('organizers')
        .select('isOnboarded')
        .eq('ownerUserId', userRecord.userId)
        .maybeSingle();
      isOnboarded = !!orgData?.isOnboarded;
    }

    return res.json({ role, isOnboarded });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    // Validate permission
    let requesterRole = normalizeRole(req.user?.role || '');
    if (requesterRole !== 'ADMIN') {
        const { data: dbUser } = await db.from('users').select('role').eq('userId', req.user?.id).maybeSingle();
        requesterRole = normalizeRole(dbUser?.role || '');
    }

    if (requesterRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can change user status' });
    }

    const { data, error } = await db
      .from('users')
      .update({ status })
      .eq('userId', id)
      .select('userId, name, email, role, status')
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'User not found' });

    await logAudit({
        actionType: 'USER_STATUS_UPDATED',
        details: { targetUserId: id, status, targetEmail: data.email },
        req
    });

    return res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
