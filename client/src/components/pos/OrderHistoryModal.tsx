import React, { useState, useEffect } from 'react';
import { 
  X, Search, RotateCcw, Printer, Tag, CheckCircle2, AlertTriangle, 
  Calendar, Clock, User, DollarSign, Layers, ShieldCheck, Filter, ArrowRightLeft
} from 'lucide-react';
import { Order } from '../../types';
import { getOrders, refundOrder } from '../../services/orderService';
import { logSecurityEvent } from '../../services/securityAuditService';
import { soundEffects } from '../../services/soundService';

interface Props {
  onClose: () => void;
  onReprintReceipt: (order: Order) => void;
  onPrintCupLabels: (order: Order) => void;
  onRequestManagerPin: (action: { title: string; details: string; onApproved: () => void }) => void;
}

export const OrderHistoryModal: React.FC<Props> = ({
  onClose,
  onReprintReceipt,
  onPrintCupLabels,
  onRequestManagerPin,
}) => {
  const [orders, setOrders] = useState<Order[]>(() => getOrders());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');

  useEffect(() => {
    const handleUpdate = () => setOrders(getOrders());
    window.addEventListener('coffee_order_created', handleUpdate);
    window.addEventListener('coffee_order_refunded', handleUpdate);
    return () => {
      window.removeEventListener('coffee_order_created', handleUpdate);
      window.removeEventListener('coffee_order_refunded', handleUpdate);
    };
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.cashierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.tableName && o.tableName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.paymentMethod && o.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'COMPLETED' && !o.isRefunded && o.status !== 'CANCELLED') ||
      (statusFilter === 'CANCELLED' && (o.isRefunded || o.status === 'CANCELLED'));

    return matchesSearch && matchesStatus;
  });

  const handleRefundClick = (order: Order) => {
    if (order.isRefunded) return;

    onRequestManagerPin({
      title: `Refund Order #${order.orderNumber} (សងប្រាក់វិក្កយបត្រ)`,
      details: `Full refund for $${order.totalAmount.toFixed(2)} (${order.items.length} items). Requires Manager PIN authorization.`,
      onApproved: () => {
        const reason = prompt('Please enter reason for refund (មូលហេតុនៃការសងលុយ):', 'Customer requested drink change') || 'Store Manager Override';
        const success = refundOrder(order.id, reason, 'Manager');
        if (success) {
          soundEffects.playCashRegister();
          logSecurityEvent(
            'ORDER_VOID',
            'Order Refund / Voided',
            `Refunded #${order.orderNumber} for $${order.totalAmount.toFixed(2)} - Reason: ${reason}`,
            order.cashierName,
            'Manager (PIN: 1234)',
            'CRITICAL'
          );
          setOrders(getOrders());
          alert(`Order #${order.orderNumber} has been successfully refunded and marked as Cancelled.`);
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 glass-panel flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100 flex items-center space-x-2">
                <span>Order History & Receipt Manager</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-700/40 font-mono">
                  ប្រវត្តិវិក្កយបត្រ
                </span>
              </h2>
              <p className="text-xs text-stone-400">Lookup past transactions, re-print 80mm receipts, print cup stickers, or issue refunds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-stone-950/60 border-b border-stone-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by order #, cashier, table, or payment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs text-stone-100 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-stone-400 flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Status:</span>
            </span>
            {(['ALL', 'COMPLETED', 'CANCELLED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-amber-600 text-stone-950 shadow-md'
                    : 'bg-stone-800/60 text-stone-400 hover:text-stone-200'
                }`}
              >
                {st === 'ALL' ? 'All Orders' : st === 'COMPLETED' ? 'Completed' : 'Refunded'}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 space-y-3 text-stone-500">
              <Clock className="w-12 h-12 mx-auto stroke-1 text-stone-600" />
              <p className="text-sm">No orders matching your search query.</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isRef = order.isRefunded || order.status === 'CANCELLED';
              const timeStr = new Date(order.createdAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={order.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isRef
                      ? 'bg-red-950/20 border-red-900/40 opacity-75'
                      : 'bg-stone-900/80 border-stone-800 hover:border-amber-700/40 shadow-md'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Info & Items preview */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-mono font-bold text-sm text-stone-100">{order.orderNumber}</span>
                        <span className="text-xs text-stone-400">• {timeStr}</span>

                        {order.tableName && (
                          <span className="px-2 py-0.5 rounded-md bg-stone-800 text-amber-300 border border-stone-700 text-[10px] font-bold">
                            🪑 {order.tableName}
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 text-[10px] uppercase font-semibold">
                          {order.type.replace('_', ' ')}
                        </span>

                        {isRef ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-700/50 text-[10px] font-bold flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>REFUNDED (បានសងលុយ)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/50 text-[10px] font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>PAID</span>
                          </span>
                        )}

                        <span className="text-xs text-stone-400">
                          Cashier: <strong className="text-stone-300">{order.cashierName}</strong>
                        </span>
                      </div>

                      {/* Item list brief */}
                      <div className="text-xs text-stone-300 font-sans">
                        {order.items.map((i, idx) => (
                          <span key={i.cartItemId}>
                            {i.quantity}x {i.name}
                            {i.selectedVariant ? ` (${i.selectedVariant.name.charAt(0)})` : ''}
                            {idx < order.items.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>

                      {/* Payment info */}
                      <div className="flex items-center space-x-3 text-[11px] text-stone-400 pt-0.5">
                        <span>
                          Method:{' '}
                          <strong className="text-stone-200">
                            {order.paymentMethod ? order.paymentMethod.replace('_', ' ') : 'N/A'}
                          </strong>
                        </span>
                        {order.splitPayments && (
                          <span className="text-purple-400 font-mono">
                            (Split: ${order.splitPayments[0]?.amount.toFixed(2)} Cash + ${order.splitPayments[1]?.amount.toFixed(2)} QR)
                          </span>
                        )}
                        {isRef && order.refundReason && (
                          <span className="text-red-400 italic">
                            Reason: {order.refundReason}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Total Amount */}
                    <div className="text-left md:text-right shrink-0">
                      <div className="text-xl font-mono font-black text-amber-400">
                        ${order.totalAmount.toFixed(2)}
                      </div>
                      <div className="text-[11px] font-mono text-stone-400">
                        ≈ ៛ {Math.round(order.totalAmount * 4100).toLocaleString()} KHR
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => onReprintReceipt(order)}
                        className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center space-x-1.5 transition-colors border border-stone-700 shadow-sm"
                        title="Re-print 80mm ESC/POS Thermal Receipt"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Receipt</span>
                      </button>

                      <button
                        onClick={() => onPrintCupLabels(order)}
                        className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center space-x-1.5 transition-colors border border-stone-700 shadow-sm"
                        title="Print 40x30mm Cup Stickers"
                      >
                        <Tag className="w-3.5 h-3.5 text-amber-400" />
                        <span>Labels</span>
                      </button>

                      {!isRef && (
                        <button
                          onClick={() => handleRefundClick(order)}
                          className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-600/50 text-red-300 text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
                          title="Void or Refund Order (Requires Manager PIN)"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                          <span>Refund</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-stone-400 font-mono">
            Total {orders.length} orders recorded in system database
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
