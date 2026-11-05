import React, { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, Info, Clock, User, Trash2, Filter } from 'lucide-react';
import { getSecurityLogs, SecurityAuditEvent } from '../../services/securityAuditService';

interface Props {
  onClose: () => void;
}

export const SecurityAuditModal: React.FC<Props> = ({ onClose }) => {
  const [logs, setLogs] = useState<SecurityAuditEvent[]>(getSecurityLogs());
  const [filter, setFilter] = useState<'ALL' | 'WARNING' | 'CRITICAL' | 'INFO'>('ALL');

  const filteredLogs = logs.filter((log) => filter === 'ALL' || log.severity === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-600/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100">Security Audit Trail & Anti-Theft Log</h3>
              <p className="text-xs text-stone-400">Chronological activity record of sensitive cashier operations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-xs text-stone-400 font-bold">Severity:</span>
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setFilter(sev)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                  filter === sev
                    ? 'bg-amber-600 text-stone-950 shadow-md'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-stone-400">
            {filteredLogs.length} Events Recorded
          </span>
        </div>

        {/* Audit Log Stream */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-stone-500 text-xs">
              No security audit logs found for this filter.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800/80 flex items-start justify-between space-x-3 transition-colors hover:border-stone-700"
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {log.severity === 'CRITICAL' ? (
                      <div className="w-7 h-7 rounded-lg bg-red-950 border border-red-500/60 text-red-400 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : log.severity === 'WARNING' ? (
                      <div className="w-7 h-7 rounded-lg bg-amber-950 border border-amber-500/60 text-amber-400 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-blue-950 border border-blue-500/60 text-blue-400 flex items-center justify-center">
                        <Info className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-stone-100">{log.title}</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          log.severity === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-400 border-red-500/40'
                            : log.severity === 'WARNING'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300">{log.details}</p>
                    <div className="flex items-center space-x-3 text-[10px] text-stone-500 pt-1">
                      <span className="flex items-center space-x-1">
                        <User className="w-3 h-3 text-stone-400" />
                        <span>Performed: {log.performedBy}</span>
                      </span>
                      {log.authorizedBy && (
                        <span className="text-amber-400 font-bold">
                          • Auth: {log.authorizedBy}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 text-[10px] text-stone-500 whitespace-nowrap font-mono flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
