import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  X, 
  HelpCircle, 
  Play, 
  ChevronDown, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw,
  BookOpen
} from 'lucide-react';

export interface RegexToken {
  id: string;
  type: 'literal' | 'digits' | 'lowercase' | 'uppercase' | 'letters' | 'alphanumeric' | 'any' | 'whitespace';
  value: string;
  quantifier: 'exactly' | 'one_or_more' | 'zero_or_more' | 'optional' | 'between' | 'at_least';
  countMin: number;
  countMax: number;
}

interface RegexBuilderProps {
  initialRegex?: string;
  onSavePattern: (compiledRegex: string) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

export default function RegexBuilder({ 
  initialRegex = '', 
  onSavePattern, 
  onClose, 
  isDarkMode 
}: RegexBuilderProps) {
  // Tokens state
  const [tokens, setTokens] = useState<RegexToken[]>([
    { id: '1', type: 'letters', value: '', quantifier: 'exactly', countMin: 3, countMax: 5 },
    { id: '2', type: 'literal', value: '-', quantifier: 'exactly', countMin: 1, countMax: 1 },
    { id: '3', type: 'digits', value: '', quantifier: 'exactly', countMin: 4, countMax: 4 }
  ]);

  const [matchStart, setMatchStart] = useState<boolean>(true);
  const [matchEnd, setMatchEnd] = useState<boolean>(true);
  
  // Tester State
  const [testValue, setTestValue] = useState<string>('ABC-1234');
  const [testResult, setTestResult] = useState<boolean | null>(null);

  const tokenTypes = [
    { value: 'literal', label: 'Exact Character(s)' },
    { value: 'digits', label: 'Digits (0-9)' },
    { value: 'letters', label: 'Any Letter (a-z, A-Z)' },
    { value: 'lowercase', label: 'Lowercase Letter (a-z)' },
    { value: 'uppercase', label: 'Uppercase Letter (A-Z)' },
    { value: 'alphanumeric', label: 'Alphanumeric (0-9, a-z)' },
    { value: 'whitespace', label: 'Whitespace (Space, tab)' },
    { value: 'any', label: 'Any Character (Wildcard)' }
  ];

  const quantifiers = [
    { value: 'exactly', label: 'Exactly' },
    { value: 'at_least', label: 'At least' },
    { value: 'one_or_more', label: '1 or more (+)' },
    { value: 'zero_or_more', label: '0 or more (*)' },
    { value: 'optional', label: 'Optional (?)' },
    { value: 'between', label: 'Between' }
  ];

  // Presets definition
  const presets = [
    {
      name: 'Invoice Format (e.g. INV-12345)',
      matchStart: true,
      matchEnd: true,
      tokens: [
        { id: 'p1', type: 'literal', value: 'INV', quantifier: 'exactly', countMin: 1, countMax: 1 },
        { id: 'p2', type: 'literal', value: '-', quantifier: 'exactly', countMin: 1, countMax: 1 },
        { id: 'p3', type: 'digits', value: '', quantifier: 'exactly', countMin: 5, countMax: 5 }
      ],
      sample: 'INV-78291'
    },
    {
      name: 'Product Key (e.g. PRD-ABC-99)',
      matchStart: true,
      matchEnd: true,
      tokens: [
        { id: 'p1', type: 'literal', value: 'PRD', quantifier: 'exactly', countMin: 1, countMax: 1 },
        { id: 'p2', type: 'literal', value: '-', quantifier: 'exactly', countMin: 1, countMax: 1 },
        { id: 'p3', type: 'uppercase', value: '', quantifier: 'exactly', countMin: 3, countMax: 3 },
        { id: 'p4', type: 'literal', value: '-', quantifier: 'exactly', countMin: 1, countMax: 1 },
        { id: 'p5', type: 'digits', value: '', quantifier: 'exactly', countMin: 2, countMax: 2 }
      ],
      sample: 'PRD-XYZ-45'
    },
    {
      name: 'Standard ISO Date (YYYY-MM-DD)',
      matchStart: true,
      matchEnd: true,
      tokens: [
        { id: 'p1', type: 'digits', value: '', quantifier: 'exactly', countMin: 4, countMax: 4 },
        { id: 'p2', type: 'literal', value: '-', quantifier: 'exactly', countMin: 1, countMax: 1 },
        { id: 'p3', type: 'digits', value: '', quantifier: 'exactly', countMin: 2, countMax: 2 },
        { id: 'p4', type: 'literal', value: '-', quantifier: 'exactly', countMin: 1, countMax: 1 },
        { id: 'p5', type: 'digits', value: '', quantifier: 'exactly', countMin: 2, countMax: 2 }
      ],
      sample: '2026-07-17'
    },
    {
      name: 'US Postal Zip Code (e.g. 12345 or 12345-6789)',
      matchStart: true,
      matchEnd: true,
      tokens: [
        { id: 'p1', type: 'digits', value: '', quantifier: 'exactly', countMin: 5, countMax: 5 },
        { id: 'p2', type: 'literal', value: '-', quantifier: 'optional', countMin: 1, countMax: 1 },
        { id: 'p3', type: 'digits', value: '', quantifier: 'optional', countMin: 4, countMax: 4 }
      ],
      sample: '90210-4829'
    },
    {
      name: 'Alphanumeric Serial (e.g. SN-482-B)',
      matchStart: true,
      matchEnd: true,
      tokens: [
        { id: 'p1', type: 'literal', value: 'SN-', quantifier: 'exactly', countMin: 1, countMax: 1 },
        { id: 'p2', type: 'digits', value: '', quantifier: 'exactly', countMin: 3, countMax: 3 },
        { id: 'p3', type: 'literal', value: '-', quantifier: 'exactly', countMin: 1, countMax: 1 },
        { id: 'p4', type: 'uppercase', value: '', quantifier: 'exactly', countMin: 1, countMax: 1 }
      ],
      sample: 'SN-901-Y'
    }
  ];

  // Helper compiled regex generator
  const getCompiledPattern = (): string => {
    let parts = tokens.map(token => {
      let charClass = '';
      switch (token.type) {
        case 'literal':
          // Escape special regex chars in literal string
          charClass = (token.value || '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          break;
        case 'digits':
          charClass = '\\d';
          break;
        case 'lowercase':
          charClass = '[a-z]';
          break;
        case 'uppercase':
          charClass = '[A-Z]';
          break;
        case 'letters':
          charClass = '[a-zA-Z]';
          break;
        case 'alphanumeric':
          charClass = '[a-zA-Z0-9]';
          break;
        case 'whitespace':
          charClass = '\\s';
          break;
        case 'any':
          charClass = '.';
          break;
      }

      // If empty literal value, skip
      if (token.type === 'literal' && !token.value) {
        return '';
      }

      // Now apply quantifier
      let quant = '';
      const needsGroup = token.type === 'literal' && (token.value || '').length > 1;
      const base = needsGroup ? `(?:${charClass})` : charClass;

      switch (token.quantifier) {
        case 'exactly':
          if (token.countMin === 1) quant = '';
          else quant = `{${token.countMin}}`;
          break;
        case 'at_least':
          quant = `{${token.countMin},}`;
          break;
        case 'one_or_more':
          quant = '+';
          break;
        case 'zero_or_more':
          quant = '*';
          break;
        case 'optional':
          // If quantifier is optional and literal length > 1, it needs group.
          quant = '?';
          break;
        case 'between':
          quant = `{${token.countMin},${token.countMax}}`;
          break;
      }

      return base + quant;
    });

    let pattern = parts.join('');
    if (matchStart) pattern = '^' + pattern;
    if (matchEnd) pattern = pattern + '$';

    return pattern;
  };

  const compiledRegex = getCompiledPattern();

  // Dynamic plain English explanation
  const getEnglishTranslation = (): string => {
    if (tokens.length === 0) return "Matches any line of text.";

    let descriptions: string[] = [];

    tokens.forEach(token => {
      let subject = '';
      switch (token.type) {
        case 'literal':
          subject = `exact text "${token.value || '?'}"`;
          break;
        case 'digits':
          subject = 'digit(s) (0-9)';
          break;
        case 'lowercase':
          subject = 'lowercase letter(s) (a-z)';
          break;
        case 'uppercase':
          subject = 'uppercase letter(s) (A-Z)';
          break;
        case 'letters':
          subject = 'letter(s) (a-z, A-Z)';
          break;
        case 'alphanumeric':
          subject = 'alphanumeric character(s)';
          break;
        case 'whitespace':
          subject = 'whitespace space(s)';
          break;
        case 'any':
          subject = 'any wildcard character(s)';
          break;
      }

      let qty = '';
      switch (token.quantifier) {
        case 'exactly':
          qty = token.countMin === 1 ? 'exactly 1' : `exactly ${token.countMin}`;
          break;
        case 'at_least':
          qty = `at least ${token.countMin}`;
          break;
        case 'one_or_more':
          qty = '1 or more';
          break;
        case 'zero_or_more':
          qty = '0 or more';
          break;
        case 'optional':
          qty = 'an optional';
          break;
        case 'between':
          qty = `between ${token.countMin} and ${token.countMax}`;
          break;
      }

      descriptions.push(`${qty} ${subject}`);
    });

    let result = '';
    if (matchStart) {
      result += "Must start with ";
    } else {
      result += "Must contain ";
    }

    result += descriptions.join(', followed directly by ');

    if (matchEnd) {
      result += ", and must end the cell value";
    }

    return result + ".";
  };

  // Run tester logic whenever pattern or test value changes
  useEffect(() => {
    if (!testValue) {
      setTestResult(null);
      return;
    }
    try {
      const rx = new RegExp(compiledRegex);
      setTestResult(rx.test(testValue));
    } catch (e) {
      setTestResult(false);
    }
  }, [compiledRegex, testValue]);

  const loadPreset = (preset: typeof presets[0]) => {
    // Generate fresh IDs
    const newTokens = preset.tokens.map((t, idx) => ({
      ...t,
      id: `preset-${idx}-${Date.now()}`
    }));
    setTokens(newTokens);
    setMatchStart(preset.matchStart);
    setMatchEnd(preset.matchEnd);
    setTestValue(preset.sample);
  };

  const handleAddToken = () => {
    const newToken: RegexToken = {
      id: `tok-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type: 'digits',
      value: '',
      quantifier: 'exactly',
      countMin: 3,
      countMax: 3
    };
    setTokens([...tokens, newToken]);
  };

  const handleUpdateToken = (id: string, updates: Partial<RegexToken>) => {
    setTokens(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteToken = (id: string) => {
    setTokens(prev => prev.filter(t => t.id !== id));
  };

  const moveToken = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === tokens.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...tokens];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setTokens(updated);
  };

  const handleReset = () => {
    setTokens([
      { id: 'r1', type: 'letters', value: '', quantifier: 'exactly', countMin: 3, countMax: 5 },
      { id: 'r2', type: 'literal', value: '-', quantifier: 'exactly', countMin: 1, countMax: 1 },
      { id: 'r3', type: 'digits', value: '', quantifier: 'exactly', countMin: 4, countMax: 4 }
    ]);
    setMatchStart(true);
    setMatchEnd(true);
    setTestValue('ABC-1234');
  };

  return (
    <div className={`p-5 rounded-xl border animate-slideDown ${
      isDarkMode ? 'bg-slate-900 border-indigo-500/30' : 'bg-slate-50 border-indigo-200 shadow-sm'
    } space-y-4`}>
      <div className="flex justify-between items-center pb-2.5 border-b border-indigo-500/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs">Visual Regex Pattern Builder</h4>
            <p className="text-[10px] text-slate-400">Design complex cell formats without writing standard code syntax.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className={`p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 cursor-pointer transition-all`}
            title="Reset to default sequence"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 hover:bg-slate-800 rounded-full text-slate-400 cursor-pointer`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Pickers */}
      <div className="space-y-1.5">
        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Choose Standard Formats (Presets)</span>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset, index) => (
            <button
              key={index}
              type="button"
              onClick={() => loadPreset(preset)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border cursor-pointer hover:scale-[1.02] ${
                isDarkMode 
                  ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-indigo-500/40 hover:text-indigo-300' 
                  : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              {preset.name.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Constraints configuration */}
      <div className="flex flex-wrap items-center gap-4 py-1 text-[10px] font-bold text-slate-300">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={matchStart}
            onChange={(e) => setMatchStart(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
          />
          <span>Must match Start of Field (Anchor ^)</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={matchEnd}
            onChange={(e) => setMatchEnd(e.target.checked)}
            className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
          />
          <span>Must match End of Field (Anchor $)</span>
        </label>
      </div>

      {/* Tokens Pipeline */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Sequence Construction Blocks</span>
          <span className="text-[9px] text-slate-500 font-mono">Blocks: {tokens.length}</span>
        </div>

        {tokens.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
            <p className="text-[10px] text-slate-500 italic">No building blocks added. Click add below to define your sequence.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tokens.map((token, index) => (
              <div 
                key={token.id}
                className={`p-3 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center gap-3 relative ${
                  isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                {/* Step indicator */}
                <div className="flex items-center justify-between shrink-0 md:justify-start gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[10px] font-extrabold flex items-center justify-center">
                    {index + 1}
                  </span>
                  
                  {/* Reordering buttons */}
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => moveToken(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-slate-800 rounded disabled:opacity-30 cursor-pointer"
                      title="Move Block Up"
                    >
                      <ArrowUp className="w-3 h-3 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveToken(index, 'down')}
                      disabled={index === tokens.length - 1}
                      className="p-0.5 hover:bg-slate-800 rounded disabled:opacity-30 cursor-pointer"
                      title="Move Block Down"
                    >
                      <ArrowDown className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Match criteria */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 flex-1 items-center">
                  
                  {/* Token Type */}
                  <div className="lg:col-span-4">
                    <select
                      value={token.type}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        handleUpdateToken(token.id, { 
                          type: val,
                          // Reset literal value if type changed
                          value: val === 'literal' ? '-' : ''
                        });
                      }}
                      className={`w-full px-2 py-1.5 rounded-lg text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800 border'
                      }`}
                    >
                      {tokenTypes.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Optional Literal Value Input */}
                  {token.type === 'literal' ? (
                    <div className="lg:col-span-3">
                      <input
                        type="text"
                        value={token.value}
                        onChange={(e) => handleUpdateToken(token.id, { value: e.target.value })}
                        placeholder="e.g. ABC or -"
                        className={`w-full px-2.5 py-1 rounded-lg text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800 border'
                        }`}
                      />
                    </div>
                  ) : (
                    <div className="lg:col-span-3 text-[10px] text-slate-500 italic flex items-center px-1">
                      {token.type === 'digits' && 'Any numeric digits (0-9)'}
                      {token.type === 'lowercase' && 'Any lowercase letter'}
                      {token.type === 'uppercase' && 'Any capital letter'}
                      {token.type === 'letters' && 'Letters (a-z, A-Z)'}
                      {token.type === 'alphanumeric' && 'Letters or digits'}
                      {token.type === 'whitespace' && 'Empty spacer characters'}
                      {token.type === 'any' && 'Matches anything'}
                    </div>
                  )}

                  {/* Quantifier Rule */}
                  <div className="lg:col-span-3">
                    <select
                      value={token.quantifier}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        handleUpdateToken(token.id, { 
                          quantifier: val,
                          countMin: val === 'optional' ? 0 : 1,
                          countMax: val === 'optional' ? 1 : 4
                        });
                      }}
                      className={`w-full px-2 py-1.5 rounded-lg text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800 border'
                      }`}
                    >
                      {quantifiers.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Quantifier count parameters */}
                  <div className="lg:col-span-2">
                    {(token.quantifier === 'exactly' || token.quantifier === 'at_least') && (
                      <div className="flex items-center gap-1">
                        <label className="text-[8px] text-slate-500 uppercase">Count:</label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={token.countMin}
                          onChange={(e) => handleUpdateToken(token.id, { countMin: Math.max(1, parseInt(e.target.value) || 1) })}
                          className={`w-12 px-1 py-0.5 rounded text-[11px] text-center font-bold font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800 border'
                          }`}
                        />
                      </div>
                    )}
                    {token.quantifier === 'between' && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={token.countMin}
                          onChange={(e) => handleUpdateToken(token.id, { countMin: Math.max(1, parseInt(e.target.value) || 1) })}
                          className={`w-10 px-1 py-0.5 rounded text-[11px] text-center font-bold font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800 border'
                          }`}
                        />
                        <span className="text-slate-500 font-mono text-[9px]">-</span>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={token.countMax}
                          onChange={(e) => handleUpdateToken(token.id, { countMax: Math.max(1, parseInt(e.target.value) || 1) })}
                          className={`w-10 px-1 py-0.5 rounded text-[11px] text-center font-bold font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800 border'
                          }`}
                        />
                      </div>
                    )}
                  </div>

                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDeleteToken(token.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer self-center"
                  title="Remove Pattern Block"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleAddToken}
          className={`w-full py-2 rounded-xl border border-dashed text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
            isDarkMode 
              ? 'bg-slate-950/40 border-slate-800 text-indigo-400 hover:bg-indigo-500/5 hover:border-indigo-500/40' 
              : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-500/5 hover:border-indigo-400'
          }`}
        >
          <Plus className="w-3.5 h-3.5" /> Append New Match Block
        </button>
      </div>

      {/* Dynamic Summary Panel */}
      <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2.5 ${
        isDarkMode ? 'bg-slate-950/60 border-slate-850' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800/20 pb-2">
          <div className="space-y-0.5">
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block font-mono">Compiled Regular Expression</span>
            <span className="text-xs font-mono font-extrabold text-indigo-400 select-all">/{compiledRegex}/</span>
          </div>
          <span className="text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full select-none self-start sm:self-auto">
            JS RegExp Compatible
          </span>
        </div>
        
        <div className="space-y-1">
          <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block flex items-center gap-1 font-mono">
            <BookOpen className="w-3 h-3 text-indigo-400" /> Rule Explanation (Plain English)
          </span>
          <p className="text-[11px] font-medium text-slate-300 leading-normal">{getEnglishTranslation()}</p>
        </div>
      </div>

      {/* Live Sandbox Tester */}
      <div className={`p-4 rounded-xl border space-y-3 ${
        isDarkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-white border-slate-200'
      }`}>
        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Interactive Live Playground</span>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-8 space-y-1">
            <label className="text-[9px] font-bold text-slate-400">Type test string to verify matches:</label>
            <input
              type="text"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              placeholder="e.g. ABC-1234"
              className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800 border'
              }`}
            />
          </div>
          <div className="sm:col-span-4 flex flex-col justify-end h-full pt-1 sm:pt-4">
            <div className="text-[10px] font-bold text-slate-400 mb-1">Status:</div>
            {testResult === true ? (
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1.5 text-xs">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Passed Match Assertion</span>
              </div>
            ) : testResult === false ? (
              <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold flex items-center gap-1.5 text-xs">
                <X className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Mismatch Violation</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 font-bold text-xs italic text-center">
                Waiting for input...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Action bar */}
      <div className="flex justify-end gap-2 pt-2 border-t border-indigo-500/10">
        <button
          type="button"
          onClick={onClose}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-400' 
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
          }`}
        >
          Discard Changes
        </button>
        <button
          type="button"
          onClick={() => {
            onSavePattern(compiledRegex);
          }}
          className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 hover:shadow-md transition-all cursor-pointer flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" /> Apply Regex to Configuration
        </button>
      </div>
    </div>
  );
}
