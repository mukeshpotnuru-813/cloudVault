const fs = require('fs');
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
    
    console.log(`Uploading file: ${file.name}, Size: ${file.size}, Temp path: ${file.tempFilePath}`);
    
    // Read file from temp path for reliable binary handling
    const fileStream = fs.createReadStream(file.tempFilePath);
    
    // Upload to S3 using file stream
    const upload = await s3
      .upload({
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
        Body: fileStream,
        ContentType: file.mimetype,
        ContentDisposition: `attachment; filename="${file.name}"`,
        CacheControl: 'no-cache'
      })
      .promise();
      
    // Temp file is automatically deleted by express-fileupload

    // Save file record to database (no direct URL stored)
    const newFile = await File.create({
      userId: req.user.userId,
      fileName: file.name,
      s3Key,
      fileSize: file.size,
      mimeType: file.mimetype
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

router.get("/download/:fileId", auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log(`Download request for file ID: ${fileId}, User ID: ${req.user.userId}`);
    
    const file = await File.findOne({ _id: fileId, userId: req.user.userId });
    
    if (!file) {
      console.log(`File not found: ${fileId} for user: ${req.user.userId}`);
      return res.status(404).json({ error: "File not found" });
    }

    console.log(`File found: ${file.fileName}, S3 Key: ${file.s3Key}`);

    // Generate pre-signed URL (expires in 1 hour)
    console.log(`Generating signed URL for file: ${file.fileName}, S3 Key: ${file.s3Key}, Bucket: ${process.env.S3_BUCKET}`);
    
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.S3_BUCKET,
      Key: file.s3Key,
      Expires: 3600 // 1 hour
      // Let S3 use original Content-Type from upload
    });

    console.log(`Generated signed URL: ${signedUrl.substring(0, 100)}...`);

    res.json({ 
      downloadUrl: signedUrl,
      fileName: file.fileName,
      expiresIn: 3600
    });
  } catch (error) {
    console.error("Download URL generation error:", error);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
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
