import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  BrainCircuit,
  Calendar,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  HelpCircle,
  Clock,
  Layers,
  Search,
  BookOpen,
  ArrowRight,
  Smile,
  AlertCircle,
  Database,
  Trash2,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { getAuthHeaders } from '../lib/firebase';
import { ReflectionSession, ChatPastMessage, ChatPastResponse } from '../types';

interface ChatWithPastViewProps {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL?: string | null;
    isAnonymous?: boolean;
  };
  sessions: ReflectionSession[];
  onNavigateToStudio?: () => void;
  onSelectPastSession?: (session: ReflectionSession) => void;
}

const PRESET_QUESTIONS = [
  'How has my stress level or mood evolved across my recent entries?',
  'What recurring themes or challenges keep coming up in my reflections?',
  'What moments of gratitude, joy, or breakthroughs have I recorded?',
  'What open decisions or dilemmas have I been untangling lately?',
  'What constructive action items did I commit to in my past sessions?',
];

export const ChatWithPastView: React.FC<ChatWithPastViewProps> = ({
  user,
  sessions,
  onNavigateToStudio,
  onSelectPastSession,
}) => {
  const [messages, setMessages] = useState<ChatPastMessage[]>([]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedEntryDetail, setSelectedEntryDetail] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll as messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAskQuestion = async (overrideQuestion?: string) => {
    const queryToSend = (overrideQuestion || inputQuery).trim();
    if (!queryToSend || loading) return;

    setError(null);
    setInputQuery('');

    const userMessage: ChatPastMessage = {
      id: `user-msg-${Date.now()}`,
      role: 'user',
      text: queryToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      // Get Firebase auth token headers
      const authHeaders = await getAuthHeaders();

      // Format current sessions into client-side entries fallback/supplement
      const formattedClientEntries = sessions.slice(0, 20).map((sess) => ({
        id: sess.id,
        title: sess.title,
        category: sess.category,
        mood: sess.mood,
        primaryEmotion: sess.primaryEmotion,
        stressScore: sess.stressScore,
        createdAt: sess.createdAt,
        updatedAt: sess.updatedAt,
        thought: sess.turns?.filter((t) => t.role === 'user').map((t) => t.text).join('\n') || '',
        replyText: sess.replyText || sess.turns?.find((t) => t.role === 'model')?.text || '',
        turns: sess.turns,
      }));

      const res = await fetch('/api/journal/chat-past', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          question: queryToSend,
          clientEntries: formattedClientEntries,
        }),
      });

      if (!res.ok) {
        let errMessage = `Server returned HTTP ${res.status}`;
        try {
          const errData = await res.json();
          errMessage = errData.message || errData.error || errMessage;
        } catch {
          // ignore parsing error
        }
        throw new Error(errMessage);
      }

      const data: ChatPastResponse = await res.json();

      const modelMessage: ChatPastMessage = {
        id: `model-msg-${Date.now()}`,
        role: 'model',
        text: data.answer || 'No response generated.',
        timestamp: new Date().toISOString(),
        entriesAnalyzed: data.entriesAnalyzed,
        referencedEntries: data.referencedEntries,
        modelUsed: data.modelUsed,
        latencyMs: data.latencyMs,
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      console.error('Failed to chat with past entries:', err);
      setError(err?.message || 'Failed to retrieve answers from your journal history');
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  const totalEntriesCount = sessions.length;

  return (
    <div className="space-y-6">
      {/* Feature Header Card */}
      <div className="bg-[#0F1115] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Chat With Your Past
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Grounded Memory
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ask Gemini questions about your personal reflections, recurring thoughts, stress patterns, and growth.
              Gemini queries Firestore for your last 20 entries and answers strictly based on your authentic records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3 py-2 bg-[#0A0A0B] rounded-xl border border-slate-800 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <div>
                <div className="text-[10px] uppercase font-mono text-slate-500">Firestore Context</div>
                <div className="text-xs font-bold text-white font-mono">
                  {Math.min(20, totalEntriesCount)} of {totalEntriesCount} Entries Active
                </div>
              </div>
            </div>

            <div className="px-3 py-2 bg-[#0A0A0B] rounded-xl border border-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <div>
                <div className="text-[10px] uppercase font-mono text-slate-500">Security Invariant</div>
                <div className="text-xs font-bold text-emerald-400 font-mono">
                  Private Token Auth
                </div>
              </div>
            </div>

            {messages.length > 0 && (
              <button
                id="btn-clear-chat-past"
                onClick={() => setMessages([])}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-medium border border-slate-800 flex items-center gap-1.5 transition-colors"
                title="Reset conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Thread</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Suggested Starter Questions */}
      {messages.length === 0 && (
        <div className="bg-[#0F1115] border border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              Suggested Explorations
            </span>
            <span className="text-[11px] text-slate-500">Click any prompt to ask immediately</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {PRESET_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                id={`btn-preset-question-${idx}`}
                onClick={() => handleAskQuestion(q)}
                disabled={loading}
                className="text-left p-3 rounded-xl bg-[#0A0A0B] hover:bg-slate-800/80 border border-slate-800/80 hover:border-emerald-500/40 text-xs text-slate-300 hover:text-white transition-all group flex items-start justify-between gap-2"
              >
                <span>{q}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Conversation Stream */}
      <div className="bg-[#0F1115] border border-slate-800 rounded-2xl shadow-xl flex flex-col min-h-[420px]">
        <div className="flex-1 p-5 space-y-6 overflow-y-auto max-h-[580px]">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 text-center px-4 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-sm font-bold text-white">Ask Your Journal Anything</h3>
                <p className="text-xs text-slate-400">
                  {totalEntriesCount > 0
                    ? `You have ${totalEntriesCount} past reflection ${
                        totalEntriesCount === 1 ? 'entry' : 'entries'
                      } in your account. Ask questions to uncover emotional patterns, key realizations, and past commitments.`
                    : 'No past entries found yet. Write a reflection in the Active Reflection Studio first, or ask a question to test the memory retrieval.'}
                </p>
              </div>

              {totalEntriesCount === 0 && onNavigateToStudio && (
                <button
                  id="btn-goto-studio-from-chat"
                  onClick={onNavigateToStudio}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Write First Reflection in Studio</span>
                </button>
              )}
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* Model Avatar */}
                {msg.role === 'model' && (
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-1 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-2xl rounded-2xl p-4.5 space-y-3 ${
                    msg.role === 'user'
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-white shadow-xs'
                      : 'bg-[#0A0A0B] border border-slate-800 text-slate-200 shadow-md'
                  }`}
                >
                  {/* Header Row for Message */}
                  <div className="flex items-center justify-between gap-4 text-[11px] text-slate-500 border-b border-slate-800/60 pb-2">
                    <span className="font-semibold text-slate-400">
                      {msg.role === 'user' ? 'You' : 'Gemini Memory Retrieval'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.role === 'model' && (
                        <button
                          id={`btn-copy-${msg.id}`}
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body Text */}
                  <div className="text-xs leading-relaxed font-sans">
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div className="markdown-body text-slate-200 prose prose-invert prose-xs max-w-none space-y-2">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    )}
                  </div>

                  {/* Grounding & Cited Sources Badge for Model Messages */}
                  {msg.role === 'model' && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Check className="w-3 h-3 text-emerald-400" />
                          Grounded in {msg.entriesAnalyzed ?? 0} past Firestore entries
                        </span>
                        {msg.modelUsed && (
                          <span className="text-slate-500">
                            Model: <span className="text-slate-400">{msg.modelUsed}</span>
                            {msg.latencyMs ? ` • ${msg.latencyMs}ms` : ''}
                          </span>
                        )}
                      </div>

                      {/* Source Citation Pills */}
                      {msg.referencedEntries && msg.referencedEntries.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Analyzed Entries ({msg.referencedEntries.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.referencedEntries.map((refEntry, refIdx) => (
                              <button
                                key={refIdx}
                                onClick={() => setSelectedEntryDetail(refEntry)}
                                className="px-2 py-1 rounded-lg bg-[#0F1115] hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                                title={refEntry.thoughtSnippet || refEntry.title}
                              >
                                <Calendar className="w-2.5 h-2.5 text-slate-500" />
                                <span>
                                  {new Date(refEntry.date).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                                {refEntry.primaryEmotion && (
                                  <span className="text-emerald-400">[{refEntry.primaryEmotion}]</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {msg.role === 'user' && (
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0 mt-1">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex gap-3.5 items-start justify-start">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              </div>
              <div className="bg-[#0A0A0B] border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Querying Firestore & grounding Gemini response...</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Analyzing your last 20 journal entries for relevant memories, thoughts, and emotional patterns.
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-5 mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => handleAskQuestion()}
              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[10px] font-bold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-[#0A0A0B] rounded-b-2xl">
          <div className="relative flex items-end gap-2">
            <textarea
              ref={textareaRef}
              id="input-chat-past-query"
              rows={2}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your past reflections... (e.g. 'What made me feel most fulfilled last week?')"
              disabled={loading}
              className="w-full bg-[#0F1115] border border-slate-800 focus:border-emerald-500/60 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden resize-none transition-colors"
            />

            <button
              id="btn-send-chat-past"
              onClick={() => handleAskQuestion()}
              disabled={loading || !inputQuery.trim()}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Ask</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
            <span>Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">Enter</kbd> to ask, <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">Shift + Enter</kbd> for newline</span>
            <span className="font-mono text-emerald-400/80">Grounding: Last 20 Firestore Entries</span>
          </div>
        </div>
      </div>

      {/* Selected Entry Detail Modal / Slide-over */}
      {selectedEntryDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0F1115] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  {selectedEntryDetail.title || 'Journal Entry'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntryDetail(null)}
                className="text-slate-500 hover:text-white text-xs font-mono px-2 py-1 bg-slate-800/60 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 bg-[#0A0A0B] rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">Date</span>
                  <span className="text-white">
                    {new Date(selectedEntryDetail.date).toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-[#0A0A0B] rounded-lg border border-slate-800">
                  <span className="text-slate-500 block">Emotion & Stress</span>
                  <span className="text-emerald-400 font-bold">
                    {selectedEntryDetail.primaryEmotion || 'Reflective'} ({selectedEntryDetail.stressScore ?? 4}/10)
                  </span>
                </div>
              </div>

              {selectedEntryDetail.thoughtSnippet && (
                <div className="p-3 bg-[#0A0A0B] rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Your Thought</span>
                  <p className="text-slate-300 italic">"{selectedEntryDetail.thoughtSnippet}"</p>
                </div>
              )}

              {selectedEntryDetail.replySnippet && (
                <div className="p-3 bg-[#0A0A0B] rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Reflection Insight</span>
                  <p className="text-slate-400">"{selectedEntryDetail.replySnippet}"</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEntryDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
