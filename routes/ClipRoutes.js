import path from "path";
import express from "express";
import fs from "fs";
import { downloadSegment } from "../utils/youtube.js";

const router = express.Router();

// Set this to true to keep files for debugging
const KEEP_FILES = true; // Change to false in production

// Helper function for file cleanup
function cleanupFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        console.error('❌ Error deleting temp file:', unlinkErr);
      } else {
        console.log('🧹 Temp file cleaned up:', filePath);
      }
    });
  }
}

// 🎬 POST /api/clip
router.post("/", async (req, res) => {
  req.setTimeout(30 * 60 * 1000);
  res.setTimeout(30 * 60 * 1000);

  let outputPath;
  
  try {
    const { link, start, end } = req.body;
    
    console.log('📥 Received clip request:', { link, start, end });
    
    if (!link || !start || !end) {
      return res.status(400).json({ 
        error: "Missing required parameters"
      });
    }

    console.log('⏳ Starting video download and processing...');
    outputPath = await downloadSegment(link, start, end);
    console.log('✅ Clip created successfully:', outputPath);

    // Check if file exists
    if (!fs.existsSync(outputPath)) {
      throw new Error('Output file was not created');
    }

    const fileStats = fs.statSync(outputPath);
    console.log(`📁 File size: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`);

    // RETURN JSON INSTEAD OF THE VIDEO FILE
    res.json({ 
      success: true,
      filePath: outputPath,
      fileSize: `${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`,
      message: "Clip created successfully"
    });

  } catch (err) {
    console.error("❌ Clip route error:", err);
    if (outputPath && !KEEP_FILES) {
      cleanupFile(outputPath);
    }
    res.status(500).json({ 
      error: "Failed to create clip",
      details: err.message 
    });
  }
});

// New route to list temp files (for debugging)
router.get("/temp-files", (req, res) => {
  try {
    const tempDir = "./temp";
    if (!fs.existsSync(tempDir)) {
      return res.json({ files: [], message: "Temp directory doesn't exist" });
    }
    
    const files = fs.readdirSync(tempDir);
    const fileStats = files.map(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: (stats.size / (1024 * 1024)).toFixed(2) + " MB",
        created: stats.birthtime
      };
    });
    
    res.json({ files: fileStats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/clip/download - Download any file
router.get("/download", (req, res) => {
  try {
    const filePath = req.query.file;
    if (!filePath) {
      return res.status(400).json({ error: "File parameter required" });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.download(filePath);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Download failed" });
  }
});

export default router;
