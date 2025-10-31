import 'dotenv/config';
import express from "express";
import cors from "cors";
import clipRoutes from "./routes/ClipRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import socialRoutes from './routes/socialRoutes.js';
import audioRoutes from './routes/audioRoutes.js';
import { getTranscriptText, summarizeTranscriptMultilingual } from './utils/summary.js';


const app = express();

// ✅ Allow requests from Chrome Extension and localhost
app.use(cors({
  origin: ["chrome-extension://*", "http://localhost:5000"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
app.use("/api/clip", clipRoutes);
app.use("/api/ai", aiRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/audio', audioRoutes);
// POST /summarize endpoint
app.post("/summarize", async (req, res) => {
  try {
    const { url, language } = req.body;
    if (!url) return res.status(400).json({ error: "YouTube URL is required" });
    
    // Step 1: Get transcript
    const transcript = await getTranscriptText(url, language || "en");

    // Step 2: Summarize transcript
    const summary = await summarizeTranscriptMultilingual(transcript, language || "en", url);

    res.json({ success: true, summary });
  } catch (err) {
    console.error("❌ /summarize error:", err.message);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

// Add this to your server.js for debugging
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  
  res.json({ routes });
});
// ✅ Auto-timestamp (if you made this route)
app.post("/api/ai/auto-timestamp", (req, res) => {
  res.json({ start: "00:00:10", end: "00:00:30" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
