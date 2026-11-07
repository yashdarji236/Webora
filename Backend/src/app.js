import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import repositoryAnalysisRoutes from "./routes/repositoryAnalysisRoutes.js";
import seoAuditRoutes from "./routes/seoAuditRoutes.js";
import { githubCallback } from "./controllers/auth.controller.js";

// Ensure .env is loaded regardless of process cwd
dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: [process.env.CLIENT_URL || "http://localhost:5173", "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount auth routes for both /api/auth and /auth
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

// Direct callback aliases in case callback URL is /github/callback
app.get("/github/callback", githubCallback);

// User routes
app.use("/api/user", userRoutes);
app.use("/user", userRoutes);

// Repository Analysis & Framework Detection routes (Feature 1)
app.use("/api/analysis", repositoryAnalysisRoutes);
app.use("/api/projects", repositoryAnalysisRoutes);

// Live Website Crawling & Comprehensive SEO Audit Engine (Feature 2)
app.use("/api/audit", seoAuditRoutes);
app.use("/api/projects", seoAuditRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Internal Server Error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export default app;
