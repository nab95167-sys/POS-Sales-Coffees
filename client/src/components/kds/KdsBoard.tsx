import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, Utensils, Coffee, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { fetchOrders, updateOrderStatusApi } from '../../services/orderService';
import { showToastNotification } from '../../services/telegramBotService';
import { useLanguage } from '../../context/LanguageContext';
import { PageHeader } from '../ui/PageHeader';

export const KdsBoard: React.FC = () => {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [loading, setLoading] = useState(true);

  const loadKdsOrders = useCallback(async () => {
    try {
      const list = await fetchOrders({ limit: 100 });
      setOrders(list.filter((o) => !o.isRefunded && o.status !== 'CANCELLED'));
    } catch (err) {
      console.error('Failed to load KDS orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKdsOrders();
    const timer = setInterval(() => {
      void loadKdsOrders();
    }, 8000);

    const onRefresh = () => {
      void loadKdsOrders();
    };
    window.addEventListener('coffee_order_created', onRefresh);
    window.addEventListener('coffee_order_refunded', onRefresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('coffee_order_created', onRefresh);
      window.removeEventListener('coffee_order_refunded', onRefresh);
    };
  }, [loadKdsOrders]);

  const updateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const updated = await updateOrderStatusApi(orderId, nextStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToastNotification(`Order ${updated.orderNumber} → ${nextStatus}`, 'success');
    } catch (err) {
      showToastNotification(err instanceof Error ? err.message : 'Failed to update ticket status', 'error');
    }
  };

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const preparingCount = orders.filter((o) => o.status === 'PREPARING').length;
  const readyCount = orders.filter((o) => o.status === 'READY').length;

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'ALL') return o.status !== 'COMPLETED';
    return o.status === activeFilter;
  });

  const getElapsedMinutes = (dateStr: string) => {
    const elapsedMs = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(elapsedMs / 60000));
  };

  return (
    <div className="space-y-5 font-sans">
      <PageHeader
        icon={<Utensils className="w-5 h-5" />}
        title={t('kdsTitle')}
        subtitle={t('kdsSub')}
        badge={`${pendingCount + preparingCount + readyCount} Active`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadKdsOrders()}
              className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-200 text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('refresh')}</span>
            </button>
          </div>
        }
      />

      {/* Live Status Counters + Filter Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-2.5 sm:flex sm:items-center">
          <div className="px-3.5 py-2 rounded-xl glass-card flex items-center justify-between gap-2 text-xs">
            <span className="text-zinc-400 font-semibold">Pending</span>
            <span className="font-mono font-black text-amber-400">{pendingCount}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl glass-card flex items-center justify-between gap-2 text-xs">
            <span className="text-zinc-400 font-semibold">Preparing</span>
            <span className="font-mono font-black text-sky-400">{preparingCount}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl glass-card flex items-center justify-between gap-2 text-xs">
            <span className="text-zinc-400 font-semibold">Ready</span>
            <span className="font-mono font-black text-emerald-400">{readyCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-zinc-400 mr-1 flex-shrink-0" />
          {(['ALL', 'PENDING', 'PREPARING', 'READY', 'COMPLETED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setActiveFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === st
                  ? 'gold-gradient-bg text-zinc-950 shadow-md'
                  : 'bg-white/[0.04] border border-white/10 text-zinc-300 hover:bg-white/[0.08]'
              }`}
            >
              {st === 'ALL' ? 'Active Queue' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-2xl space-y-2">
          <Coffee className="w-11 h-11 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-zinc-200">No Orders in Queue</h3>
          <p className="text-xs text-zinc-500">New incoming orders from POS will appear here live.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredOrders.map((order) => {
            const elapsed = getElapsedMinutes(order.createdAt);
            const isLate = elapsed > 10;
            const isCritical = elapsed > 15;

            return (
              <div
                key={order.id}
                className={`glass-card rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between transition-all ${
                  isCritical
                    ? 'border-red-500/70'
                    : isLate
                    ? 'border-amber-500/70'
                    : 'border-white/10 hover:border-amber-500/40'
                }`}
              >
                <div
                  className={`p-4 border-b flex items-center justify-between gap-2 ${
                    order.status === 'PREPARING'
                      ? 'bg-sky-950/35 border-sky-500/25'
                      : order.status === 'READY'
                      ? 'bg-emerald-950/35 border-emerald-500/25'
                      : 'bg-[#0b0c10] border-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-zinc-100 font-mono">{order.orderNumber}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
                        {order.type.replace('_', ' ')}
                      </span>
                    </div>
                    {order.tableName && <span className="text-xs text-amber-400 font-semibold">{order.tableName}</span>}
                  </div>

                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold ${
                      isCritical
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                        : isLate
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-zinc-900 text-zinc-300 border border-white/10'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{elapsed}m</span>
                  </div>
                </div>

                <div className="p-4 space-y-2.5 flex-1 overflow-y-auto max-h-64">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#0b0c10] border border-white/10 space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-sm font-bold text-zinc-100">
                          <span className="text-amber-400 font-mono mr-2">{item.quantity}x</span>
                          {item.name}
                        </span>
                        {item.selectedVariant && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-zinc-800 text-amber-300 flex-shrink-0">
                            {item.selectedVariant.name}
                          </span>
                        )}
                      </div>

                      {item.selectedToppings.length > 0 && (
                        <div className="text-xs text-zinc-400 pl-6">
                          + {item.selectedToppings.map((tp) => tp.name).join(', ')}
                        </div>
                      )}

                      {item.notes && (
                        <div className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/25 flex items-center gap-1.5 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{item.notes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-3.5 bg-[#0b0c10] border-t border-white/10">
                  {order.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => void updateOrderStatus(order.id, 'PREPARING')}
                      className="w-full py-2.5 rounded-xl gold-gradient-bg hover:brightness-110 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <Coffee className="w-4 h-4" />
                      <span>Start Preparing</span>
                    </button>
                  )}

                  {order.status === 'PREPARING' && (
                    <button
                      type="button"
                      onClick={() => void updateOrderStatus(order.id, 'READY')}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Mark Order Ready</span>
                    </button>
                  )}

                  {order.status === 'READY' && (
                    <button
                      type="button"
                      onClick={() => void updateOrderStatus(order.id, 'COMPLETED')}
                      className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Complete & Handover</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
