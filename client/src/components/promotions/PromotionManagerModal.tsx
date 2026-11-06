import React, { useState } from 'react';
import { X, Sparkles, Tag, Clock, Calendar, Check, Power, Plus, ShieldCheck } from 'lucide-react';
import { Promotion, getPromotions, togglePromotion, isPromotionTimeActive } from '../../services/promotionService';
import { soundEffects } from '../../services/soundService';

interface Props {
  onClose: () => void;
  onApplyToCart?: (promo: Promotion) => void;
}

export const PromotionManagerModal: React.FC<Props> = ({ onClose, onApplyToCart }) => {
  const [promotions, setPromotions] = useState<Promotion[]>(() => getPromotions());
  const now = new Date();

  const handleToggle = (id: string) => {
    soundEffects.playBeep();
    const updated = togglePromotion(id);
    setPromotions(updated);
  };

  const handleApply = (promo: Promotion) => {
    soundEffects.playSuccess();
    if (onApplyToCart) {
      onApplyToCart(promo);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center space-x-2">
                <span>Promotions & Happy Hour Engine</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-700/40 font-mono">
                  កម្មវិធីបញ្ចុះតម្លៃ
                </span>
              </h2>
              <p className="text-xs text-stone-400">Automated discounts, happy hour schedules & combo offers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Time Status Banner */}
        <div className="px-6 py-2.5 bg-stone-950/60 border-b border-stone-800/60 flex items-center justify-between text-xs text-stone-400">
          <span className="flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Store Time: <strong className="text-stone-200 font-mono">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
          </span>
          <span className="text-[11px] text-amber-400/90 font-medium">
            Active campaigns evaluate automatically at checkout
          </span>
        </div>

        {/* Promotions List */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {promotions.map((promo) => {
            const isLive = isPromotionTimeActive(promo, now);

            return (
              <div
                key={promo.id}
                className={`p-4 rounded-2xl border transition-all ${
                  !promo.isActive
                    ? 'bg-stone-950/40 border-stone-800/60 opacity-60'
                    : isLive
                    ? 'bg-gradient-to-r from-amber-950/30 to-stone-900 border-amber-600/50 shadow-lg shadow-amber-950/20'
                    : 'bg-stone-900/90 border-stone-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-bold text-sm text-stone-100">{promo.nameKh}</span>
                      <span className="text-xs text-stone-400">({promo.name})</span>

                      {/* Live Status Badge */}
                      {promo.isActive ? (
                        isLive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-600/40 flex items-center space-x-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>កំពុងដំណើរការ (LIVE NOW)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950/60 text-amber-300 border border-amber-700/40">
                            {promo.badge}
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-800 text-stone-400">
                          បិទ (Disabled)
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-300">{promo.descriptionKh}</p>
                    <p className="text-[11px] text-stone-400">{promo.description}</p>

                    <div className="pt-2 flex items-center space-x-4 text-[11px] text-stone-400">
                      <span className="flex items-center space-x-1">
                        <Tag className="w-3 h-3 text-amber-400" />
                        <span className="text-stone-300 font-bold font-mono">
                          {promo.type === 'PERCENT' || promo.type === 'HAPPY_HOUR' ? `${promo.value}% OFF` : `$${promo.value.toFixed(2)} OFF`}
                        </span>
                      </span>
                      {promo.startHour !== undefined && (
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-blue-400" />
                          <span>{promo.startHour}:00 - {promo.endHour}:00</span>
                        </span>
                      )}
                      {promo.minSpend && (
                        <span className="flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>Min Spend: ${promo.minSpend.toFixed(2)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    {onApplyToCart && promo.isActive && (
                      <button
                        onClick={() => handleApply(promo)}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold transition-all shadow-md flex items-center space-x-1"
                        title="Apply this promotion to active cart right now"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>អនុវត្ត (Apply)</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleToggle(promo.id)}
                      className={`p-2 rounded-xl border transition-colors ${
                        promo.isActive
                          ? 'bg-stone-800 hover:bg-red-950/40 text-stone-300 hover:text-red-400 border-stone-700 hover:border-red-600/40'
                          : 'bg-emerald-950/40 text-emerald-400 border-emerald-600/40 hover:bg-emerald-900/40'
                      }`}
                      title={promo.isActive ? 'Disable promotion' : 'Enable promotion'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            {promotions.filter((p) => p.isActive).length} active promotions configured
          </span>
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
