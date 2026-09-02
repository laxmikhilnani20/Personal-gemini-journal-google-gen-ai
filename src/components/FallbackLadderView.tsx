import React, { useState } from 'react';
import { 
  CloudLightning, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  Server
} from 'lucide-react';
import { AttemptLog } from '../types';
import { getAuthHeaders } from '../lib/firebase';

export const FallbackLadderView: React.FC = () => {
  const [testPrompt, setTestPrompt] = useState('Analyze system latency and verify fallback resilience protocol.');
  const [simulateFailTier, setSimulateFailTier] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    modelUsed: string;
    attempts: AttemptLog[];
    latencyMs: number;
    responseSample?: string;
  } | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const LADDER_STEPS = [
    {
      tier: 1,
      model: 'gemini-3.6-flash',
      role: 'Primary Fast Model',
      description: 'Default high-speed agentic reasoning engine.',
      color: 'border-emerald-500 bg-emerald-50 text-emerald-950',
    },
    {
      tier: 2,
      model: 'gemini-3.1-flash-lite',
      role: 'High-Availability Fallback',
      description: 'Ultra-low latency tier engaged if primary experiences 503 or 429.',
      color: 'border-blue-500 bg-blue-50 text-blue-950',
    },
    {
      tier: 3,
      model: 'gemini-flash-latest',
      role: 'Dynamic Alias Fallback',
      description: 'Points to stable production flash alias across regional deployments.',
      color: 'border-purple-500 bg-purple-50 text-purple-950',
    },
    {
      tier: 4,
      model: 'gemini-3.7-flash',
      role: 'Deep Reasoning Fallback',
      description: 'Extended reasoning capability invoked for heavy or degraded fallback chains.',
      color: 'border-amber-500 bg-amber-50 text-amber-950',
    },
  ];

  const handleTestFallback = async () => {
    setLoading(true);
    setErrorBanner(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/test-fallback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: testPrompt,
          simulateFailIndex: simulateFailTier,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const resJson = await response.json();
      setResult({
        modelUsed: resJson.modelUsed,
        attempts: resJson.attempts || [],
        latencyMs: resJson.latencyMs,
        responseSample: resJson.responseSample,
      });
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to run fallback test.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0F1115] text-slate-200 p-6 rounded-xl shadow-xs border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold">
                Directive 6: Resilience Protocol
              </span>
              <span className="text-xs text-slate-500 uppercase tracking-wider">Zero-Outage Auto-Failover Ladder</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white mt-1">Gemini Model Fallback Ladder</h2>
            <p className="text-xs text-slate-400 max-w-2xl mt-1">
              Guarantees uptime by automatically catching recoverable status codes (503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED,
              404 NOT_FOUND, 500 INTERNAL) and sequentially cascading down the resilience chain.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1.5 bg-slate-800 rounded-lg text-emerald-400 border border-slate-700">
              4-Tier Ladder Configured
            </span>
          </div>
        </div>
      </div>

      {/* Ladder Visualizer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {LADDER_STEPS.map((step) => {
          const isSelectedTarget = result?.modelUsed === step.model;
          return (
            <div
              key={step.tier}
              className={`p-4 rounded-xl border transition-all shadow-xs ${
                isSelectedTarget
                  ? 'border-emerald-500 bg-[#0C0E12] ring-1 ring-emerald-500/40 shadow-md'
                  : 'border-slate-800 bg-[#0F1115] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Tier {step.tier}
                </span>
                {isSelectedTarget && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Fulfilled
                  </span>
                )}
              </div>

              <h4 className="font-mono text-xs font-bold text-white mb-0.5">{step.model}</h4>
              <p className="text-xs font-semibold text-slate-300 mb-1.5">{step.role}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
            </div>
          );
        })}
      </div>

      {/* Interactive Fault-Injection Tester */}
      <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
          Live Fallback Simulation & Fault Injection Tester
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1">Test Payload / Prompt</label>
            <input
              id="input-fallback-prompt"
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-800 rounded-lg focus:outline-hidden focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 bg-[#0A0A0B] text-slate-200 placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Fault-Injection Scenario</label>
            <select
              id="select-fault-tier"
              value={simulateFailTier}
              onChange={(e) => setSimulateFailTier(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 border border-slate-800 rounded-lg focus:outline-hidden focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 bg-[#0A0A0B] text-slate-200"
            >
              <option value="-1">Normal Execution (Tier 1 Primary)</option>
              <option value="0">Inject 503 on Tier 1 (Verify Fallback to Tier 2)</option>
              <option value="1">Inject 503 on Tier 1 & Tier 2 (Verify Fallback to Tier 3)</option>
              <option value="2">Inject 503 on Tiers 1-3 (Verify Fallback to Tier 4)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            Executes backend <code className="font-mono bg-[#0C0E12] border border-slate-800 px-1 py-0.5 rounded text-emerald-400">generateContentWithFallback</code> with automated retry ladder.
          </p>
          <button
            id="btn-run-fallback-test"
            onClick={handleTestFallback}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                <span>Traversing Fallback Ladder...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-slate-950" />
                <span>Trigger Live Fallback Test</span>
              </>
            )}
          </button>
        </div>

        {errorBanner && (
          <div className="p-3 bg-red-950/80 border border-red-800 rounded-lg flex items-center justify-between text-xs text-red-200">
            <span>{errorBanner}</span>
            <button onClick={handleTestFallback} className="px-2 py-0.5 bg-red-700 hover:bg-red-600 text-white rounded text-xs">
              Retry
            </button>
          </div>
        )}

        {/* Execution Log Output */}
        {result && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">Resolution Status:</span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Resolved by {result.modelUsed}
                </span>
              </div>
              <span className="text-xs text-slate-400">Total Latency: <strong className="text-slate-200">{result.latencyMs}ms</strong></span>
            </div>

            {/* Attempts Breakdown Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="min-w-full divide-y divide-slate-800 text-xs text-left">
                <thead className="bg-[#0C0E12] font-semibold text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Step</th>
                    <th className="py-2.5 px-3">Model Evaluated</th>
                    <th className="py-2.5 px-3">Outcome</th>
                    <th className="py-2.5 px-3">Code / Reason</th>
                    <th className="py-2.5 px-3 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#0F1115]">
                  {result.attempts.map((attempt, index) => (
                    <tr key={index} className={attempt.status === 'success' ? 'bg-emerald-500/5' : 'bg-rose-950/20'}>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-300">#{index + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">{attempt.model}</td>
                      <td className="py-2.5 px-3">
                        {attempt.status === 'success' ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Success
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-rose-400 font-bold">
                            <XCircle className="w-3.5 h-3.5" /> Failed (Failover)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {attempt.errorCode ? `${attempt.errorCode}: ` : ''}
                        {attempt.errorMessage || 'Successful response generated'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">{attempt.durationMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Error Recovery Matrix Documentation */}
      <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-6 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-white">Directive 6: Error Recovery Matrix Specification</h3>
        <p className="text-xs text-slate-400">
          The backend automatically intercepts these status codes and executes ladder failover before bubbling errors to users:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#0C0E12] border border-slate-800 rounded-lg">
            <p className="font-mono font-bold text-emerald-400">503 UNAVAILABLE</p>
            <p className="text-slate-400 mt-1">Transient capacity limit; immediately step down to high-availability tier.</p>
          </div>
          <div className="p-3 bg-[#0C0E12] border border-slate-800 rounded-lg">
            <p className="font-mono font-bold text-amber-400">429 RESOURCE_EXHAUSTED</p>
            <p className="text-slate-400 mt-1">Per-minute quota ceiling reached; cascade to separate quota pool.</p>
          </div>
          <div className="p-3 bg-[#0C0E12] border border-slate-800 rounded-lg">
            <p className="font-mono font-bold text-blue-400">404 NOT_FOUND</p>
            <p className="text-slate-400 mt-1">Model identifier unavailable in regional deployment; fallback to alias.</p>
          </div>
          <div className="p-3 bg-[#0C0E12] border border-slate-800 rounded-lg">
            <p className="font-mono font-bold text-rose-400">500 INTERNAL</p>
            <p className="text-slate-400 mt-1">Upstream model runtime exception; trigger secondary tier.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
