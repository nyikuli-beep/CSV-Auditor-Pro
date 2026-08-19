import React, { useState } from 'react';
import { Type, Check, Search, Globe, Laptop, BookOpen, Code2 } from 'lucide-react';
import { TypographyFontFamily } from '../../types';
import { FONTS_REGISTRY, FontDetails, loadGoogleFont } from '../../lib/typographyEngine';

interface FontFamilySelectorProps {
  selectedFont: TypographyFontFamily | string;
  onSelectFont: (font: TypographyFontFamily) => void;
  isDarkMode: boolean;
}

type FilterCategory = 'all' | 'standard' | 'modern' | 'serif' | 'monospace';

export default function FontFamilySelector({
  selectedFont,
  onSelectFont,
  isDarkMode
}: FontFamilySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');

  const allFonts: FontDetails[] = Object.values(FONTS_REGISTRY);

  const filteredFonts = allFonts.filter(font => {
    const matchesSearch = font.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          font.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || font.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleFontClick = (fontId: TypographyFontFamily) => {
    const font = FONTS_REGISTRY[fontId];
    if (font?.isWebFont) {
      loadGoogleFont(fontId);
    }
    onSelectFont(fontId);
  };

  return (
    <div className="space-y-4" id="typography-font-family-section">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="font-search-input"
            type="text"
            placeholder="Search fonts (e.g. Inter, Helvetica, Times)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-500'
                : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" id="font-category-filters">
          {[
            { id: 'all', label: 'All Fonts', icon: Type },
            { id: 'standard', label: 'Standard OS', icon: Laptop },
            { id: 'modern', label: 'Modern Web', icon: Globe },
            { id: 'serif', label: 'Serif', icon: BookOpen },
            { id: 'monospace', label: 'Monospace', icon: Code2 },
          ].map(cat => {
            const Icon = cat.icon;
            const isActive = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                id={`font-filter-${cat.id}`}
                type="button"
                onClick={() => setCategoryFilter(cat.id as FilterCategory)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
        {filteredFonts.map((font) => {
          const isSelected = selectedFont === font.id;
          return (
            <div
              key={font.id}
              id={`font-option-${font.id}`}
              onClick={() => handleFontClick(font.id)}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500'
                  : isDarkMode
                  ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {font.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded capitalize ${
                      font.category === 'modern'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : font.category === 'serif'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : font.category === 'monospace'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}>
                      {font.category}
                    </span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </div>

                <p className={`text-[10px] line-clamp-2 leading-relaxed mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {font.description}
                </p>
              </div>

              {/* Sample Typography Preview rendered in the font's actual stack */}
              <div
                className={`p-2.5 rounded-lg border text-xs leading-tight ${
                  isDarkMode ? 'bg-slate-950 border-slate-800/80 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
                style={{ fontFamily: font.fontStack }}
              >
                <div className="text-sm font-bold truncate">{font.samplePhrase}</div>
                <div className="text-[11px] opacity-75 mt-0.5 font-normal truncate">
                  Aa Bb Gg 12345 &amp; %
                </div>
              </div>
            </div>
          );
        })}

        {filteredFonts.length === 0 && (
          <div className="col-span-full py-8 text-center text-slate-400 text-xs">
            No font families found matching &ldquo;{searchQuery}&rdquo;. Try another search term.
          </div>
        )}
      </div>
    </div>
  );
}
