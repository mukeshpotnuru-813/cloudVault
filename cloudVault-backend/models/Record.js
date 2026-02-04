const mongoose = require("mongoose");

// Validation functions
function validateBloodPressure(bp) {
  const bpRegex = /^(\d{1,3})\/(\d{1,3})$/;
  const match = bp.match(bpRegex);
  if (!match) return false;
  
  const systolic = parseInt(match[1]);
  const diastolic = parseInt(match[2]);
  
  return systolic >= 70 && systolic <= 250 && 
         diastolic >= 40 && diastolic <= 150 && 
         systolic > diastolic;
}

function validateSugar(sugar) {
  const sugarNum = parseInt(sugar);
  return !isNaN(sugarNum) && sugarNum >= 20 && sugarNum <= 600;
}

function validateHeartRate(hr) {
  const hrNum = parseInt(hr);
  return !isNaN(hrNum) && hrNum >= 30 && hrNum <= 220;
}

const recordSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: [true, 'User ID is required'] 
  },
  bp: {
    type: String,
    required: [true, 'Blood pressure is required'],
    validate: {
      validator: validateBloodPressure,
      message: 'Blood pressure must be in format systolic/diastolic (e.g., 120/80) with valid ranges'
    }
  },
  sugar: {
    type: String,
    required: [true, 'Sugar level is required'],
    validate: {
      validator: validateSugar,
      message: 'Sugar level must be a number between 20-600'
    }
  },
  heartRate: {
    type: String,
    required: [true, 'Heart rate is required'],
    validate: {
      validator: validateHeartRate,
      message: 'Heart rate must be a number between 30-220'
    }
  },
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Record", recordSchema);
