import React from 'react';
import { X, Printer, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Order } from '../../types';

interface Props {
  order: Order;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<Props> = ({ order, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const khrExchangeRate = 4100;
  const totalKHR = Math.round(order.totalAmount * khrExchangeRate);

  const getOrderTypeKhmer = (type: string) => {
    switch (type) {
      case 'DINE_IN':
        return 'ហូបក្នុងហាង (Dine In)';
      case 'TAKE_AWAY':
        return 'ខ្ចប់ (Take Away)';
      case 'DELIVERY':
        return 'ដឹកជញ្ជូន (Delivery)';
      default:
        return 'បើកបរទិញ (Drive Thru)';
    }
  };

  const getPaymentMethodKhmer = (method?: string) => {
    switch (method) {
      case 'ABA_KHQR':
        return 'ស្កែន ABA KHQR 🇰🇭';
      case 'CREDIT_CARD':
        return 'កាតធនាគារ (Card)';
      default:
        return 'ប្រាក់សុទ្ធ (Cash)';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="text-sm font-bold text-stone-100">វិក្កយបត្រពន្ធ / Khmer Official Tax Receipt</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 80mm Khmer Thermal Receipt View */}
        <div className="p-6 bg-stone-950 max-h-[70vh] overflow-y-auto">
          <div
            id="printable-receipt"
            className="bg-white text-stone-900 p-6 rounded-2xl shadow-xl font-sans text-xs space-y-4 max-w-[320px] mx-auto border border-stone-300"
          >
            {/* Store Khmer Header */}
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold tracking-wide text-stone-950">ក្រុមហ៊ុន អូរ៉ា កាហ្វេ ខូ អិលធីឌី</h2>
              <p className="text-[11px] font-mono font-bold text-amber-900">AURA COFFEE CO., LTD.</p>
              <p className="text-[10px] text-stone-600">លេខអត្តសញ្ញាណកម្ម អតប: K002-902188201</p>
              <p className="text-[10px] text-stone-600 leading-tight">
                អាសយដ្ឋាន៖ ផ្លូវ ២៤០ រាជធានីភ្នំពេញ កម្ពុជា
              </p>
              <p className="text-[10px] text-stone-600">ទូរស័ព្ទ៖ +855 23 999 888</p>
              <div className="text-[11px] font-bold border-t border-b border-dashed border-stone-400 py-1 my-2 text-amber-950">
                វិក្កយបត្រពន្ធ / TAX INVOICE
              </div>
            </div>

            {/* Invoice Khmer Meta */}
            <div className="text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>លេខវិក្កយបត្រ (Inv #):</span>
                <span className="font-mono font-bold">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>កាលបរិច្ឆេទ (Date):</span>
                <span>{new Date(order.createdAt).toLocaleString('km-KH')}</span>
              </div>
              <div className="flex justify-between">
                <span>បេឡាធិការ (Cashier):</span>
                <span className="font-bold">{order.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>ប្រភេទ (Type):</span>
                <span className="font-bold">{getOrderTypeKhmer(order.type)}</span>
              </div>
            </div>

            {/* Items Khmer Table */}
            <div className="border-t border-dashed border-stone-400 pt-2 space-y-2">
              <div className="flex justify-between text-[10px] font-bold border-b border-stone-300 pb-1">
                <span>ទំនិញ (Item)</span>
                <span>ចំនួន x តម្លៃ</span>
                <span>សរុប ($)</span>
              </div>

              {order.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between font-bold">
                    <span>{item.name}</span>
                    <span className="font-mono">${item.itemSubtotal.toFixed(2)}</span>
                  </div>

                  {(item.selectedVariant || item.selectedToppings.length > 0) && (
                    <div className="text-[9px] text-stone-600 pl-2">
                      {item.selectedVariant && <div>ទំហំ: {item.selectedVariant.name}</div>}
                      {item.selectedToppings.length > 0 && (
                        <div>+ {item.selectedToppings.map((t) => t.name).join(', ')}</div>
                      )}
                    </div>
                  )}

                  <div className="text-[9px] text-stone-500 font-mono">
                    {item.quantity} x ${item.unitPrice.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary Khmer */}
            <div className="border-t border-dashed border-stone-400 pt-2 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>សរុបរង (Subtotal):</span>
                <span className="font-mono">${order.subtotal.toFixed(2)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>បញ្ចុះតម្លៃ (Discount):</span>
                  <span className="font-mono">-${order.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>អាករលើតម្លៃបន្ថែម 10% (VAT):</span>
                <span className="font-mono">${order.taxAmount.toFixed(2)}</span>
              </div>

              {/* Total Payable USD & KHR */}
              <div className="border-t border-stone-900 pt-2 space-y-1 font-bold text-xs">
                <div className="flex justify-between text-stone-950">
                  <span>ប្រាក់ត្រូវបង់សរុប (USD):</span>
                  <span className="text-sm font-extrabold font-mono">${order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-950 text-[11px]">
                  <span>ប្រាក់ត្រូវបង់សរុប (KHR ៛):</span>
                  <span className="font-bold">៛ {totalKHR.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Khmer Payment Details */}
            <div className="border-t border-dashed border-stone-400 pt-2 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>វិធីសាស្ត្រទូទាត់ (Payment):</span>
                <span className="font-bold">{getPaymentMethodKhmer(order.paymentMethod)}</span>
              </div>
              {order.amountPaid !== undefined && (
                <div className="flex justify-between">
                  <span>ប្រាក់ទទួលបាន (Received):</span>
                  <span className="font-mono">${order.amountPaid.toFixed(2)}</span>
                </div>
              )}
              {order.changeAmount !== undefined && order.changeAmount > 0 && (
                <div className="flex justify-between">
                  <span>ប្រាក់អាប់ (Change):</span>
                  <span className="font-mono">${order.changeAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* ABA KHQR & Khmer Footer */}
            <div className="border-t border-dashed border-stone-400 pt-3 text-center space-y-2">
              <div className="inline-block p-2 bg-stone-100 rounded-xl border border-stone-300">
                <QRCodeSVG
                  value={`00020101021238580016AURACOFFEEOFFICIAL0111ABA00099485204599953038405404${order.totalAmount.toFixed(2)}5802KH5910AURA COFFEE6010PHNOM PENH630488F4`}
                  size={90}
                />
              </div>
              <p className="text-[10px] text-stone-800 font-bold">ស្កែនទូទាត់ប្រាក់ ឬផ្ទៀងផ្ទាត់ជាមួយ ABA KHQR / Bakong</p>
              <p className="text-[10px] text-stone-600">សូមអរគុណ! សូមអញ្ជើញមកពិសាកាហ្វេម្ដងទៀត។</p>
            </div>
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs"
          >
            បិទ (Close)
          </button>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-900/30"
          >
            <Printer className="w-4 h-4" />
            <span>បោះពុម្ពវិក្កយបត្រ 80mm</span>
          </button>
        </div>
      </div>
    </div>
  );
};
