import express from "express";
import {
  createStockMovement,
  getStockStatusController,
  getCurrentStockController,
  getStockMovements,
  reserveStockController,
  releaseReservedStockController,
  getStockBatches,
  adjustStock,
  transferStock
} from "../controllers/stock.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Stock status and movements
router.get("/status", verifyToken, getStockStatusController);
router.get("/movements", verifyToken, getStockMovements);
router.get("/batches", verifyToken, getStockBatches);
router.get("/items/:item_id/current", verifyToken, getCurrentStockController);

// Stock operations
router.post("/movements", verifyToken, createStockMovement);
router.post("/reserve", verifyToken, reserveStockController);
router.post("/release", verifyToken, releaseReservedStockController);
router.post("/adjust", verifyToken, adjustStock);
router.post("/transfer", verifyToken, transferStock);

export default router;
