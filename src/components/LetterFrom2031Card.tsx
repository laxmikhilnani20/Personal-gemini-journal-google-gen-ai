import React, { useState } from 'react';
import { Mail, Sparkles, Copy, Check, Clock, ChevronDown, ChevronUp, Bookmark, Maximize2, X, Send } from 'lucide-react';

interface LetterFrom2031CardProps {
  letterText: string;
  rawThought?: string;
  timestamp?: string;
  primaryEmotion?: string;
  stressScore?: number;
  yearSentFrom?: string;
  title?: string;
  isInteractive?: boolean;
}

export const LetterFrom2031Card: React.FC<LetterFrom2031CardProps> = ({
  letterText,
  rawThought,
  timestamp = new Date().toISOString(),
  primaryEmotion = 'Reassured',
  stressScore = 2,
  yearSentFrom = '2031',
  title = 'Letter from 2031',
  isInteractive = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [showOriginalThought, setShowOriginalThought] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const futureYearDate = `September 2031 · 5 Years in the Future`;

  const handleCopy = () => {
    navigator.clipboard.writeText(letterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Split letter text into clean paragraphs
  const paragraphs = letterText
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <div
        id="card-letter-from-2031"
        className="relative my-4 rounded-2xl bg-gradient-to-b from-[#131122] via-[#0e0d1a] to-[#080711] border border-amber-500/30 p-6 sm:p-8 shadow-[0_8px_32px_rgba(217,119,6,0.12)] text-slate-200 overflow-hidden group transition-all duration-300 hover:border-amber-500/45"
      >
        {/* Subtle Decorative Vintage Postmark & Wax Seal Stamp */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3 pointer-events-none opacity-80 sm:opacity-90">
          <div className="hidden sm:flex flex-col items-end text-right font-mono text-[10px] text-amber-300/80 tracking-widest uppercase">
            <span>Temporal Dispatch</span>
            <span className="text-amber-400 font-bold">YEAR 2031 ➔ 2026</span>
          </div>

          {/* Postal Stamp Badge */}
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-amber-400/50 flex flex-col items-center justify-center text-center p-1 rotate-6 bg-amber-950/20 backdrop-blur-xs">
            <span className="text-[7px] font-mono tracking-tighter uppercase text-amber-300 font-bold">POSTMARK</span>
            <Clock className="w-3.5 h-3.5 text-amber-400 my-0.5" />
            <span className="text-[8px] font-mono font-black text-amber-300">2031</span>
          </div>
        </div>

        {/* Letter Header */}
        <div className="border-b border-amber-500/20 pb-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-wide bg-amber-500/15 text-amber-300 border border-amber-500/40">
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>A Letter from Your Future Self</span>
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              {futureYearDate}
            </span>
          </div>

          <h3 className="font-serif text-xl sm:text-2xl font-normal text-amber-100/95 tracking-wide">
            {title}
          </h3>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
            <span className="text-amber-200/70 font-serif italic">Received from five years down the road</span>
            <span>•</span>
            <span>Written in response to your 2026 reflection</span>
          </div>
        </div>

        {/* Letter Body in Distinct Serif Typography */}
        <div className="font-serif text-[15px] sm:text-[16.5px] leading-[1.85] text-slate-200/95 space-y-4 tracking-wide selection:bg-amber-500/30">
          {paragraphs.map((para, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === paragraphs.length - 1 && (para.toLowerCase().includes('yours') || para.toLowerCase().includes('love') || para.toLowerCase().includes('2031'));
            return (
              <p
                key={idx}
                className={`${isFirst ? 'font-serif text-amber-100 font-medium text-lg italic mb-3' : ''} ${
                  isLast ? 'pt-2 text-amber-200/90 font-serif italic border-t border-amber-500/15 mt-5' : ''
                }`}
              >
                {para}
              </p>
            );
          })}
        </div>

        {/* User Raw Words Toggle Drawer (What the user wrote back in 2026) */}
        {rawThought && (
          <div className="mt-6 pt-4 border-t border-amber-500/20">
            <button
              onClick={() => setShowOriginalThought(!showOriginalThought)}
              className="flex items-center gap-1.5 text-xs text-amber-300/80 hover:text-amber-200 transition-colors font-medium cursor-pointer"
            >
              <span>{showOriginalThought ? 'Hide your raw 2026 thoughts' : 'Read what you asked / shared in 2026'}</span>
              {showOriginalThought ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showOriginalThought && (
              <div className="mt-3 p-4 rounded-xl bg-[#08070e] border border-slate-800 text-slate-300 text-xs sm:text-sm font-sans leading-relaxed">
                <span className="text-[11px] font-mono text-amber-400 font-semibold block mb-1">
                  Your 2026 Journal Submission:
                </span>
                <p className="italic text-slate-300">"{rawThought}"</p>
              </div>
            )}
          </div>
        )}

        {/* Letter Footer Toolbar */}
        <div className="mt-6 pt-4 border-t border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-mono text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Resolved Sentiment: {primaryEmotion}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-[11px]">
              Stress Level: {stressScore}/10
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[11px]">
              Saved to Firestore
            </span>
          </div>

          {isInteractive && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 border border-amber-500/30 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                title="Open in quiet reading mode"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Focus Reader</span>
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Copy entire letter text"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Letter</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Focus / Full Screen Modal Reader */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#151224] via-[#0f0e1b] to-[#0a0914] border border-amber-500/40 rounded-3xl p-8 sm:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-slate-200 my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8 border-b border-amber-500/20 pb-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 mb-3">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>TRANS-TEMPORAL DISPATCH FROM 2031</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-normal text-amber-100">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-serif italic mt-1">
                Written by your future self, looking back at 2026
              </p>
            </div>

            <div className="font-serif text-[16px] sm:text-[18px] leading-[2.0] text-slate-200 space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {paragraphs.map((para, idx) => (
                <p key={idx} className={idx === 0 ? 'text-amber-100 font-medium italic text-xl' : ''}>
                  {para}
                </p>
              ))}
            </div>

            {rawThought && (
              <div className="mt-8 p-4 rounded-xl bg-black/40 border border-amber-500/20 text-xs sm:text-sm text-slate-300">
                <span className="font-mono text-amber-400 font-semibold block mb-1">Your 2026 Query / Thought:</span>
                <p className="italic">"{rawThought}"</p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-amber-500/20 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                Preserved permanently in your reflection collection
              </span>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Full Letter'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
