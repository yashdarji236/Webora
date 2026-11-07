import { Router } from "express";
import {
  runSeoAudit,
  getLatestAudit,
  getAuditHistory,
  getAuditById,
} from "../controllers/seoAuditController.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router({ mergeParams: true });

// Audits API routes (authenticated)
router.post("/run", authenticate, runSeoAudit);
router.post("/:projectId/audit", authenticate, runSeoAudit);
router.post("/", authenticate, runSeoAudit);

router.get("/latest", authenticate, getLatestAudit);
router.get("/:projectId/audit/history", authenticate, getAuditHistory);
router.get("/:projectId/audit/:auditId", authenticate, getAuditById);
router.get("/:projectId/audit", authenticate, getLatestAudit);
router.get("/", authenticate, getLatestAudit);

export default router;

