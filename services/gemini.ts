
import { GoogleGenAI } from "@google/genai";
import { ConversionPreset, VideoGenConfig } from "../types";

// Transcribe Tamil media audio to Tanglish subtitles using Gemini 3 Flash
export const transcribeMediaToTanglish = async (
  base64Data: string, 
  mimeType: string,
  preset: ConversionPreset = ConversionPreset.NEUTRAL
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: `You are an elite Tamil-to-Tanglish subtitle engineer.
          
Task:
1. Listen to the audio in the provided media.
2. Generate highly accurate timestamps for every spoken sentence.
3. Transcribe the Tamil speech and immediately convert it to natural Tanglish following this style: ${preset.toUpperCase()}.
4. Output the result in a STRICT SRT FORMAT with precise timestamps.

Style Guidelines:
${preset === ConversionPreset.CINEMA ? '- Use natural spoken cinematic Tanglish' : 
  preset === ConversionPreset.YOUTUBE ? '- Use casual, friendly, conversational Tanglish' :
  preset === ConversionPreset.FORMAL ? '- Use formal, respectful Tanglish, avoiding slang' :
  preset === ConversionPreset.SLANG ? '- Use slang-heavy, youth street-style Tanglish' :
  '- Use clean, neutral Tanglish suitable for general subtitles'}

The timestamps are CRITICAL. Every subtitle block MUST have a valid time range (00:00:00,000 --> 00:00:00,000).`
        }
      ]
    },
    config: {
      temperature: 0.1,
    }
  });
  return response.text || '';
};

// Generate AI videos using the Veo model with polling and status updates
export const generateVeoVideo = async (
  imageBytes: string,
  prompt: string,
  config: VideoGenConfig,
  onStatusUpdate: (status: string) => void
): Promise<string> => {
  // Always create a new GoogleGenAI instance right before the call to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  onStatusUpdate("Initializing video generation...");
  
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt || 'Animate this image in a cinematic way with fluid movement',
    image: {
      imageBytes: imageBytes,
      mimeType: 'image/png',
    },
    config: {
      numberOfVideos: 1,
      resolution: config.resolution,
      aspectRatio: config.aspectRatio
    }
  });

  onStatusUpdate("Generating video frames (this may take a few minutes)...");

  while (!operation.done) {
    // Provide reassuring updates to the user during long processing times
    await new Promise(resolve => setTimeout(resolve, 10000));
    onStatusUpdate("Still processing... applying neural motion features...");
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error("Failed to retrieve generated video link.");
  }

  onStatusUpdate("Downloading your video...");
  // The response body contains the MP4 bytes. Must append API key when fetching.
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  if (!response.ok) {
    throw new Error(`Video download failed with status: ${response.status}`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
