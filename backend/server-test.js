import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./db.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import setupController from "./controllers/setup.controller.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
  credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("IMRAS Backend Running");
});

app.get("/test-mysql", async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT NOW() as current_time');
    res.json({ message: "Database connected successfully", time: rows[0].current_time });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Setup route - creates tables
app.get("/setup", setupController.createTables);

// Dashboard routes
app.use("/api/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database connected`);
  console.log(`Visit http://localhost:${PORT}/setup to create database tables`);
});
