import React, { useState } from 'react';
import { 
  Cpu, 
  Copy, 
  Check, 
  ShieldCheck, 
  KeyRound, 
  Terminal, 
  Layers, 
  ExternalLink,
  Award
} from 'lucide-react';

export const DeploymentCenterView: React.FC = () => {
  const [serviceName, setServiceName] = useState('threatguard-app');
  const [projectId, setProjectId] = useState('my-gcp-project');
  const [projectNumber, setProjectNumber] = useState('102065487064');
  const [region, setRegion] = useState('asia-southeast1');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const firestoreRulesSnippet = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Owner-bound path isolation: only authenticated users can access their own interactions
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

  const secretManagerCommands = `# 1. Create and populate the secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \\
  --member="serviceAccount:${projectNumber}-compute@developer.gserviceaccount.com" \\
  --role="roles/secretmanager.secretAccessor"`;

  const cloudRunDeployCommand = `# Deploy container to Cloud Run mounting Secret Manager secret
gcloud run deploy ${serviceName} \\
  --source . \\
  --region ${region} \\
  --project ${projectId} \\
  --platform managed \\
  --allow-unauthenticated \\
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \\
  --port 3000`;

  const verificationCommand = `gcloud run services update ${serviceName} \\
  --update-labels=dev-tutorial=cloud-run-ai-challenge \\
  --region=${region} \\
  --project=${projectId}`;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#0F1115] text-slate-200 p-6 rounded-xl shadow-xs border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                Directives 3, 4 & 7
              </span>
              <span className="text-xs text-slate-500 uppercase tracking-wider">Production Infrastructure & Challenge Verification</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white mt-1">Cloud Run & Secret Management Center</h2>
            <p className="text-xs text-slate-400 max-w-2xl mt-1">
              Production-hardened scripts for deploying to Google Cloud Run, binding Google Cloud Secret Manager credentials,
              enforcing Firestore owner-bound security rules, and applying the mandatory challenge verification label.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1.5 bg-slate-800 rounded-lg text-emerald-400 border border-slate-700 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> Campaign Label Ready
            </span>
          </div>
        </div>
      </div>

      {/* Deployment Parameter Inputs */}
      <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Deployment Target Parameters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Service Name</label>
            <input
              id="input-service-name"
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-800 rounded-md font-mono bg-[#0A0A0B] text-slate-200 focus:outline-hidden focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">GCP Project ID</label>
            <input
              id="input-project-id"
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-800 rounded-md font-mono bg-[#0A0A0B] text-slate-200 focus:outline-hidden focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">GCP Project Number</label>
            <input
              id="input-project-number"
              type="text"
              value={projectNumber}
              onChange={(e) => setProjectNumber(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-800 rounded-md font-mono bg-[#0A0A0B] text-slate-200 focus:outline-hidden focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">GCP Region</label>
            <input
              id="input-region"
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-800 rounded-md font-mono bg-[#0A0A0B] text-slate-200 focus:outline-hidden focus:border-emerald-500/50"
            />
          </div>
        </div>
      </div>

      {/* Grid of Production Scripts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Campaign Verification Labeling */}
        <div className="bg-[#0F1115] border border-emerald-500/40 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white">Mandatory Challenge Verification Label</h4>
            </div>
            <button
              id="btn-copy-verification-label"
              onClick={() => copySnippet(verificationCommand, 'verification')}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-800 text-emerald-400 hover:bg-slate-700 font-semibold transition-colors border border-slate-700"
            >
              {copiedId === 'verification' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'verification' ? 'Copied!' : 'Copy Verification Command'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Mandatory command to apply the <code className="font-mono bg-[#0C0E12] border border-slate-800 px-1 py-0.5 rounded text-emerald-400">dev-tutorial=cloud-run-ai-challenge</code> resource label to register for verification:
          </p>
          <pre className="text-xs font-mono bg-black text-emerald-400 p-3.5 rounded-lg overflow-x-auto border border-slate-800">
            {verificationCommand}
          </pre>
        </div>

        {/* Section 2: Firestore Security Rules */}
        <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-bold text-white">Directive 3: Owner-Bound Firestore Rules</h4>
            </div>
            <button
              id="btn-copy-firestore-rules"
              onClick={() => copySnippet(firestoreRulesSnippet, 'firestore')}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors border border-slate-700"
            >
              {copiedId === 'firestore' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'firestore' ? 'Copied!' : 'Copy firestore.rules'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Strict user data isolation prohibiting insecure global reads and enforcing owner-bound authentication:
          </p>
          <pre className="text-xs font-mono bg-black text-blue-300 p-3.5 rounded-lg overflow-x-auto border border-slate-800">
            {firestoreRulesSnippet}
          </pre>
        </div>

        {/* Section 3: Secret Manager Setup */}
        <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white">Directive 4: Secret Manager Bindings</h4>
            </div>
            <button
              id="btn-copy-secret-manager"
              onClick={() => copySnippet(secretManagerCommands, 'secrets')}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors border border-slate-700"
            >
              {copiedId === 'secrets' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'secrets' ? 'Copied!' : 'Copy Script'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Creates GEMINI_API_KEY secret and grants runtime service account Secret Accessor role:
          </p>
          <pre className="text-xs font-mono bg-black text-amber-300 p-3.5 rounded-lg overflow-x-auto border border-slate-800">
            {secretManagerCommands}
          </pre>
        </div>

        {/* Section 4: Cloud Run Deploy Command */}
        <div className="bg-[#0F1115] border border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold text-white">Cloud Run Deployment Command</h4>
            </div>
            <button
              id="btn-copy-deploy-cmd"
              onClick={() => copySnippet(cloudRunDeployCommand, 'deploy')}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors border border-slate-700"
            >
              {copiedId === 'deploy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === 'deploy' ? 'Copied!' : 'Copy Deploy Command'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Deploys the containerized service mounting Secret Manager as an environment variable:
          </p>
          <pre className="text-xs font-mono bg-black text-purple-300 p-3.5 rounded-lg overflow-x-auto border border-slate-800">
            {cloudRunDeployCommand}
          </pre>
        </div>
      </div>
    </div>
  );
};
