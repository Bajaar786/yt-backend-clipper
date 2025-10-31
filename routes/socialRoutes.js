import express from "express";
import { convertToSocialFormat } from "../utils/youtube.js"; // Make sure this function exists

const router = express.Router();

// GET /api/social/formats
router.get("/formats", (req, res) => {
  const formats = [
    {
      id: 'tiktok',
      name: 'TikTok',
      description: 'Vertical 9:16 (1080x1920) - Max 60s',
      icon: '📱'
    },
    {
      id: 'instagram-reel', 
      name: 'Instagram Reels',
      description: 'Vertical 9:16 (1080x1920) - Max 90s',
      icon: '🎬'
    },
    {
      id: 'instagram-square',
      name: 'Instagram Square', 
      description: 'Square 1:1 (1080x1080) - Max 60s',
      icon: '📸'
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      description: 'Landscape 16:9 (1280x720) - Max 140s',
      icon: '🐦'
    },
    {
      id: 'youtube-short',
      name: 'YouTube Shorts',
      description: 'Vertical 9:16 (1080x1920) - Max 60s',
      icon: '▶️'
    }
  ];
  
  res.json({ formats });
});

// POST /api/social/convert - ACTUALLY CONVERT THE VIDEO
router.post("/convert", async (req, res) => {
  try {
    const { videoPath, platform } = req.body;
    
    if (!videoPath || !platform) {
      return res.status(400).json({ 
        error: "Missing videoPath or platform" 
      });
    }

    console.log(`📱 Converting to ${platform}:`, videoPath);
    
    // ACTUALLY CONVERT THE VIDEO
    const result = await convertToSocialFormat(videoPath, platform);
    
    res.json({
      success: true,
      convertedFile: result.filePath, // Real converted file path
      platform: result.platform,
      dimensions: result.dimensions,
      description: 'Video converted for social media'
    });

  } catch (error) {
    console.error("❌ Social conversion error:", error);
    res.status(500).json({ 
      error: "Failed to convert to social format",
      details: error.message 
    });
  }
});

export default router;