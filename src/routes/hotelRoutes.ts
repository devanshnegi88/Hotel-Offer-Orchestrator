import { Router } from "express";
import { getHotels } from "../controllers/hotelController";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/api/hotels", asyncHandler(getHotels));

export default router;
