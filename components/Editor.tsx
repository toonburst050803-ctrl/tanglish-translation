
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { transcribeMediaToTanglish } from '../services/gemini';
import { blobToBase64, parseSRT } from '../utils';
import { ConversionPreset } from '../types';

const Editor: React.FC = () => {
  const [output, setOutput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [needsKey, setNeedsKey] = useState(false);
  const [preset, setPreset] = useState<ConversionPreset>(ConversionPreset.NEUTRAL);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeBlockId, setActiveBlockId] = useState<number | null>(null);
  const [timingOffset, setTimingOffset] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const activeBlockRef = useRef<HTMLDivElement>(null);

  const parsedSubtitles = useMemo(() => {
    if (!output) return [];
    return parseSRT(output);
  }, [output]);

  useEffect(() => {
    const active = parsedSubtitles.find(
      (s: any) => currentTime >= (s.start + timingOffset) && currentTime <= (s.end + timingOffset)
    );
    if (active) {
      setActiveBlockId(active.id);
    } else {
      setActiveBlockId(null);
    }
  }, [currentTime, parsedSubtitles, timingOffset]);

  useEffect(() => {
    if (activeBlockId && activeBlockRef.current) {
      activeBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeBlockId]);

  const handleConvert = async () => {
    if (!mediaFile) return;

    setIsProcessing(true);
    setNeedsKey(false);
    try {
      const b64 = await blobToBase64(mediaFile);
      const result = await transcribeMediaToTanglish(b64, mediaFile.type, preset);
      setOutput(result);
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("403") || error.message?.includes("PERMISSION_DENIED")) {
        setNeedsKey(true);
      } else {
        alert("Processing failed. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setNeedsKey(false);
    handleConvert();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    alert("Copied to clipboard!");
  };

  const downloadSRT = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tanglish_subtitles.srt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setOutput('');
      setCurrentTime(0);
      setActiveBlockId(null);
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
      setMediaPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMediaFile(null);
    setCurrentTime(0);
    setActiveBlockId(null);
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaPreviewUrl(null);
    setOutput('');
  };

  const activeText = useMemo(() => {
    return parsedSubtitles.find((s: any) => s.id === activeBlockId)?.text || '';
  }, [activeBlockId, parsedSubtitles]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const PRESETS = [
    { value: ConversionPreset.NEUTRAL, label: 'Neutral', icon: '⚖️' },
    { value: ConversionPreset.CINEMA, label: 'Cinema', icon: '🎬' },
    { value: ConversionPreset.YOUTUBE, label: 'YouTube', icon: '🎥' },
    { value: ConversionPreset.FORMAL, label: 'Formal', icon: '👔' },
    { value: ConversionPreset.SLANG, label: 'Slang', icon: '🔥' },
  ];

  return (
    <div className="flex flex-col h-full gap-4 max-w-6xl mx-auto w-full">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <div className="px-5 py-2 text-indigo-600 font-bold flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            Media Intelligence Sync
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full xl:w-auto overflow-x-auto hide-scrollbar">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                preset === p.value 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{p.icon}</span>
              <span className="hidden sm:inline">{p.label}</span>
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Offset</label>
            <input 
              type="range" 
              min="-2" 
              max="2" 
              step="0.1" 
              value={timingOffset} 
              onChange={(e) => setTimingOffset(parseFloat(e.target.value))}
              className="w-24 accent-indigo-600"
            />
            <span className={`text-[10px] font-mono font-bold w-12 ${timingOffset === 0 ? 'text-slate-400' : 'text-indigo-600'}`}>
              {timingOffset > 0 ? '+' : ''}{timingOffset.toFixed(1)}s
            </span>
          </div>
        </div>
      </div>

      {needsKey && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v3m0-3h3m-3 0H9m12-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">Paid API Required</p>
              <p className="text-xs text-amber-700">Speech-to-text with timestamps requires a paid Gemini key.</p>
            </div>
          </div>
          <button 
            onClick={handleSelectKey}
            className="px-6 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition-colors shadow-lg shadow-amber-100"
          >
            Select Paid Key
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[500px]">
        <div className="flex flex-col h-full space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-600 tracking-wider uppercase">Media Input</h3>
            {mediaFile && (
              <button onClick={clearMedia} className="text-xs text-slate-400 hover:text-red-500">Change File</button>
            )}
          </div>
          
          <div 
            onClick={() => !mediaFile && fileInputRef.current?.click()}
            className={`flex-1 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center p-6 transition-all group relative overflow-hidden ${!mediaFile ? 'cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20' : ''}`}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="audio/*,video/mp4" />
            
            {!mediaFile ? (
              <div className="z-10 text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform mx-auto shadow-