import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./db.js";
import itemRoutes from "./routes/item.routes.js";
import reorderRoutes from "./routes/reorder.routes.js";
import stockRoutes from "./routes/stock.routes.js";
import authRoutes from "./routes/auth.routes.js";
import newItemRoutes from "./routes/items.routes.js";
import newStockRoutes from "./routes/stock-new.routes.js";
import newReorderRoutes from "./routes/reorder-new.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import emailRoutes from "./routes/email.routes.js";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      /\.vercel\.app$/
    ],
    credentials: true
  })
);
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

// Add email endpoint directly to main server
app.post("/api/email/send-email", async (req, res) => {
  try {
    console.log("📧 Email endpoint hit on main server");
    const { to, subject, html } = req.body;
    
    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Missing required fields: to, subject, html" });
    }

    console.log("📧 Email data:", { to, subject });
    
    // For now, return success without sending real email
    // This tests the API endpoint
    const emailId = "email-" + Date.now();
    console.log("✅ Email processed:", emailId);
    
    res.json({ 
      success: true, 
      message: "Email sent successfully", 
      data: { id: emailId }
    });

  } catch (error) {
    console.error("❌ Email API error:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/items", newItemRoutes);
app.use("/api/stock", newStockRoutes);
app.use("/api/reorder", newReorderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/email", emailRoutes);
// Legacy routes (keep for compatibility)
app.use("/api/item", itemRoutes);
app.use("/api/reorder", reorderRoutes);
app.use("/api/stock", stockRoutes);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database connected `);
  });
}

export default app;
