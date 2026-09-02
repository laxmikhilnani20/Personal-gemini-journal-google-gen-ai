import React, { useState } from 'react';
import { 
  Terminal, 
  Sparkles, 
  AlertOctagon, 
  Copy, 
  Check, 
  Code, 
  RefreshCw, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { SecurityReviewResult, Vulnerability } from '../types';
import { getAuthHeaders } from '../lib/firebase';

interface SecurityReviewViewProps {
  onPersistSuccess: () => void;
}

const CODE_TEMPLATES = [
  {
    label: 'Insecure Firestore Rule',
    context: 'Firebase / Firestore Security Rules file (firestore.rules)',
    code: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // INSECURE: Allows unauthenticated global public read and write access
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`,
  },
  {
    label: 'Hardcoded API Key',
    context: 'Server configuration file (server.ts / config.ts)',
    code: `import { GoogleGenAI } from '@google/genai';

// CRITICAL FLAW: Hardcoded API credentials directly in source code
const GEMINI_API_KEY = "AIzaSyD7kL90-X19929mZ8x02LLKq9-0129k";

export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });`,
  },
  {
    label: 'Prompt Injection Risk',
    context: 'LLM Prompt orchestration service (aiService.ts)',
    code: `// FLAW: Raw concatenation of untrusted user input without delimiters or escaping
export async function summarizeSupportTicket(untrustedUserInput: string) {
  const prompt = "You are a customer assistant. " + untrustedUserInput;
  return await geminiClient.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt
  });
}`,
  },
  {
    label: 'Missing Undefined Stripping',
    context: 'Firestore database persistence layer (db.ts)',
    code: `import { doc, setDoc } from 'firebase/firestore';

export async function saveUserProfile(userId: string, data: any) {
  // CRASH RISK: Firestore SDK throws error if any property is undefined
  const docRef = doc(db, 'users', userId);
  await setDoc(docRef, data);
}`,
  },
];

export const SecurityReviewView: React.FC<SecurityReviewViewProps> = ({ onPersistSuccess }) => {
  const [context, setContext] = useState(CODE_TEMPLATES[0].context);
  const [codeSnippet, setCodeSnippet] = useState(CODE_TEMPLATES[0].code);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [result, setResult] = useState<SecurityReviewResult | null>(null);
  const [modelUsed, setModelUsed] = useState('');
  const [latency, setLatency] = useState(0);
  const [copiedPatchIdx, setCopiedPatchIdx] = useState<number | null>(null);

  const applyTemplate = (template: typeof CODE_TEMPLATES[0]) => {
    setContext(template.context);
    setCodeSnippet(template.code);
  };

  const handleReview = async () => {
    if (!codeSnippet.trim()) {
      setErrorBanner('Please provide code or architecture text to review.');
      return;
    }

    setLoading(true);
    setErrorBanner(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/security-review', {
        method: 'POST',
        headers,
        body: JSON.stringify({ codeSnippet, context }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Review failed with status ${response.status}`);
      }

      const resJson = await response.json();
      setResult(resJson.data);
      setModelUsed(resJson.modelUsed);
      setLatency(resJson.latencyMs);
      onPersistSuccess();
    } catch (err: any) {
      console.error('Security review error:', err);
      setErrorBanner(err.message || 'Failed to complete security audit.');
    } finally {
      setLoading(false);
    }
  };

  const copyPatch = (patch: string, idx: number) => {
    navigator.clipboard.writeText(patch);
    setCopiedPatchIdx(idx);
    setTimeout(() => setCopiedPatchIdx(null), 2000);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-950 text-rose-300 font-bold border border-rose-700';
      case 'HIGH':
        return 'bg-amber-950 text-amber-300 font-semibold border border-amber-700';
      case 'MEDIUM':
        return 'bg-yellow-950 text-yellow-300 font-medium border border-yellow-700';
      case 'LOW':
        return 'bg-blue-950 text-blue-300 font-medium border border-blue-700';
      default:
        return 'bg-slate-800 text-slate-400 border border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-[#0F1115] text-slate-200 p-6 rounded-xl shadow-xs border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30 font-semibold">
                Directive 5: Security Reviewer
              </span>
              <span className="text-xs text-slate-500 uppercase tracking-wider">OWASP Top 10 Web & LLM Code Auditor</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white mt-1">Code & Security Rules Reviewer</h2>
            <p className="text-xs text-slate-400 max-w-2xl mt-1">
              Inspects source code, Firestore rules, and API orchestrations for hardcoded secrets, broken access controls,
              and prompt injection vectors. Generates concrete unified diffs for remediation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1.5 bg-slate-800 rounded-lg text-emerald-400 border border-slate-700">
              Auto-Patch Generator
            </span>
          </div>
        </div>
      </div>

      {/* Code Input Form */}
      <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white">Code Snippet or Security Rules to Audit</h3>
            <p className="text-xs text-slate-400">Inspect for vulnerabilities, insecure defaults, and missing auth.</p>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Load Flaw Template:</span>
            {CODE_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                id={`btn-code-template-${idx}`}
                onClick={() => applyTemplate(tmpl)}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors whitespace-nowrap border border-slate-700"
              >
                {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Architecture or File Context</label>
          <input
            id="input-review-context"
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-800 rounded-lg focus:outline-hidden focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 bg-[#0A0A0B] text-slate-200 placeholder-slate-600"
            placeholder="e.g. firestore.rules or server.ts"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Source Code / Rules Snippet</label>
          <textarea
            id="input-code-snippet"
            rows={8}
            value={codeSnippet}
            onChange={(e) => setCodeSnippet(e.target.value)}
            className="w-full font-mono text-xs p-3 border border-slate-800 rounded-lg focus:outline-hidden focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 bg-black text-emerald-400 resize-y"
            placeholder="Paste code or rules here..."
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            Audits data flows and produces unified diff patches for immediate remediation.
          </p>
          <button
            id="btn-run-security-review"
            onClick={handleReview}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                <span>Auditing Code & Generating Diffs...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>Audit Code & Generate Diffs</span>
              </>
            )}
          </button>
        </div>

        {errorBanner && (
          <div className="p-3 bg-red-950/80 border border-red-800 rounded-lg flex items-center justify-between text-xs text-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={handleReview}
              className="px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white rounded font-medium text-xs transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Review Results */}
      {result && (
        <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Security Review Findings</h3>
                <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700 font-semibold">
                  {result.vulnerabilityCount} Findings
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{result.summary}</p>
            </div>
            <div className="text-xs font-mono bg-[#0C0E12] border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400">
              Model: <span className="text-purple-400 font-semibold">{modelUsed}</span> ({latency}ms)
            </div>
          </div>

          {/* Vulnerabilities List */}
          <div className="space-y-4">
            {result.vulnerabilities.map((vuln, idx) => (
              <div key={idx} className="border border-slate-800 rounded-lg p-4 bg-[#0C0E12] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs ${getSeverityBadge(vuln.severity)}`}>
                      {vuln.severity}
                    </span>
                    <h4 className="text-xs font-bold text-white">{vuln.title}</h4>
                  </div>
                  <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {vuln.owaspCategory}
                  </span>
                </div>

                <p className="text-xs text-slate-300">{vuln.description}</p>

                {/* Vulnerable vs Remediated side-by-side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
                  {vuln.vulnerableSnippet && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                        <AlertOctagon className="w-3 h-3" /> Vulnerable Pattern
                      </span>
                      <pre className="text-xs font-mono bg-rose-950/40 text-rose-200 p-3 rounded-md overflow-x-auto border border-rose-900/60">
                        {vuln.vulnerableSnippet}
                      </pre>
                    </div>
                  )}

                  {vuln.remediationSnippet && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Remediation Standard
                      </span>
                      <pre className="text-xs font-mono bg-black text-emerald-400 p-3 rounded-md overflow-x-auto border border-slate-800">
                        {vuln.remediationSnippet}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Unified Diff Box */}
                {vuln.unifiedDiff && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between pb-1.5">
                      <span className="text-[11px] font-mono text-slate-400 font-semibold">Unified Diff Patch:</span>
                      <button
                        id={`btn-copy-patch-${idx}`}
                        onClick={() => copyPatch(vuln.unifiedDiff!, idx)}
                        className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white font-medium px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
                      >
                        {copiedPatchIdx === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied Patch!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>Copy Unified Diff</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-xs font-mono bg-black text-slate-200 p-3 rounded-md overflow-x-auto border border-slate-800">
                      {vuln.unifiedDiff}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
