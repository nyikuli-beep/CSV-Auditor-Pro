import React from 'react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { SystemSettings } from '../../types';
import { Shield, RefreshCw, EyeOff, Lock, Trash2 } from 'lucide-react';

export const PrivacySettings: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const { settings, updateSettings, resetCategory } = usePersonalization();
  const priv = settings.privacy;

  const handleToggle = (key: keyof SystemSettings['privacy']) => {
    updateSettings({
      privacy: { ...priv, [key]: !(priv[key]) },
    });
  };

  const handleSelect = (key: keyof SystemSettings['privacy'], val: any) => {
    updateSettings({
      privacy: { ...priv, [key]: val },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Data Privacy, File Retention & PII Masking
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Control dataset auto-deletion schedules, PII redaction for emails/phones/IDs, and cell blurring.
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetCategory('privacy')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Restore Defaults
        </button>
      </div>

      {/* File Retention Schedule */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block flex items-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Automated Dataset Retention & Purge Policy
        </label>
        <select
          value={priv.fileRetention || '30d'}
          onChange={(e) => handleSelect('fileRetention', e.target.value)}
          className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer"
        >
          <option value="immediate" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Delete Immediately After Session / Tab Close</option>
          <option value="24h" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Retain for 24 Hours</option>
          <option value="7d" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Retain for 7 Days</option>
          <option value="30d" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Retain for 30 Days (Recommended)</option>
          <option value="90d" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Retain for 90 Days</option>
        </select>
      </div>

      {/* PII Masking & Privacy Rules */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block flex items-center gap-1.5">
          <EyeOff className="w-3.5 h-3.5 text-blue-500" /> Automatic PII Masking & Redaction Rules
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'maskEmailAddresses', label: 'Mask Email Addresses', desc: 'Redact emails to e.g. a***@domain.com in grid preview & shared exports.' },
            { key: 'maskPhoneNumbers', label: 'Mask Phone Numbers', desc: 'Conceal telephone numbers as +1 (***) ***-1234.' },
            { key: 'maskIDs', label: 'Mask Social Security / National IDs', desc: 'Mask sensitive identification numbers automatically.' },
            { key: 'blurSensitiveCells', label: 'Blur Sensitive Cells on Focus Away', desc: 'Blur sensitive cells unless hovered by active authenticated user.' },
            { key: 'autoDeleteTempFiles', label: 'Auto-Delete Temp CSV Fragments', desc: 'Purge temporary chunked upload buffers from server memory.' },
            { key: 'autoDeleteCachedPreviews', label: 'Clear Browser Storage Cache on Logout', desc: 'Wipe indexedDB and local dataset snapshots upon signing out.' },
            { key: 'hidePersonalInfo', label: 'Hide Personal Profile in Audit Log', desc: 'Anonymize user email in workspace public activity audit trail.' },
            { key: 'shareAnonymousStats', label: 'Share Anonymous Diagnostic Metrics', desc: 'Help improve CSV Auditor Pro by submitting crash & speed logs.' },
          ].map((item) => (
            <div
              key={item.key}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{item.label}</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean((priv as any)[item.key])}
                onChange={() => handleToggle(item.key as any)}
                className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
