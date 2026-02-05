
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils';

const LiveAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);

  const audioContextRef = useRef<{input: AudioContext, output: AudioContext} | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    for (const source of sourcesRef.current) {
      source.stop();
    }
    sourcesRef.current.clear();
    setIsActive(false);
  };

  const handleSelectKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setNeedsKey(false);
    setError(null);
  };

  const startSession = async () => {
    try {
      setError(null);
      setNeedsKey(false);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      if (!audioContextRef.current) {
        audioContextRef.current = {
          input: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }),
          output: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 })
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = audioContextRef.current!.input.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.input.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.input.destination);
            setIsActive(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcription
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              currentInputTranscription.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const userMsg = currentInputTranscription.current;
              const modelMsg = currentOutputTranscription.current;
              if (userMsg || modelMsg) {
                setTranscript(prev => [
                  ...prev, 
                  ...(userMsg ? [{role: 'user' as const, text: userMsg}] : []),
                  ...(modelMsg ? [{role: 'model' as const, text: modelMsg}] : [])
                ]);
              }
              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const outCtx = audioContextRef.current!.output;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outCtx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              for (const source of sourcesRef.current) {
                source.stop();
              }
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: any) => {
            console.error("Live API Error:", e);
            if (e.message?.includes("403") || e.message?.includes("PERMISSION_DENIED")) {
              setError("Permission Denied: This feature requires a paid API key.");
              setNeedsKey(true);
            } else {
              setError("Connection error. Check your API key or microphone.");
            }
            stopSession();
          },
          onclose: () => setIsActive(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'You are a helpful assistant for a Tamil subtitle editor. You can help users with translations, Tanglish tips, or general advice. Speak naturally and politely.',
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      if (err.message?.includes("403") || err.message?.includes("PERMISSION_DENIED")) {
        setError("Permission Denied: This feature requires a paid API key.");
        setNeedsKey(true);
      } else {
        setError(err.message || "Failed to start session.");
      }
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[70vh]">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
            <span className="font-semibold text-slate-700">Live Voice Assistant</span>
          </div>
          {isActive && (
            <button onClick={stopSession} className="text-red-600 font-medium hover:text-red-700 text-sm">
              Stop Session
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {needsKey && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col items-center text-center gap-3">
              <p className="text-sm font-semibold text-amber-900">Paid API Key Required</p>
              <p className="text-xs text-amber-700">The Live API requires a project with a billing account attached.</p>
              <button 
                onClick={handleSelectKey}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition-colors"
              >
                Select Valid Key
              </button>
            </div>
          )}

          {transcript.length === 0 && !isActive && !needsKey && (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                 </svg>
              </div>
              <p>Start a conversation to get help with your translations.</p>
            </div>
          )}
          
          {transcript.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-slate-100 text-slate-800 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isActive && (
            <div className="flex justify-start">
              <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-xs text-center border-t border-red-100">
            {error}
          </div>
        )}

        <div className="p-6 border-t border-slate-100 flex justify-center">
          {!isActive ? (
            <button
              onClick={startSession}
              disabled={needsKey}
              className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold shadow-lg transition-all hover:scale-105 ${
                needsKey ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Start Conversation
            </button>
          ) : (
             <div className="flex flex-col items-center gap-2">
               <div className="flex gap-1.5 h-8 items-end">
                 {[...Array(5)].map((_, i) => (
                   <div key={i} className={`w-1.5 bg-indigo-500 rounded-full animate-pulse`} style={{height: `${Math.random() * 100}%`}}></div>
                 ))}
               </div>
               <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Listening...</span>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAssistant;
