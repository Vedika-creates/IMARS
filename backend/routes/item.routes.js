import express from "express";
import { getItems, createItem, getItemById, updateItem, deleteItem } from "../controllers/item.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, getItems);
router.post("/", verifyToken, createItem);
router.get("/:id", verifyToken, getItemById);
router.put("/:id", verifyToken, updateItem);
router.delete("/:id", verifyToken, deleteItem);

export default router;
