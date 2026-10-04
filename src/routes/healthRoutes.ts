import { Router } from "express";
import { getHealth, getLiveness } from "../controllers/healthController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/health", asyncHandler(getHealth));
router.get("/health/ready", asyncHandler(getHealth));
router.get("/health/live", getLiveness);

export default router;
