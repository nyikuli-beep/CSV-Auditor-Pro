import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Check, 
  X, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CustomValidationRule, Severity } from '../types';

interface CustomValidationPanelProps {
  customRules: CustomValidationRule[];
  onAddRule: (rule: CustomValidationRule) => void;
  onToggleRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
  isDarkMode: boolean;
  accentClass: string;
  availableColumns?: string[];
}

export default function CustomValidationPanel({
  customRules,
  onAddRule,
  onToggleRule,
  onDeleteRule,
  isDarkMode,
  accentClass,
  availableColumns = []
}: CustomValidationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form states
  const [columnName, setColumnName] = useState('');
  const [selectedColFromList, setSelectedColFromList] = useState('');
  const [ruleType, setRuleType] = useState<'regex' | 'range'>('regex');
  const [regexPattern, setRegexPattern] = useState('');
  const [rangeMin, setRangeMin] = useState('');
  const [rangeMax, setRangeMax] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('warning');
  const [formError, setFormError] = useState('');

  const handleAddClick = () => {
    setIsAdding(true);
    setFormError('');
    // Reset fields
    setColumnName(availableColumns[0] || '');
    setSelectedColFromList(availableColumns[0] || '');
    setRuleType('regex');
    setRegexPattern('');
    setRangeMin('');
    setRangeMax('');
    setDescription('');
    setSeverity('warning');
  };

  const handleColSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedColFromList(val);
    if (val !== '__custom__') {
      setColumnName(val);
    } else {
      setColumnName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const finalColumnName = (selectedColFromList === '__custom__' || availableColumns.length === 0) 
      ? columnName.trim() 
      : selectedColFromList;

    if (!finalColumnName) {
      setFormError('Column name is required.');
      return;
    }

    if (ruleType === 'regex') {
      if (!regexPattern.trim()) {
        setFormError('Regex pattern is required for regex validation.');
        return;
      }
      try {
        new RegExp(regexPattern);
      } catch (err) {
        setFormError('Invalid regular expression pattern.');
        return;
      }
    } else {
      if (rangeMin === '' && rangeMax === '') {
        setFormError('At least one limit (Min or Max) must be specified for range validation.');
        return;
      }
      const minVal = rangeMin !== '' ? parseFloat(rangeMin) : undefined;
      const maxVal = rangeMax !== '' ? parseFloat(rangeMax) : undefined;
      if (minVal !== undefined && isNaN(minVal)) {
        setFormError('Minimum value must be a valid number.');
        return;
      }
      if (maxVal !== undefined && isNaN(maxVal)) {
        setFormError('Maximum value must be a valid number.');
        return;
      }
      if (minVal !== undefined && maxVal !== undefined && minVal > maxVal) {
        setFormError('Minimum limit cannot be greater than maximum limit.');
        return;
      }
    }

    const defaultDesc = ruleType === 'regex'
      ? `${finalColumnName} must match format ${regexPattern}`
      : `${finalColumnName} must be between ${rangeMin || '-∞'} and ${rangeMax || '+∞'}`;

    const newRule: CustomValidationRule = {
      id: `rule-${Date.now()}`,
      columnName: finalColumnName,
      type: ruleType,
      regexPattern: ruleType === 'regex' ? regexPattern : undefined,
      rangeMin: ruleType === 'range' && rangeMin !== '' ? parseFloat(rangeMin) : undefined,
      rangeMax: ruleType === 'range' && rangeMax !== '' ? parseFloat(rangeMax) : undefined,
      description: description.trim() || defaultDesc,
      severity,
      isActive: true
    };

    onAddRule(newRule);
    setIsAdding(false);
  };

  const getSeverityBadge = (sev: Severity) => {
    const config = {
      critical: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      info: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
    }[sev];

    return (
      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${config}`}>
        {sev}
      </span>
    );
  };

  return (
    <div className={`rounded-xl border transition-all overflow-hidden ${
      isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-5 py-4 flex items-center justify-between transition-colors ${
          isDarkMode ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
            <ShieldAlert className="w-4.5 h-4.5 text-blue-500" />
          </div>
          <div className="text-left">
            <h3 className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              Custom Validation Rules Panel
            </h3>
            <p className="text-[10px] text-slate-400 leading-normal">
              Define custom regex patterns or range bounds applied instantly during sanity check.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
            customRules.filter(r => r.isActive).length > 0 
              ? 'bg-blue-500/10 text-blue-400' 
              : 'bg-slate-500/10 text-slate-400'
          }`}>
            {customRules.filter(r => r.isActive).length} Active
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="px-5 pb-5 border-t border-slate-500/10 pt-4 space-y-4">
          
          {/* Rules List */}
          {customRules.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-500/20 rounded-lg">
              <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto opacity-50 mb-1.5" />
              <p className="text-xs text-slate-400 font-medium">No custom rules defined yet.</p>
              <p className="text-[10px] text-slate-500 leading-normal max-w-xs mx-auto mt-0.5">
                Add clean patterns to automatically flag date irregularities, currency overflows, or restricted entries.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {customRules.map((rule) => (
                <div 
                  key={rule.id}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                    rule.isActive 
                      ? (isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-100')
                      : 'opacity-50 border-slate-500/10 bg-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-mono text-[11px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {rule.columnName}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded font-mono ${
                        rule.type === 'regex' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {rule.type}
                      </span>
                      {getSeverityBadge(rule.severity)}
                    </div>
                    <p className={`text-[11px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} title={rule.description}>
                      {rule.description}
                    </p>
                    {rule.type === 'regex' && rule.regexPattern && (
                      <code className="text-[9px] font-mono block text-slate-500 truncate bg-slate-950/40 px-1 py-0.5 rounded w-fit max-w-full">
                        Regex: {rule.regexPattern}
                      </code>
                    )}
                    {rule.type === 'range' && (
                      <code className="text-[9px] font-mono block text-slate-500 bg-slate-950/40 px-1 py-0.5 rounded w-fit">
                        Range: {rule.rangeMin !== undefined ? rule.rangeMin : '-∞'} to {rule.rangeMax !== undefined ? rule.rangeMax : '+∞'}
                      </code>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleRule(rule.id)}
                      title={rule.isActive ? "Deactivate Rule" : "Activate Rule"}
                      className={`p-1 rounded-md transition-colors border ${
                        rule.isActive
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 border-slate-500/20'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRule(rule.id)}
                      title="Delete Rule"
                      className="p-1 rounded-md hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-transparent hover:border-rose-500/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Rule Button & Form */}
          {!isAdding ? (
            <button
              type="button"
              onClick={handleAddClick}
              className={`w-full py-2 border border-dashed text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                isDarkMode 
                  ? 'border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/30' 
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Plus className="w-4 h-4 text-blue-500" /> Define Custom Validation Rule
            </button>
          ) : (
            <form onSubmit={handleSubmit} className={`p-4 rounded-xl border space-y-4.5 relative animate-fadeIn ${
              isDarkMode ? 'bg-slate-900/40 border-slate-850' : 'bg-slate-50/50 border-slate-200'
            }`}>
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className={`font-bold text-xs uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                New Validation Rule
              </h4>

              {formError && (
                <div className="p-2.5 text-[11px] rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Column Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Target Column
                  </label>
                  {availableColumns.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={selectedColFromList}
                        onChange={handleColSelectChange}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 border'
                        }`}
                      >
                        {availableColumns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                        <option value="__custom__">✍️ Custom Column Name...</option>
                      </select>
                      
                      {selectedColFromList === '__custom__' && (
                        <input
                          type="text"
                          value={columnName}
                          onChange={(e) => setColumnName(e.target.value)}
                          placeholder="Type custom column header"
                          className={`w-full px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200 animate-fadeIn' : 'bg-white border-slate-200 text-slate-700 border animate-fadeIn'
                          }`}
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={columnName}
                      onChange={(e) => setColumnName(e.target.value)}
                      placeholder="e.g. Email / Date"
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 border'
                      }`}
                    />
                  )}
                </div>

                {/* Rule Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Rule Type
                  </label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as 'regex' | 'range')}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 border'
                    }`}
                  >
                    <option value="regex">Regex (Format Matching)</option>
                    <option value="range">Range (Numeric Limits)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Inputs Based on Type */}
              {ruleType === 'regex' ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Regular Expression Pattern
                    </label>
                    <span className="text-[9px] text-slate-500 italic">E.g. ^\d{"{3}"}-\d{"{2}"}-\d{"{4}"}$</span>
                  </div>
                  <input
                    type="text"
                    value={regexPattern}
                    onChange={(e) => setRegexPattern(e.target.value)}
                    placeholder="e.g. ^\d{4}-\d{2}-\d{2}$ or ^[a-zA-Z]+$"
                    className={`w-full px-3 py-2 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 border'
                    }`}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Minimum Value (Optional)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={rangeMin}
                      onChange={(e) => setRangeMin(e.target.value)}
                      placeholder="e.g. 0"
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 border'
                      }`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Maximum Value (Optional)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={rangeMax}
                      onChange={(e) => setRangeMax(e.target.value)}
                      placeholder="e.g. 10000"
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 border'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Description and Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Rule Description / Custom Warning Message
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Field must be alphanumeric format YYYY-MM-DD"
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 border'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Trigger Severity
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as Severity)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 border'
                    }`}
                  >
                    <option value="warning">⚠️ Warning</option>
                    <option value="critical">🚨 Critical</option>
                    <option value="info">ℹ️ Info</option>
                  </select>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-500/10">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                    isDarkMode ? 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60' : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all shadow-sm flex items-center gap-1 cursor-pointer ${accentClass}`}
                >
                  <Check className="w-3.5 h-3.5" /> Save Rule
                </button>
              </div>
            </form>
          )}

        </div>
      )}
    </div>
  );
}
