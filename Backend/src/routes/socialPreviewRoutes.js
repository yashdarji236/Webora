import { Router } from "express";
import {
  getProjectPreviews,
  simulateProjectPreviews,
  validateSocialImage,
} from "../controllers/socialPreviewController.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router({ mergeParams: true });

router.get("/:projectId/previews", authenticate, getProjectPreviews);
router.post("/:projectId/previews/simulate", authenticate, simulateProjectPreviews);
router.post("/:projectId/previews/validate-image", authenticate, validateSocialImage);

router.get("/", authenticate, getProjectPreviews);
router.post("/simulate", authenticate, simulateProjectPreviews);
router.post("/validate-image", authenticate, validateSocialImage);

export default router;

