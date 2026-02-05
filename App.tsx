
import React, { useState } from 'react';
import Editor from './components/Editor';
import LiveAssistant from './components/LiveAssistant';
import VideoGenerator from './components/VideoGenerator';
import { AppView } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.EDITOR);

  const NavItem = ({ target, icon, label }: { target: AppView, icon: React.ReactNode, label: string }) => (
    <button
      onClick={() => setView(target)}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
        view === target 
        ? 'bg-indigo-600 text-white shadow-md' 
        : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="py-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">
            Tanglish<span className="text-indigo-600">Sync</span> <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-md ml-1 uppercase">V2</span>
          </h1>
        </div>

        <nav className="flex items-center bg-white/50 backdrop-blur p-1 rounded-full border border-slate-200 shadow-sm">
          <NavItem 
            target={AppView.EDITOR} 
            label="Media Sync" 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg>} 
          />
          <NavItem 
            target={AppView.VIDEO_GEN} 
            label="Animate" 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg>} 
          />
          <NavItem 
            target={AppView.LIVE_CHAT} 
            label="AI Assistant" 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg>} 
          />
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-4 mb-10">
        {view === AppView.EDITOR && <Editor />}
        {view === AppView.LIVE_CHAT && <LiveAssistant />}
        {view === AppView.VIDEO_GEN && <VideoGenerator />}
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">
        &copy; {new Date().getFullYear()} Tanglish Sync Pro. Built with Gemini 2.5.
      </footer>
    </div>
  );
};

export default App;
