/* START OF FILE routes/authRoutes.js */

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();



// Validation functions
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*]/.test(password)) return false;
  return true;
}

function validateName(name) {
  return name && name.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(name.trim());
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/[<>"'&]/g, '');
}

// Register
router.post("/register", async (req, res) => {
  const { name, email, password, role, specialty } = req.body;
  
  // Input validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "All fields are required." });
  }
  
  if (!validateName(name)) {
    return res.status(400).json({ error: "Name must be at least 2 characters and contain only letters and spaces." });
  }
  
  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }
  
  if (!validatePassword(password)) {
    return res.status(400).json({ error: "Password must be at least 8 characters with uppercase, lowercase, number, and special character." });
  }
  
  if (!['patient', 'doctor'].includes(role)) {
    return res.status(400).json({ error: "Role must be either 'patient' or 'doctor'." });
  }
  
  if (role === 'doctor' && (!specialty || specialty.trim().length < 2)) {
    return res.status(400).json({ error: "Specialty is required for doctors and must be at least 2 characters." });
  }
  
  try {
    const hashed = await bcrypt.hash(password, 10);
    const userData = { 
      name: sanitizeInput(name), 
      email: sanitizeInput(email.toLowerCase()), 
      password: hashed, 
      role 
    };
    if (role === "doctor" && specialty) {
      userData.specialty = sanitizeInput(specialty);
    }
    const user = await User.create(userData);
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      res
        .status(400)
        .json({ error: "Email already used. Please use a different email." });
    } else {
      console.error("Registration error:", error);
      res
        .status(500)
        .json({ error: "Registration failed due to server error." });
    }
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" } // Add token expiration for security
  );
  // ✅ Send back the user's role and name (and specialty for doctor)
  res.json({
    token,
    role: user.role,
    name: user.name,
    specialty: user.specialty,
  });
});

module.exports = router;
