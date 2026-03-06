import db from "../database/db.js";
import supabase, { createAuthClient } from '../database/db.js';
import { sendMakeNotification } from '../utils/makeWebhook.js';

const ORGANIZER_ROLE = 'ORGANIZER';

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    // Check if email already exists in users table
    const { data: existingUser } = await db
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    // Create user in Supabase Auth using admin API (service role key)
    let authData, authError;
    ({ data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
    }));

    // Handle case where auth user exists but users table row was deleted (orphaned auth user)
    if (authError && (authError.message?.includes('already been registered') || authError.code === 'email_exists')) {
      console.log("Auth user exists but no users row — cleaning up orphaned auth user for:", email);
      // Find and delete the orphaned auth user, then recreate
      try {
        const { data: listData } = await supabase.auth.admin.listUsers();
        const orphanedUser = listData?.users?.find(u => u.email === email.toLowerCase().trim());
        if (orphanedUser) {
          await supabase.auth.admin.deleteUser(orphanedUser.id);
          // Recreate fresh
          ({ data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email.toLowerCase().trim(),
            password,
            email_confirm: true,
          }));
        }
      } catch (cleanupErr) {
        console.error("Orphan cleanup error:", cleanupErr);
      }
    }

    if (authError) {
      console.error("Supabase auth error:", authError);
      return res.status(400).json({ message: authError.message || "Failed to create account" });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return res.status(500).json({ message: "Failed to create auth user" });
    }

    // Insert into users table with role ORGANIZER
    let { data: userData, error: dbError } = await db
      .from('users')
      .insert({
        userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: ORGANIZER_ROLE,
        canviewevents: false,
        caneditevents: false,
        canmanualcheckin: false,
      })
      .select('userId, name, email, role')
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      try { await supabase.auth.admin.deleteUser(userId); } catch (e) { }
      return res.status(500).json({ message: "Failed to create user record" });
    }

    // Safety net: if any DB default/trigger rewrote role to USER, force ORGANIZER.
    const persistedRole = String(userData?.role || '').toUpperCase();
    if (persistedRole !== ORGANIZER_ROLE) {
      const roleFix = await db
        .from('users')
        .update({ role: ORGANIZER_ROLE })
        .eq('userId', userId)
        .select('userId, name, email, role')
        .maybeSingle();
      if (!roleFix.error && roleFix.data) {
        userData = roleFix.data;
      }
    }

    // Send welcome email via Make.com webhook (same format as invite so Make.com sends the email)
    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const inviteLink = `${frontendUrl}/#/login`;

    try {
      await sendMakeNotification({
        type: 'invite',
        email: email.toLowerCase().trim(),
        name: name.trim(),
        meta: { inviteLink, role: ORGANIZER_ROLE }
      });
    } catch (webhookErr) {
      console.warn("Make.com webhook failed (non-blocking):", webhookErr?.message);
    }

    return res.status(201).json({
      message: "Account created successfully! A confirmation email has been sent to your inbox.",
      user: userData
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ message: "Server error during registration" });
  }
};

export const login = async (req, res) => {
  const { access_token, refresh_token } = req.body;

  if (!access_token || !refresh_token) {
    return res.status(400).json({ message: "Missing tokens" });
  }

  try {
    // ✅ Verify access token with a short-lived client to avoid mutating global state
    const authClient = createAuthClient(access_token);
    const { data: user, error } = await authClient.auth.getUser(access_token);

    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // ✅ Store tokens in cookies (match middleware attributes)
    const isProd = process.env.NODE_ENV === "production";
    const base = {
      httpOnly: true,
      sameSite: isProd ? "None" : "Lax",
      secure: isProd ? true : false,
      path: "/",
    };
    res.cookie("access_token", access_token, { ...base, maxAge: 60 * 60 * 1000 });
    res.cookie("refresh_token", refresh_token, { ...base, maxAge: 14 * 24 * 60 * 60 * 1000 });
    return res.json({
      message: "Logged in successfully",
      user: user.user,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}


const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";

export async function logout(req, res) {
  const isProd = process.env.NODE_ENV === "production";

  const cookieBase = {
    httpOnly: true,
    path: "/",
    sameSite: isProd ? "None" : "Lax",
    secure: isProd ? true : false,
  };

  try {
    const accessToken = req.cookies?.[ACCESS_COOKIE] ?? null;
    const refreshToken = req.cookies?.[REFRESH_COOKIE] ?? null;

    // Best-effort: bind session; ignore errors
    if (accessToken && refreshToken) {
      try {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      } catch (e) {
        // ignore (session may not map)
      }
    }

    // Best-effort revoke; ignore benign errors (e.g., missing session_id)
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (e) {
      // ignore
    }

    // Always expire cookies; names and attributes must match how you set them at login
    res.cookie(ACCESS_COOKIE, "", { ...cookieBase, expires: new Date(0) });
    res.cookie(REFRESH_COOKIE, "", { ...cookieBase, expires: new Date(0) });

    return res.status(204).send();
  } catch (err) {
    // Still expire on unexpected errors and finish with 204
    res.cookie(ACCESS_COOKIE, "", { ...cookieBase, expires: new Date(0) });
    res.cookie(REFRESH_COOKIE, "", { ...cookieBase, expires: new Date(0) });
    return res.status(204).send();
  }
}

