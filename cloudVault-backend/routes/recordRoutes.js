const express = require("express");
const Record = require("../models/Record");
const auth = require("../middleware/authMiddleware");
const router = express.Router();

// Validation functions
function validateBloodPressure(bp) {
  const bpRegex = /^(\d{1,3})\/(\d{1,3})$/;
  const match = bp.match(bpRegex);
  if (!match) return { valid: false, message: "Blood pressure must be in format 'systolic/diastolic' (e.g., 120/80)" };
  
  const systolic = parseInt(match[1]);
  const diastolic = parseInt(match[2]);
  
  if (systolic < 70 || systolic > 250) {
    return { valid: false, message: "Systolic pressure must be between 70-250 mmHg" };
  }
  if (diastolic < 40 || diastolic > 150) {
    return { valid: false, message: "Diastolic pressure must be between 40-150 mmHg" };
  }
  if (systolic <= diastolic) {
    return { valid: false, message: "Systolic pressure must be higher than diastolic pressure" };
  }
  
  return { valid: true };
}

function validateSugar(sugar) {
  const sugarNum = parseInt(sugar);
  if (isNaN(sugarNum) || sugarNum < 20 || sugarNum > 600) {
    return { valid: false, message: "Sugar level must be a number between 20-600 mg/dL" };
  }
  return { valid: true };
}

function validateHeartRate(hr) {
  const hrNum = parseInt(hr);
  if (isNaN(hrNum) || hrNum < 30 || hrNum > 220) {
    return { valid: false, message: "Heart rate must be a number between 30-220 bpm" };
  }
  return { valid: true };
}

router.post("/add", auth, async (req, res) => {
  const { bp, sugar, heartRate } = req.body;
  
  // Input validation
  if (!bp || !sugar || !heartRate) {
    return res.status(400).json({ error: "All vitals (blood pressure, sugar, heart rate) are required" });
  }
  
  const bpValidation = validateBloodPressure(bp.trim());
  if (!bpValidation.valid) {
    return res.status(400).json({ error: bpValidation.message });
  }
  
  const sugarValidation = validateSugar(sugar.trim());
  if (!sugarValidation.valid) {
    return res.status(400).json({ error: sugarValidation.message });
  }
  
  const hrValidation = validateHeartRate(heartRate.trim());
  if (!hrValidation.valid) {
    return res.status(400).json({ error: hrValidation.message });
  }
  
  try {
    const record = await Record.create({
      userId: req.user.userId,
      bp: bp.trim(),
      sugar: sugar.trim(),
      heartRate: heartRate.trim(),
    });
    res.json({ message: "Vitals added successfully", record });
  } catch (error) {
    console.error('Error adding vitals:', error);
    res.status(500).json({ error: "Failed to add vitals. Please try again." });
  }
});

router.get("/my", auth, async (req, res) => {
  const records = await Record.find({ userId: req.user.userId }).sort({
    createdAt: -1,
  });
  res.json(records);
});

module.exports = router;
