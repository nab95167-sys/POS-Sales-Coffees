import React, { useState } from 'react';
import { X, Megaphone, Plus, Trash2, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import {
  BroadcastMessage,
  getBroadcasts,
  addBroadcast,
  setActiveBroadcast,
  toggleBroadcast,
} from '../../services/broadcastService';
import { soundEffects } from '../../services/soundService';

interface Props {
  onClose: () => void;
  authorName: string;
}

export const BroadcastModal: React.FC<Props> = ({ onClose, authorName }) => {
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>(() => getBroadcasts());
  const [messageKh, setMessageKh] = useState('');
  const [messageEn, setMessageEn] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageKh.trim()) return;

    soundEffects.playSuccess();
    const created = addBroadcast(messageKh, messageEn || messageKh, priority, authorName);
    setBroadcasts(getBroadcasts());
    setMessageKh('');
    setMessageEn('');
  };

  const handleActivate = (id: string) => {
    soundEffects.playBeep();
    setActiveBroadcast(id);
    setBroadcasts(getBroadcasts());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center space-x-2">
                <span>Store Broadcast & Staff Announcement</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-700/40 font-mono">
                  សេចក្តីជូនដំណឹង
                </span>
              </h2>
              <p className="text-xs text-stone-400">Real-time ticker banner across all POS & KDS terminal screens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Post Form */}
        <form onSubmit={handlePost} className="p-6 bg-stone-950/40 border-b border-stone-800/80 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
            <Send className="w-3.5 h-3.5" />
            <span>ផ្សាយដំណឹងថ្មី (Broadcast New Notice)</span>
          </h3>

          <div className="space-y-2">
            <input
              type="text"
              required
              placeholder="សារជាភាសាខ្មែរ (e.g. ថ្ងៃនេះបញ្ចុះតម្លៃ 20% លើ Espresso ទាំងអស់)..."
              value={messageKh}
              onChange={(e) => setMessageKh(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700/80 text-stone-100 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500"
            />
            <input
              type="text"
              placeholder="English notice (optional translation)..."
              value={messageEn}
              onChange={(e) => setMessageEn(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700/80 text-stone-100 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-stone-400">កម្រិតអាទិភាព (Priority):</span>
              {(['NORMAL', 'HIGH', 'URGENT'] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    priority === p
                      ? p === 'URGENT'
                        ? 'bg-red-600 text-white shadow-md'
                        : p === 'HIGH'
                        ? 'bg-amber-600 text-stone-950 shadow-md'
                        : 'bg-stone-700 text-stone-100'
                      : 'bg-stone-900 text-stone-400 border border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-900/30 transition-all"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>ផ្សាយដំណឹង (Publish)</span>
            </button>
          </div>
        </form>

        {/* Existing Broadcast History */}
        <div className="p-6 max-h-[40vh] overflow-y-auto space-y-2.5">
          <div className="text-xs font-semibold text-stone-400">ប្រវត្តិសេចក្តីជូនដំណឹង (Notice History)</div>
          {broadcasts.map((b) => (
            <div
              key={b.id}
              className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                b.isActive
                  ? 'bg-stone-900 border-amber-600/50 shadow-md'
                  : 'bg-stone-950/60 border-stone-800/70 opacity-70'
              }`}
            >
              <div className="space-y-1 flex-1 pr-3">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      b.priority === 'URGENT'
                        ? 'bg-red-600 text-white'
                        : b.priority === 'HIGH'
                        ? 'bg-amber-600 text-stone-950'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {b.priority}
                  </span>
                  <span className="text-[10px] text-stone-500">
                    {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • By {b.author}
                  </span>
                </div>
                <p className="text-xs text-stone-200 font-medium">{b.messageKh}</p>
                {b.messageEn && <p className="text-[11px] text-stone-400">{b.messageEn}</p>}
              </div>

              <div>
                {b.isActive ? (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-600/40 text-[11px] font-bold flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>កំពុងផ្សាយ (Active)</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleActivate(b.id)}
                    className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-semibold transition-colors"
                  >
                    ផ្សាយសារនេះ (Activate)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-950 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors"
          >
            បិទ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
