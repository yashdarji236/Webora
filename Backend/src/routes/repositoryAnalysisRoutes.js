import { Router } from "express";
import {
  analyzeRepository,
  getRepositoryAnalysis,
} from "../controllers/repositoryAnalysisController.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// Analysis routes with authentication
router.post("/analyze", authenticate, analyzeRepository);
router.post("/:owner/:repo/analyze", authenticate, analyzeRepository);
router.post("/:projectId/analyze", authenticate, analyzeRepository);

router.get("/status", authenticate, getRepositoryAnalysis);
router.get("/:owner/:repo", authenticate, getRepositoryAnalysis);
router.get("/:projectId", authenticate, getRepositoryAnalysis);
router.get("/", authenticate, getRepositoryAnalysis);

export default router;

