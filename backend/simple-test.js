import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Test endpoint
app.get("/", (req, res) => {
  res.send("Simple Test Server Running");
});

// Email endpoint (test mode)
app.post("/send-email", async (req, res) => {
  try {
    console.log("📧 Email request received");
    const { to, subject, html } = req.body;
    
    console.log("📧 Email details:", { to, subject });
    console.log("📧 HTML length:", html?.length);
    
    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Simulate email sending
    const emailId = "test-" + Date.now();
    console.log("✅ Email simulated:", emailId);
    
    res.json({ 
      success: true, 
      message: "Email sent successfully (test mode)",
      data: { id: emailId }
    });

  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Simple test server running on port ${PORT}`);
});
