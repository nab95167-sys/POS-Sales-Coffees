import React, { useState } from 'react';
import { X, Sparkles, Coffee, Thermometer, Flame, Gauge, CheckCircle2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const AiBaristaModal: React.FC<Props> = ({ onClose }) => {
  const [selectedDrink, setSelectedDrink] = useState('Espresso Shot');
  const [beansType, setBeansType] = useState('100% Arabica Ethiopian Yirgacheffe');

  const recipeGuides: Record<string, { dose: string; extractionTime: string; yieldAmount: string; temp: string; milkRatio?: string }> = {
    'Espresso Shot': { dose: '18.5g', extractionTime: '26-28 seconds', yieldAmount: '36g liquid', temp: '92.5 °C' },
    'Iced Caramel Macchiato': { dose: '19.0g', extractionTime: '25 seconds', yieldAmount: '38g liquid', temp: '93.0 °C', milkRatio: '180ml Oat Milk + 15ml Vanilla' },
    'Flat White': { dose: '18.0g', extractionTime: '27 seconds', yieldAmount: '34g liquid', temp: '92.0 °C', milkRatio: '150ml Whole Milk (Micro-foam 65°C)' },
  };

  const currentGuide = recipeGuides[selectedDrink] || recipeGuides['Espresso Shot'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-stone-900 border border-amber-600/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-stone-950 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">AI Barista Brew & Quality Assistant</h3>
              <p className="text-xs text-stone-400">Smart extraction timing, temp & milk micro-foam calibration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Select Drink */}
          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">Select Coffee Beverage</label>
            <select
              value={selectedDrink}
              onChange={(e) => setSelectedDrink(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-stone-100 text-xs font-bold focus:outline-none"
            >
              <option value="Espresso Shot" className="bg-stone-900">Espresso Shot</option>
              <option value="Iced Caramel Macchiato" className="bg-stone-900">Iced Caramel Macchiato</option>
              <option value="Flat White" className="bg-stone-900">Flat White</option>
            </select>
          </div>

          {/* AI Recommended Calibration Card */}
          <div className="p-5 bg-stone-950 rounded-2xl border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between text-xs text-amber-400 font-bold border-b border-stone-800 pb-2">
              <span className="flex items-center space-x-1">
                <Coffee className="w-4 h-4" />
                <span>AI Recipe Target Matrix</span>
              </span>
              <span className="text-[10px] bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-800/40">Gold Cup Standard</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-stone-900 rounded-xl">
                <span className="text-[10px] text-stone-400 block">Dose Weight</span>
                <span className="font-bold text-stone-100 font-mono text-sm">{currentGuide.dose}</span>
              </div>
              <div className="p-2.5 bg-stone-900 rounded-xl">
                <span className="text-[10px] text-stone-400 block">Extraction Time</span>
                <span className="font-bold text-amber-300 font-mono text-sm">{currentGuide.extractionTime}</span>
              </div>
              <div className="p-2.5 bg-stone-900 rounded-xl">
                <span className="text-[10px] text-stone-400 block">Target Yield</span>
                <span className="font-bold text-stone-100 font-mono text-sm">{currentGuide.yieldAmount}</span>
              </div>
              <div className="p-2.5 bg-stone-900 rounded-xl">
                <span className="text-[10px] text-stone-400 block">Water Temperature</span>
                <span className="font-bold text-stone-100 font-mono text-sm">{currentGuide.temp}</span>
              </div>
            </div>

            {currentGuide.milkRatio && (
              <div className="p-2.5 bg-stone-900 rounded-xl text-xs text-stone-300">
                <span className="text-[10px] text-stone-400 block mb-0.5">Milk Steaming Ratio</span>
                <span className="font-bold text-amber-200">{currentGuide.milkRatio}</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-lg"
          >
            Apply Recipe Settings to Barista Ticket
          </button>
        </div>
      </div>
    </div>
  );
};
