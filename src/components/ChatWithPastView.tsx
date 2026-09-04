import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Bot,
  Sparkles,
  Clock,
  Send,
  RefreshCw,
  AlertCircle,
  Database,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Trash2,
  HelpCircle,
  BrainCircuit,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { getAuthHeaders } from '../lib/firebase';
import { PastChatExchange, ReflectionSession } from '../types';

interface ChatWithPastViewProps {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
  };
  sessions: ReflectionSession[];
  onNavigateToStudio: () => void;
}

const SAMPLE_QUESTIONS = [
  'What made me feel most stressed recently, and how did I handle it?',
  'What recurring themes or goals have I mentioned in my reflections?',
  'When did I feel most grateful or peaceful in my past entries?',
  'What actionable commitments did I set for myself recently?',
  'How has my emotional mindset shifted across my entries?',
];

export const ChatWithPastView: React.FC<ChatWithPastViewProps> = ({
  user,
  sessions,
  onNavigateToStudio,
}) => {
  const [exchanges, setExchanges] = useState<PastChatExchange[]>(() => {
    try {
      const saved = localStorage.getItem(`threatguard_past_chat_${user.uid}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [questionInput, setQuestionInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Save exchanges to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`threatguard_past_chat_${user.uid}`, JSON.stringify(exchanges));
    } catch (e) {
      console.warn('Failed to save past chat to localStorage:', e);
    }
  }, [exchanges, user.uid]);

  // Auto-scroll on new exchanges
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exchanges, loading]);

  const toggleSources = (exchangeId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [exchangeId]: !prev[exchangeId],
    }));
  };

  const handleCopy = (exchangeId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(exchangeId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (window.confirm('Clear your Chat With Your Past conversation history?')) {
      setExchanges([]);
      localStorage.removeItem(`threatguard_past_chat_${user.uid}`);
    }
  };

  const handleSendQuestion = async (textToSend?: string) => {
    const q = (textToSend || questionInput).trim();
    if (!q || loading) return;

    setLoading(true);
    setErrorMessage(null);
    setQuestionInput('');

    try {
      const headers = await getAuthHeaders();

      // Pass cached entries as an auxiliary fallback if in demo/preview mode with local storage
      const payload: Record<string, any> = {
        question: q,
        cachedEntries: sessions.slice(0, 20).map((s) => ({
          id: s.id,
          title: s.title,
          category: s.category,
          mood: s.mood,
          primaryEmotion: s.primaryEmotion,
          stressScore: s.stressScore,
          turns: s.turns,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
        model: 'gemini-3.1-flash-lite',
      };

      const res = await fetch('/api/journal/chat-with-past', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || `Server returned HTTP ${res.status}`);
      }

      const data = await res.json();

      const newExchange: PastChatExchange = {
        id: `exchange-${Date.now()}`,
        question: q,
        answer: data.answer || 'No response returned from the model.',
        timestamp: new Date().toISOString(),
        entriesAnalyzed: typeof data.entriesAnalyzed === 'number' ? data.entriesAnalyzed : 0,
        modelUsed: data.modelUsed || 'gemini-3.1-flash-lite',
        latencyMs: data.latencyMs,
        sourceEntries: data.entries || [],
      };

      setExchanges((prev) => [...prev, newExchange]);
    } catch (err: any) {
      console.error('Chat with past error:', err);
      setErrorMessage(err?.message || 'Failed to query past entries. Please verify your connection.');
    } finally {
      setLoading(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  };

  return (
    <div id="chat-with-past-view" className="space-y-6">
      {/* Top Banner & Context Info */}
      <div className="bg-[#0F1115] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-bold shadow-md shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Chat With Your Past
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                Strict Grounding
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Last 20 Firestore Entries
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ask questions about your thoughts, emotional trends, recurring decisions, and growth milestones. Gemini answers based strictly on your historical entries.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          <div className="px-3 py-1.5 bg-[#0A0A0B] rounded-xl border border-slate-800 text-right">
            <span className="block text-[10px] text-slate-500 uppercase font-mono">Available Records</span>
            <span className="font-mono text-xs font-bold text-emerald-400 flex items-center justify-end gap-1.5">
              <Database className="w-3 h-3 text-emerald-400" />
              {sessions.length} Saved Entries
            </span>
          </div>

          {exchanges.length > 0 && (
            <button
              id="btn-clear-chat-past"
              onClick={handleClearHistory}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl border border-slate-800 transition-colors"
              title="Clear conversation history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Zero Entries Warning Notice if User Has No Reflections */}
      {sessions.length === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              You do not have any journal reflections saved in Cloud Firestore yet. Write your first reflection in the Studio so Gemini can ground answers in your past records.
            </span>
          </div>
          <button
            onClick={onNavigateToStudio}
            className="px-3 py-1.5 bg-amber-400 text-slate-950 font-bold rounded-lg hover:bg-amber-300 transition-colors shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Go to Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Suggested Question Starters */}
      <div className="bg-[#0A0A0B] border border-slate-800/80 rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Suggested Memory Queries</span>
          <span className="text-[10px] text-slate-500 font-mono">(Click to ask instantly)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              disabled={loading}
              onClick={() => handleSendQuestion(q)}
              className="text-left text-xs bg-[#0F1115] hover:bg-emerald-500/10 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 border border-slate-800 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="space-y-4 min-h-[250px]">
        {exchanges.length === 0 && (
          <div className="bg-[#0F1115] border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-sm font-bold text-white">Ask your journal anything</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Try asking how your mood has developed over time, what challenges keep appearing, or what you felt most inspired by in your recent entries.
              </p>
            </div>
          </div>
        )}

        {exchanges.map((exchange) => (
          <div
            key={exchange.id}
            id={exchange.id}
            className="bg-[#0F1115] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
          >
            {/* User Question */}
            <div className="flex items-start gap-3 border-b border-slate-800/80 pb-4">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 text-xs font-bold">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-200">You asked</span>
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(exchange.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-white font-medium mt-1 leading-relaxed">
                  {exchange.question}
                </p>
              </div>
            </div>

            {/* Gemini Grounded Answer */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400">Gemini Grounded Memory</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {exchange.modelUsed || 'gemini-3.1-flash-lite'}
                    </span>
                    {typeof exchange.entriesAnalyzed === 'number' && (
                      <span className="text-[11px] font-mono text-slate-400">
                        ({exchange.entriesAnalyzed} entries analyzed)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {exchange.latencyMs !== undefined && (
                      <span className="text-[10px] font-mono text-slate-500">
                        {exchange.latencyMs}ms
                      </span>
                    )}
                    <button
                      onClick={() => handleCopy(exchange.id, exchange.answer)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Copy response"
                    >
                      {copiedId === exchange.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Markdown Body */}
                <div className="markdown-body prose prose-invert max-w-none text-sm text-slate-200 leading-relaxed font-sans space-y-2">
                  <Markdown>{exchange.answer}</Markdown>
                </div>

                {/* Consulted Sources Drawer / Accordion */}
                {exchange.sourceEntries && exchange.sourceEntries.length > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => toggleSources(exchange.id)}
                      className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>
                        {expandedSources[exchange.id] ? 'Hide' : 'View'} Consulted Journal Entries ({exchange.sourceEntries.length})
                      </span>
                      {expandedSources[exchange.id] ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {expandedSources[exchange.id] && (
                      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#0A0A0B] p-3 rounded-xl border border-slate-800">
                        {exchange.sourceEntries.map((src, sIdx) => (
                          <div
                            key={sIdx}
                            className="bg-[#0F1115] p-2.5 rounded-lg border border-slate-800/80 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-slate-200 truncate">{src.title}</span>
                              {src.primaryEmotion && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                  {src.primaryEmotion}
                                </span>
                              )}
                            </div>
                            {src.createdAt && (
                              <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {new Date(src.createdAt).toLocaleDateString()}
                              </div>
                            )}
                            {src.preview && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                                "{src.preview}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading Bubble */}
        {loading && (
          <div className="bg-[#0F1115] border border-slate-800 rounded-2xl p-5 shadow-sm flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400">Querying Firestore & Synthesizing</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Searching last 20 entries for context and extracting data-backed answers...
              </p>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Inline Error Notice */}
      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-center gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[11px] font-mono text-rose-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sticky Input Bar */}
      <div className="sticky bottom-4 z-10 bg-[#0F1115] border border-slate-800 rounded-2xl p-3 shadow-xl space-y-2">
        <div className="flex items-end gap-2">
          <textarea
            id="input-chat-past"
            ref={textareaRef}
            rows={2}
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your past entries... (e.g. 'What have I noticed about my energy levels?')"
            disabled={loading}
            className="flex-1 bg-[#0A0A0B] text-slate-200 placeholder-slate-500 text-xs sm:text-sm rounded-xl p-3 border border-slate-800 focus:outline-none focus:border-emerald-500/50 resize-none transition-all disabled:opacity-50"
          />

          <button
            id="btn-send-chat-past"
            disabled={loading || !questionInput.trim()}
            onClick={() => handleSendQuestion()}
            className="h-11 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:hover:bg-emerald-500 shrink-0 shadow-sm"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Ask Journal</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono px-1">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <Database className="w-3 h-3" />
            Cloud Firestore Verified Query
          </span>
        </div>
      </div>
    </div>
  );
};
