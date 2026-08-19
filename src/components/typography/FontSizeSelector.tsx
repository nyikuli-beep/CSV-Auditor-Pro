import React from 'react';
import { Type, Check } from 'lucide-react';
import { TypographyFontSize } from '../../types';
import { FONT_SIZE_OPTIONS, FontSizeOption } from '../../lib/typographyEngine';

interface FontSizeSelectorProps {
  selectedSize: TypographyFontSize;
  onSelectSize: (size: TypographyFontSize) => void;
  isDarkMode: boolean;
}

export default function FontSizeSelector({
  selectedSize,
  onSelectSize,
  isDarkMode
}: FontSizeSelectorProps) {
  return (
    <div className="space-y-3" id="typography-font-size-section">
      <div className="flex items-center justify-between">
        <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          <Type className="w-3.5 h-3.5 text-emerald-400" /> Global Base Font Size
        </h4>
        <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Scales body copy, labels, and table cells proportionally
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FONT_SIZE_OPTIONS.map((opt: FontSizeOption) => {
          const isSelected = selectedSize === opt.id;
          return (
            <button
              key={opt.id}
              id={`font-size-option-${opt.id}`}
              type="button"
              onClick={() => onSelectSize(opt.id)}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left relative flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500'
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
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-emerald-400 font-bold mb-1">
                  {opt.px} <span className="text-[10px] text-slate-500">({opt.rem})</span>
                </div>
                <p className={`text-[10px] leading-relaxed line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {opt.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/20 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono uppercase">Scale Spec</span>
                <span className="font-extrabold text-slate-300" style={{ fontSize: opt.px }}>
                  Aa
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
