
import React, { useState } from 'react';
import { generateVeoVideo } from '../services/gemini';
import { blobToBase64 } from '../utils';
import { VideoGenConfig } from '../types';

const VideoGenerator: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBytes, setImageBytes] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [config, setConfig] = useState<VideoGenConfig>({
    aspectRatio: '16:9',
    resolution: '720p'
  });
  const [status, setStatus] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    const b64 = await blobToBase64(file);
    setImageBytes(b64);
  };

  const handleGenerate = async () => {
    if (!imageBytes) return;

    try {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }

      setIsGenerating(true);
      setStatus("Starting generation...");
      setGeneratedVideo(null);
      
      const videoUrl = await generateVeoVideo(imageBytes, prompt, config, (s) => setStatus(s));
      setGeneratedVideo(videoUrl);
      setStatus("Completed!");
    } catch (err: any) {
      console.error(err);
      const isPermissionError = err.message?.includes("403") || err.message?.includes("PERMISSION_DENIED");
      const isNotFoundError = err.message?.includes("Requested entity was not found");
      
      if (isPermissionError || isNotFoundError) {
        alert("This model requires a paid API key from a project with billing enabled. Please re-select a valid key.");
        // @ts-ignore
        await window.aistudio.openSelectKey();
      } else {
        alert("Generation failed: " + err.message);
      }
    } finally {
      setIsGenerating(false);
      setStatus(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Animate Images with Veo
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-600">UPLOAD IMAGE</label>
              <div className="relative border-2 border-dashed border-slate-200 rounded-xl aspect-square flex items-center justify-center hover:bg-slate-50 transition-colors group cursor-pointer overflow-hidden">
                {selectedImage ? (
                  <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className="text-slate-500 font-medium">Click to upload photo</p>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-600 block mb-2">ANIMATION PROMPT (OPTIONAL)</label>
                <textarea
                  className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  rows={3}
                  placeholder="Describe the movement (e.g. 'A gentle breeze blowing through hair')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-2">ASPECT RATIO</label>
                  <select 
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white"
                    value={config.aspectRatio}
                    onChange={(e) => setConfig({...config, aspectRatio: e.target.value as any})}
                  >
                    <option value="16:9">16:9 Landscape</option>
                    <option value="9:16">9:16 Portrait</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-2">RESOLUTION</label>
                  <select 
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white"
                    value={config.resolution}
                    onChange={(e) => setConfig({...config, resolution: e.target.value as any})}
                  >
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center bg-slate-50 rounded-xl p-6 border border-slate-100 min-h-[300px]">
            {isGenerating ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="font-semibold text-indigo-600">{status}</p>
                <p className="text-xs text-slate-400 max-w-[200px] mx-auto">Please do not close this tab while we work our magic.</p>
              </div>
            ) : generatedVideo ? (
              <div className="w-full space-y-4">
                <video src={generatedVideo} controls className="w-full rounded-lg shadow-lg border border-white" />
                <a href={generatedVideo} download="generated-video.mp4" className="block text-center w-full py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900">
                  Download MP4
                </a>
              </div>
            ) : (
              <div className="text-center text-slate-400">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                <p>Generated video preview will appear here</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !imageBytes}
            className={`px-12 py-4 rounded-full font-bold text-lg shadow-xl transition-all transform hover:scale-105 active:scale-95 ${
              isGenerating || !imageBytes ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
            }`}
          >
            {isGenerating ? 'Generating...' : 'Generate AI Animation'}
          </button>
        </div>
      </div>

      <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex items-start gap-4">
        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
        </div>
        <div>
          <h4 className="font-bold text-indigo-900">About Veo API Generation</h4>
          <p className="text-sm text-indigo-800 mt-1 leading-relaxed">
            Generating high-quality video is computationally expensive. If you encounter errors, please ensure you have selected a valid paid Google Cloud billing project in the API selection dialog. Check your usage limits at <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline font-medium">ai.google.dev/gemini-api/docs/billing</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;
