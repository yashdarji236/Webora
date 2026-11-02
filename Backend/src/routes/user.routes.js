import { Router } from "express";
import { getUserRepos, auditWebsite } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/repos", authenticate, getUserRepos);
router.post("/audit", authenticate, auditWebsite);

export default router;

