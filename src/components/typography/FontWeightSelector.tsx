import React from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';
import { TypographyFontWeight } from '../../types';
import { FONT_WEIGHT_OPTIONS, FontWeightOption } from '../../lib/typographyEngine';

interface FontWeightSelectorProps {
  selectedWeight: TypographyFontWeight;
  onSelectWeight: (weight: TypographyFontWeight) => void;
  isDarkMode: boolean;
}

export default function FontWeightSelector({
  selectedWeight,
  onSelectWeight,
  isDarkMode
}: FontWeightSelectorProps) {
  return (
    <div className="space-y-3" id="typography-font-weight-section">
      <div className="flex items-center justify-between">
        <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" /> Default Base Font Weight
        </h4>
        <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Enforces baseline typographic thickness across user interface
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FONT_WEIGHT_OPTIONS.map((opt: FontWeightOption) => {
          const isSelected = selectedWeight === opt.id;
          return (
            <button
              key={opt.id}
              id={`font-weight-option-${opt.id}`}
              type="button"
              onClick={() => onSelectWeight(opt.id)}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left relative flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500'
                  : isDarkMode
                  ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-blue-400 font-bold mb-1">
                  Numeric Weight: {opt.weight}
                </div>
                <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {opt.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/20 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Preview</span>
                <span
                  className={`text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}
                  style={{ fontWeight: opt.weight }}
                >
                  Typography
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
