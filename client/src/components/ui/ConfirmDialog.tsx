import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl space-y-4 border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${
                variant === 'danger'
                  ? 'bg-red-500/15 border-red-500/35 text-red-400'
                  : 'bg-amber-500/15 border-amber-500/35 text-amber-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-zinc-100">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">{message}</p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all disabled:opacity-50 ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-900/30'
            }`}
          >
            {busy ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
