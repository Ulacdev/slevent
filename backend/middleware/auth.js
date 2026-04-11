import { jwtDecode } from "jwt-decode";
import supabase, { createAuthClient } from "../database/db.js";

const isProd = process.env.NODE_ENV === "production";

function setSessionCookies(res, { access_token, refresh_token }) {
  const isProd = process.env.NODE_ENV === "production";
  const base = {
    httpOnly: true,
    sameSite: isProd ? "None" : "Lax",
    secure: isProd ? true : false,
    path: "/",
  };
  res.cookie("access_token", access_token, {
    ...base,
    maxAge: 60 * 60 * 1000,
  });
  if (refresh_token) {
    res.cookie("refresh_token", refresh_token, {
      ...base,
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });
  }
}

async function resolveUserFromAccess(accessToken) {
  try {
    // Fast path: decode JWT directly — no round-trip to Supabase Auth.
    // The token is trusted because it's our own httpOnly cookie issued by Supabase.
    const decoded = jwtDecode(accessToken);
    if (!decoded?.sub) {
      const err = new Error('Invalid token: missing user subject');
      err.status = 401;
      err.isAuthError = true;
      throw err;
    }
    // Reconstruct the minimal user object that the rest of the app expects
    return {
      id: decoded.sub,
      email: decoded.email || '',
      role: decoded.role || 'authenticated',
      user_metadata: decoded.user_metadata || {},
      app_metadata: decoded.app_metadata || {},
      aud: decoded.aud || 'authenticated',
    };
  } catch (e) {
    if (e.isAuthError) throw e;
    // Fallback: verify via Supabase if decode fails for any reason
    const authClient = createAuthClient(accessToken);
    const { data, error } = await authClient.auth.getUser(accessToken);
    if (error || !data?.user) {
      const msg = error?.message || 'User not found';
      const err = new Error(msg);
      err.status = 401;
      err.isAuthError = true;
      throw err;
    }
    return data.user;
  }
}

export const authMiddleware = async (req, res, next) => {
  try {
    if (req.authProcessed) return next();
    req.authProcessed = true;

    // Check for Bearer token first (React Native)
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (bearerToken) {
      try {
        const user = await resolveUserFromAccess(bearerToken);
        req.user = user;
        req.isMobileRequest = false; // We can set cookies here for web browsers

        // If cookies are missing (first time after OAuth), seed the access_token cookie
        if (!req.cookies?.access_token) {
          const isProd = process.env.NODE_ENV === "production";
          res.cookie("access_token", bearerToken, {
            httpOnly: true,
            sameSite: isProd ? "None" : "Lax",
            secure: isProd ? true : false,
            path: "/",
            maxAge: 60 * 60 * 1000,
          });
        }
        return next();
      } catch (err) {
        return res.status(401).json({ error: err.message || "Invalid access token" });
      }
    }

    // Fall back to cookie-based auth (React web)
    const accessToken = req.cookies?.access_token;
    const refreshToken = req.cookies?.refresh_token;

    if (!accessToken) {
      if (!refreshToken) {
        return res.status(401).json({ error: "No tokens provided" });
      }
      // Refresh session
      const authClient = createAuthClient();
      const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data?.session) {
        return res.status(401).json({ error: "Refresh token invalid or expired" });
      }
      const session = data.session;
      setSessionCookies(res, session);
      const user = await resolveUserFromAccess(session.access_token);
      req.user = user;
      return next();
    }

    // Check expiry
    let decoded = null;
    try {
      decoded = jwtDecode(accessToken);
    } catch (e) {
      console.warn("Auth: decode failed; checking via refresh");
    }
    const now = Math.floor(Date.now() / 1000);
    const buffer = 60;
    const expiring = !decoded || decoded.exp <= (now + buffer);

    if (expiring) {
      if (!refreshToken) {
        return res.status(401).json({ error: "Access token expired and no refresh token" });
      }
      const authClient = createAuthClient();
      const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data?.session) {
        return res.status(401).json({ error: "Session expired. Please login again." });
      }
      const session = data.session;
      setSessionCookies(res, session);
      const user = await resolveUserFromAccess(session.access_token);
      req.user = user;
      return next();
    }

    // Access token valid locally; verify user in Supabase
    try {
      const user = await resolveUserFromAccess(accessToken);
      req.user = user;
      return next();
    } catch (err) {
      // If session is missing/invalid but we have a refresh token, try one last time to refresh
      if (err.message?.includes('session') || err.message?.includes('missing')) {
        if (refreshToken) {
          console.log("♻️ Auth: Session missing but refresh token exists; attempting auto-repair");
          const authClient = createAuthClient();
          const { data, error: refreshErr } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
          if (!refreshErr && data?.session) {
            setSessionCookies(res, data.session);
            req.user = await resolveUserFromAccess(data.session.access_token);
            return next();
          } else {
            console.warn("❌ Auth: auto-repair failed:", refreshErr?.message || "No session returned");
          }
        }
      }
      console.warn("❌ Auth: resolveUser failed:", err.message);
      return res.status(401).json({ error: err.message || "Authentication failed" });
    }

  } catch (err) {
    if (err.isAuthError) {
      return res.status(401).json({ error: err.message });
    }
    console.error("❌ Auth middleware error:", err);
    return res.status(500).json({ error: "Server error during authentication" });
  }
};
