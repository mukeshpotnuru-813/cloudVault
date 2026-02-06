const express = require("express");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const File = require("../models/File");
const auth = require("../middleware/authMiddleware");
const router = express.Router();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

router.post("/upload", auth, async (req, res) => {
  try {
    // Validate file exists
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.file;
    
    // Validate file size (additional check)
    if (file.size > 50 * 1024 * 1024) { // 50MB
      return res.status(400).json({ error: "File too large. Maximum size is 50MB" });
    }

    // Validate file type (basic check)
    const allowedTypes = ['image/', 'application/pdf', 'text/', 'application/msword', 'application/vnd.openxmlformats'];
    const isValidType = allowedTypes.some(type => file.mimetype.startsWith(type));
    if (!isValidType) {
      return res.status(400).json({ error: "File type not allowed" });
    }

    const s3Key = `${uuidv4()}-${file.name}`;
    
    // Upload directly to S3 using file buffer
    const upload = await s3
      .upload({
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
        Body: file.data, // This is the file buffer in memory
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256' // Add encryption
      })
      .promise();

    // Save file record to database
    const newFile = await File.create({
      userId: req.user.userId,
      fileName: file.name,
      s3Key,
      fileUrl: upload.Location,
    });

    res.json({ message: "File uploaded successfully", file: newFile });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

router.get("/my", auth, async (req, res) => {
  const files = await File.find({ userId: req.user.userId }).sort({
    createdAt: -1,
  });
  res.json(files);
});

router.delete("/:fileId", auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findOne({ _id: fileId, userId: req.user.userId });
    
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Delete from S3
    await s3
      .deleteObject({
        Bucket: process.env.S3_BUCKET,
        Key: file.s3Key,
      })
      .promise();

    // Delete from database
    await File.findByIdAndDelete(fileId);

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

module.exports = router;
