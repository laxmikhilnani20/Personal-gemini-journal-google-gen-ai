import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  FileDown, 
  RefreshCw, 
  Layers, 
  Zap, 
  Database,
  Lock,
  ArrowRight
} from 'lucide-react';
import { ThreatModelResult, ThreatZone } from '../types';
import { getAuthHeaders } from '../lib/firebase';

interface ThreatModelViewProps {
  onPersistSuccess: () => void;
}

const PRESETS = [
  {
    name: 'Cloud Run RAG & Support Agent',
    description: 'Cloud Run microservice receiving customer queries, querying Firestore knowledge base, and generating answers via Gemini with vector search embeddings.',
    inputSurfaces: 'Customer chat box, uploaded PDF documents, web-hook order notifications',
    toolsAndAPIs: 'Google Search grounding, internal billing API, Cloud Firestore SDK',
    storageEngine: 'Cloud Firestore (multi-tenant) & Google Cloud Storage',
  },
  {
    name: 'Autonomous Financial Reporting Bot',
    description: 'Scheduled batch pipeline parsing bank statements, calling external accounting APIs, generating financial summaries, and persisting reports in Firestore.',
    inputSurfaces: 'CSV/Excel uploads, OAuth-authenticated bank feeds, scheduled Cron jobs',
    toolsAndAPIs: 'Google Sheets API, Stripe balance endpoint, code execution sandbox',
    storageEngine: 'Cloud Firestore with owner-bound path isolation',
  },
  {
    name: 'Multi-Agent Code Review Pipeline',
    description: 'Developer productivity tool ingesting GitHub pull request webhooks, executing static analysis, reasoning through architecture changes, and posting review comments.',
    inputSurfaces: 'Git diff payloads, PR comments, user-supplied agent instructions',
    toolsAndAPIs: 'GitHub REST API, esbuild parser, Gemini 3.6 Flash fallback ladder',
    storageEngine: 'Cloud Firestore audit logs and Cloud Run ephemeral memory',
  },
];

export const ThreatModelView: React.FC<ThreatModelViewProps> = ({ onPersistSuccess }) => {
  const [systemName, setSystemName] = useState(PRESETS[0].name);
  const [description, setDescription] = useState(PRESETS[0].description);
  const [inputSurfaces, setInputSurfaces] = useState(PRESETS[0].inputSurfaces);
  const [toolsAndAPIs, setToolsAndAPIs] = useState(PRESETS[0].toolsAndAPIs);
  const [storageEngine, setStorageEngine] = useState(PRESETS[0].storageEngine);
  const [simulateFailIndex, setSimulateFailIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [result, setResult] = useState<ThreatModelResult | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [latency, setLatency] = useState<number>(0);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setSystemName(preset.name);
    setDescription(preset.description);
    setInputSurfaces(preset.inputSurfaces);
    setToolsAndAPIs(preset.toolsAndAPIs);
    setStorageEngine(preset.storageEngine);
  };

  const handleGenerate = async () => {
    if (!systemName.trim() || !description.trim()) {
      setErrorBanner('Please provide a System Name and Architecture Description.');
      return;
    }

    setLoading(true);
    setErrorBanner(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/threat-model', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          systemName,
          description,
          inputSurfaces,
          toolsAndAPIs,
          storageEngine,
          simulateFailIndex,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const resJson = await response.json();
      setResult(resJson.data);
      setModelUsed(resJson.modelUsed);
      setLatency(resJson.latencyMs);
      onPersistSuccess();
    } catch (err: any) {
      console.error('Threat model generation error:', err);
      setErrorBanner(err.message || 'Failed to complete threat modeling request.');
    } finally {
      setLoading(false);
    }
  };

  const exportMarkdown = () => {
    if (!result) return;
    let md = `# Threat Modeling Summary: ${result.systemName}\n\n`;
    md += `**Executive Summary**: ${result.executiveSummary}\n\n`;
    md += `**Model Executed**: ${modelUsed} (${latency}ms)\n\n`;
    md += `| Threat Zone | Threat & Scenario | OWASP Mapping | Likelihood | Impact | Technical Countermeasure |\n`;
    md += `| :--- | :--- | :--- | :---: | :---: | :--- |\n`;

    result.threats.forEach((t) => {
      md += `| **${t.zone}** | ${t.threat} <br>*${t.scenario || ''}* | \`${t.owasp}\` | ${t.likelihood} | **${t.impact}** | ${t.countermeasure} |\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-model-${systemName.toLowerCase().replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const getZoneBadgeColor = (zone: ThreatZone) => {
    switch (zone) {
      case 'Input Surfaces':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Planning & Reasoning':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Tool Execution':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'Memory & State':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Inter-System Communication':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'CRITICAL':
        return 'bg-rose-950 text-rose-300 border border-rose-700 font-bold';
      case 'HIGH':
        return 'bg-amber-950 text-amber-300 border border-amber-700 font-semibold';
      case 'MEDIUM':
        return 'bg-yellow-950 text-yellow-300 border border-yellow-700 font-medium';
      case 'LOW':
        return 'bg-slate-800 text-slate-400 border border-slate-700 font-medium';
      default:
        return 'bg-slate-800 text-slate-400 border border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-[#0F1115] text-slate-200 p-6 rounded-xl shadow-xs border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                Directive 1 & 2 Enforced
              </span>
              <span className="text-xs text-slate-500 uppercase tracking-wider">OWASP Top 10 & OWASP LLM Standard</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">Agentic Threat Modeling Engine</h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Analyzes system architecture across the 5 mandatory threat zones: Input Surfaces, Planning & Reasoning,
              Tool Execution, Memory & State, and Inter-System Communication. Maps risks directly to concrete countermeasures.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-500">Active Pipeline</p>
              <p className="text-xs font-mono text-emerald-400 font-medium">Auto-Fallback Ladder Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Input Form */}
      <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white">1. Target Architecture Specification</h3>
            <p className="text-xs text-slate-400">Define the system components, data ingress, tools, and persistence layer.</p>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Load Preset:</span>
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                id={`btn-preset-${idx}`}
                onClick={() => applyPreset(preset)}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors whitespace-nowrap border border-slate-700"
              >
                {preset.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Target System / Service Name</label>
            <input
              id="input-system-name"
              type="text"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-800 rounded-lg focus:outline-hidden focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 bg-[#0A0A0B] text-slate-200 placeholder-slate-600"
              placeholder="e.g. CloudRun-RAG-Support-Agent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">State & Storage Engine (Directive 3)</label>
            <input
              id="input-storage-engine"
              type="text"
              value={storageEngine}
              onChange={(e) => setStorageEngine(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-800 rounded-lg focus:outline-hidden focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 bg-[#0A0A0B] text-slate-200 placeholder-slate-600"
              placeholder="e.g. Cloud Firestore (/users/{userId}/interactions)"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 mb-1">Architecture & Data Flow Description</label>
            <textarea
              id="input-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-800 rounded-lg focus:outline-hidden focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 bg-[#0A0A0B] text-slate-200 placeholder-slate-600 resize-y"
              placeholder="Describe how user input enters the system, how the LLM plans and calls tools, and how state is persisted..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Zone 1: Input Surfaces</label>
            <input
              id="input-surfaces"
              type="text"
              value={inputSurfaces}
              onChange={(e) => setInputSurfaces(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-800 rounded-lg focus:outline-hidden focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 bg-[#0A0A0B] text-slate-200 placeholder-slate-600"
              placeholder="User prompt, file uploads, webhooks..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Zone 3: Downstream Tools & External APIs</label>
            <input
              id="input-tools-apis"
              type="text"
              value={toolsAndAPIs}
              onChange={(e) => setToolsAndAPIs(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-800 rounded-lg focus:outline-hidden focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 bg-[#0A0A0B] text-slate-200 placeholder-slate-600"
              placeholder="Firestore SDK, Google Search grounding, external HTTP fetch..."
            />
          </div>
        </div>

        {/* Resilient Ladder Simulation Options */}
        <div className="bg-[#0C0E12] border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-200">Gemini Ladder Resilience Test:</span>
            <span className="text-slate-400 text-xs hidden sm:inline">Optionally simulate transient HTTP 503 error on higher tiers:</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              id="select-simulate-fail"
              value={simulateFailIndex}
              onChange={(e) => setSimulateFailIndex(Number(e.target.value))}
              className="text-xs px-2.5 py-1.5 border border-slate-800 rounded-md bg-[#0A0A0B] text-slate-300"
            >
              <option value="-1">Normal (Tier 1: gemini-3.6-flash)</option>
              <option value="0">Simulate Tier 1 Fail -&gt; Auto-Recover to Tier 2 (3.1-flash-lite)</option>
              <option value="1">Simulate Tier 1 & 2 Fail -&gt; Recover to Tier 3 (flash-latest)</option>
            </select>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            Generates a structured Threat Summary Table mapping risks to countermeasures.
          </p>
          <button
            id="btn-generate-threat-model"
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                <span>Analyzing 5 Threat Zones...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>Execute Threat Analysis</span>
              </>
            )}
          </button>
        </div>

        {/* Error Feedback Banner */}
        {errorBanner && (
          <div className="p-3 bg-red-950/80 border border-red-800 rounded-lg flex items-center justify-between text-xs text-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={handleGenerate}
              className="px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white rounded font-medium text-xs transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Threat Summary Table Result */}
      {result && (
        <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Mandatory Threat Summary Table</h3>
                <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                  {result.threats.length} Identified Vectors
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{result.executiveSummary}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs font-mono bg-[#0C0E12] border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">
                Fulfilled by: <span className="text-emerald-400 font-semibold">{modelUsed}</span> ({latency}ms)
              </div>
              <button
                id="btn-export-markdown"
                onClick={exportMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>{copyFeedback ? 'Exported!' : 'Export Markdown'}</span>
              </button>
            </div>
          </div>

          {/* Threat Matrix Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="min-w-full divide-y divide-slate-800 text-xs text-left">
              <thead className="bg-[#0C0E12] font-semibold text-slate-400">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap">Threat Zone</th>
                  <th className="py-3 px-3.5 min-w-[200px]">Threat Title & Scenario</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">OWASP Code</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">Likelihood</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">Impact</th>
                  <th className="py-3 px-3.5 min-w-[260px]">Mandatory Countermeasure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#0F1115]">
                {result.threats.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3.5 align-top whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold border ${getZoneBadgeColor(item.zone)}`}>
                        {item.zone}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 align-top space-y-1">
                      <p className="font-semibold text-slate-100">{item.threat}</p>
                      {item.scenario && (
                        <p className="text-slate-400 text-xs italic">{item.scenario}</p>
                      )}
                    </td>
                    <td className="py-3 px-3.5 align-top whitespace-nowrap font-mono text-xs text-slate-300">
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                        {item.owasp}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 align-top text-center whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-300">
                        {item.likelihood}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 align-top text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getImpactBadge(item.impact)}`}>
                        {item.impact}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 align-top text-slate-300 font-normal">
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md p-2 text-emerald-300">
                        {item.countermeasure}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Compliance Checklist Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-[#0C0E12] border border-slate-800 rounded-lg flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-200">Zero-Hardcoded Secrets</p>
                <p className="text-[11px] text-slate-500">Secret Manager injected</p>
              </div>
            </div>

            <div className="p-3 bg-[#0C0E12] border border-slate-800 rounded-lg flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-200">Owner-Bound Firestore</p>
                <p className="text-[11px] text-slate-500">request.auth.uid enforced</p>
              </div>
            </div>

            <div className="p-3 bg-[#0C0E12] border border-slate-800 rounded-lg flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-200">4-Tier Fallback Ladder</p>
                <p className="text-[11px] text-slate-500">3.6-flash to 3.7-flash ladder</p>
              </div>
            </div>

            <div className="p-3 bg-[#0C0E12] border border-slate-800 rounded-lg flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-200">Zero-Crash Persistence</p>
                <p className="text-[11px] text-slate-500">stripUndefined payload hygiene</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
