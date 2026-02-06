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
  const file = req.files.file;
  const s3Key = `${uuidv4()}-${file.name}`;
  const upload = await s3
    .upload({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
      Body: file.data,
      ContentType: file.mimetype,
    })
    .promise();

  const newFile = await File.create({
    userId: req.user.userId,
    fileName: file.name,
    s3Key,
    fileUrl: upload.Location,
  });

  res.json({ message: "File uploaded", file: newFile });
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
