import express from "express";
import { getTranscriptText, getTranscriptTimestamps } from "../utils/transcript.js";
import { 
  quickVideoSummary,
  summarizeTranscriptMultilingual, 
  convertSummaryToTXT,
  getSupportedLanguages 
} from "../utils/summary.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// GET /api/ai/languages
router.get("/languages", (req, res) => {
  try {
    const languages = getSupportedLanguages();
    res.json({ languages });
  } catch (error) {
    console.error("❌ Languages error:", error);
    res.status(500).json({ error: "Failed to get languages" });
  }
});

// POST /api/ai/summary-multilingual
router.post("/summary-multilingual", async (req, res) => {
  req.setTimeout(2 * 60 * 1000);
  res.setTimeout(2 * 60 * 1000);

  try {
    const { url, language = 'en' } = req.body;
    
    if (!url) return res.status(400).json({ error: "Missing YouTube URL" });

    console.log(`🌍 Generating ${language} summary for:`, url);

    const transcriptText = await getTranscriptText(url, language);
    const summary = await summarizeTranscriptMultilingual(transcriptText, language, url);
    
    const txtContent = convertSummaryToTXT(summary, language);
    const txtFilename = `summary_${Date.now()}_${language}.txt`;
    const txtPath = path.join("temp", txtFilename);
    fs.writeFileSync(txtPath, txtContent);

    res.json({ 
      summary,
      txtFile: txtPath,
      language,
      transcriptLength: transcriptText?.length || 0
    });

  } catch (err) {
    console.error("❌ Multilingual summary error:", err);
    res.status(500).json({ 
      error: "Failed to generate multilingual summary",
      details: err.message 
    });
  }
});

// POST /api/ai/summary (defaults to English but can accept other languages)
router.post("/summary", async (req, res) => {
  req.setTimeout(2 * 60 * 1000);
  res.setTimeout(2 * 60 * 1000);

  try {
    const { url, language = 'en' } = req.body;
    if (!url) return res.status(400).json({ error: "Missing YouTube URL" });

    console.log(`⏱️ Starting summary for ${url} in ${language}...`);

    let transcriptText;
    try {
      transcriptText = await getTranscriptText(url, language);
      console.log('📝 Transcript length:', transcriptText?.length || 0);
    } catch (transcriptError) {
      console.log('❌ Transcript failed, using quick summary:', transcriptError.message);
      const quickSummary = await quickVideoSummary(url);
      return res.json({ 
        summary: quickSummary,
        note: "Based on video metadata (transcript unavailable)",
        source: "metadata"
      });
    }

    if (!transcriptText || transcriptText.length < 100 || transcriptText.includes('blocking us') || transcriptText.includes("We're sorry")) {
      console.log('⚠️ Poor transcript quality, using metadata fallback');
      const quickSummary = await quickVideoSummary(url);
      return res.json({ 
        summary: quickSummary,
        note: "Limited transcript available, using metadata fallback",
        source: "metadata_fallback",
        transcriptPreview: transcriptText?.substring(0, 200)
      });
    }

    // ✅ Use multilingual summary for requested language
    const summary = await summarizeTranscriptMultilingual(transcriptText, language, url);

    res.json({ 
      summary,
      source: "transcript",
      language,
      transcriptLength: transcriptText.length
    });

  } catch (err) {
    console.error("❌ Summary error:", err);
    res.status(500).json({ 
      error: "Failed to generate summary",
      details: err.message,
      suggestion: "Try a video with available captions or check the URL"
    });
  }
});

// POST /api/ai/auto-timestamps
router.post("/auto-timestamps", async (req, res) => {
  req.setTimeout(30 * 1000);
  res.setTimeout(30 * 1000);

  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "Missing YouTube URL" });

    console.log('⏰ Getting auto timestamps for:', url);
    const timestamps = await getTranscriptTimestamps(url);

    res.json({ 
      highlights: [timestamps],
      note: "Based on transcript analysis",
      start: timestamps.start,
      end: timestamps.end
    });

  } catch (err) {
    console.error("❌ Auto timestamp error:", err);
    const defaultTimestamps = { start: "00:01:00", end: "00:02:00" };
    res.json({
      highlights: [defaultTimestamps],
      note: "Using default timestamps (analysis failed)",
      start: defaultTimestamps.start,
      end: defaultTimestamps.end,
      error: err.message
    });
  }
});

// GET /api/ai/health
router.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    service: "AI Routes",
    timestamp: new Date().toISOString(),
    endpoints: [
      "POST /api/ai/summary",
      "POST /api/ai/summary-multilingual",
      "POST /api/ai/auto-timestamps"
    ]
  });
});

// POST /api/ai/debug-transcript
router.post("/debug-transcript", async (req, res) => {
  try {
    const { url, language = "en" } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    console.log('🔍 Debug transcript for:', url);
    const transcript = await getTranscriptText(url, language);

    res.json({
      success: true,
      transcriptLength: transcript.length,
      first500Chars: transcript.substring(0, 500),
      hasBlockingMessage: transcript.includes('blocking us') || transcript.includes("We're sorry"),
      fullTranscript: transcript.length > 1000 ? transcript.substring(0, 1000) + "..." : transcript
    });

  } catch (error) {
    res.status(500).json({ 
      error: "Failed to get transcript",
      details: error.message 
    });
  }
});

export default router;
