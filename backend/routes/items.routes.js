import express from "express";
import { getItems, getItemById, createItem, updateItem, deleteItem } from "../controllers/items.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply JWT middleware to all routes
router.use(verifyToken);

// GET /api/items - Get all items
router.get("/", getItems);

// GET /api/items/:id - Get single item
router.get("/:id", getItemById);

// POST /api/items - Create new item
router.post("/", createItem);

// PUT /api/items/:id - Update item
router.put("/:id", updateItem);

// DELETE /api/items/:id - Delete item
router.delete("/:id", deleteItem);

export default router;
