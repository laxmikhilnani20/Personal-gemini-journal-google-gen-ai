import React from 'react';
import {
  HeartPulse,
  Sparkles,
  Activity,
  Smile,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Brain,
  Gauge,
} from 'lucide-react';
import { ReflectionSession } from '../types';

interface MoodOverviewProps {
  primaryEmotion: string | null;
  stressScore: number | null;
  assessmentTime?: string | null;
  totalEntriesCount: number;
  recentSessions: ReflectionSession[];
  onStartNewEntry: () => void;
  isLiveUpdating?: boolean;
}

export const MoodOverview: React.FC<MoodOverviewProps> = ({
  primaryEmotion,
  stressScore,
  assessmentTime,
  totalEntriesCount,
  recentSessions,
  onStartNewEntry,
  isLiveUpdating = false,
}) => {
  // If no data is available yet (first-time user)
  if (!primaryEmotion && stressScore === null) {
    return (
      <div
        id="mood-overview-empty"
        className="bg-[#0A0A0B] border border-slate-800/80 rounded-2xl p-6 shadow-lg space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>AI Mood & Sentiment Tracking</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Gemini 3.6 Flash
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Cognitive stress and emotion analysis mapped on every journal entry
              </p>
            </div>
          </div>

          <button
            onClick={onStartNewEntry}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all self-start sm:self-auto shadow-xs"
          >
            <span>Write First Reflection</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-[#0F1115] border border-slate-800/60 text-xs text-slate-400 leading-relaxed">
          No reflections recorded yet. As you write journal entries, Gemini will automatically detect your single-word
          <span className="text-emerald-400 font-semibold"> primaryEmotion</span> and quantify your
          <span className="text-teal-400 font-semibold"> stressScore</span> (1–10) in Cloud Firestore.
        </div>
      </div>
    );
  }

  // Safe defaults
  const emotion = primaryEmotion || 'Reflective';
  const score = Math.max(1, Math.min(10, stressScore ?? 4));

  // Determine stress classification & visual accents
  let stressTier = {
    label: 'Low Stress • Restorative Calm',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    barFillClass: 'bg-emerald-400 shadow-emerald-500/20',
    textColor: 'text-emerald-400',
    description: 'Mind state appears centered, tranquil, and receptive to positive reflection.',
  };

  if (score >= 4 && score <= 6) {
    stressTier = {
      label: 'Moderate Stress • Balanced Focus',
      badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
      barFillClass: 'bg-teal-400 shadow-teal-500/20',
      textColor: 'text-teal-400',
      description: 'Active cognitive load present with focused processing and manageable tension.',
    };
  } else if (score >= 7 && score <= 8) {
    stressTier = {
      label: 'Elevated Stress • Decompression Advised',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      barFillClass: 'bg-amber-400 shadow-amber-500/20',
      textColor: 'text-amber-400',
      description: 'Notable anxiety or strain detected; a mindful pause or breathing loop is recommended.',
    };
  } else if (score >= 9) {
    stressTier = {
      label: 'High Stress • Rest & Recovery Priority',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      barFillClass: 'bg-rose-400 shadow-rose-500/20',
      textColor: 'text-rose-400',
      description: 'Acute overwhelm detected. Prioritize rest, boundaries, and compassionate support today.',
    };
  }

  // Emotional tone nuance
  const getEmotionTone = (emo: string) => {
    const e = emo.toLowerCase();
    if (['grateful', 'peaceful', 'content', 'happy', 'serene', 'calm'].includes(e)) {
      return { tone: 'Grounded & Positive', chipClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    }
    if (['anxious', 'overwhelmed', 'exhausted', 'stressed', 'restless', 'frustrated'].includes(e)) {
      return { tone: 'Tension & Strain', chipClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    }
    if (['inspired', 'energized', 'motivated', 'hopeful', 'determined'].includes(e)) {
      return { tone: 'Creative Activation', chipClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30' };
    }
    return { tone: 'Introspective Insight', chipClass: 'bg-slate-800 text-slate-300 border-slate-700' };
  };

  const emotionMetadata = getEmotionTone(emotion);

  return (
    <div
      id="mood-overview-section"
      className="bg-[#0A0A0B] border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-5 relative overflow-hidden"
    >
      {/* Decorative subtle ambient glow line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400`} />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Mood Overview & Sentiment
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                Live AI Tracking
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Structured sentiment and cognitive stress mapped to Cloud Firestore on every entry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {assessmentTime && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono bg-[#0F1115] px-2.5 py-1 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {new Date(assessmentTime).toLocaleDateString()} at{' '}
                {new Date(assessmentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 text-[11px] text-emerald-400/90 font-mono bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Firestore Synced</span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metric 1: Most Recent Primary Emotion */}
        <div
          id="mood-overview-emotion-card"
          className="bg-[#0F1115] border border-slate-800 rounded-xl p-4 md:p-5 space-y-3 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-emerald-400" />
              Primary Emotion
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-semibold ${emotionMetadata.chipClass}`}>
              {emotionMetadata.tone}
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl md:text-3xl font-black text-white tracking-tight capitalize">
              {emotion}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              (Single-word mood)
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed pt-1 border-t border-slate-800/80">
            {stressTier.description}
          </p>
        </div>

        {/* Metric 2: Cognitive Stress Score (1-10) */}
        <div
          id="mood-overview-stress-card"
          className="bg-[#0F1115] border border-slate-800 rounded-xl p-4 md:p-5 space-y-3 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-teal-400" />
              Stress Score (1 - 10)
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-semibold ${stressTier.badgeClass}`}>
              {stressTier.label}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className={`text-2xl md:text-3xl font-black font-mono tracking-tight ${stressTier.textColor}`}>
              {score}
            </span>
            <span className="text-sm font-mono text-slate-500 font-medium">/ 10</span>
          </div>

          {/* 10-Segment Gauge Meter */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
            <div className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => {
                const isFilled = lvl <= score;
                let activeColor = 'bg-emerald-500';
                if (lvl > 3 && lvl <= 6) activeColor = 'bg-teal-500';
                if (lvl > 6 && lvl <= 8) activeColor = 'bg-amber-500';
                if (lvl > 8) activeColor = 'bg-rose-500';

                return (
                  <div
                    key={lvl}
                    className={`h-2.5 rounded-xs transition-all duration-300 ${
                      isFilled ? activeColor : 'bg-slate-800/70 border border-slate-800'
                    }`}
                    title={`Level ${lvl} of 10`}
                  />
                );
              })}
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-500 px-0.5">
              <span>1 (Calm)</span>
              <span>5 (Balanced)</span>
              <span>10 (Overwhelmed)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent History Mood Badges (if multiple entries recorded) */}
      {recentSessions.length > 1 && (
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-mono">Recent session moods:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {recentSessions.slice(0, 4).map((sess) => {
                const sessEmo = sess.primaryEmotion || sess.mood;
                const sessScore = sess.stressScore;
                return (
                  <span
                    key={sess.id}
                    className="px-2 py-0.5 rounded-md bg-[#0F1115] border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1"
                  >
                    <span>{sessEmo}</span>
                    {sessScore !== undefined && (
                      <span className="text-slate-500 text-[10px]">({sessScore}/10)</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          <span className="text-[11px] font-mono text-slate-500">
            {totalEntriesCount} total {totalEntriesCount === 1 ? 'reflection' : 'reflections'} stored
          </span>
        </div>
      )}
    </div>
  );
};
