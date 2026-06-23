import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Palette, 
  Key, 
  Bell, 
  Globe, 
  Lock, 
  User, 
  CheckCircle2, 
  AlertTriangle,
  Mail,
  Info
} from 'lucide-react';
import { SystemSettings } from '../types';

interface SettingsViewProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  accentClass: string;
}

export default function SettingsView({ settings, onUpdateSettings, isDarkMode, toggleTheme, accentClass }: SettingsViewProps) {
  const [tempApiKey, setTempApiKey] = useState(settings.apiKey || '••••••••••••••••••••••••••••••••');
  const [showKey, setShowKey] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      apiKey: tempApiKey
    });
    setSuccessMsg('Settings updated successfully!');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleAccentChange = (color: 'blue' | 'emerald' | 'violet' | 'amber') => {
    onUpdateSettings({
      ...settings,
      accentColor: color
    });
  };

  const toggleNotification = (key: 'auditCompleted' | 'teamInvites' | 'weeklyDigest') => {
    onUpdateSettings({
      ...settings,
      emailNotifications: {
        ...settings.emailNotifications,
        [key]: !settings.emailNotifications[key]
      }
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
          <Settings className="w-3.5 h-3.5" /> Workspace Config
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">User & API Settings</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Configure theme accents, edit language locales, edit mail preferences, and manage secure API keys.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-bounce" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <form onSubmit={saveSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: General Profile, Theme & Accents */}
        <div className="lg:col-span-6 space-y-6">
          {/* Accent Color Section (Requirement) */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2"><Palette className="w-4 h-4 text-emerald-500" /> Brand Customization</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Accent Theme Selection</label>
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { key: 'blue', label: 'Deep Blue', hex: '#2563EB' },
                    { key: 'emerald', label: 'Emerald', hex: '#10B981' },
                    { key: 'violet', label: 'Violet', hex: '#8B5CF6' },
                    { key: 'amber', label: 'Amber', hex: '#F59E0B' }
                  ].map((colorObj) => (
                    <button
                      key={colorObj.key}
                      type="button"
                      onClick={() => handleAccentChange(colorObj.key as any)}
                      className={`p-3 rounded-xl border-2 text-xs font-bold text-center flex flex-col items-center gap-1.5 transition-all hover:scale-102 ${settings.accentColor === colorObj.key ? 'border-blue-500 dark:border-blue-400 bg-blue-500/5' : 'border-slate-800 dark:bg-slate-950/40 hover:opacity-85'}`}
                    >
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: colorObj.hex }}></span>
                      <span className="text-[9px] uppercase tracking-widest block">{colorObj.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme toggle checkbox */}
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-800/40">
                <div>
                  <h4 className="font-bold text-xs">Light / Dark Toggle</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">Instantly switch between white and charcoal dark backgrounds.</p>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border cursor-pointer hover:bg-slate-800/20 transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                >
                  {isDarkMode ? 'Dark Mode Active' : 'Light Mode Active'}
                </button>
              </div>
            </div>
          </div>

          {/* Locale & Language settings */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-500" /> Locale Preferences</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => onUpdateSettings({ ...settings, language: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-950'}`}
                >
                  <option value="en">English (US)</option>
                  <option value="de">Deutsch (German)</option>
                  <option value="fr">Français (French)</option>
                  <option value="ja">日本語 (Japanese)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Time Zone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => onUpdateSettings({ ...settings, timezone: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-950'}`}
                >
                  <option value="UTC-8">Pacific Time (PT)</option>
                  <option value="UTC">Coordinated Universal (UTC)</option>
                  <option value="UTC+1">Central European (CET)</option>
                  <option value="UTC+9">Japan Standard (JST)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: API Key Management & Notifications */}
        <div className="lg:col-span-6 space-y-6">
          {/* API Key management */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2"><Key className="w-4 h-4 text-violet-500" /> Gemini API Settings</h3>
            
            <div className="space-y-4">
              <p className="text-[10px] leading-relaxed text-slate-400">
                To bypass standard public Sandbox request throttling, input your private Google Gemini API key. All LLM reasoning will be direct-routed through your billing tier.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">API Secret Key</label>
                <div className="flex gap-2">
                  <input 
                    type={showKey ? "text" : "password"}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="AIzaSy..." 
                    className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-950'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className={`px-3 py-2.5 text-xs font-semibold rounded-xl border hover:bg-slate-800/20 transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] flex gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Default API keys are configured and injected automatically by Google AI Studio at runtime. Standard developer sandbox features are active.</span>
              </div>
            </div>
          </div>

          {/* Email Notifications */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" /> Email Configurations</h3>
            
            <div className="space-y-3">
              {/* Box 1 */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.emailNotifications.auditCompleted}
                  onChange={() => toggleNotification('auditCompleted')}
                  className="mt-1 accent-blue-500"
                />
                <div className="text-xs">
                  <span className="font-bold block text-slate-200">Audit Completion Dispatches</span>
                  <span className="text-[10px] text-slate-400">Receive an email notification once any pipeline file finishes evaluation.</span>
                </div>
              </label>

              {/* Box 2 */}
              <label className="flex items-start gap-3 cursor-pointer pt-3 border-t border-slate-800/40">
                <input 
                  type="checkbox" 
                  checked={settings.emailNotifications.teamInvites}
                  onChange={() => toggleNotification('teamInvites')}
                  className="mt-1 accent-blue-500"
                />
                <div className="text-xs">
                  <span className="font-bold block text-slate-200">Team Invites & Mentions</span>
                  <span className="text-[10px] text-slate-400">Receive notification digests when commentators tag you on a row annotation.</span>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Settings */}
          <button
            type="submit"
            className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg hover:scale-101 transition-all cursor-pointer ${accentClass}`}
          >
            Save All Configurations
          </button>
        </div>

      </form>
    </div>
  );
}
