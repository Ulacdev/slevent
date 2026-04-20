import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";

// Prevent crashing on unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 [FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🔥 [FATAL] Uncaught Exception:', err);
  // Optional: Gracefully shutdown? For now, just log.
});

import userRoutes from "./routes/userRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import adminEventRoutes from "./routes/adminEventRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import inviteRoutes from "./routes/inviteRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import { authMiddleware } from "./middleware/auth.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { startReservationCleanup } from "./utils/reservationCleanup.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import ticketTypeRoutes from "./routes/ticketTypeRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import organizerRoutes from "./routes/organizerRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import adminPlanRoutes from "./routes/adminPlanRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import promotionRoutes from "./routes/promotionRoutes.js";
import eventPromotionRoutes from "./routes/eventPromotionRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import discoveryRoutes from "./routes/discoveryRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import searchHistoryRoutes from "./routes/searchHistoryRoutes.js";
const PORT = process.env.BACKEND_PORT
const app = express();

// Required for rate limiting behind proxies like Vercel
// Using '1' satisfies the security check by assuming exactly one proxy hop
app.set("trust proxy", 1);


const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [];

const rawBodySaver = (req, res, buf) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString("utf8");
  }
};

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server / Postman / curl
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("⚠️ [CORS] Blocked origin:", origin);
    // Instead of throwing an error which might crash some middlewares/libs, 
    // we return false. The browser will handle the CORS failure.
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Security: Rate limiting for auth and sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 failed attempts per window for auth
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // IMPORTANT: only count failures (4xx, 5xx)
  message: { error: "🛑 SECURITY PROTECTION: Too many invalid attempts, please try again after 15 minutes" },
  handler: (req, res, next, options) => {
    console.warn(`🛑 [SECURITY] Rate limit EXCEEDED for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  }
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased from 100 to prevent false-positive 'crashes' on SPAs
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});


app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "http://127.0.0.1:5000", "http://localhost:5000", "https://image.pollinations.ai", "https://images.unsplash.com", "https://*.pollinations.ai"],
      "connect-src": ["'self'", "http://127.0.0.1:5000", "http://localhost:5000", "https://xmjdcbzgdfylbqkjoyyb.supabase.co", "https://api.groq.com", "https://generativelanguage.googleapis.com"]
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));
app.use(morgan("dev"));

app.use(cookieParser());
app.use(
  ["/api/payments/hitpay/webhook", "/api/subscriptions/webhook"],
  express.raw({
    type: ["application/json", "application/x-www-form-urlencoded", "*/*"],
    limit: "1mb",
  }),
  (req, res, next) => {
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body.toString("utf8");
      const contentType = req.headers["content-type"] || "";

      try {
        if (contentType.includes("application/json")) {
          req.body = req.rawBody ? JSON.parse(req.rawBody) : {};
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
          req.body = Object.fromEntries(new URLSearchParams(req.rawBody));
        } else {
          try {
            req.body = req.rawBody ? JSON.parse(req.rawBody) : {};
          } catch {
            try {
              req.body = Object.fromEntries(new URLSearchParams(req.rawBody));
            } catch {
              req.body = {};
            }
          }
        }
      } catch (err) {
        console.error("Webhook body parsing error:", err);
        req.body = {};
      }
    }
    next();
  }
);
app.use(express.json({ limit: "50mb", verify: rawBodySaver }));
app.use(express.urlencoded({ limit: "50mb", extended: true, verify: rawBodySaver }));

app.use("/api/events", eventRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/ticket-types", ticketTypeRoutes);
app.use("/api", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/invite", inviteRoutes); // Removed authLimiter from the whole dashboard
app.use("/api/newsletter", newsletterRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", userRoutes);
app.use("/api", organizerRoutes);
app.use("/api", notificationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin/events", authMiddleware, adminEventRoutes);
app.use("/api/admin/plans", authMiddleware, adminPlanRoutes);
app.use("/api", promotionRoutes);
app.use("/api", eventPromotionRoutes);
app.use("/api", supportRoutes);
app.use("/api", categoryRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/discovery", discoveryRoutes);
app.use("/api", reportRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/search-history", searchHistoryRoutes);

// Root endpoint for status check
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "StartupLab Ticketing API is running!" });
});

if (process.env.VERCEL !== "1") {
  startReservationCleanup();
}

app.get("/api/cron/cleanup", async (req, res) => {
  try {
    const { runReservationCleanup } = await import("./utils/reservationCleanup.js");
    const result = await runReservationCleanup();
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 [Global Error]:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

if (process.env.VERCEL !== "1") {
  const PORT = process.env.BACKEND_PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
