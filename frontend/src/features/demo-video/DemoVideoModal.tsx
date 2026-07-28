import React, { useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Sparkles, CheckCircle2 } from 'lucide-react';

interface DemoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoVideoModal: React.FC<DemoVideoModalProps> = ({ isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);

  if (!isOpen) return null;

  const chapters = [
    { title: '01. AI Engine Overview', duration: '0:45' },
    { title: '02. Risk Assessment', duration: '1:15' },
    { title: '03. Automated Rebalancing', duration: '2:00' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-premium max-w-4xl w-full overflow-hidden shadow-2xl relative border border-white/20 text-white">
        {/* Header Bar */}
        <div className="p-4 md:p-6 bg-slate-950 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm md:text-base">Astera AI Advisor Platform Walkthrough</h3>
              <p className="text-xs text-slate-400">Institutional Wealth Management Interface</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Canvas Simulation Screen */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
          {/* Animated Background Graphic simulating dashboard UI video */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-primary to-secondary/30 opacity-90" />
          
          <div className="relative z-10 text-center p-6 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-secondary/80 backdrop-blur-md text-white flex items-center justify-center cursor-pointer shadow-2xl hover:scale-110 transition-transform">
              {isPlaying ? (
                <Pause className="w-10 h-10" onClick={() => setIsPlaying(false)} />
              ) : (
                <Play className="w-10 h-10 translate-x-1" onClick={() => setIsPlaying(true)} />
              )}
            </div>
            <div className="space-y-1">
              <span className="text-xs font-mono text-secondary bg-secondary/20 px-3 py-1 rounded-full border border-secondary/30">
                CHAPTER: {chapters[activeChapter].title}
              </span>
              <h4 className="text-lg md:text-xl font-bold tracking-tight">
                Demystifying Market Regime AI Classification
              </h4>
            </div>
          </div>

          {/* Video Player Controls Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-between gap-4 text-xs font-mono">
            <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-secondary transition-colors">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <div className="grow h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer relative">
              <div className="h-full bg-secondary w-2/3 rounded-full relative" />
            </div>

            <div className="flex items-center gap-3">
              <span>01:42 / 03:20</span>
              <button onClick={() => setIsMuted(!isMuted)} className="hover:text-secondary transition-colors">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Chapters Footer */}
        <div className="p-4 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-white/10">
          <span className="text-slate-400 font-semibold">Jump to Chapter:</span>
          <div className="flex flex-wrap gap-2">
            {chapters.map((ch, idx) => (
              <button
                key={idx}
                onClick={() => setActiveChapter(idx)}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeChapter === idx
                    ? 'bg-secondary text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {activeChapter === idx && <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{ch.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
