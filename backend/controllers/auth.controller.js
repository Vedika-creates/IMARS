import { db } from "../databaseClient.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role = 'user' } = req.body;

    // Check if user already exists
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await db.execute(
      `INSERT INTO users (first_name, last_name, email, password, role) 
       VALUES (?, ?, ?, ?, ?)`,
      [first_name, last_name, email, hashedPassword, role]
    );

    const token = jwt.sign(
      { id: result.insertId, email, role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: result.insertId,
        first_name,
        last_name,
        email,
        role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const [users] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
