import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  Table, 
  Check, 
  X, 
  Info, 
  Search, 
  Plus, 
  Trash2, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert, 
  Layers, 
  SlidersHorizontal,
  FileSpreadsheet,
  HelpCircle,
  Tag
} from 'lucide-react';
import { CustomValidationRule } from '../types';

export interface SystemFieldDefinition {
  id: string;
  name: string;
  isRequired: boolean;
  description: string;
  keywords: string[];
  expectedFormat?: string;
  isCustom?: boolean;
}

export const DEFAULT_SYSTEM_FIELDS: SystemFieldDefinition[] = [
  {
    id: 'txn_id',
    name: 'Transaction ID',
    isRequired: true,
    description: 'Unique row reference identifier for strict deduplication and transaction indexing.',
    keywords: ['id', 'txn', 'txnid', 'transaction_id', 'reference', 'ref', 'key', 'order_id', 'invoice_no', 'code']
  },
  {
    id: 'txn_date',
    name: 'Transaction Date',
    isRequired: true,
    description: 'Standardizes transaction timestamps into uniform ISO-8601 (YYYY-MM-DD) date formats.',
    keywords: ['date', 'time', 'timestamp', 'created_at', 'txn_date', 'posted_date', 'day', 'month', 'year']
  },
  {
    id: 'amount',
    name: 'Amount',
    isRequired: true,
    description: 'Financial value metric for numeric ledger compliance, outlier detection, and balance totals.',
    keywords: ['amount', 'price', 'total', 'cost', 'val', 'value', 'revenue', 'sum', 'balance', 'pay', 'charge']
  },
  {
    id: 'customer_name',
    name: 'Customer Name',
    isRequired: false,
    description: 'Entity, client, or payer name associated with the financial transaction.',
    keywords: ['customer', 'client', 'name', 'payer', 'vendor', 'entity', 'account_name', 'user']
  },
  {
    id: 'email_contact',
    name: 'Email / Contact',
    isRequired: false,
    description: 'Email address or contact handle. Evaluated for mailbox syntax and communication standards.',
    keywords: ['email', 'mail', 'contact', 'customer_email', 'user_email', 'phone', 'address']
  },
  {
    id: 'category',
    name: 'Category',
    isRequired: false,
    description: 'Expense or transaction classification tag (e.g. SaaS, Hardware, Consulting).',
    keywords: ['category', 'type', 'group', 'class', 'department', 'ledger', 'tag']
  },
  {
    id: 'country',
    name: 'Country',
    isRequired: false,
    description: 'Geographic location or ISO country code for international tax & regulatory audit.',
    keywords: ['country', 'geo', 'region', 'location', 'state', 'territory', 'code']
  },
  {
    id: 'status_notes',
    name: 'Status / Notes',
    isRequired: false,
    description: 'Operational state (Completed, Pending, Refunded) or auditor memos.',
    keywords: ['status', 'notes', 'memo', 'description', 'remarks', 'state', 'comment']
  }
];

export interface PresetMapping {
  id: string;
  name: string;
  provider: string;
  description: string;
  mapping: Record<string, string>; // SystemFieldName -> CustomCSVHeader
}

export const PRESET_MAPPINGS: PresetMapping[] = [
  {
    id: 'stripe_export',
    name: 'Stripe Balance Export',
    provider: 'Stripe',
    description: 'Standard mapping for Stripe payouts, balance transactions, and charges CSV exports.',
    mapping: {
      'Transaction ID': 'id',
      'Transaction Date': 'created',
      'Amount': 'amount',
      'Customer Name': 'customer_name',
      'Email / Contact': 'customer_email',
      'Category': 'type',
      'Status / Notes': 'description'
    }
  },
  {
    id: 'quickbooks_ledger',
    name: 'QuickBooks Online Ledger',
    provider: 'Intuit QuickBooks',
    description: 'Default layout for QuickBooks General Ledger and Journal entry CSV reports.',
    mapping: {
      'Transaction ID': 'TxnID',
      'Transaction Date': 'Date',
      'Amount': 'Amount',
      'Customer Name': 'Name',
      'Category': 'Account',
      'Status / Notes': 'Memo/Description'
    }
  },
  {
    id: 'shopify_orders',
    name: 'Shopify Orders Export',
    provider: 'Shopify',
    description: 'Canonical column alignment for Shopify store sales orders and customer checkouts.',
    mapping: {
      'Transaction ID': 'Name',
      'Transaction Date': 'Created at',
      'Amount': 'Total',
      'Customer Name': 'Billing Name',
      'Email / Contact': 'Email',
      'Country': 'Shipping Country',
      'Status / Notes': 'Financial Status'
    }
  },
  {
    id: 'bank_statement',
    name: 'Generic Bank Statement',
    provider: 'Banking & Financial',
    description: 'Standardized setup for checking and credit account CSV downloads.',
    mapping: {
      'Transaction ID': 'Reference Number',
      'Transaction Date': 'Post Date',
      'Amount': 'Transaction Amount',
      'Customer Name': 'Payee / Description',
      'Category': 'Category',
      'Status / Notes': 'Transaction Type'
    }
  }
];

interface ColumnMappingPanelProps {
  headers?: string[];
  rows?: Record<string, string>[];
  mappings: Record<string, string>; // CSV Header -> System Field Name (or 'None')
  onMappingsChange: (newMappings: Record<string, string>) => void;
  explanations?: Record<string, string>;
  onAutoMapClick?: () => void;
  isAnalyzing?: boolean;
  isDarkMode: boolean;
  accentClass: string;
  isStandaloneView?: boolean;
}

export default function ColumnMappingPanel({
  headers = [],
  rows = [],
  mappings,
  onMappingsChange,
  explanations = {},
  onAutoMapClick,
  isAnalyzing = false,
  isDarkMode,
  accentClass,
  isStandaloneView = false
}: ColumnMappingPanelProps) {
  const [viewMode, setViewMode] = useState<'system_matrix' | 'csv_columns'>('system_matrix');
  const [searchTerm, setSearchTerm] = useState('');
  const [systemFields, setSystemFields] = useState<SystemFieldDefinition[]>(DEFAULT_SYSTEM_FIELDS);
  const [customFieldNameInput, setCustomFieldNameInput] = useState('');
  const [isAddingCustomField, setIsAddingCustomField] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [mappingNotification, setMappingNotification] = useState<string | null>(null);

  // Derive reverse mapping: System Field Name -> CSV Header Name
  const reverseMappings = useMemo(() => {
    const rev: Record<string, string> = {};
    Object.entries(mappings).forEach(([csvHeader, sysField]) => {
      if (sysField && sysField !== 'None') {
        rev[sysField] = csvHeader;
      }
    });
    return rev;
  }, [mappings]);

  // Check coverage for required system fields
  const requiredFieldsStatus = useMemo(() => {
    const required = systemFields.filter(f => f.isRequired);
    const mappedCount = required.filter(f => Boolean(reverseMappings[f.name])).length;
    const missingFields = required.filter(f => !reverseMappings[f.name]);
    const isComplete = missingFields.length === 0;

    return {
      totalRequired: required.length,
      mappedCount,
      missingFields,
      isComplete,
      percentage: Math.round((mappedCount / (required.length || 1)) * 100)
    };
  }, [systemFields, reverseMappings]);

  // Handle setting a mapping for a specific System Field -> CSV Header
  const handleSystemFieldChange = (sysFieldName: string, csvHeaderTarget: string) => {
    const newMappings = { ...mappings };

    // If this CSV header was previously mapped to another system field, unmap it first
    if (csvHeaderTarget !== 'None') {
      Object.keys(newMappings).forEach(key => {
        if (newMappings[key] === sysFieldName) {
          newMappings[key] = 'None';
        }
      });
      newMappings[csvHeaderTarget] = sysFieldName;
    } else {
      // Unmap whichever header was mapped to this system field
      Object.keys(newMappings).forEach(key => {
        if (newMappings[key] === sysFieldName) {
          newMappings[key] = 'None';
        }
      });
    }

    onMappingsChange(newMappings);
    setActivePresetId(null);
  };

  // Handle setting a mapping for a specific CSV Header -> System Field Name
  const handleCSVHeaderChange = (csvHeader: string, sysFieldName: string) => {
    const newMappings = { ...mappings };

    if (sysFieldName !== 'None') {
      // If another CSV header had this system field, clear it
      Object.keys(newMappings).forEach(key => {
        if (key !== csvHeader && newMappings[key] === sysFieldName) {
          newMappings[key] = 'None';
        }
      });
    }
    newMappings[csvHeader] = sysFieldName;

    onMappingsChange(newMappings);
    setActivePresetId(null);
  };

  // Run Smart Auto-Map
  const handleSmartAutoMap = () => {
    if (onAutoMapClick) {
      onAutoMapClick();
      return;
    }

    // Local fuzzy auto-map logic
    const newMappings: Record<string, string> = { ...mappings };
    let matchedCount = 0;

    headers.forEach(h => {
      const lowerHeader = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Find matching system field based on keywords
      const matchedField = systemFields.find(field => {
        return field.keywords.some(kw => lowerHeader.includes(kw) || kw.includes(lowerHeader));
      });

      if (matchedField) {
        // Ensure not already assigned to another header unless better match
        const existingHeader = Object.keys(newMappings).find(k => newMappings[k] === matchedField.name);
        if (!existingHeader) {
          newMappings[h] = matchedField.name;
          matchedCount++;
        }
      } else {
        if (!newMappings[h]) {
          newMappings[h] = 'None';
        }
      }
    });

    onMappingsChange(newMappings);
    setMappingNotification(`Smart Auto-Map complete! Matched ${matchedCount} columns to system fields.`);
    setTimeout(() => setMappingNotification(null), 4000);
  };

  // Apply preset mapping template
  const handleApplyPreset = (preset: PresetMapping) => {
    const newMappings: Record<string, string> = {};

    // Initialize all headers to None
    headers.forEach(h => {
      newMappings[h] = 'None';
    });

    let mappedCount = 0;

    // Apply preset mapping rules against uploaded CSV headers
    Object.entries(preset.mapping).forEach(([sysFieldName, targetHeaderKeyword]) => {
      const targetLower = targetHeaderKeyword.toLowerCase();
      
      // Find exact or closest header match
      const matchedHeader = headers.find(h => {
        const hLower = h.toLowerCase();
        return hLower === targetLower || hLower.includes(targetLower) || targetLower.includes(hLower);
      });

      if (matchedHeader) {
        newMappings[matchedHeader] = sysFieldName;
        mappedCount++;
      }
    });

    onMappingsChange(newMappings);
    setActivePresetId(preset.id);
    setMappingNotification(`Applied preset "${preset.name}" (${mappedCount} headers mapped)`);
    setTimeout(() => setMappingNotification(null), 4000);
  };

  // Reset all mappings
  const handleResetAll = () => {
    const cleared: Record<string, string> = {};
    headers.forEach(h => {
      cleared[h] = 'None';
    });
    onMappingsChange(cleared);
    setActivePresetId(null);
    setMappingNotification('All column mappings cleared');
    setTimeout(() => setMappingNotification(null), 3000);
  };

  // Add custom system required field
  const handleAddCustomField = () => {
    const trimmed = customFieldNameInput.trim();
    if (!trimmed) return;

    if (systemFields.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
      setMappingNotification(`System field "${trimmed}" already exists.`);
      setTimeout(() => setMappingNotification(null), 3000);
      return;
    }

    const newField: SystemFieldDefinition = {
      id: `custom_field_${Date.now()}`,
      name: trimmed,
      isRequired: true,
      description: `User-defined required system field for corporate compliance.`,
      keywords: [trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')],
      isCustom: true
    };

    setSystemFields(prev => [...prev, newField]);
    setCustomFieldNameInput('');
    setIsAddingCustomField(false);
    setMappingNotification(`Custom system field "${trimmed}" created.`);
    setTimeout(() => setMappingNotification(null), 3000);
  };

  // Remove custom system field
  const handleRemoveCustomField = (fieldId: string) => {
    const target = systemFields.find(f => f.id === fieldId);
    if (!target) return;

    // Remove from mappings
    const newMappings = { ...mappings };
    Object.keys(newMappings).forEach(k => {
      if (newMappings[k] === target.name) {
        newMappings[k] = 'None';
      }
    });
    onMappingsChange(newMappings);

    setSystemFields(prev => prev.filter(f => f.id !== fieldId));
    setMappingNotification(`Removed custom field "${target.name}".`);
    setTimeout(() => setMappingNotification(null), 3000);
  };

  // Filtered system fields for search
  const filteredSystemFields = useMemo(() => {
    if (!searchTerm) return systemFields;
    const term = searchTerm.toLowerCase();
    return systemFields.filter(f => 
      f.name.toLowerCase().includes(term) || 
      f.description.toLowerCase().includes(term) ||
      (reverseMappings[f.name] && reverseMappings[f.name].toLowerCase().includes(term))
    );
  }, [systemFields, searchTerm, reverseMappings]);

  // Filtered CSV headers for search
  const filteredCSVHeaders = useMemo(() => {
    if (!searchTerm) return headers;
    const term = searchTerm.toLowerCase();
    return headers.filter(h => 
      h.toLowerCase().includes(term) || 
      (mappings[h] && mappings[h].toLowerCase().includes(term))
    );
  }, [headers, searchTerm, mappings]);

  return (
    <div className={`rounded-2xl border ${isDarkMode ? 'bg-[#131b2e]/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} overflow-hidden space-y-0`}>
      {/* HEADER BAR */}
      <div className={`p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <SlidersHorizontal className="w-4 h-4 text-blue-500" />
            </span>
            <h3 className="font-extrabold text-sm tracking-tight">Explicit Column Mapping Engine</h3>
            <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {headers.length > 0 ? `${headers.length} CSV Columns Detected` : 'Preset Configuration Mode'}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Map custom CSV spreadsheet headers directly to standard system fields to ensure seamless data standardization and audit compliance.
          </p>
        </div>

        {/* CONTROLS & SHORTCUTS */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSmartAutoMap}
            disabled={isAnalyzing}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm flex items-center gap-1.5 ${
              isAnalyzing 
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white hover:scale-[1.02]'
            }`}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" /> Auto-Detecting...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" /> Auto-Map Columns
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isDarkMode 
                ? 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900' 
                : 'border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Reset All
          </button>
        </div>
      </div>

      {/* NOTIFICATION BANNER */}
      {mappingNotification && (
        <motion.div 
          initial={{ opacity: 0, y: -6 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0 }}
          className="p-3 bg-blue-500/10 border-b border-blue-500/20 text-blue-400 text-xs font-semibold flex items-center justify-between px-5"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <span>{mappingNotification}</span>
          </div>
          <button onClick={() => setMappingNotification(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* SYSTEM REQUIRED FIELDS COVERAGE HEALTH BAR */}
      <div className={`p-4 border-b ${isDarkMode ? 'bg-slate-950/40 border-slate-800/80' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-4 h-4 ${requiredFieldsStatus.isComplete ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`} />
            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              Required System Field Coverage:
            </span>
            <span className={`text-xs font-mono font-extrabold ${requiredFieldsStatus.isComplete ? 'text-emerald-400' : 'text-amber-400'}`}>
              {requiredFieldsStatus.mappedCount} / {requiredFieldsStatus.totalRequired} Mapped ({requiredFieldsStatus.percentage}%)
            </span>
          </div>

          {!requiredFieldsStatus.isComplete && (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-bold">
              Missing: {requiredFieldsStatus.missingFields.map(f => f.name).join(', ')}
            </span>
          )}
        </div>

        {/* Progress Line */}
        <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <motion.div 
            className={`h-full transition-all duration-500 ${
              requiredFieldsStatus.isComplete ? 'bg-emerald-500' : requiredFieldsStatus.percentage >= 66 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${requiredFieldsStatus.percentage}%` }}
          />
        </div>
      </div>

      {/* PRESETS TEMPLATE QUICK-SELECTOR & CONTROLS TOOLBAR */}
      <div className={`p-4 border-b flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 ${
        isDarkMode ? 'bg-slate-900/40 border-slate-800/60' : 'bg-slate-50/50 border-slate-200'
      }`}>
        {/* VIEW MODE TOGGLE */}
        <div className="flex items-center gap-1 bg-slate-950/50 p-1 rounded-xl border border-slate-800/60 self-start">
          <button
            type="button"
            onClick={() => setViewMode('system_matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'system_matrix'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" /> System Fields Matrix
          </button>
          <button
            type="button"
            onClick={() => setViewMode('csv_columns')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'csv_columns'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> CSV Columns View ({headers.length})
          </button>
        </div>

        {/* PRESET TEMPLATES DROPDOWN & SEARCH */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">Preset Template:</span>
            <div className="flex gap-1 overflow-x-auto max-w-xs sm:max-w-md py-0.5">
              {PRESET_MAPPINGS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer shrink-0 ${
                    activePresetId === preset.id
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-sm'
                      : isDarkMode
                      ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title={preset.description}
                >
                  {preset.provider}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search fields or columns..."
              className={`w-full pl-8 pr-3 py-1 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 border'
              }`}
            />
          </div>
        </div>
      </div>

      {/* MAIN VIEW CONTENT */}
      <div className="p-5">
        {viewMode === 'system_matrix' ? (
          /* MATRIX VIEW: System Field -> Custom CSV Header */
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              <span>Standard System Required & Custom Fields ({filteredSystemFields.length})</span>
              <button
                type="button"
                onClick={() => setIsAddingCustomField(!isAddingCustomField)}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Custom System Field
              </button>
            </div>

            {/* ADD CUSTOM FIELD INLINE FORM */}
            <AnimatePresence>
              {isAddingCustomField && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-4 rounded-xl border space-y-3 ${
                    isDarkMode ? 'bg-slate-950 border-blue-500/30' : 'bg-blue-50/50 border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> Add Custom Required Field for Corporate Schema
                    </span>
                    <button onClick={() => setIsAddingCustomField(false)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customFieldNameInput}
                      onChange={(e) => setCustomFieldNameInput(e.target.value)}
                      placeholder="e.g. Cost Center, Tax Registration ID, Branch Code"
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 border'
                      }`}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomField()}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomField}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm shrink-0"
                    >
                      Add Field
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MATRIX GRID CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSystemFields.map((field) => {
                const mappedCSVHeader = reverseMappings[field.name];
                const isMapped = Boolean(mappedCSVHeader);

                // Sample values from rows
                const samplesList = mappedCSVHeader && rows.length > 0
                  ? rows.slice(0, 3).map(r => r[mappedCSVHeader]).filter(Boolean)
                  : [];
                const samplesStr = samplesList.join(', ');

                return (
                  <div
                    key={field.id}
                    className={`p-4 rounded-xl border transition-all duration-200 space-y-3 ${
                      isMapped
                        ? isDarkMode
                          ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                        : field.isRequired
                        ? isDarkMode
                          ? 'bg-rose-500/5 border-rose-500/30'
                          : 'bg-rose-50/40 border-rose-200 shadow-sm'
                        : isDarkMode
                        ? 'bg-slate-950/40 border-slate-800/60'
                        : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    {/* Top Row: System Field Info & Required Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-extrabold text-xs block truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {field.name}
                          </span>
                          {field.isRequired ? (
                            <span className="text-[9px] bg-rose-500/10 text-rose-400 font-bold px-1.5 py-0.5 rounded border border-rose-500/20 select-none shrink-0">
                              * Required
                            </span>
                          ) : (
                            <span className="text-[9px] bg-slate-500/10 text-slate-400 font-medium px-1.5 py-0.5 rounded border border-slate-500/20 select-none shrink-0">
                              Optional
                            </span>
                          )}
                          {field.isCustom && (
                            <span className="text-[9px] bg-purple-500/10 text-purple-400 font-bold px-1.5 py-0.5 rounded border border-purple-500/20 select-none shrink-0">
                              Custom Field
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                          {field.description}
                        </p>
                      </div>

                      {field.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(field.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                          title="Remove custom system field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Mapping Dropdown Control */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>Mapped Custom CSV Column:</span>
                        {isMapped ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        ) : field.isRequired ? (
                          <span className="text-rose-400 font-bold flex items-center gap-0.5">
                            <AlertCircle className="w-3 h-3" /> Unmapped Required
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">Unmapped</span>
                        )}
                      </div>

                      <select
                        value={mappedCSVHeader || 'None'}
                        onChange={(e) => handleSystemFieldChange(field.name, e.target.value)}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                          isMapped
                            ? isDarkMode ? 'bg-slate-950 border-emerald-500/40 text-emerald-300' : 'bg-white border-emerald-300 text-slate-900 border'
                            : field.isRequired
                            ? isDarkMode ? 'bg-slate-950 border-rose-500/40 text-rose-300' : 'bg-white border-rose-300 text-rose-700 border'
                            : isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 border'
                        }`}
                      >
                        <option value="None">-- Select CSV Column --</option>
                        {headers.map(h => (
                          <option key={h} value={h}>
                            {h || '[Empty Column Label]'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Samples Preview */}
                    {samplesStr && (
                      <div className="pt-2 border-t border-slate-800/40 text-[10px] font-mono text-slate-400 truncate">
                        <span>Sample Data: </span>
                        <span className={`${isDarkMode ? 'text-slate-300' : 'text-slate-700'} font-semibold italic`}>
                          {samplesStr}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* CSV COLUMNS VIEW: Raw CSV Headers -> Target System Field */
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              <span>Uploaded CSV Column Headers ({filteredCSVHeaders.length})</span>
              <span className="text-[10px] font-mono">Select target canonical system field for each column</span>
            </div>

            <div className="space-y-3">
              {filteredCSVHeaders.map((header) => {
                const currentMappedField = mappings[header] || 'None';
                const isMapped = currentMappedField !== 'None';

                // Extract sample values
                const samplesList = rows.length > 0 ? rows.slice(0, 3).map(r => r[header]).filter(Boolean) : [];
                const samplesStr = samplesList.join(', ');

                // AI Explanation if available
                const explanation = explanations[header];

                return (
                  <div
                    key={header}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      isDarkMode
                        ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      {/* Left: CSV Header & Sample Values */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-extrabold text-xs block truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {header || '[Unnamed Column]'}
                          </span>
                          {isMapped ? (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 shrink-0">
                              <Check className="w-2.5 h-2.5" /> Mapped to {currentMappedField}
                            </span>
                          ) : (
                            <span className="text-[9px] bg-slate-500/10 text-slate-400 font-medium px-1.5 py-0.5 rounded border border-slate-500/20 shrink-0">
                              Auxiliary / Unmapped
                            </span>
                          )}
                        </div>

                        {samplesStr && (
                          <span className={`text-[10px] font-mono block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Sample values: <span className={`${isDarkMode ? 'text-slate-300' : 'text-slate-700'} italic`}>{samplesStr}</span>
                          </span>
                        )}
                      </div>

                      {/* Right: Target System Field Selector */}
                      <div className="w-full sm:w-56 shrink-0">
                        <select
                          value={currentMappedField}
                          onChange={(e) => handleCSVHeaderChange(header, e.target.value)}
                          className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                            isMapped
                              ? isDarkMode ? 'bg-slate-950 border-emerald-500/30 text-emerald-300' : 'bg-white border-emerald-300 text-slate-900 border'
                              : isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 border'
                          }`}
                        >
                          <option value="None">None (Auxiliary / Ignore)</option>
                          {systemFields.map(sys => (
                            <option key={sys.id} value={sys.name}>
                              {sys.name} {sys.isRequired ? '(* Required)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Explanation Badge */}
                    {explanation && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/40 flex items-start gap-1.5 text-[10px] text-slate-400">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <span>{explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
