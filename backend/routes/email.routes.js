import express from "express";
import dotenv from "dotenv";

const router = express.Router();

// Load environment variables
dotenv.config();

// Simple test endpoint
router.get("/test", (req, res) => {
  console.log("📧 Email test endpoint hit");
  res.json({ 
    message: "Email API is working",
    timestamp: new Date().toISOString()
  });
});

// Send email endpoint - Real implementation
router.post("/send-email", async (req, res) => {
  try {
    console.log("📧 Email endpoint hit");
    console.log("📧 Request body:", req.body);

    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ 
        error: "Missing required fields: to, subject, html" 
      });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      console.log("❌ Resend API key not configured");
      return res.status(500).json({ 
        error: "Email service not configured - Missing API key" 
      });
    }

    console.log("📧 Sending email:", { to, subject });
    console.log("📧 API Key present:", !!RESEND_API_KEY);

    // Import Resend dynamically
    const { Resend } = await import("resend");
    const resend = new Resend(RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: "Inventory Management System <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("❌ Email send error:", error);
      return res.status(500).json({ 
        error: "Failed to send email", 
        details: error 
      });
    }

    console.log("✅ Email sent successfully:", data);
    return res.json({ 
      success: true, 
      message: "Email sent successfully", 
      data: data 
    });

  } catch (error) {
    console.error("❌ Email API error:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error.message 
    });
  }
});

export default router;
