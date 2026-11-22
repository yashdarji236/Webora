import { Router } from "express";
import {
  generateFixes,
  getFixes,
  getFixById,
  approveFix,
  rejectFix,
  regenerateFix,
  publishFixesHandler,
  getPublishStatusHandler,
  detectSeoStateHandler,
  bootstrapFixesHandler,
  previewDiffHandler,
  previewPublishHandler,
} from "../controllers/seoFixController.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router({ mergeParams: true });

// ─── 1. PROJECT / REPO NESTED ENDPOINTS ───
// Matches /api/projects/:projectId/fixes/... and /api/repos/:repo/fixes/...
router.post("/:projectId/fixes/generate", authenticate, generateFixes);
router.post("/:projectId/fixes/bootstrap", authenticate, bootstrapFixesHandler);
router.get("/:projectId/fixes/detect-seo-state", authenticate, detectSeoStateHandler);
router.post("/:projectId/fixes/publish", authenticate, publishFixesHandler);
router.get("/:projectId/fixes/publish/:publishId", authenticate, getPublishStatusHandler);
router.post("/:projectId/fixes/preview-diff", authenticate, previewDiffHandler);
router.post("/:projectId/fixes/preview-publish", authenticate, previewPublishHandler);
router.get("/:projectId/fixes", authenticate, getFixes);
router.get("/:projectId/fixes/:fixId", authenticate, getFixById);
router.post("/:projectId/fixes/:fixId/approve", authenticate, approveFix);
router.post("/:projectId/fixes/:fixId/reject", authenticate, rejectFix);
router.post("/:projectId/fixes/:fixId/regenerate", authenticate, regenerateFix);

// ─── 2. FLAT ENDPOINTS (/api/fixes/...) ───
router.post("/generate", authenticate, generateFixes);
router.post("/bootstrap", authenticate, bootstrapFixesHandler);
router.get("/detect-seo-state", authenticate, detectSeoStateHandler);
router.post("/publish", authenticate, publishFixesHandler);
router.get("/publish/:publishId", authenticate, getPublishStatusHandler);
router.post("/preview-diff", authenticate, previewDiffHandler);
router.post("/preview-publish", authenticate, previewPublishHandler);
router.get("/", authenticate, getFixes);
router.get("/:fixId", authenticate, getFixById);
router.post("/:fixId/approve", authenticate, approveFix);
router.post("/:fixId/reject", authenticate, rejectFix);
router.post("/:fixId/regenerate", authenticate, regenerateFix);

export default router;
