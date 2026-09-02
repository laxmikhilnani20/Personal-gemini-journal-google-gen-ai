import React from 'react';
import { Clock, ShieldAlert, Terminal, Trash2, X, FileText } from 'lucide-react';
import { PersistedInteraction } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  interactions: PersistedInteraction[];
  onSelectInteraction: (interaction: PersistedInteraction) => void;
  onDeleteInteraction: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  interactions,
  onSelectInteraction,
  onDeleteInteraction,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0F1115] border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#0A0A0B] text-white">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold tracking-tight">Persisted Audit History</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                {interactions.length} records
              </span>
            </div>
            <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 bg-[#0C0E12] border-b border-slate-800 text-xs text-slate-400">
            Directive 6: Payloads sanitized via <code className="font-mono bg-slate-800 px-1 py-0.5 rounded text-emerald-400 border border-slate-700">stripUndefined</code> prior to persistence.
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {interactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No persisted audits yet. Execute a threat model or code review to see records.
              </div>
            ) : (
              interactions.map((item) => (
                <div
                  key={item.id}
                  className="border border-slate-800 rounded-lg p-3 bg-[#0A0A0B] hover:border-slate-700 transition-all shadow-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.type === 'threat_model' ? (
                        <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Terminal className="w-4 h-4 text-purple-400 shrink-0" />
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-white leading-tight">{item.title}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(item.createdAt).toLocaleTimeString()} · {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteInteraction(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
                    <span>Model: <strong className="text-slate-300">{item.modelUsed}</strong></span>
                    <span>{item.latencyMs}ms</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
