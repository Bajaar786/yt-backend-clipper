import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { promisify } from "util";
import path from "path";
import fs from "fs";
const execAsync = promisify(exec);

export const downloadSegment = async (url, start, end) => {
  try {
    const output = path.join("temp", `${uuidv4()}.mp4`);
    
    console.log('🎬 Creating clip:', { start, end, output });

    // Use yt-dlp with external downloader to handle timing properly
    const cmd = `yt-dlp -f "best[height<=720]" -o "${output}" --external-downloader ffmpeg --external-downloader-args "ffmpeg_i:-ss ${start} -to ${end}" "${url}"`;

    await execAsync(cmd);
    
    console.log('✅ Clip created:', output);
    return output;
    
  } catch (error) {
    console.error('❌ Clip error:', error);
    throw error;
  }
};


// Add this to your existing youtube.js

// Social Media Format Converter
export const convertToSocialFormat = async (inputVideoPath, platform) => {
  try {
    const output = path.join("temp", `${uuidv4()}_${platform}.mp4`);
    
    console.log(`📱 Converting to ${platform} format...`);
    console.log(`📥 Input: ${inputVideoPath}`);
    console.log(`📤 Output: ${output}`);

    const platformSpecs = {
      'tiktok': {
        dimensions: '1080x1920',
        videoFilter: 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
        maxDuration: 60,
        description: 'TikTok/Reels (Vertical 9:16)'
      },
      'instagram-reel': {
        dimensions: '1080x1920', 
        videoFilter: 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
        maxDuration: 90,
        description: 'Instagram Reels (Vertical 9:16)'
      },
      'instagram-square': {
        dimensions: '1080x1080',
        videoFilter: 'scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:black',
        maxDuration: 60,
        description: 'Instagram Square (1:1)'
      },
      'twitter': {
        dimensions: '1280x720',
        videoFilter: 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black',
        maxDuration: 140,
        description: 'Twitter/X (Landscape 16:9)'
      },
      'youtube-short': {
        dimensions: '1080x1920',
        videoFilter: 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
        maxDuration: 60,
        description: 'YouTube Shorts (Vertical 9:16)'
      }
    };

    const spec = platformSpecs[platform];
    if (!spec) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Get video duration to check if we need to trim
    const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputVideoPath}"`;
    const { stdout: durationStr } = await execAsync(durationCmd);
    const duration = parseFloat(durationStr);
    
    console.log(`⏰ Video duration: ${duration.toFixed(2)} seconds`);
    console.log(`📏 Platform max duration: ${spec.maxDuration} seconds`);

    let cmd = `ffmpeg -i "${inputVideoPath}" -vf "${spec.videoFilter}" -c:a aac -b:a 192k`;

    // Trim if video is longer than platform allows
    if (duration > spec.maxDuration) {
      console.log(`✂️ Trimming to ${spec.maxDuration} seconds for ${platform}`);
      cmd += ` -t ${spec.maxDuration}`;
    }

    // Optimize for web/mobile
    cmd += ` -movflags +faststart "${output}" -y`;

    console.log(`🔄 Running conversion: ${cmd}`);
    await execAsync(cmd);

    console.log(`✅ Successfully converted to ${platform} format: ${output}`);
    return {
      filePath: output,
      platform: platform,
      dimensions: spec.dimensions,
      description: spec.description
    };

  } catch (error) {
    console.error(`❌ Conversion to ${platform} failed:`, error);
    throw error;
  }
};

// Helper function to get available social media formats
export const getAvailableSocialFormats = () => {
  return [
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
};

// Audio Extraction Function
export const extractAudio = async (url, start, end) => {
  try {
    const output = path.join("temp", `${uuidv4()}.mp3`);
    
    console.log('🎵 Extracting audio:', { start, end });
    console.log('📁 Output path:', output);

    // Method 1: Download video segment and extract audio
    const tempVideo = path.join("temp", `${uuidv4()}_temp.mp4`);
    
    // Download the video segment first
    const videoCmd = `yt-dlp -f "best[height<=720]" -o "${tempVideo}" --external-downloader ffmpeg --external-downloader-args "ffmpeg_i:-ss ${start} -to ${end}" "${url}"`;
    await execAsync(videoCmd);

    // Extract audio from the video segment
    console.log('🔊 Extracting audio from video...');
    const audioCmd = `ffmpeg -i "${tempVideo}" -q:a 0 -map a "${output}" -y`;
    await execAsync(audioCmd);

    // Cleanup temp video file
    if (fs.existsSync(tempVideo)) {
      fs.unlinkSync(tempVideo);
    }

    console.log('✅ Audio extracted successfully:', output);
    return output;

  } catch (error) {
    console.error('❌ Audio extraction error:', error);
    
    // Cleanup on error
    try {
      if (tempVideo && fs.existsSync(tempVideo)) {
        fs.unlinkSync(tempVideo);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    throw error;
  }
};