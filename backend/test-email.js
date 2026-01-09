import express from "express";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const app = express();
app.use(express.json());

// Test endpoint
app.get("/", (req, res) => {
  res.send("Email Test Server Running");
});

// Email endpoint
app.post("/send-email", async (req, res) => {
  try {
    console.log("📧 Email request received");
    const { to, subject, html } = req.body;
    
    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: "Inventory Management System <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("❌ Email error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("✅ Email sent:", data);
    res.json({ success: true, data });

  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Email test server running on port ${PORT}`);
  console.log(`Resend API key: ${process.env.RESEND_API_KEY ? 'present' : 'missing'}`);
});
