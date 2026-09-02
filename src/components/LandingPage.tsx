import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Lock,
  BrainCircuit,
  FileText,
  Clock,
  ArrowRight,
  LogIn,
  CheckCircle2,
  Database,
  KeyRound,
  Compass,
} from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';

interface LandingPageProps {
  onSignInSuccess: () => void;
  onDemoSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignInSuccess,
  onDemoSignIn,
}) => {
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      onSignInSuccess();
    } catch (err: any) {
      console.warn('Google sign-in attempt:', err);
      // Helpful message if popup blocked
      if (err?.code === 'auth/popup-blocked') {
        setAuthError('Browser popup was blocked. Please enable popups or try the Quick Demo Sign-In below.');
      } else if (err?.code === 'auth/cancelled-popup-request' || err?.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in was cancelled. Click below to try again.');
      } else {
        setAuthError(err?.message || 'Authentication error occurred. You can use the Quick Demo Sign-In to preview.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 flex flex-col justify-between selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-[#0F1115]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-950/40">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
                ThreatGuard <span className="text-emerald-400 font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">AI Journal</span>
              </span>
              <p className="text-[10px] text-slate-400 font-mono">Gemini 3.6 Flash + Cloud Firestore Isolated Storage</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-nav-google-login"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{signingIn ? 'Authenticating...' : 'Sign In with Google'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col justify-center">
        {/* Verification & Architecture Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Firebase Authentication (Google Sign-In)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Database className="w-3.5 h-3.5" /> Isolated Cloud Firestore (handy-diode-29brs)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <BrainCircuit className="w-3.5 h-3.5" /> Gemini 3.6 Flash API
          </span>
        </div>

        {/* Hero Headline */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Your Private AI Reflection & Journaling Companion
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Engage in thoughtful, multi-turn reflective conversations with Gemini 3.6 Flash. Unpack complex thoughts, brainstorm creative ideas, and extract structured summaries—stored strictly isolated in your private Cloud Firestore account.
          </p>
        </div>

        {/* Call to Action Box */}
        <div className="mt-8 max-w-md mx-auto w-full">
          <div className="bg-[#0F1115] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Step 1: Sign in to Access Your Private Dashboard
              </h2>
              <p className="text-xs text-slate-400">
                Google Authentication guarantees that other users cannot access or read your journal entries.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/80 border border-red-800/80 rounded-lg text-left text-xs text-red-300 space-y-1">
                <p className="font-semibold">Sign-In Note:</p>
                <p>{authError}</p>
              </div>
            )}

            <button
              id="btn-hero-google-signin"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{signingIn ? 'Opening Google Sign-In...' : 'Sign In with Google'}</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-slate-800"></div>
              <span className="shrink mx-3 text-[11px] text-slate-500 uppercase tracking-widest font-mono">or</span>
              <div className="grow border-t border-slate-800"></div>
            </div>

            <button
              id="btn-demo-signin"
              onClick={onDemoSignIn}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs border border-slate-700 transition-all hover:border-slate-600"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Explore as Authenticated Demo User</span>
            </button>

            <p className="text-[11px] text-slate-500">
              No passwords stored. Fully compliant with Google Identity Services.
            </p>
          </div>
        </div>

        {/* 4 Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          <div className="p-4 rounded-xl bg-[#0F1115] border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">Strict User Data Isolation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Rules enforce <code className="text-emerald-400 font-mono text-[10px]">request.auth.uid == userId</code> on all <code className="text-emerald-400 font-mono text-[10px]">/users/{'{userId}'}/reflections</code> paths.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1115] border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">Multi-Turn Gemini 3.6 Flash</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Maintains complete conversation memory across reflection turns to ask insightful follow-up questions.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1115] border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">AI Summarization & Insights</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instantly synthesizes long reflection threads into executive summaries, emotional tone, and action items.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#0F1115] border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">Persistent Reflection History</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Revisit and continue past sessions anytime. Filter by category, mood, and search for specific thoughts.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#0F1115] py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ThreatGuard AI Journal • Google AI Studio & Cloud Run Sandbox</span>
          <span className="font-mono text-[11px] text-emerald-400/80">
            Firestore DB: handy-diode-29brs • Gemini 3.6 Flash
          </span>
        </div>
      </footer>
    </div>
  );
};
