import React, { useState } from 'react';
import {
  Sparkles,
  Trophy,
  AlertTriangle,
  Lightbulb,
  Calendar,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  Database,
  Brain,
  ShieldCheck,
  ChevronDown,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { WeeklyReport, ReflectionSession } from '../types';

interface WeeklyReportViewProps {
  currentReport: WeeklyReport | null;
  reportsList: WeeklyReport[];
  isGenerating: boolean;
  onGenerateReport: () => void;
  onSelectReport?: (report: WeeklyReport) => void;
  recentSessionsCount: number;
  error?: string | null;
}

export const WeeklyReportView: React.FC<WeeklyReportViewProps> = ({
  currentReport,
  reportsList,
  isGenerating,
  onGenerateReport,
  onSelectReport,
  recentSessionsCount,
  error,
}) => {
  const [copied, setCopied] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  const handleCopy = () => {
    if (!currentReport) return;
    const text = `Weekly Journal Pattern Report (${new Date(currentReport.periodStart).toLocaleDateString()} - ${new Date(currentReport.periodEnd).toLocaleDateString()})
Entries Analyzed: ${currentReport.entriesAnalyzed}

🏆 TOP WINS:
${currentReport.topWins.map((w, idx) => `${idx + 1}. ${w}`).join('\n')}

⚡ CORE STRESSORS:
${currentReport.coreStressors.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

💡 ACTIONABLE ADVICE:
${currentReport.actionableAdvice.map((a, idx) => `${idx + 1}. ${a}`).join('\n')}

${currentReport.overallSummary ? `Summary: ${currentReport.overallSummary}` : ''}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDateRange = (startStr: string, endStr: string) => {
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const startFmt = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endFmt = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startFmt} – ${endFmt}`;
    } catch {
      return 'Past 7 Days';
    }
  };

  return (
    <div
      id="weekly-pattern-synthesizer"
      className="bg-[#0A0A0B] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6 transition-all"
    >
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Weekly Pattern Synthesizer</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                Gemini 3.8 Flash
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                Last 7 Days
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              AI cognitive batch synthesis of your emotions, stress trajectories, top wins, and weekly advice
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Historical reports selector if > 1 report */}
          {reportsList.length > 1 && onSelectReport && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#0F1115] hover:bg-slate-800/80 border border-slate-800 rounded-xl text-xs text-slate-300 transition-colors"
                title="View past weekly reports"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Reports ({reportsList.length})</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {showHistoryDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-[#0F1115] border border-slate-700 rounded-xl shadow-2xl py-1 z-30 space-y-0.5">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-800">
                    Saved Weekly Reports (Firestore)
                  </div>
                  {reportsList.map((rep) => {
                    const isSelected = currentReport?.id === rep.id;
                    return (
                      <button
                        key={rep.id}
                        onClick={() => {
                          onSelectReport(rep);
                          setShowHistoryDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="truncate">
                          <div className="truncate">
                            {formatDateRange(rep.periodStart, rep.periodEnd)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(rep.generatedAt).toLocaleDateString()} • {rep.entriesAnalyzed} entries
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Primary CTA: Generate Weekly Report Button */}
          <button
            id="btn-generate-weekly-report"
            onClick={onGenerateReport}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing Patterns...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{currentReport ? 'Re-Generate Report' : 'Generate Weekly Report'}</span>
              </>
            )}
          </button>

          {currentReport && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0F1115] hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-300 transition-colors"
              title="Copy formatted weekly synthesis to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ERROR NOTICE IF PRESENT */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold">Unable to synthesize weekly report</span>
            <p className="text-rose-300/90 text-[11px]">{error}</p>
          </div>
        </div>
      )}

      {/* GENERATING STATE */}
      {isGenerating && (
        <div className="py-12 px-4 text-center space-y-3 bg-[#0F1115] border border-slate-800/80 rounded-xl animate-pulse">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
          <h4 className="text-sm font-semibold text-white">Synthesizing 7-Day Journal Trajectory...</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Querying your Cloud Firestore entries, extracting emotional sentiments and stress metrics, and invoking Gemini 3.8 Flash to identify your top wins, core stressors, and actionable guidance.
          </p>
        </div>
      )}

      {/* REPORT CONTENT VIEW */}
      {!isGenerating && currentReport && (
        <div className="space-y-5 animate-fade-in">
          {/* Report Metadata Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0F1115] border border-slate-800/70 text-xs">
            <div className="flex items-center gap-3 text-slate-300 flex-wrap">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium text-white">
                  {formatDateRange(currentReport.periodStart, currentReport.periodEnd)}
                </span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">
                <span className="text-emerald-400 font-semibold">{currentReport.entriesAnalyzed}</span> entries evaluated
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500 font-mono text-[11px]">
                Generated {new Date(currentReport.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <Database className="w-3 h-3" />
                <span>Firestore weekly_reports</span>
              </span>
            </div>
          </div>

          {/* Overall Summary */}
          {currentReport.overallSummary && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/20 via-[#0F1115] to-[#0F1115] border border-emerald-500/20 text-xs text-slate-300 leading-relaxed space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>7-Day Trajectory Summary</span>
              </div>
              <p className="text-slate-200 text-xs sm:text-[13px]">{currentReport.overallSummary}</p>
            </div>
          )}

          {/* 3 Core Synthesized Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PILLAR 1: TOP WINS */}
            <div className="bg-[#0F1115] border border-emerald-500/30 rounded-xl p-4.5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Top Wins</h4>
                    <span className="text-[10px] text-slate-500">Breakthroughs & Resilience</span>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 font-bold">
                  {currentReport.topWins.length}
                </span>
              </div>

              <ul className="space-y-2.5">
                {currentReport.topWins.map((win, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-200 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span>{win}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* PILLAR 2: CORE STRESSORS */}
            <div className="bg-[#0F1115] border border-amber-500/30 rounded-xl p-4.5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Core Stressors</h4>
                    <span className="text-[10px] text-slate-500">Friction & Fatigue Points</span>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 font-bold">
                  {currentReport.coreStressors.length}
                </span>
              </div>

              <ul className="space-y-2.5">
                {currentReport.coreStressors.map((stressor, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-200 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span>{stressor}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* PILLAR 3: ACTIONABLE ADVICE */}
            <div className="bg-[#0F1115] border border-teal-500/30 rounded-xl p-4.5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Actionable Advice</h4>
                    <span className="text-[10px] text-slate-500">Next Week's Strategy</span>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-teal-500/10 text-teal-400 font-bold">
                  {currentReport.actionableAdvice.length}
                </span>
              </div>

              <ul className="space-y-2.5">
                {currentReport.actionableAdvice.map((advice, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-200 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                    <span>{advice}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* EMPTY / INITIAL STATE */}
      {!isGenerating && !currentReport && (
        <div className="p-6 rounded-xl bg-[#0F1115] border border-slate-800/80 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
            <Brain className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-sm font-bold text-white">No Weekly Report Generated Yet</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Synthesize your last 7 days of reflections into high-level emotional themes, celebrated breakthroughs, tension triggers, and empowering behavioral adjustments.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onGenerateReport}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Weekly Report Now</span>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reports are safely stored in your private Firestore <code className="text-slate-400">weekly_reports</code> subcollection</span>
          </div>
        </div>
      )}
    </div>
  );
};
