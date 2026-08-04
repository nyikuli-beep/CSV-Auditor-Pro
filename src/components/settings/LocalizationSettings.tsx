import React from 'react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { SystemSettings } from '../../types';
import { Globe, RefreshCw, Clock, DollarSign, Calendar } from 'lucide-react';

export const LocalizationSettings: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const { settings, updateSettings, resetCategory } = usePersonalization();
  const loc = settings.localization;

  const handleSelect = (key: keyof SystemSettings['localization'], val: any) => {
    updateSettings({
      localization: { ...loc, [key]: val },
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Localization, Language, Currency & Timezone
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure regional language preferences, time zone formatting, currency symbols, and date separators.
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetCategory('localization')}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Restore Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Language */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-500" /> Interface Language
          </label>
          <select
            value={loc.language || 'en'}
            onChange={(e) => handleSelect('language', e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer"
          >
            <option value="en" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">English (US / UK)</option>
            <option value="de" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Deutsch (German)</option>
            <option value="fr" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Français (French)</option>
            <option value="es" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Español (Spanish)</option>
            <option value="ja" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">日本語 (Japanese)</option>
            <option value="zh" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">中文 (Chinese)</option>
          </select>
        </div>

        {/* Timezone */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-500" /> Time Zone
          </label>
          <select
            value={loc.timezone || 'UTC'}
            onChange={(e) => handleSelect('timezone', e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer"
          >
            <option value="UTC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">UTC (Universal Coordinated Time)</option>
            <option value="Europe/London" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Europe/London (GMT / BST)</option>
            <option value="America/New_York" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">America/New_York (EST / EDT)</option>
            <option value="America/Los_Angeles" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">America/Los_Angeles (PST / PDT)</option>
            <option value="Asia/Tokyo" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Asia/Tokyo (JST)</option>
          </select>
        </div>

        {/* Currency */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 block flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Default Currency
          </label>
          <select
            value={loc.currency || '$ USD'}
            onChange={(e) => handleSelect('currency', e.target.value)}
            className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer"
          >
            <option value="$ USD" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">$ USD (US Dollar)</option>
            <option value="€ EUR" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">€ EUR (Euro)</option>
            <option value="£ GBP" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">£ GBP (British Pound)</option>
            <option value="¥ JPY" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">¥ JPY (Japanese Yen)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
