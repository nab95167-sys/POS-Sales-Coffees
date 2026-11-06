import React, { useState, useEffect } from 'react';
import { Megaphone, AlertCircle, Sparkles, X, Edit3 } from 'lucide-react';
import { BroadcastMessage, getActiveBroadcast } from '../../services/broadcastService';

interface Props {
  onOpenManager?: () => void;
}

export const BroadcastBanner: React.FC<Props> = ({ onOpenManager }) => {
  const [broadcast, setBroadcast] = useState<BroadcastMessage | null>(() => getActiveBroadcast());
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Poll/check periodically or listen for storage changes
    const handleStorage = () => {
      setBroadcast(getActiveBroadcast());
      setIsDismissed(false);
    };

    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 5000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  if (!broadcast || isDismissed) return null;

  const priorityStyles = {
    URGENT: 'bg-red-950/80 border-red-600/60 text-red-200',
    HIGH: 'bg-amber-950/80 border-amber-600/60 text-amber-200',
    NORMAL: 'bg-stone-900/90 border-stone-700/60 text-stone-200',
  };

  const badgeStyles = {
    URGENT: 'bg-red-600 text-white animate-pulse',
    HIGH: 'bg-amber-600 text-stone-950 font-bold',
    NORMAL: 'bg-stone-800 text-stone-300',
  };

  return (
    <div
      className={`px-4 py-2 border rounded-2xl flex items-center justify-between shadow-lg transition-all mb-3 text-xs ${priorityStyles[broadcast.priority]}`}
    >
      <div className="flex items-center space-x-3 overflow-hidden">
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold flex items-center space-x-1 shrink-0 ${badgeStyles[broadcast.priority]}`}
        >
          {broadcast.priority === 'URGENT' ? (
            <AlertCircle className="w-3 h-3" />
          ) : (
            <Megaphone className="w-3 h-3" />
          )}
          <span>{broadcast.priority} NOTICE</span>
        </span>

        <div className="truncate font-medium flex items-center space-x-2">
          <span className="font-semibold text-stone-100">{broadcast.messageKh}</span>
          <span className="text-stone-400 hidden lg:inline">| {broadcast.messageEn}</span>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0 ml-3">
        {onOpenManager && (
          <button
            onClick={onOpenManager}
            className="p-1 rounded-lg hover:bg-stone-800/60 text-stone-400 hover:text-stone-200 transition-colors"
            title="Edit Store Broadcasts (កែប្រែសារជូនដំណឹង)"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-lg hover:bg-stone-800/60 text-stone-400 hover:text-stone-200 transition-colors"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
