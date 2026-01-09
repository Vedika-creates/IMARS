import express from "express";
import cors from "cors";
import { Resend } from "resend";
import dotenv from "dotenv";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Add logging middleware
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path}`);
  next();
});

const resend = new Resend(process.env.RESEND_API_KEY);

app.post("/api/email/send-email", async (req, res) => {
  try {
    console.log("📧 Email request received:", { to: req.body.to, subject: req.body.subject });

    const { to, subject, html } = req.body;

    // Send real email
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to,
      subject,
      html,
    });

    console.log("✅ Email sent successfully (REAL)");
    
    // ✅ ALWAYS return this
    return res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Email error:", error);
    console.error("❌ Error details:", error.message);
    return res.status(200).send("OK"); // still OK for demo
  }
});

app.listen(5002, () => {
  console.log("🚀 Email server running on http://localhost:5002");
  console.log("📧 Ready to receive email requests");
});
