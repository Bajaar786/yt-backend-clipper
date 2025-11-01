import express from "express";
import cors from "cors";
import 'dotenv/config'; // optional, only for local dev
import OpenAI from "openai";
import clipRoutes from "./routes/ClipRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import socialRoutes from './routes/socialRoutes.js';
import audioRoutes from './routes/audioRoutes.js';
import { getTranscriptText, summarizeTranscriptMultilingual } from './utils/summary.js';

const app = express();

// ✅ Make sure the key comes from environment variable
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is not set. Cloud Run deployment will fail!");
  process.exit(1); // fail fast
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// CORS for Chrome extension
app.use(cors({ origin: true, credentials: true }));
app.options('*', cors());

app.use(express.json());

// Debug logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    headers: req.headers.origin
  });
  next();
});

// Routes
app.use("/api/clip", clipRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/audio", audioRoutes);

app.post("/summarize", async (req, res) => {
  try {
    const { url, language } = req.body;
    if (!url) return res.status(400).json({ error: "YouTube URL is required" });

    const transcript = await getTranscriptText(url, language || "en");
    const summary = await summarizeTranscriptMultilingual(transcript, language || "en", url);

    res.json({ success: true, summary });
  } catch (err) {
    console.error("❌ /summarize error:", err.message);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

// Listen on Cloud Run port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
