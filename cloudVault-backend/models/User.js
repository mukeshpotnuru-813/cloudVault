/* START OF FILE models/User.js */

const mongoose = require("mongoose");

// Email validation function
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
    match: [/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces']
  },
  email: { 
    type: String, 
    unique: true, 
    required: [true, 'Email is required'],
    lowercase: true,
    validate: {
      validator: validateEmail,
      message: 'Please provide a valid email address'
    }
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },
  role: { 
    type: String, 
    enum: {
      values: ["patient", "doctor"], 
      message: 'Role must be either patient or doctor'
    }, 
    default: "patient" 
  },
  specialty: {
    type: String,
    required: function () {
      return this.role === "doctor";
    },
    minlength: [2, 'Specialty must be at least 2 characters'],
    maxlength: [100, 'Specialty cannot exceed 100 characters']
  },
  // New fields for consultations
  consultedDoctors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // For patients: doctors they are consulting
  consultedPatients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // For doctors: patients they are consulting
  pendingConsultations: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // For doctors: patients who requested consultation
});
module.exports = mongoose.model("User", userSchema);

/* END OF FILE models/User.js */
