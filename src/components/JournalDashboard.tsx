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
  MessageSquare,
  Clock,
  Mail,
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
  WeeklyReport,
} from '../types';
import { MoodOverview } from './MoodOverview';
import { ChatWithPastView } from './ChatWithPastView';
import { WeeklyReportView } from './WeeklyReportView';
import { LetterFrom2031Card } from './LetterFrom2031Card';

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

const FUTURE_SELF_PROMPT_STARTERS = [
  'I am anxious about this current crossroad with... Looking back from 2031, what perspective did I lack?',
  'Tell me: did the exhaustion and stress of this present season actually lead somewhere good?',
  'What quiet habit or daily boundary should I cultivate today that our future self will thank us for?',
  'I feel doubtful about whether my current efforts matter. Give me honest reassurance.',
  'Describe a calm morning in 2031—what does life feel like once this storm passes?',
];

export const JournalDashboard: React.FC<JournalDashboardProps> = ({
  user,
  onSignOut,
}) => {
  // Navigation tabs: 'studio' (active reflection) | 'history' (past entries) | 'summary' (active session summary) | 'chat-past' (chat with journal)
  const [activeTab, setActiveTab] = useState<'studio' | 'history' | 'summary' | 'chat-past'>('studio');

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

  // Future Self Feature State (Letter from 2031)
  const [isFutureSelfMode, setIsFutureSelfMode] = useState<boolean>(false);

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

  // Weekly Pattern Synthesizer State
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [currentWeeklyReport, setCurrentWeeklyReport] = useState<WeeklyReport | null>(null);
  const [isGeneratingWeeklyReport, setIsGeneratingWeeklyReport] = useState<boolean>(false);
  const [weeklyReportError, setWeeklyReportError] = useState<string | null>(null);

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

  // Real-time synchronization for saved weekly_reports in Cloud Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const isFirebaseAuthUser = Boolean(auth.currentUser && auth.currentUser.uid === user.uid);
    if (!isFirebaseAuthUser) return;

    const reportsCol = collection(db, 'users', user.uid, 'weekly_reports');
    const q = query(reportsCol, orderBy('generatedAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: WeeklyReport[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as WeeklyReport;
          loaded.push({ ...d, id: docSnap.id });
        });
        setWeeklyReports(loaded);
        if (loaded.length > 0) {
          setCurrentWeeklyReport((prev) => prev || loaded[0]);
        }
      },
      (error) => {
        console.warn('Firestore weekly_reports listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  // Handler to call backend Weekly Pattern Synthesizer route
  const handleGenerateWeeklyReport = async () => {
    setIsGeneratingWeeklyReport(true);
    setWeeklyReportError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/journal/weekly-report', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cachedEntries: sessions.slice(0, 20).map((s) => ({
            id: s.id,
            title: s.title,
            category: s.category,
            mood: s.mood,
            primaryEmotion: s.primaryEmotion,
            stressScore: s.stressScore,
            replyText: s.replyText,
            turns: s.turns,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to generate weekly pattern report');
      }

      if (data.report) {
        setCurrentWeeklyReport(data.report);
        setWeeklyReports((prev) => {
          const filtered = prev.filter((r) => r.id !== data.report.id);
          return [data.report, ...filtered];
        });
        // Switch to history tab to see the report below mood tracker
        if (activeTab !== 'history') {
          setActiveTab('history');
        }
      }
    } catch (err: any) {
      console.error('Weekly report generation error:', err);
      setWeeklyReportError(err?.message || 'Failed to generate weekly pattern report');
    } finally {
      setIsGeneratingWeeklyReport(false);
    }
  };

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

    const isFutureSelfTurn = isFutureSelfMode || updatedTurns.some((t) => t.isFutureSelf);
    const letterFrom2031 =
      updatedTurns.slice().reverse().find((t) => t.letterFrom2031)?.letterFrom2031 ||
      (isFutureSelfTurn ? latestReplyText : undefined);
    const rawThought =
      updatedTurns.find((t) => t.role === 'user' && (t.rawThought || t.isFutureSelf))?.text ||
      updatedTurns.find((t) => t.role === 'user')?.text ||
      '';

    // Build reflection session payload:
    // Strict Undefined-Stripping rule is applied to ensure no undefined property ever reaches Firestore.
    const rawSessionData: Record<string, any> = {
      id: currentSessionId,
      userId: user.uid,
      userEmail: user.email || null,
      userName: user.displayName || null,
      title: overrideTitle || title,
      category: isFutureSelfTurn ? 'Future Self Letter' : category,
      mood,
      turns: updatedTurns,
      replyText: latestReplyText,
      letterFrom2031: letterFrom2031 || null,
      isFutureSelf: isFutureSelfTurn || false,
      rawThought: rawThought || null,
      yearSentFrom: isFutureSelfTurn ? '2031' : null,
      primaryEmotion: derivedEmotion || (isFutureSelfTurn ? 'Reassured' : 'Reflective'),
      stressScore: derivedStress ?? (isFutureSelfTurn ? 2 : 4),
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

      // If this is a Future Self Letter, also persist to future_letters collection for dedicated querying
      if (isFutureSelfTurn && letterFrom2031) {
        try {
          const futureLettersCol = collection(db, 'users', user.uid, 'future_letters');
          await addDoc(futureLettersCol, stripUndefined({
            id: `letter-${Date.now()}`,
            userId: user.uid,
            rawThought: rawThought || '',
            letterText: letterFrom2031,
            primaryEmotion: derivedEmotion || 'Reassured',
            stressScore: derivedStress ?? 2,
            yearSentFrom: '2031',
            createdAt: new Date().toISOString(),
            sessionId: currentSessionId,
            title: overrideTitle || title,
          }));
        } catch (futErr) {
          console.warn('Note: Local future_letters addDoc deferred (handled by backend):', futErr);
        }
      }

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
    setIsFutureSelfMode(false);
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
    setIsFutureSelfMode(Boolean(sess.isFutureSelf || sess.category === 'Future Self Letter' || sess.turns?.some((t) => t.isFutureSelf)));
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
      mode: isFutureSelfMode ? 'future-self' : 'reflection',
      isFutureSelf: isFutureSelfMode,
      rawThought: promptToSend,
    };

    const nextTurns = [...turns, userTurn];
    setTurns(nextTurns);
    setUserInput('');
    setSubmitting(true);

    // If first turn and title is default, generate a better title
    let newTitle = title;
    if (turns.length === 0 && (title === 'New Reflection Session' || title === 'Evening Clarity Reflection')) {
      if (isFutureSelfMode) {
        newTitle = `Letter to 2031: ${promptToSend.slice(0, 32)}${promptToSend.length > 32 ? '...' : ''}`;
      } else {
        newTitle = promptToSend.slice(0, 38) + (promptToSend.length > 38 ? '...' : '');
      }
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
          category: isFutureSelfMode ? 'Future Self Letter' : category,
          mood,
          title: newTitle,
          sessionId: currentSessionId,
          userId: user.uid,
          isFutureSelf: isFutureSelfMode,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawReply =
        data.letterFrom2031 ||
        data.replyText ||
        data.reply ||
        'Thank you for sharing that reflection. What feeling stands out most as you sit with that thought?';
      const detectedEmotion = data.primaryEmotion || (isFutureSelfMode ? 'Reassured' : 'Reflective');
      const detectedStressScore =
        typeof data.stressScore === 'number' ? data.stressScore : (isFutureSelfMode ? 2 : 4);

      // Update state for live UI tracking
      setLatestEmotion(detectedEmotion);
      setLatestStressScore(detectedStressScore);
      setLatestAssessmentTime(new Date().toISOString());

      const isModelFutureSelf = Boolean(isFutureSelfMode || data.isFutureSelf || data.letterFrom2031);
      const modelTurn: JournalTurn = {
        id: `turn-${Date.now() + 1}`,
        role: 'model',
        text: rawReply,
        timestamp: new Date().toISOString(),
        mode: isModelFutureSelf ? 'future-self' : 'reflection',
        primaryEmotion: detectedEmotion,
        stressScore: detectedStressScore,
        isFutureSelf: isModelFutureSelf,
        letterFrom2031: isModelFutureSelf ? rawReply : undefined,
        rawThought: promptToSend,
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
      const fallbackText = isFutureSelfMode
        ? `Dear past self,\n\nI hear the weight in what you are carrying right now. Looking back from here in 2031, I want you to breathe. The doubts and ambiguity that feel so heavy in 2026 are simply the raw clay of the life we are building together.\n\nBe patient and gentle with your pace. Everything you are learning today prepares us for the peace we inhabit now.\n\nWith unending love and gratitude,\nYour 2031 Self`
        : `Thank you for expressing this reflection. Taking time to put thoughts into words brings immense clarity.\n\n*What is one small, gentle action you could take today that honors this feeling?*`;

      const fallbackTurn: JournalTurn = {
        id: `turn-${Date.now() + 1}`,
        role: 'model',
        text: fallbackText,
        timestamp: new Date().toISOString(),
        mode: isFutureSelfMode ? 'future-self' : 'reflection',
        primaryEmotion: isFutureSelfMode ? 'Reassured' : (mood || 'Reflective'),
        stressScore: isFutureSelfMode ? 2 : 4,
        isFutureSelf: isFutureSelfMode,
        letterFrom2031: isFutureSelfMode ? fallbackText : undefined,
        rawThought: promptToSend,
      };
      const finalTurns = [...nextTurns, fallbackTurn];
      setTurns(finalTurns);
      await saveSessionToFirestore(
        finalTurns,
        summary,
        newTitle,
        isFutureSelfMode ? 'Reassured' : (mood || 'Reflective'),
        isFutureSelfMode ? 2 : 4
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

          <button
            id="tab-chat-past"
            onClick={() => setActiveTab('chat-past')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'chat-past'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat with your Journal</span>
            <span
              className={`px-1.5 py-0.2 rounded-full font-mono text-[9px] ${
                activeTab === 'chat-past'
                  ? 'bg-slate-950/20 text-slate-950 font-bold'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              Past 20
            </span>
          </button>
        </div>

        {/* Weekly Report CTA & Firestore live saving indicator */}
        <div className="flex items-center gap-3">
          <button
            id="btn-nav-generate-weekly-report"
            onClick={() => {
              if (activeTab !== 'history') {
                setActiveTab('history');
              }
              handleGenerateWeeklyReport();
            }}
            disabled={isGeneratingWeeklyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isGeneratingWeeklyReport ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{isGeneratingWeeklyReport ? 'Synthesizing...' : 'Weekly Report'}</span>
          </button>

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
            <div className={`border rounded-2xl p-4 shadow-xs space-y-2.5 transition-all ${
              isFutureSelfMode ? 'bg-[#120f26] border-amber-500/30' : 'bg-[#0F1115] border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold flex items-center gap-1.5">
                  {isFutureSelfMode ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-200">Prompts for Your 2031 Self</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-slate-300">Reflection Spark Prompts</span>
                    </>
                  )}
                </h4>
              </div>
              <div className="space-y-1.5">
                {(isFutureSelfMode ? FUTURE_SELF_PROMPT_STARTERS : PROMPT_STARTERS).map((promptText, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendTurn(promptText)}
                    disabled={submitting}
                    className={`w-full text-left p-2 rounded-lg border text-[11px] transition-colors leading-relaxed ${
                      isFutureSelfMode
                        ? 'bg-[#181432] hover:bg-amber-950/40 border-amber-500/20 text-slate-300 hover:text-amber-200'
                        : 'bg-[#0A0A0B] hover:bg-slate-800/80 border-slate-800/80 text-slate-400 hover:text-emerald-300'
                    }`}
                  >
                    "{promptText}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Main Area: Multi-turn Conversation Stream */}
          <div className={`lg:col-span-3 flex flex-col border rounded-2xl shadow-lg h-[640px] overflow-hidden transition-all duration-300 ${
            isFutureSelfMode
              ? 'bg-[#0d0b1a] border-amber-500/35 shadow-[0_4px_30px_rgba(217,119,6,0.08)]'
              : 'bg-[#0F1115] border-slate-800'
          }`}>
            {/* Conversation Header */}
            <div className={`px-5 py-3.5 border-b flex items-center justify-between transition-colors ${
              isFutureSelfMode ? 'border-amber-500/20 bg-[#120f22]' : 'border-slate-800 bg-[#0A0A0B]'
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{title}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                  isFutureSelfMode
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {isFutureSelfMode ? 'Letter from 2031' : category}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                  {MOODS.find((m) => m.label === mood)?.emoji} {mood}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                {isFutureSelfMode ? (
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <strong>Persona: Future Self (2031)</strong>
                  </span>
                ) : (
                  <span>Model: <strong className="text-emerald-400">gemini-3.6-flash</strong></span>
                )}
              </div>
            </div>

            {/* Conversation Messages Container */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {turns.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
                    isFutureSelfMode
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {isFutureSelfMode ? <Mail className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {isFutureSelfMode ? 'Write to Your Future Self (Year 2031)' : 'Begin Your Multi-Turn Reflection'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                    {isFutureSelfMode
                      ? 'What questions, struggles, or quiet hopes are you carrying today in 2026? Send them forward across time. Your future self will respond with the wisdom of hindsight and lived clarity.'
                      : 'Write your thoughts, daily learnings, dilemmas, or ideas below. Gemini 3.6 Flash will reflect back, offer insightful inquiries, and help you unlock new perspectives.'}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500">
                    🔒 All entries are saved to Firestore under: <code className={isFutureSelfMode ? 'text-amber-400' : 'text-emerald-400'}>users/{user.uid.slice(0, 8)}...</code>
                  </p>
                </div>
              ) : (
                turns.map((turn, index) => {
                  const isUser = turn.role === 'user';
                  const isFutureSelfTurn = Boolean(
                    turn.isFutureSelf ||
                    turn.mode === 'future-self' ||
                    turn.letterFrom2031 ||
                    isFutureSelfMode
                  );

                  // Render Model turn as a beautiful physical letter from 2031 when it's a Future Self letter
                  if (!isUser && isFutureSelfTurn) {
                    return (
                      <div key={turn.id || index} className="w-full">
                        <LetterFrom2031Card
                          letterText={turn.letterFrom2031 || turn.text}
                          rawThought={turn.rawThought}
                          timestamp={turn.timestamp}
                          primaryEmotion={turn.primaryEmotion}
                          stressScore={turn.stressScore}
                          yearSentFrom="2031"
                          title={title}
                        />
                      </div>
                    );
                  }

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
                            ? isFutureSelfTurn
                              ? 'bg-gradient-to-br from-[#1d1933] to-[#120f24] text-amber-100 border border-amber-500/35'
                              : 'bg-slate-800 text-slate-100 border border-slate-700'
                            : 'bg-[#0A0A0B] text-slate-200 border border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 border-b border-slate-800/80 pb-1.5 font-mono">
                          <span className={`font-semibold flex items-center gap-1.5 ${isFutureSelfTurn && isUser ? 'text-amber-300' : 'text-slate-300'}`}>
                            {isUser ? (
                              isFutureSelfTurn ? (
                                <>
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>To My Future Self (2031)</span>
                                </>
                              ) : (
                                'You'
                              )
                            ) : (
                              'Gemini 3.6 Flash'
                            )}
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
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 mt-1 ${
                          isFutureSelfTurn
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}>
                          {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {submitting && (
                <div className="flex gap-3 justify-start items-center">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 animate-pulse ${
                    isFutureSelfMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {isFutureSelfMode ? <Mail className="w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
                  </div>
                  <div className={`border rounded-2xl px-4 py-3 text-xs flex items-center gap-2 ${
                    isFutureSelfMode ? 'bg-[#141026] border-amber-500/30 text-amber-200' : 'bg-[#0A0A0B] border-slate-800 text-slate-400'
                  }`}>
                    <RefreshCw className={`w-3.5 h-3.5 animate-spin ${isFutureSelfMode ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <span>
                      {isFutureSelfMode
                        ? 'Transmitting across 2026 ➔ 2031... Your Future Self is penning a letter...'
                        : 'Gemini 3.6 Flash is reflecting on your entry...'}
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Turn Composer Input Box with Distinct Future Self Mode Toggle & Styling */}
            <div className={`p-3.5 border-t transition-all duration-300 ${
              isFutureSelfMode
                ? 'bg-gradient-to-b from-[#141028] via-[#0d0a1c] to-[#070510] border-amber-500/35 shadow-[0_-8px_25px_rgba(217,119,6,0.12)]'
                : 'bg-[#0A0A0B] border-slate-800'
            }`}>
              {/* Visually Distinct "Write to my Future Self" Toggle Button */}
              <div className="flex items-center justify-between pb-2.5">
                <div className="flex items-center gap-2">
                  <button
                    id="btn-toggle-future-self"
                    type="button"
                    onClick={() => setIsFutureSelfMode(!isFutureSelfMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isFutureSelfMode
                        ? 'bg-gradient-to-r from-amber-500/25 via-purple-600/25 to-indigo-600/30 border border-amber-400/60 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                        : 'bg-[#0F1115] hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <Clock className={`w-3.5 h-3.5 ${isFutureSelfMode ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                    <span>Write to my Future Self</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isFutureSelfMode ? 'bg-amber-400/25 text-amber-300 border border-amber-400/40' : 'bg-slate-800 text-slate-500'
                    }`}>
                      2031
                    </span>
                    {isFutureSelfMode && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </button>
                </div>

                {isFutureSelfMode && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300/80">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Future Self Mode Active · 2031 Perspective</span>
                  </div>
                )}
              </div>

              {/* Special Mode Guidance Banner */}
              {isFutureSelfMode && (
                <div className="mb-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-[11px] leading-tight">
                      <strong>Letter from 2031 Mode:</strong> Pour out your current dilemma, fear, or uncertainty. Your future self will respond as a wiser, grounded companion from 5 years ahead.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFutureSelfMode(false)}
                    className="text-[10px] text-amber-300/80 hover:text-white underline ml-2 shrink-0 cursor-pointer"
                  >
                    Standard Mode
                  </button>
                </div>
              )}

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
                    placeholder={
                      isFutureSelfMode
                        ? "Write to yourself in 2031: What is weighing on you today? What decision feels ambiguous or heavy? (Press Cmd+Enter or click Send)"
                        : "Write your journal entry or reflection thought here... (Press Cmd+Enter or click Send)"
                    }
                    rows={isFutureSelfMode ? 4 : 3}
                    className={`w-full text-xs p-3 pr-12 rounded-xl transition-all resize-none ${
                      isFutureSelfMode
                        ? 'bg-[#181330] border border-amber-500/40 text-amber-100 placeholder-amber-200/40 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 font-serif text-[13.5px] leading-relaxed'
                        : 'bg-[#0F1115] border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 font-sans'
                    }`}
                  />
                  <button
                    id="btn-send-turn"
                    type="submit"
                    disabled={!userInput.trim() || submitting}
                    className={`absolute bottom-3 right-3 p-2 font-bold rounded-lg shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                      isFutureSelfMode
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                    title={isFutureSelfMode ? "Send letter to your 2031 self" : "Send reflection to Gemini"}
                  >
                    {isFutureSelfMode ? <Mail className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">Tip: Cmd+Enter to send</span>
                    <span>•</span>
                    <span>{isFutureSelfMode ? 'Dispatched to your future self' : 'Continuous multi-turn reflection dialogue'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      disabled={turns.length === 0}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                    >
                      <FileText className="w-3 h-3" /> Summarize
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={handleBrainstormIdeas}
                      disabled={turns.length === 0}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
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
            onGenerateWeeklyReport={handleGenerateWeeklyReport}
            isGeneratingWeeklyReport={isGeneratingWeeklyReport}
          />

          {/* USER REQUESTED: WEEKLY PATTERN SYNTHESIZER (DISPLAYED BELOW MOOD TRACKER) */}
          <WeeklyReportView
            currentReport={currentWeeklyReport}
            reportsList={weeklyReports}
            isGenerating={isGeneratingWeeklyReport}
            onGenerateReport={handleGenerateWeeklyReport}
            onSelectReport={(rep) => setCurrentWeeklyReport(rep)}
            recentSessionsCount={sessions.length}
            error={weeklyReportError}
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
                const isFutureLetter = Boolean(
                  sess.isFutureSelf ||
                  sess.letterFrom2031 ||
                  sess.category === 'Future Self Letter' ||
                  sess.turns?.some((t) => t.isFutureSelf || t.letterFrom2031)
                );

                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSelectPastSession(sess)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs space-y-3 ${
                      isFutureLetter
                        ? isCurrent
                          ? 'bg-[#141026] border-amber-500/60 ring-1 ring-amber-500/30'
                          : 'bg-[#100d1e] border-amber-500/30 hover:border-amber-400/50 hover:bg-[#141028]'
                        : isCurrent
                        ? 'bg-[#0A0A0B] border-emerald-500/50 ring-1 ring-emerald-500/20'
                        : 'bg-[#0A0A0B] border-slate-800 hover:border-slate-700 hover:bg-[#0C0E12]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`text-xs font-bold ${isFutureLetter ? 'text-amber-200' : 'text-white group-hover:text-emerald-400'}`}>
                            {sess.title}
                          </h3>
                          {isFutureLetter && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-semibold">
                              <Mail className="w-2.5 h-2.5" /> 2031 Letter
                            </span>
                          )}
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

                    <p className={`text-xs line-clamp-2 leading-relaxed ${
                      isFutureLetter ? 'text-amber-100/80 font-serif' : 'text-slate-400'
                    }`}>
                      {sess.letterFrom2031 || sess.replyText || sess.summary?.executiveSummary || lastTurn || 'No text in reflection.'}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={isFutureLetter ? 'text-amber-300' : 'text-slate-400'}>
                          {isFutureLetter ? 'Future Self Letter' : sess.category}
                        </span>
                        <span>•</span>
                        <span className={isFutureLetter ? 'text-amber-400 font-semibold' : (sess.primaryEmotion ? 'text-emerald-400 font-semibold' : '')}>
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
                        <span className={isFutureLetter ? 'text-amber-400/90' : 'text-emerald-400/90'}>{turnCount} turns</span>
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

      {/* TAB 4: CHAT WITH YOUR JOURNAL (GROUNDED RETRIEVAL) */}
      {activeTab === 'chat-past' && (
        <ChatWithPastView
          user={user}
          sessions={sessions}
          onNavigateToStudio={() => setActiveTab('studio')}
        />
      )}
    </div>
  );
};
