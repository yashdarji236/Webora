import { Router } from "express";
import {
  redirectToGithub,
  githubCallback,
  exchangeGithubCode,
  getMe,
  getAuthConfig,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// OAuth initiation & callbacks
router.get("/github", redirectToGithub);
router.get("/github/callback", githubCallback);
router.post("/github/exchange", exchangeGithubCode);

// Config & user profile
router.get("/config", getAuthConfig);
router.get("/me", authenticate, getMe);

export default router;

