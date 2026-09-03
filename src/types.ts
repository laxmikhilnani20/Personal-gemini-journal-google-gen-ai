export type ThreatZone =
  | 'Input Surfaces'
  | 'Planning & Reasoning'
  | 'Tool Execution'
  | 'Memory & State'
  | 'Inter-System Communication';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ThreatItem {
  zone: ThreatZone;
  threat: string;
  scenario?: string;
  owasp: string;
  likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: Severity;
  countermeasure: string;
}

export interface ThreatModelResult {
  systemName: string;
  executiveSummary: string;
  threatScore?: number;
  threats: ThreatItem[];
  productionDirectivesCompliance?: {
    zeroHardcodedSecrets?: string;
    ownerBoundFirestore?: string;
    resilientModelLadder?: string;
    topLevelDeserialization?: string;
  };
}

export interface Vulnerability {
  severity: Severity;
  title: string;
  owaspCategory: string;
  description: string;
  vulnerableSnippet?: string;
  remediationSnippet?: string;
  unifiedDiff?: string;
}

export interface SecurityReviewResult {
  summary: string;
  vulnerabilityCount: number;
  vulnerabilities: Vulnerability[];
  remediationDiff?: string;
}

export interface AttemptLog {
  model: string;
  status: 'success' | 'failed';
  errorCode?: number | string;
  errorMessage?: string;
  durationMs: number;
}

export interface PersistedInteraction {
  id: string;
  createdAt: string;
  type: 'threat_model' | 'security_review' | 'fallback_test';
  title: string;
  systemName: string;
  threatCount: number;
  criticalCount: number;
  modelUsed: string;
  latencyMs: number;
  inputPayload: Record<string, any>;
  resultData: Record<string, any>;
}

// User-Authenticated Journal & Reflection Types
export type ReflectionCategory =
  | 'Deep Reflection'
  | 'Daily Retrospective'
  | 'Brainstorming & Ideas'
  | 'Gratitude & Mindset'
  | 'Problem Solving';

export type ReflectionMood =
  | 'Peaceful'
  | 'Energized'
  | 'Pensive'
  | 'Challenged'
  | 'Grateful'
  | 'Focused';

export interface JournalTurn {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  mode?: 'chat' | 'brainstorm' | 'summary' | 'reflection';
  primaryEmotion?: string;
  stressScore?: number;
}

export interface ReflectionSummary {
  executiveSummary: string;
  keyTakeaways: string[];
  actionItems: string[];
  emotionalTone: string;
  suggestedPrompts: string[];
}

export interface ReflectionSession {
  id: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  title: string;
  category: ReflectionCategory;
  mood: ReflectionMood;
  turns: JournalTurn[];
  replyText?: string;
  primaryEmotion?: string;
  stressScore?: number;
  summary?: ReflectionSummary;
  tags?: string[];
  modelUsed: string;
  createdAt: string;
  updatedAt: string;
}

export interface MoodOverviewData {
  primaryEmotion: string;
  stressScore: number;
  assessedAt?: string;
  sampleThought?: string;
}

export interface JournalEntryResponse {
  success: boolean;
  replyText: string;
  reply?: string;
  primaryEmotion: string;
  stressScore: number;
  firestorePersisted?: boolean;
  modelUsed?: string;
  latencyMs?: number;
}

export interface PastEntryContextItem {
  id: string;
  date: string;
  title?: string;
  category?: string;
  mood?: string;
  primaryEmotion?: string;
  stressScore?: number;
  thoughtSnippet: string;
  replySnippet?: string;
}

export interface ChatPastMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  entriesAnalyzed?: number;
  referencedEntries?: PastEntryContextItem[];
  modelUsed?: string;
  latencyMs?: number;
}

export interface ChatPastResponse {
  success: boolean;
  answer: string;
  question: string;
  entriesAnalyzed: number;
  referencedEntries: PastEntryContextItem[];
  modelUsed?: string;
  latencyMs?: number;
  warning?: string;
}

