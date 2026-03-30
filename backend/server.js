import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import userRoutes from "./routes/userRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import adminEventRoutes from "./routes/adminEventRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import inviteRoutes from "./routes/inviteRoutes.js";
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

    console.error("Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Security: Rate limiting for auth and sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window for auth
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "🛑 SECURITY PROTECTION: Too many attempts, please try again after 15 minutes" },
  handler: (req, res, next, options) => {
    console.warn(`🛑 [SECURITY] Rate limit EXCEEDED for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  }
});

const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});


app.use(helmet());
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
app.use(express.json({ verify: rawBodySaver }));
app.use(express.urlencoded({ extended: false, verify: rawBodySaver }));

app.use("/api/events", eventRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/ticket-types", ticketTypeRoutes);
app.use("/api", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/invite", inviteRoutes); // Removed authLimiter from the whole dashboard
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
