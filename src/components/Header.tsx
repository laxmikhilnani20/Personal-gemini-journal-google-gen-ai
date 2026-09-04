import React from 'react';
import { ShieldAlert, Cpu, Terminal, CheckCircle2, CloudLightning } from 'lucide-react';

interface HeaderProps {
  activeTab: 'threat-model' | 'security-review' | 'fallback-ladder' | 'deployment' | 'walkthrough';
  setActiveTab: (tab: 'threat-model' | 'security-review' | 'fallback-ladder' | 'deployment' | 'walkthrough') => void;
  interactionCount: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, interactionCount }) => {
  const tabs = [
    { id: 'threat-model', label: 'Threat Modeling (5 Zones)', icon: ShieldAlert },
    { id: 'security-review', label: 'Security Review & Diffs', icon: Terminal },
    { id: 'fallback-ladder', label: 'Resilient Model Ladder', icon: CloudLightning },
    { id: 'deployment', label: 'Cloud Run & Secrets', icon: Cpu },
    { id: 'walkthrough', label: 'Walkthrough Test Suites', icon: CheckCircle2 },
  ] as const;

  return (
    <header className="border-b border-slate-800 bg-[#0F1115] sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xs">
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-base">ThreatGuard</span>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold tracking-wider">
                  SYSTEM SECURE
                </span>
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wider hidden sm:block">
                Agentic Threat Modeling & Sec-Ops Defense
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-full text-[10px] font-semibold text-slate-400 border border-slate-700 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Ladder: gemini-3.1-flash-lite + Fallbacks</span>
            </div>
            <div className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-semibold text-slate-300 border border-slate-700">
              Audits: <span className="font-bold text-emerald-400">{interactionCount}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
