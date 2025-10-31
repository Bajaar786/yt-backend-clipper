import 'dotenv/config';
import OpenAI from "openai";
import express from "express";
import cors from "cors";
import clipRoutes from "./routes/ClipRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import socialRoutes from './routes/socialRoutes.js';
import audioRoutes from './routes/audioRoutes.js';
import { getTranscriptText, summarizeTranscriptMultilingual } from './utils/summary.js';

const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✅ CORS configuration that works with Chrome extensions
app.use(cors({
  origin: true, // Reflect the request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Explicitly handle preflight requests
app.options('*', cors());

app.use(express.json());

// ✅ Debug middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    headers: req.headers.origin
  });
  next();
}); // ✅ ← this was missing!

// ✅ Your routes
app.use("/api/clip", clipRoutes);
app.use("/api/ai", aiRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/audio', audioRoutes);

// ✅ Your summarize endpoint
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
