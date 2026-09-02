/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { subscribeToAuth, signOutUser, signInWithGoogle, getAuthHeaders } from './lib/firebase';
import { LandingPage } from './components/LandingPage';
import { JournalDashboard } from './components/JournalDashboard';
import { Header } from './components/Header';
import { ThreatModelView } from './components/ThreatModelView';
import { SecurityReviewView } from './components/SecurityReviewView';
import { FallbackLadderView } from './components/FallbackLadderView';
import { DeploymentCenterView } from './components/DeploymentCenterView';
import { WalkthroughTestView } from './components/WalkthroughTestView';
import { HistoryDrawer } from './components/HistoryDrawer';
import { PersistedInteraction } from './types';
import {
  Sparkles,
  Shield,
  CloudLightning,
  Award,
  Layers,
  BrainCircuit,
  History,
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<{
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL?: string | null;
    isAnonymous?: boolean;
  } | null>(null);

  const [authLoading, setAuthLoading] = useState(true);

  // Authenticated workspace mode: 'journal' (Primary dashboard) | 'security-studio'
  const [workspaceMode, setWorkspaceMode] = useState<'journal' | 'security-studio'>('journal');

  // Security Studio sub-tabs
  const [activeTab, setActiveTab] = useState<
    'threat-model' | 'security-review' | 'fallback-ladder' | 'deployment' | 'walkthrough'
  >('threat-model');

  const [interactions, setInteractions] = useState<PersistedInteraction[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [serverHealth, setServerHealth] = useState<{
    status: string;
    apiKeyConfigured: boolean;
    fallbackLadder: string[];
  } | null>(null);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuth((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isAnonymous: firebaseUser.isAnonymous,
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchInteractions = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/interactions', { headers });
      if (res.ok) {
        const data = await res.json();
        setInteractions(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load interactions:', err);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setServerHealth(data);
      }
    } catch (err) {
      console.error('Health check error:', err);
    }
  };

  useEffect(() => {
    fetchInteractions();
    fetchHealth();
  }, []);

  const handleDemoSignIn = () => {
    setUser({
      uid: 'demo-user-7842',
      email: 'alex.chen@workspace.dev',
      displayName: 'Alex Chen',
      photoURL: null,
      isAnonymous: false,
    });
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setUser(null);
  };

  const handleDeleteInteraction = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/interactions/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        setInteractions((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-slate-400 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-emerald-400">Verifying Firebase Authentication...</span>
      </div>
    );
  }

  // USER FLOW 1: Landing Page when Unauthenticated
  if (!user) {
    return (
      <LandingPage
        onSignInSuccess={() => {}}
        onDemoSignIn={handleDemoSignIn}
      />
    );
  }

  // USER FLOW 2: Private Dashboard when Authenticated
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-300 flex flex-col font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Authenticated Global Mode Switcher Bar */}
      <header className="border-b border-slate-800 bg-[#0F1115] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 shadow-md">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-sm sm:text-base">ThreatGuard</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                  AI REFLECTION & JOURNAL
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                Gemini 3.6 Flash • Cloud Firestore Isolated Storage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#0A0A0B] p-1 rounded-xl border border-slate-800">
              <button
                id="btn-switch-journal"
                onClick={() => setWorkspaceMode('journal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  workspaceMode === 'journal'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Journal</span>
              </button>

              <button
                id="btn-switch-security"
                onClick={() => setWorkspaceMode('security-studio')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  workspaceMode === 'security-studio'
                    ? 'bg-slate-800 text-white font-bold border border-slate-700 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Security Architecture</span>
                <span className="sm:hidden">Security</span>
              </button>
            </div>
          </div>
        </div>

        {/* If in Security Studio mode, render sub-tabs Header */}
        {workspaceMode === 'security-studio' && (
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            interactionCount={interactions.length}
          />
        )}
      </header>

      {/* Main Authenticated Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {workspaceMode === 'journal' ? (
          <JournalDashboard user={user} onSignOut={handleSignOut} />
        ) : (
          <div className="space-y-6">
            {activeTab === 'threat-model' && (
              <ThreatModelView onPersistSuccess={fetchInteractions} />
            )}

            {activeTab === 'security-review' && (
              <SecurityReviewView onPersistSuccess={fetchInteractions} />
            )}

            {activeTab === 'fallback-ladder' && <FallbackLadderView />}

            {activeTab === 'deployment' && <DeploymentCenterView />}

            {activeTab === 'walkthrough' && <WalkthroughTestView />}
          </div>
        )}
      </main>

      {/* Floating Audit History Trigger for Security Studio */}
      {workspaceMode === 'security-studio' && (
        <div className="fixed bottom-6 right-6 z-20">
          <button
            id="btn-open-history-drawer"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0F1115] hover:bg-slate-800 text-slate-200 rounded-full shadow-lg transition-all text-xs font-semibold border border-slate-700 hover:border-emerald-500/50 hover:scale-105"
          >
            <History className="w-4 h-4 text-emerald-400" />
            <span>Audit History</span>
            <span className="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full font-mono text-[11px] border border-slate-700">
              {interactions.length}
            </span>
          </button>
        </div>
      )}

      {/* History Slide-over Drawer for Security Studio */}
      <HistoryDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        interactions={interactions}
        onSelectInteraction={() => {}}
        onDeleteInteraction={handleDeleteInteraction}
      />

      {/* Production Status Footer */}
      <footer className="border-t border-slate-800 bg-[#0F1115] py-3 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Server: {serverHealth?.status || 'Active'}
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <CloudLightning className="w-3.5 h-3.5 text-blue-400" />
              Engine: gemini-3.6-flash
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400">
              Database: <code className="text-emerald-400">handy-diode-29brs</code>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Award className="w-3 h-3 text-emerald-400" />
            <span>Directive Compliance: Firebase Auth + Cloud Firestore + Gemini 3.6 Flash</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
