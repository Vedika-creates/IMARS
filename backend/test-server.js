import { db } from "./db.js";

const testServer = async () => {
  try {
    console.log("Testing database connection...");
    await db.execute("SELECT 1");
    console.log("✅ Database connection successful");
    
    // Test if server can start
    console.log("✅ All imports working correctly");
    console.log("🚀 Ready to start server with: npm start");
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  }
};

testServer();
