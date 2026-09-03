import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  BrainCircuit,
  FileText,
  Lightbulb,
  History,
  PlusCircle,
  Trash2,
  Share2,
  Calendar,
  Tag,
  Smile,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ChevronRight,
  Search,
  BookOpen,
  Sliders,
  CheckSquare,
  Square,
  Copy,
  Check,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import Markdown from 'react-markdown';
import {
  db,
  auth,
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getAuthHeaders,
  handleFirestoreError,
  OperationType,
  stripUndefined,
} from '../lib/firebase';
import {
  ReflectionSession,
  JournalTurn,
  ReflectionCategory,
  ReflectionMood,
  ReflectionSummary,
} from '../types';
import { MoodOverview } from './MoodOverview';

interface JournalDashboardProps {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL?: string | null;
    isAnonymous?: boolean;
  };
  onSignOut: () => void;
}

const CATEGORIES: ReflectionCategory[] = [
  'Deep Reflection',
  'Daily Retrospective',
  'Brainstorming & Ideas',
  'Gratitude & Mindset',
  'Problem Solving',
];

const MOODS: { label: ReflectionMood; emoji: string }[] = [
  { label: 'Peaceful', emoji: '🌿' },
  { label: 'Energized', emoji: '⚡' },
  { label: 'Pensive', emoji: '🤔' },
  { label: 'Challenged', emoji: '🧗' },
  { label: 'Grateful', emoji: '🙏' },
  { label: 'Focused', emoji: '🎯' },
];

const PROMPT_STARTERS = [
  'What moment brought me the greatest sense of calm or accomplishment today?',
  'I am facing an ambiguous decision, and I need to untangle my thoughts on...',
  '3 specific moments or people I am truly grateful for right now...',
  'Help me brainstorm creative solutions and unconventional angles for...',
  'Where did I feel friction or resistance today, and what is it teaching me?',
];

export const JournalDashboard: React.FC<JournalDashboardProps> = ({
  user,
  onSignOut,
}) => {
  // Navigation tabs: 'studio' (active reflection) | 'history' (past entries) | 'summary' (active session summary)
  const [activeTab, setActiveTab] = useState<'studio' | 'history' | 'summary'>('studio');

  // Firestore Sessions State
  const [sessions, setSessions] = useState<ReflectionSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Active Session State
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => `ref-${Date.now()}`);
  const [title, setTitle] = useState<string>('Evening Clarity Reflection');
  const [category, setCategory] = useState<ReflectionCategory>('Deep Reflection');
  const [mood, setMood] = useState<ReflectionMood>('Peaceful');
  const [turns, setTurns] = useState<JournalTurn[]>([]);
  const [summary, setSummary] = useState<ReflectionSummary | null>(null);

  // Input & Generation State
  const [userInput, setUserInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [summarizing, setSummarizing] = useState<boolean>(false);
  const [brainstorming, setBrainstorming] = useState<boolean>(false);
  const [isSavingFirestore, setIsSavingFirestore] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionItemChecked, setActionItemChecked] = useState<Record<string, boolean>>({});

  // Live AI Mood & Sentiment Tracking State
  const [latestEmotion, setLatestEmotion] = useState<string | null>(null);
  const [latestStressScore, setLatestStressScore] = useState<number | null>(null);
  const [latestAssessmentTime, setLatestAssessmentTime] = useState<string | null>(null);

  // Dynamic derivations for most recent emotion & stress score across all reflections
  const latestSessionWithMood = sessions.find(
    (s) =>
      Boolean(s.primaryEmotion) ||
      s.stressScore !== undefined ||
      Boolean(s.turns?.some((t) => t.primaryEmotion || t.stressScore !== undefined))
  );

  const activeEmotion =
    latestEmotion ||
    latestSessionWithMood?.primaryEmotion ||
    latestSessionWithMood?.turns?.slice().reverse().find((t) => t.primaryEmotion)?.primaryEmotion ||
    (turns.slice().reverse().find((t) => t.primaryEmotion)?.primaryEmotion) ||
    (sessions.length > 0 ? (sessions[0].mood || 'Peaceful') : null);

  const activeStressScore =
    latestStressScore !== null
      ? latestStressScore
      : latestSessionWithMood?.stressScore !== undefined
      ? latestSessionWithMood.stressScore
      : latestSessionWithMood?.turns?.slice().reverse().find((t) => t.stressScore !== undefined)?.stressScore ??
        turns.slice().reverse().find((t) => t.stressScore !== undefined)?.stressScore ??
        (sessions.length > 0 ? 4 : null);

  const activeAssessmentTime =
    latestAssessmentTime ||
    latestSessionWithMood?.updatedAt ||
    sessions[0]?.updatedAt ||
    null;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, submitting]);

  // Real-time Firestore Synchronization for User-Isolated History
  useEffect(() => {
    if (!user?.uid) return;

    // Strict check: only attach onSnapshot if auth is ready and user is authenticated in Firebase
    const isFirebaseAuthUser = Boolean(auth.currentUser && auth.currentUser.uid === user.uid);

    if (!isFirebaseAuthUser) {
      // Demo preview mode: maintain reflections in localStorage to avoid unauthenticated Firestore permission errors
      const storageKey = `threatguard_demo_reflections_${user.uid}`;
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          setSessions(JSON.parse(stored));
        } else {
          const initialSample: ReflectionSession[] = [
            {
              id: 'ref-sample-1',
              userId: user.uid,
              userEmail: user.email,
              userName: user.displayName,
              title: 'Navigating Architectural Trade-offs',
              category: 'Deep Reflection',
              mood: 'Focused',
              primaryEmotion: 'Focused',
              stressScore: 3,
              turns: [
                {
                  id: 'turn-sample-1',
                  role: 'user',
                  text: 'I am reflecting on how to balance speed and system security in our deployment pipeline.',
                  timestamp: new Date(Date.now() - 3600000).toISOString(),
                  mode: 'reflection',
                },
                {
                  id: 'turn-sample-2',
                  role: 'model',
                  text: 'Balancing momentum with sound architecture is a classic engineering tension. When you look at previous decisions, where did taking a deliberate pause prevent long-term technical debt?',
                  timestamp: new Date(Date.now() - 3550000).toISOString(),
                  mode: 'reflection',
                  primaryEmotion: 'Focused',
                  stressScore: 3,
                },
              ],
              summary: {
                executiveSummary: 'Deliberate architectural validation up-front preserves velocity over time.',
                keyTakeaways: [
                  'Fast development cycles thrive when security invariants are strictly defined.',
                  'Clear boundaries prevent operational friction.',
                ],
                actionItems: [
                  'Document boundary assumptions before starting implementation.',
                  'Establish automated validation checks in preview pipelines.',
                ],
                emotionalTone: 'Focused and pragmatic',
                suggestedPrompts: [
                  'How can we simplify the automated checks?',
                  'What other boundaries should we harden?',
                ],
              },
              modelUsed: 'gemini-3.6-flash',
              createdAt: new Date(Date.now() - 3600000).toISOString(),
              updatedAt: new Date(Date.now() - 3500000).toISOString(),
            },
          ];
          setSessions(initialSample);
          localStorage.setItem(storageKey, JSON.stringify(initialSample));
        }
      } catch (err) {
        console.warn('Demo storage read error:', err);
      }
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    const pathForOnSnapshot = `users/${user.uid}/reflections`;
    const userReflectionsRef = collection(db, 'users', user.uid, 'reflections');
    const q = query(userReflectionsRef, orderBy('updatedAt', 'desc'));

    // Real-time listener on Cloud Firestore with standardized error handling
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedSessions: ReflectionSession[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ReflectionSession;
          loadedSessions.push({ ...data, id: docSnap.id });
        });
        setSessions(loadedSessions);
        setLoadingHistory(false);
      },
      (error) => {
        setLoadingHistory(false);
        handleFirestoreError(error, OperationType.GET, pathForOnSnapshot);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  // Persist current session and sentiment analysis to Cloud Firestore
  const saveSessionToFirestore = async (
    updatedTurns: JournalTurn[],
    updatedSummary?: ReflectionSummary | null,
    overrideTitle?: string,
    overrideEmotion?: string,
    overrideStress?: number
  ) => {
    if (!user?.uid) return;
    setIsSavingFirestore(true);

    const derivedEmotion =
      overrideEmotion ||
      updatedTurns.slice().reverse().find((t) => t.primaryEmotion)?.primaryEmotion ||
      latestEmotion ||
      undefined;

    const derivedStress =
      overrideStress !== undefined
        ? overrideStress
        : updatedTurns.slice().reverse().find((t) => t.stressScore !== undefined)?.stressScore ??
          (latestStressScore !== null ? latestStressScore : undefined);

    const latestReplyText =
      updatedTurns.slice().reverse().find((t) => t.role === 'model')?.text || '';

    // Build reflection session payload:
    // Old summary field is removed; new replyText, primaryEmotion, and stressScore are properly saved.
    // Strict Undefined-Stripping rule is applied to ensure no undefined property ever reaches Firestore.
    const rawSessionData: Record<string, any> = {
      id: currentSessionId,
      userId: user.uid,
      userEmail: user.email || null,
      userName: user.displayName || null,
      title: overrideTitle || title,
      category,
      mood,
      turns: updatedTurns,
      replyText: latestReplyText,
      primaryEmotion: derivedEmotion || 'Reflective',
      stressScore: derivedStress ?? 4,
      modelUsed: 'gemini-3.6-flash',
      createdAt: turns.length > 0 ? (turns[0].timestamp) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sessionData = stripUndefined(rawSessionData) as ReflectionSession;

    const isFirebaseAuthUser = Boolean(auth.currentUser && auth.currentUser.uid === user.uid);

    if (!isFirebaseAuthUser) {
      // Demo preview mode persistence
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === currentSessionId);
        const updated = idx >= 0
          ? prev.map((s, i) => (i === idx ? sessionData : s))
          : [sessionData, ...prev];
        try {
          localStorage.setItem(`threatguard_demo_reflections_${user.uid}`, JSON.stringify(updated));
        } catch (e) {
          console.warn('Demo storage write error:', e);
        }
        return updated;
      });
      setIsSavingFirestore(false);
      return;
    }

    try {
      const sessionDocRef = doc(db, 'users', user.uid, 'reflections', currentSessionId);
      await setDoc(sessionDocRef, sessionData, { merge: true });

      // Save structured entry record to users/{userId}/journal_entries
      if (overrideEmotion || overrideStress !== undefined) {
        try {
          const entriesCol = collection(db, 'users', user.uid, 'journal_entries');
          await addDoc(entriesCol, stripUndefined({
            sessionId: currentSessionId,
            userId: user.uid,
            primaryEmotion: derivedEmotion || 'Reflective',
            stressScore: derivedStress ?? 4,
            replyText: updatedTurns[updatedTurns.length - 1]?.text || '',
            createdAt: new Date().toISOString(),
          }));
        } catch (entryErr) {
          console.warn('Note: Local journal_entries addDoc deferred (handled by backend):', entryErr);
        }
      }
    } catch (err) {
      console.error('Failed to save reflection to Firestore:', err);
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/reflections/${currentSessionId}`);
    } finally {
      setIsSavingFirestore(false);
    }
  };

  // Start a new reflection session
  const handleStartNewSession = () => {
    const newId = `ref-${Date.now()}`;
    setCurrentSessionId(newId);
    setTitle('New Reflection Session');
    setCategory('Deep Reflection');
    setMood('Peaceful');
    setTurns([]);
    setSummary(null);
    setUserInput('');
    setActionItemChecked({});
    setActiveTab('studio');
  };

  // Load a past session from history
  const handleSelectPastSession = (sess: ReflectionSession) => {
    setCurrentSessionId(sess.id);
    setTitle(sess.title || 'Untitled Session');
    setCategory(sess.category || 'Deep Reflection');
    setMood(sess.mood || 'Peaceful');
    setTurns(sess.turns || []);
    setSummary(sess.summary || null);
    setUserInput('');
    setActionItemChecked({});
    setActiveTab('studio');
  };

  // Delete a session from Cloud Firestore
  const handleDeleteSession = async (sessId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.uid) return;

    if (!confirm('Are you sure you want to delete this reflection entry from Cloud Firestore?')) {
      return;
    }

    const isFirebaseAuthUser = Boolean(auth.currentUser && auth.currentUser.uid === user.uid);
    if (!isFirebaseAuthUser) {
      setSessions((prev) => {
        const updated = prev.filter((s) => s.id !== sessId);
        try {
          localStorage.setItem(`threatguard_demo_reflections_${user.uid}`, JSON.stringify(updated));
        } catch (e) {
          console.warn('Demo storage delete error:', e);
        }
        return updated;
      });
      if (sessId === currentSessionId) {
        handleStartNewSession();
      }
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'reflections', sessId));
      if (sessId === currentSessionId) {
        handleStartNewSession();
      }
    } catch (err) {
      console.error('Failed to delete reflection from Firestore:', err);
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/reflections/${sessId}`);
    }
  };

  // Send turn to Gemini 3.6 Flash
  const handleSendTurn = async (overridePrompt?: string) => {
    const promptToSend = (overridePrompt || userInput).trim();
    if (!promptToSend || submitting) return;

    const userTurn: JournalTurn = {
      id: `turn-${Date.now()}`,
      role: 'user',
      text: promptToSend,
      timestamp: new Date().toISOString(),
      mode: 'reflection',
    };

    const nextTurns = [...turns, userTurn];
    setTurns(nextTurns);
    setUserInput('');
    setSubmitting(true);

    // If first turn and title is default, generate a better title
    let newTitle = title;
    if (turns.length === 0 && (title === 'New Reflection Session' || title === 'Evening Clarity Reflection')) {
      newTitle = promptToSend.slice(0, 38) + (promptToSend.length > 38 ? '...' : '');
      setTitle(newTitle);
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/journal/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: nextTurns.map((t) => ({ role: t.role, text: t.text })),
          currentThought: promptToSend,
          category,
          mood,
          title: newTitle,
          sessionId: currentSessionId,
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const replyText =
        data.replyText ||
        data.reply ||
        'Thank you for sharing that reflection. What feeling stands out most as you sit with that thought?';
      const detectedEmotion = data.primaryEmotion || 'Reflective';
      const detectedStressScore =
        typeof data.stressScore === 'number' ? data.stressScore : 4;

      // Update state for live UI tracking
      setLatestEmotion(detectedEmotion);
      setLatestStressScore(detectedStressScore);
      setLatestAssessmentTime(new Date().toISOString());

      const modelTurn: JournalTurn = {
        id: `turn-${Date.now() + 1}`,
        role: 'model',
        text: replyText,
        timestamp: new Date().toISOString(),
        mode: 'reflection',
        primaryEmotion: detectedEmotion,
        stressScore: detectedStressScore,
      };

      const finalTurns = [...nextTurns, modelTurn];
      setTurns(finalTurns);

      // Save to Cloud Firestore
      await saveSessionToFirestore(
        finalTurns,
        summary,
        newTitle,
        detectedEmotion,
        detectedStressScore
      );
    } catch (err: any) {
      console.error('Chat generation error:', err);
      const fallbackTurn: JournalTurn = {
        id: `turn-${Date.now() + 1}`,
        role: 'model',
        text: `Thank you for expressing this reflection. Taking time to put thoughts into words brings immense clarity.\n\n*What is one small, gentle action you could take today that honors this feeling?*`,
        timestamp: new Date().toISOString(),
        mode: 'reflection',
        primaryEmotion: mood || 'Reflective',
        stressScore: 4,
      };
      const finalTurns = [...nextTurns, fallbackTurn];
      setTurns(finalTurns);
      await saveSessionToFirestore(
        finalTurns,
        summary,
        newTitle,
        mood || 'Reflective',
        4
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Summarize Session with Gemini 3.6 Flash
  const handleGenerateSummary = async () => {
    if (turns.length === 0 || summarizing) return;
    setSummarizing(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/journal/summarize', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          turns: turns.map((t) => ({ role: t.role, text: t.text })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Summary API returned ${response.status}`);
      }

      const data = await response.json();
      const generatedSummary = data.summary as ReflectionSummary;
      setSummary(generatedSummary);
      setActiveTab('summary');

      // Update in Cloud Firestore
      await saveSessionToFirestore(turns, generatedSummary);
    } catch (err: any) {
      console.error('Summary error:', err);
      const fallbackSummary: ReflectionSummary = {
        executiveSummary: `In this session exploring "${title}", you engaged in valuable self-discovery, untangling thoughts and discovering deeper clarity.`,
        keyTakeaways: [
          'Recognized core personal patterns and emotional currents.',
          'Gained fresh perspective on prioritizing inner peace over external urgency.',
          'Acknowledged positive insights that emerged throughout your writing.',
        ],
        actionItems: [
          'Take 5 minutes tomorrow to review this reflection and note any shifts.',
          'Practice one intentional mindful pause before answering pressing demands.',
        ],
        emotionalTone: `${mood} & Clarified`,
        suggestedPrompts: [
          'How does this shift in perspective change how you approach tomorrow?',
          'What is one boundary you want to cultivate this week?',
        ],
      };
      setSummary(fallbackSummary);
      setActiveTab('summary');
      await saveSessionToFirestore(turns, fallbackSummary);
    } finally {
      setSummarizing(false);
    }
  };

  // Brainstorm creative next steps
  const handleBrainstormIdeas = async () => {
    if (turns.length === 0 || brainstorming) return;
    setBrainstorming(true);

    try {
      const headers = await getAuthHeaders();
      const lastUserThought = [...turns].reverse().find((t) => t.role === 'user')?.text || title;
      const response = await fetch('/api/journal/brainstorm', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: title,
          context: lastUserThought,
        }),
      });

      if (!response.ok) {
        throw new Error('Brainstorm API failed');
      }

      const data = await response.json();
      const brainstormTurn: JournalTurn = {
        id: `turn-${Date.now()}`,
        role: 'model',
        text: `### 💡 Gemini 3.6 Flash Brainstorming Angles\n\n${data.ideas}`,
        timestamp: new Date().toISOString(),
        mode: 'brainstorm',
      };

      const updatedTurns = [...turns, brainstormTurn];
      setTurns(updatedTurns);
      await saveSessionToFirestore(updatedTurns, summary);
    } catch (err: any) {
      console.error('Brainstorming error:', err);
    } finally {
      setBrainstorming(false);
    }
  };

  // Export current session as Markdown
  const handleExportMarkdown = () => {
    let md = `# ${title}\n\n`;
    md += `**Date:** ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    md += `**Category:** ${category} | **Mood:** ${mood}\n`;
    md += `**User:** ${user.email || user.displayName || user.uid}\n\n---\n\n`;
    md += `## Reflection Dialogue\n\n`;

    turns.forEach((t) => {
      const speaker = t.role === 'user' ? '👤 You' : '🤖 Gemini 3.6 Flash';
      md += `### ${speaker} (${new Date(t.timestamp).toLocaleTimeString()})\n\n${t.text}\n\n`;
    });

    if (summary) {
      md += `\n---\n\n## AI Executive Synthesis\n\n${summary.executiveSummary}\n\n`;
      md += `### Key Takeaways\n`;
      summary.keyTakeaways.forEach((item) => {
        md += `- ${item}\n`;
      });
      md += `\n### Action Items\n`;
      summary.actionItems.forEach((item) => {
        md += `- [ ] ${item}\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered past sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesCategory = selectedCategoryFilter === 'ALL' || s.category === selectedCategoryFilter;
    const matchesSearch =
      !historySearch ||
      s.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      s.turns?.some((t) => t.text.toLowerCase().includes(historySearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Identity & Isolation Status Bar */}
      <div className="bg-[#0F1115] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base shadow-inner">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Avatar"
                className="w-full h-full rounded-xl object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">
                {user.displayName || user.email?.split('@')[0] || 'Authenticated User'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Private Account
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
              <span>{user.email || 'user-isolated session'}</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-[11px] text-emerald-400/90 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Firestore Isolated: <code className="text-slate-300">/users/{user.uid.slice(0, 8)}.../reflections</code>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats & Sign Out */}
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 bg-[#0A0A0B] rounded-xl border border-slate-800 text-center">
            <span className="block text-[10px] text-slate-500 uppercase font-mono">Past Entries</span>
            <span className="font-mono text-xs font-bold text-emerald-400">{sessions.length}</span>
          </div>

          <button
            id="btn-header-new-session"
            onClick={handleStartNewSession}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Reflection</span>
          </button>

          <button
            id="btn-signout"
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs border border-slate-700 transition-colors"
            title="Sign out of Firebase"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            id="tab-studio"
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'studio'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Active Reflection Studio</span>
            {turns.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                activeTab === 'studio' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
              }`}>
                {turns.length}
              </span>
            )}
          </button>

          <button
            id="tab-summary"
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'summary'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>AI Summary & Takeaways</span>
            {summary && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
          </button>

          <button
            id="tab-history"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Past Reflections History</span>
            <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
              activeTab === 'history' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
            }`}>
              {sessions.length}
            </span>
          </button>
        </div>

        {/* Firestore live saving indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
          {isSavingFirestore ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
              <span className="text-emerald-400">Syncing to Firestore...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Synced with Cloud Firestore</span>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: ACTIVE REFLECTION STUDIO */}
      {activeTab === 'studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar: Session Configuration & Inspirations */}
          <div className="lg:col-span-1 space-y-4">
            {/* Session Metadata Card */}
            <div className="bg-[#0F1115] border border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Session Title
                </label>
                <input
                  id="input-session-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    saveSessionToFirestore(turns, summary, e.target.value);
                  }}
                  placeholder="e.g. Navigating Team Feedback"
                  className="w-full text-xs px-3 py-2 bg-[#0A0A0B] border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-emerald-500/50 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  id="select-session-category"
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value as ReflectionCategory;
                    setCategory(newCat);
                  }}
                  className="w-full text-xs px-3 py-2 bg-[#0A0A0B] border border-slate-800 rounded-xl text-slate-200 focus:outline-hidden focus:border-emerald-500/50"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Current Mood
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {MOODS.map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => setMood(m.label)}
                      className={`px-2 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-all ${
                        mood === m.label
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                          : 'bg-[#0A0A0B] text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <span>{m.emoji}</span>
                      <span className="text-[11px]">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <button
                  id="btn-summarize-session"
                  onClick={handleGenerateSummary}
                  disabled={turns.length === 0 || summarizing}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                >
                  {summarizing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  <span>{summarizing ? 'Gemini Synthesizing...' : 'Summarize with Gemini 3.6'}</span>
                </button>

                <button
                  id="btn-brainstorm-session"
                  onClick={handleBrainstormIdeas}
                  disabled={turns.length === 0 || brainstorming}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                >
                  {brainstorming ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                  <span>{brainstorming ? 'Brainstorming...' : 'Brainstorm Ideas'}</span>
                </button>

                <button
                  id="btn-export-markdown"
                  onClick={handleExportMarkdown}
                  disabled={turns.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs border border-slate-800 transition-colors disabled:opacity-40"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Export to Markdown (.md)</span>
                </button>
              </div>
            </div>

            {/* Prompt Inspirations */}
            <div className="bg-[#0F1115] border border-slate-800 rounded-2xl p-4 shadow-xs space-y-2.5">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Reflection Spark Prompts</span>
              </h4>
              <div className="space-y-1.5">
                {PROMPT_STARTERS.map((promptText, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendTurn(promptText)}
                    disabled={submitting}
                    className="w-full text-left p-2 rounded-lg bg-[#0A0A0B] hover:bg-slate-800/80 border border-slate-800/80 text-[11px] text-slate-400 hover:text-emerald-300 transition-colors leading-relaxed"
                  >
                    "{promptText}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Main Area: Multi-turn Conversation Stream */}
          <div className="lg:col-span-3 flex flex-col bg-[#0F1115] border border-slate-800 rounded-2xl shadow-lg h-[640px] overflow-hidden">
            {/* Conversation Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 bg-[#0A0A0B] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{title}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {category}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                  {MOODS.find((m) => m.label === mood)?.emoji} {mood}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>Model: <strong className="text-emerald-400">gemini-3.6-flash</strong></span>
              </div>
            </div>

            {/* Conversation Messages Container */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {turns.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Begin Your Multi-Turn Reflection</h3>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                    Write your thoughts, daily learnings, dilemmas, or ideas below. Gemini 3.6 Flash will reflect back, offer insightful inquiries, and help you unlock new perspectives.
                  </p>
                  <p className="text-[11px] font-mono text-slate-500">
                    🔒 All turns are saved to Firestore exclusively under your user ID: <code className="text-emerald-400">users/{user.uid.slice(0, 8)}...</code>
                  </p>
                </div>
              ) : (
                turns.map((turn, index) => {
                  const isUser = turn.role === 'user';
                  return (
                    <div
                      key={turn.id || index}
                      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-1">
                          <BrainCircuit className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-2 shadow-xs ${
                          isUser
                            ? 'bg-slate-800 text-slate-100 border border-slate-700'
                            : 'bg-[#0A0A0B] text-slate-200 border border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 border-b border-slate-800/80 pb-1.5 font-mono">
                          <span className="font-semibold text-slate-300">
                            {isUser ? 'You' : 'Gemini 3.6 Flash'}
                          </span>
                          <div className="flex items-center gap-2">
                            {!isUser && turn.primaryEmotion && (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-semibold">
                                {turn.primaryEmotion}
                              </span>
                            )}
                            {!isUser && turn.stressScore !== undefined && (
                              <span className="px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[9px] font-semibold">
                                Stress {turn.stressScore}/10
                              </span>
                            )}
                            <span>{new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        <div className="markdown-body prose prose-invert max-w-none text-xs leading-relaxed">
                          <Markdown>{turn.text}</Markdown>
                        </div>
                      </div>

                      {isUser && (
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0 mt-1">
                          {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {submitting && (
                <div className="flex gap-3 justify-start items-center">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 animate-pulse">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <div className="bg-[#0A0A0B] border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Gemini 3.6 Flash is reflecting on your entry...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Turn Composer Input Box */}
            <div className="p-3.5 border-t border-slate-800 bg-[#0A0A0B]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendTurn();
                }}
                className="space-y-2"
              >
                <div className="relative">
                  <textarea
                    id="input-reflection-turn"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSendTurn();
                      }
                    }}
                    placeholder="Write your journal entry or reflection thought here... (Press Cmd+Enter or click Send)"
                    rows={3}
                    className="w-full text-xs p-3 pr-12 bg-[#0F1115] border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 resize-none font-sans"
                  />
                  <button
                    id="btn-send-turn"
                    type="submit"
                    disabled={!userInput.trim() || submitting}
                    className="absolute bottom-3 right-3 p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Send reflection to Gemini"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">Tip: Cmd+Enter to send</span>
                    <span>•</span>
                    <span>Continuous multi-turn reflection dialogue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      disabled={turns.length === 0}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 disabled:opacity-40"
                    >
                      <FileText className="w-3 h-3" /> Summarize
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={handleBrainstormIdeas}
                      disabled={turns.length === 0}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Lightbulb className="w-3 h-3" /> Brainstorm
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI SUMMARY & TAKEAWAYS */}
      {activeTab === 'summary' && (
        <div className="bg-[#0F1115] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30 font-semibold">
                  Executive Synthesis
                </span>
                <span className="text-xs text-slate-400">Gemini 3.6 Flash Cognitive Analysis</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                {title} — Summary & Insights
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-resynthesize"
                onClick={handleGenerateSummary}
                disabled={summarizing || turns.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
              >
                {summarizing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Regenerate Summary</span>
              </button>

              <button
                onClick={() => setActiveTab('studio')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Studio</span>
              </button>
            </div>
          </div>

          {!summary ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No Summary Generated Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click "Summarize with Gemini 3.6" in the Reflection Studio to generate an executive synthesis, core takeaways, and action items.
              </p>
              <button
                onClick={handleGenerateSummary}
                disabled={turns.length === 0}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Generate Summary Now
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="p-5 rounded-xl bg-[#0A0A0B] border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Executive Synthesis
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {summary.executiveSummary}
                </p>
                <div className="pt-2 flex items-center gap-3 text-xs text-slate-400">
                  <span>
                    Emotional Resonance: <strong className="text-emerald-400">{summary.emotionalTone || mood}</strong>
                  </span>
                  <span>•</span>
                  <span>Turns Evaluated: <strong className="text-slate-200">{turns.length}</strong></span>
                </div>
              </div>

              {/* Grid: Key Takeaways & Action Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Key Takeaways */}
                <div className="p-5 rounded-xl bg-[#0A0A0B] border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Key Takeaways & Realizations</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {summary.keyTakeaways.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Items with Interactive Checkboxes */}
                <div className="p-5 rounded-xl bg-[#0A0A0B] border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-blue-400" />
                    <span>Personal Action Items & Habit Commitments</span>
                  </h3>
                  <div className="space-y-2 text-xs">
                    {summary.actionItems.map((item, idx) => {
                      const isChecked = actionItemChecked[idx] || false;
                      return (
                        <div
                          key={idx}
                          onClick={() =>
                            setActionItemChecked((prev) => ({ ...prev, [idx]: !prev[idx] }))
                          }
                          className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300 line-through opacity-70'
                              : 'bg-[#0F1115] border-slate-800 text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-emerald-500 mt-0.5"
                          />
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Suggested Next Prompts */}
              {summary.suggestedPrompts && summary.suggestedPrompts.length > 0 && (
                <div className="p-5 rounded-xl bg-[#0A0A0B] border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Suggested Next Reflection Angles</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {summary.suggestedPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleSendTurn(p);
                          setActiveTab('studio');
                        }}
                        className="p-3 rounded-lg bg-[#0F1115] border border-slate-800 hover:border-purple-500/40 text-left text-xs text-slate-300 hover:text-purple-300 transition-colors"
                      >
                        <span className="font-semibold block mb-1 text-[11px] text-purple-400">
                          Angle #{idx + 1}
                        </span>
                        <span>"{p}"</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: USER FLOW 6 - VIEW PAST ENTRIES HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-[#0F1115] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {/* History Header & Search Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                  User Flow 6: Reflection Archive
                </span>
                <span className="text-xs text-slate-400">Isolated Cloud Firestore Collection</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">Past Reflection Entries</h2>
              <p className="text-xs text-slate-400">
                All multi-turn entries and AI summaries saved securely to <code className="text-emerald-400 font-mono text-[11px]">users/{user.uid}/reflections</code>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-history-new-reflection"
                onClick={handleStartNewSession}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Start New Entry</span>
              </button>
            </div>
          </div>

          {/* USER REQUESTED: VISUAL MOOD OVERVIEW SECTION */}
          <MoodOverview
            primaryEmotion={activeEmotion}
            stressScore={activeStressScore}
            assessmentTime={activeAssessmentTime}
            totalEntriesCount={sessions.length}
            recentSessions={sessions}
            onStartNewEntry={handleStartNewSession}
            isLiveUpdating={submitting}
          />

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                id="input-history-search"
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search reflections by title, keyword, or insight..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-[#0A0A0B] border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500/50"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-[#0A0A0B] text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                All ({sessions.length})
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                    selectedCategoryFilter === cat
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-[#0A0A0B] text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Entries List */}
          {loadingHistory ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400" />
              <p className="text-xs">Loading reflections from Cloud Firestore...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-3">
              <BookOpen className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs">No reflections found matching your criteria.</p>
              <button
                onClick={handleStartNewSession}
                className="px-3.5 py-1.5 bg-emerald-500 text-slate-950 text-xs font-bold rounded-lg"
              >
                Write Your First Reflection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSessions.map((sess) => {
                const turnCount = sess.turns?.length || 0;
                const lastTurn = sess.turns && sess.turns.length > 0 ? sess.turns[sess.turns.length - 1].text : '';
                const isCurrent = sess.id === currentSessionId;

                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSelectPastSession(sess)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs space-y-3 ${
                      isCurrent
                        ? 'bg-[#0A0A0B] border-emerald-500/50 ring-1 ring-emerald-500/20'
                        : 'bg-[#0A0A0B] border-slate-800 hover:border-slate-700 hover:bg-[#0C0E12]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-white group-hover:text-emerald-400">
                            {sess.title}
                          </h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Active
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(sess.updatedAt || sess.createdAt).toLocaleDateString()} at{' '}
                          {new Date(sess.updatedAt || sess.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        className="text-slate-600 hover:text-rose-400 p-1 rounded-md transition-colors"
                        title="Delete from Firestore"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {sess.replyText || sess.summary?.executiveSummary || lastTurn || 'No text in reflection.'}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400">{sess.category}</span>
                        <span>•</span>
                        <span className={sess.primaryEmotion ? 'text-emerald-400 font-semibold' : ''}>
                          {sess.primaryEmotion || sess.mood}
                        </span>
                        {sess.stressScore !== undefined && (
                          <>
                            <span>•</span>
                            <span className="text-teal-400">Stress: {sess.stressScore}/10</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-emerald-400/90">{turnCount} turns</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
