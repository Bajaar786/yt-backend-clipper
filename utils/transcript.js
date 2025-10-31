import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";
import { YoutubeTranscript } from "youtube-transcript";

const execAsync = promisify(exec);

export const getTranscriptText = async (url) => {
  try {
    const videoId = extractVideoId(url);
    if (!videoId) throw new Error("Invalid YouTube URL");

    console.log("🎯 Fast transcript fetch for video:", videoId);

    // --- Method 1: yt-dlp Auto-Subtitles (Android impersonation) ---
    try {
      const transcript = await getQuickTranscript(videoId);
      if (transcript && transcript.length > 200) {
        console.log("✅ Got transcript via yt-dlp auto-subtitles");
        return transcript;
      }
    } catch (error) {
      console.log("⚠️ yt-dlp subtitles failed:", error.message);
    }

    // --- Method 2: YoutubeTranscript Fallback ---
    try {
      console.log("🧠 Trying YoutubeTranscript fallback...");
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: "en",
      });
      const combined = transcriptItems.map((i) => i.text).join(" ");
      if (combined.length > 100) {
        console.log("✅ Got transcript via YoutubeTranscript package");
        return combined;
      }
    } catch (error) {
      console.log("⚠️ YoutubeTranscript fallback failed:", error.message);
    }

    // --- Method 3: Video Info Description Fallback ---
    try {
      console.log("🔎 Fetching video info fallback...");
      const videoInfo = await getVideoInfoQuick(videoId);
      if (videoInfo && videoInfo.length > 50) {
        console.log("✅ Got transcript from video description/title");
        return videoInfo;
      }
    } catch (error) {
      console.log("⚠️ Video info fallback failed:", error.message);
    }

    throw new Error("No transcript available");
  } catch (error) {
    console.error("❌ Transcript error:", error.message);
    throw error;
  }
};

// ==========================================================
// 🧩 METHOD 1: yt-dlp Auto-Subtitles (Android impersonation)
// ==========================================================
async function getQuickTranscript(videoId) {
  const url = `https://youtu.be/${videoId}`;

  const cmd = `yt-dlp --skip-download --write-auto-sub --sub-lang en \
  --extractor-args "youtube:player_client=android" \
  --add-header "User-Agent: Mozilla/5.0 (Linux; Android 10; SM-G975F)" \
  --add-header "Accept-Language: en-US,en;q=0.9" \
  "${url}"`;

  try {
    await execAsync(cmd, {
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const { stdout: videoInfo } = await execAsync(
      `yt-dlp --skip-download --print-json "${url}"`,
      { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
    );

    const info = JSON.parse(videoInfo);

    if (info.automatic_captions?.en?.[0]?.url) {
      const subtitleUrl = info.automatic_captions.en[0].url;
      const response = await axios.get(subtitleUrl, { timeout: 15000 });
      return parseSubtitles(response.data);
    }

    // If no captions found, fallback to description/title
    if (info.description || info.title) {
      return `${info.title || ""}\n\n${info.description || ""}`;
    }

    throw new Error("No auto-captions available");
  } catch (error) {
    console.log("⚠️ yt-dlp failed, trying info JSON fallback:", error.message);

    // Backup: try fetching info.json if subtitles fail
    try {
      const { stdout: infoJson } = await execAsync(
        `yt-dlp --skip-download --write-info-json "${url}"`,
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
      );
      const info = JSON.parse(infoJson);
      return `${info.title || ""}\n\n${info.description || ""}`;
    } catch {
      throw new Error("yt-dlp and info.json methods failed");
    }
  }
}

// ==========================================================
// 🧩 Subtitle Parser
// ==========================================================
function parseSubtitles(subtitleData) {
  if (typeof subtitleData !== "string") subtitleData = String(subtitleData);

  if (subtitleData.includes("WEBVTT") || subtitleData.includes("Kind: captions")) {
    return subtitleData
      .split("\n")
      .filter(
        (line) =>
          !line.includes("-->") &&
          !line.includes("WEBVTT") &&
          line.trim().length > 0
      )
      .join(" ");
  }

  return subtitleData.replace(/<[^>]*>/g, "").replace(/\n/g, " ");
}

// ==========================================================
// 🧩 METHOD 3: Video Description Fallback
// ==========================================================
async function getVideoInfoQuick(videoId) {
  const url = `https://youtu.be/${videoId}`;
  const { stdout } = await execAsync(
    `yt-dlp --skip-download --print-json "${url}"`,
    { timeout: 20000, maxBuffer: 10 * 1024 * 1024 }
  );

  const info = JSON.parse(stdout);
  let transcript = "";

  if (info.title) transcript += `🎥 Title: ${info.title}\n\n`;
  if (info.description) transcript += `📝 Description:\n${info.description}\n\n`;
  if (info.tags?.length) transcript += `🏷️ Tags: ${info.tags.join(", ")}\n\n`;
  if (info.categories?.length)
    transcript += `📂 Categories: ${info.categories.join(", ")}\n`;

  return transcript || "No video information available";
}

// ==========================================================
// 🧩 Extract Video ID
// ==========================================================
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]+)/,
    /youtube\.com\/embed\/([^&?\s]+)/,
    /youtube\.com\/v\/([^&?\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

// ==========================================================
// 🧩 Dummy Timestamp Generator (optional)
// ==========================================================
export const getTranscriptTimestamps = async () => {
  return { start: "00:01:00", end: "00:02:00" };
};
