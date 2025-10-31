import express from "express";
import { extractAudio } from "../utils/youtube.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// 🎵 POST /api/audio/extract
router.post("/extract", async (req, res) => {
  req.setTimeout(30 * 60 * 1000);
  res.setTimeout(30 * 60 * 1000);

  try {
    const { link, start, end } = req.body;
    
    console.log('🎵 Received audio extraction request:', { link, start, end });
    
    if (!link || !start || !end) {
      return res.status(400).json({ 
        error: "Missing required parameters: link, start, end"
      });
    }

    console.log('⏳ Extracting audio segment...');
    const outputPath = await extractAudio(link, start, end);
    console.log('✅ Audio extracted successfully:', outputPath);

    // Check if file exists
    if (!fs.existsSync(outputPath)) {
      throw new Error('Audio file was not created');
    }

    const fileStats = fs.statSync(outputPath);
    console.log(`📁 Audio file size: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`);

    // Return JSON with file path
    res.json({ 
      success: true,
      filePath: outputPath,
      fileSize: `${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`,
      duration: `${start} to ${end}`,
      message: "Audio extracted successfully"
    });

  } catch (err) {
    console.error("❌ Audio extraction error:", err);
    res.status(500).json({ 
      error: "Failed to extract audio",
      details: err.message 
    });
  }
});

export default router;