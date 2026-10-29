import React from 'react';
import { X, Sparkles, TrendingUp, AlertTriangle, Coffee, Package, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Props {
  onClose: () => void;
}

export const AiForecastModal: React.FC<Props> = ({ onClose }) => {
  const forecastTrendData = [
    { day: 'Mon', historical: 1420, predicted: 1510 },
    { day: 'Tue', historical: 1610, predicted: 1680 },
    { day: 'Wed', historical: 1842, predicted: 1950 },
    { day: 'Thu', historical: 1750, predicted: 1820 },
    { day: 'Fri', historical: 2100, predicted: 2350 },
    { day: 'Sat', historical: 2890, predicted: 3100 },
    { day: 'Sun', historical: 2650, predicted: 2850 },
  ];

  const aiInventoryReorders = [
    { ingredient: 'Oat Milk Barista Edition', current: '4.5 L', predictedDepletion: 'In 1.2 Days', reorderQty: '30 Liters', status: 'CRITICAL' },
    { ingredient: 'Ethiopia Yirgacheffe Beans', current: '14.5 kg', predictedDepletion: 'In 3.8 Days', reorderQty: '25 kg', status: 'OPTIMAL' },
    { ingredient: 'Artisan Sourdough Loaves', current: '8 pcs', predictedDepletion: 'In 0.8 Days', reorderQty: '20 pcs', status: 'HIGH_DEMAND' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-700/40 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-amber-500 to-yellow-400 flex items-center justify-center text-stone-950 font-bold shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">AI Sales & Inventory Forecast Engine</h3>
              <p className="text-xs text-stone-400">Predictive Machine Learning for Sales Demand & Stock Reorders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* AI Sales Forecast Chart */}
          <div className="p-5 bg-stone-950 rounded-2xl border border-stone-800 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-stone-100 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>Predicted 7-Day Revenue Growth (+12.8%)</span>
                </h4>
                <p className="text-[11px] text-stone-400">AI model trained on 500+ branch historical sales velocity</p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-900/40">
                Peak: Sat ($3,100)
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastTrendData}>
                  <defs>
                    <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" />
                  <XAxis dataKey="day" stroke="#78716c" fontSize={11} />
                  <YAxis stroke="#78716c" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1c1917', borderColor: '#78716c', borderRadius: '12px', color: '#f5f5f4' }} />
                  <Area type="monotone" dataKey="predicted" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#aiGrad)" name="AI Predicted ($)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Inventory Reorder Recommendations */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Automated Reorder Point Recommendations
            </h4>

            <div className="space-y-2.5">
              {aiInventoryReorders.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Package className="w-5 h-5 text-amber-400" />
                    <div>
                      <h5 className="text-xs font-bold text-stone-200">{item.ingredient}</h5>
                      <span className="text-[10px] text-stone-400">On Hand: {item.current} • Depletion: {item.predictedDepletion}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold text-emerald-400">Order: {item.reorderQty}</span>
                    <button
                      onClick={() => alert(`Purchase Order generated for ${item.reorderQty} of ${item.ingredient}`)}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
                    >
                      Auto Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
