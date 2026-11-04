import { Router } from "express";
import { getUserRepos, getRepoOverview, auditWebsite } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/repos", authenticate, getUserRepos);
router.get("/repo-overview", authenticate, getRepoOverview);
router.post("/repo-overview", authenticate, getRepoOverview);
router.post("/audit", authenticate, auditWebsite);

export default router;
