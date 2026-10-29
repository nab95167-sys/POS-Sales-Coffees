import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Utensils, AlertTriangle, Coffee, Filter } from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { SAMPLE_KDS_ORDERS } from '../../services/mockData';

export const KdsBoard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('coffee_kds_orders');
    return saved ? JSON.parse(saved) : SAMPLE_KDS_ORDERS;
  });

  const [activeFilter, setActiveFilter] = useState<'ALL' | OrderStatus>('ALL');

  useEffect(() => {
    localStorage.setItem('coffee_kds_orders', JSON.stringify(orders));
  }, [orders]);

  const updateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
  };

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'ALL') return o.status !== 'COMPLETED';
    return o.status === activeFilter;
  });

  const getElapsedMinutes = (dateStr: string) => {
    const elapsedMs = Date.now() - new Date(dateStr).getTime();
    return Math.floor(elapsedMs / 60000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900/80 p-4 rounded-3xl border border-stone-800 glass-panel">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-100">Kitchen Display System (KDS)</h2>
            <p className="text-xs text-stone-400">Live order queue & ticket management for Baristas</p>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-stone-400 mr-1" />
          {(['ALL', 'PENDING', 'PREPARING', 'READY', 'COMPLETED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setActiveFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeFilter === st
                  ? 'bg-amber-600 text-stone-950 shadow-lg shadow-amber-900/30'
                  : 'bg-stone-800/60 text-stone-300 hover:bg-stone-800'
              }`}
            >
              {st === 'ALL' ? 'Active Queue' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-stone-900/40 border border-stone-800/60 rounded-3xl glass-card">
          <Coffee className="w-12 h-12 text-stone-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-stone-300">No Orders in Queue</h3>
          <p className="text-xs text-stone-500 mt-1">New incoming orders from POS will appear here live.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            const elapsed = getElapsedMinutes(order.createdAt);
            const isLate = elapsed > 10;
            const isCritical = elapsed > 15;

            return (
              <div
                key={order.id}
                className={`bg-stone-900 border rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between transition-all ${
                  isCritical
                    ? 'border-red-500/80 shadow-red-950/30'
                    : isLate
                    ? 'border-amber-500/80 shadow-amber-950/30'
                    : 'border-stone-800 hover:border-amber-700/50'
                }`}
              >
                {/* Ticket Header */}
                <div
                  className={`p-4 border-b flex items-center justify-between ${
                    order.status === 'PREPARING'
                      ? 'bg-amber-950/40 border-amber-900/40'
                      : order.status === 'READY'
                      ? 'bg-emerald-950/40 border-emerald-900/40'
                      : 'bg-stone-950 border-stone-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-extrabold text-stone-100 font-mono">{order.orderNumber}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
                        {order.type.replace('_', ' ')}
                      </span>
                    </div>
                    {order.tableName && <span className="text-xs text-amber-400 font-semibold">{order.tableName}</span>}
                  </div>

                  {/* Elapsed Timer */}
                  <div
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold ${
                      isCritical
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                        : isLate
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{elapsed}m ago</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-5 space-y-3 flex-1 overflow-y-auto max-h-64">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-stone-950/60 border border-stone-800/80 space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-bold text-stone-100">
                          <span className="text-amber-400 mr-2">{item.quantity}x</span>
                          {item.name}
                        </span>
                        {item.selectedVariant && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-stone-800 text-amber-300">
                            {item.selectedVariant.name}
                          </span>
                        )}
                      </div>

                      {item.selectedToppings.length > 0 && (
                        <div className="text-xs text-stone-400 pl-5">
                          + {item.selectedToppings.map((t) => t.name).join(', ')}
                        </div>
                      )}

                      {item.notes && (
                        <div className="text-xs font-medium text-red-400 bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-900/30 mt-1">
                          ⚠️ {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Status Action Buttons */}
                <div className="p-4 bg-stone-950/80 border-t border-stone-800/80">
                  {order.status === 'PENDING' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                      className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-amber-900/30"
                    >
                      <Coffee className="w-4 h-4" />
                      <span>Start Preparing</span>
                    </button>
                  )}

                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'READY')}
                      className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-900/30"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Mark Order Ready</span>
                    </button>
                  )}

                  {order.status === 'READY' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                      className="w-full py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center space-x-2 transition-all"
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
