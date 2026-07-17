import React, { useState, useEffect } from 'react';
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
  Info,
  Database,
  Server,
  RefreshCw,
  Code2,
  Shield,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Terminal,
  Copy,
  Check,
  Cookie
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
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [apiDocOpen, setApiDocOpen] = useState(false);
  const [tosOpen, setTosOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Google Search Console (GSC) Verification State
  const [metaCode, setMetaCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [gscLoading, setGscLoading] = useState(false);
  const [gscSuccessMsg, setGscSuccessMsg] = useState('');

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  useEffect(() => {
    fetchDbStatus();
    fetchGscSettings();
  }, []);

  const fetchGscSettings = (retries = 3, delay = 1000) => {
    fetch('/api/gsc/settings')
      .then(res => {
        if (!res.ok) throw new Error(`GSC HTTP error! Status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data) {
          setMetaCode(data.metaCode || '');
          setFileName(data.fileName || '');
          setFileContent(data.fileContent || '');
        }
      })
      .catch(err => {
        console.warn(`Error fetching GSC settings (retries left: ${retries}):`, err);
        if (retries > 0) {
          setTimeout(() => fetchGscSettings(retries - 1, delay * 1.5), delay);
        } else {
          console.error("Failed to fetch GSC settings after all retries:", err);
        }
      });
  };

  const handleGscSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    setGscLoading(true);
    setGscSuccessMsg('');
    try {
      const res = await fetch('/api/gsc/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metaCode, fileName, fileContent })
      });
      if (res.ok) {
        setGscSuccessMsg('Google Search Console configuration saved and live deployed!');
        setTimeout(() => setGscSuccessMsg(''), 3500);
      } else {
        console.error('Failed to save GSC settings');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGscLoading(false);
    }
  };

  const fetchDbStatus = (retries = 3, delay = 1000) => {
    setDbLoading(true);
    fetch('/api/sql/status')
      .then(res => {
        if (!res.ok) throw new Error(`DB Status HTTP error! Status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setDbStatus(data);
        setDbLoading(false);
      })
      .catch(err => {
        console.warn(`Error fetching db status (retries left: ${retries}):`, err);
        if (retries > 0) {
          setTimeout(() => fetchDbStatus(retries - 1, delay * 1.5), delay);
        } else {
          console.error("Failed to fetch DB status after all retries:", err);
          setDbStatus({ status: 'error', error: 'Database link momentarily offline. Please click refresh to try again.' });
          setDbLoading(false);
        }
      });
  };

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

          {/* Database Connection Status (Cloud SQL) */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" /> Database Integration
              </h3>
              <button
                type="button"
                onClick={fetchDbStatus}
                disabled={dbLoading}
                className="p-1.5 rounded-lg border border-slate-800/60 hover:bg-slate-800/20 text-slate-400 transition-all cursor-pointer"
                title="Refresh Status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dbLoading ? 'animate-spin text-emerald-500' : ''}`} />
              </button>
            </div>

            {dbLoading ? (
              <div className="py-4 flex justify-center items-center gap-2 text-xs text-slate-400">
                <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                <span>Checking connectivity...</span>
              </div>
            ) : dbStatus?.status === 'online' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-semibold text-emerald-400">Cloud SQL (PostgreSQL)</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-500 uppercase font-bold">Connected</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Ingested Datasets</span>
                    <span className="text-xs font-extrabold text-slate-200">{dbStatus.metrics?.totalFiles ?? 0} files</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Audit Activities</span>
                    <span className="text-xs font-extrabold text-slate-200">{dbStatus.metrics?.totalActivities ?? 0} rows</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Synced Members</span>
                    <span className="text-xs font-extrabold text-slate-200">{dbStatus.metrics?.totalMembers ?? 0} users</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Instance Region</span>
                    <span className="text-xs font-extrabold text-slate-200">europe-west2</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
                  <span>Database Link Inactive</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  {dbStatus?.error || 'Failed to communicate with PostgreSQL instance. Verify your .env setup.'}
                </p>
              </div>
            )}
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

          {/* Google Search Console Verification */}
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" /> Search Console Verification
            </h3>
            
            <div className="space-y-4">
              <p className="text-[10px] leading-relaxed text-slate-400">
                Verify your app on Google Search Console using HTML Meta Tag or dynamic HTML File verification.
              </p>

              {gscSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <span>{gscSuccessMsg}</span>
                </div>
              )}

              {/* Meta Tag Code */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Method A: HTML Meta Tag Content Code
                </label>
                <input 
                  type="text"
                  value={metaCode}
                  onChange={(e) => setMetaCode(e.target.value)}
                  placeholder="e.g. google1234567890abcdef" 
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-950'}`}
                />
                <span className="text-[9px] text-slate-500 block">
                  Places verification meta tag in your document header.
                </span>
              </div>

              <div className="border-t border-slate-800/40 my-3"></div>

              {/* Dynamic HTML File serving */}
              <div className="space-y-3">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Method B: Dynamic HTML File
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">
                      Verification Filename
                    </label>
                    <input 
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="e.g. google1234567890.html" 
                      className={`w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-950'}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase">
                      File Content
                    </label>
                    <input 
                      type="text"
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      placeholder="e.g. google-site-verification: google1234567890.html" 
                      className={`w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-950'}`}
                    />
                  </div>
                </div>
                <span className="text-[9px] text-slate-500 block">
                  Dynamically responds with verification details when requested.
                </span>
              </div>

              <button
                type="button"
                onClick={handleGscSave}
                disabled={gscLoading}
                className="w-full mt-2 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-55 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md"
              >
                {gscLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save & Deploy Search Console Verification</span>
                )}
              </button>
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

      {/* API Reference & Terms of Service */}
      <div className="space-y-6 pt-6 border-t border-slate-800/20">
        
        {/* Interactive API Documentation Panel */}
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
          <button
            type="button"
            onClick={() => setApiDocOpen(!apiDocOpen)}
            className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  API Developer Documentation
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Integrate your internal workflows directly with Auditor Pro's PostgreSQL backend.
                </p>
              </div>
            </div>
            <div className={`p-1 rounded-lg ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
              {apiDocOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {apiDocOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 pt-6 border-t border-slate-800/40 space-y-6"
            >
              {/* Authenticated Context Banner */}
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <span className="font-extrabold uppercase text-[9px] tracking-widest block text-violet-300 mb-1">Authorization Protocol</span>
                  All requests must carry your Firebase ID token in the bearer header. Ensure HTTPS is enforced.
                </div>
                <div className="font-mono text-[10px] p-1.5 rounded bg-slate-950 border border-slate-800 shrink-0 select-all">
                  Authorization: Bearer &lt;ID_TOKEN&gt;
                </div>
              </div>

              {/* Endpoint Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-500" /> Core Endpoints
                </h4>
                <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}`}>
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className={`border-b ${isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-100/60'}`}>
                        <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest text-[9px]">Method</th>
                        <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest text-[9px]">Route</th>
                        <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest text-[9px]">Description</th>
                        <th className="p-3 font-extrabold text-slate-400 uppercase tracking-widest text-[9px] text-right">Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-medium">
                      <tr>
                        <td className="p-3"><span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono rounded font-bold">GET</span></td>
                        <td className="p-3 font-mono text-slate-300">/api/sql/status</td>
                        <td className="p-3 text-slate-400">Fetch DB health metrics and counts. No auth header required for diagnostics.</td>
                        <td className="p-3 text-right font-mono text-slate-500">None</td>
                      </tr>
                      <tr>
                        <td className="p-3"><span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono rounded font-bold">GET</span></td>
                        <td className="p-3 font-mono text-slate-300">/api/sql/files</td>
                        <td className="p-3 text-slate-400">Retrieves all audited datasets and cleaning reports linked to your tenancy.</td>
                        <td className="p-3 text-right font-mono text-slate-500">None</td>
                      </tr>
                      <tr>
                        <td className="p-3"><span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 font-mono rounded font-bold">POST</span></td>
                        <td className="p-3 font-mono text-slate-300">/api/sql/sync-file</td>
                        <td className="p-3 text-slate-400">Pushes or upserts audited spreadsheets to PostgreSQL. Syncs raw cells, compliance scores, and flags.</td>
                        <td className="p-3 text-right"><span className="px-1.5 py-0.5 bg-slate-900 text-slate-400 font-mono rounded font-bold text-[9px]">JSON</span></td>
                      </tr>
                      <tr>
                        <td className="p-3"><span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 font-mono rounded font-bold">POST</span></td>
                        <td className="p-3 font-mono text-slate-300">/api/sql/sync-activity</td>
                        <td className="p-3 text-slate-400">Logs key actions to the shared compliance history timeline for accountability audits.</td>
                        <td className="p-3 text-right"><span className="px-1.5 py-0.5 bg-slate-900 text-slate-400 font-mono rounded font-bold text-[9px]">JSON</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Developer Snippets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Curl Box */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-slate-500" /> CLI Query Sample (cURL)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`curl -X GET "${window.location.origin}/api/sql/status"`, 'curl')}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer flex items-center gap-1 text-[9px]"
                    >
                      {copiedText === 'curl' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedText === 'curl' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className={`p-3.5 rounded-xl text-[10px] font-mono leading-relaxed overflow-x-auto select-all ${isDarkMode ? 'bg-slate-950 border border-slate-800/80 text-slate-300' : 'bg-slate-100 border border-slate-200 text-slate-800'}`}>
                    {`curl -X GET "${window.location.origin}/api/sql/status"`}
                  </pre>
                </div>

                {/* Node Box */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-slate-500" /> Javascript SDK fetch
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`const fetchStatus = async () => {\n  const res = await fetch(\`/api/sql/status\`);\n  const stats = await res.json();\n  console.log(stats);\n};`, 'js')}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer flex items-center gap-1 text-[9px]"
                    >
                      {copiedText === 'js' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedText === 'js' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className={`p-3.5 rounded-xl text-[10px] font-mono leading-relaxed overflow-x-auto select-all ${isDarkMode ? 'bg-slate-950 border border-slate-800/80 text-slate-300' : 'bg-slate-100 border border-slate-200 text-slate-800'}`}>
{`const fetchStatus = async () => {
  const res = await fetch(\`/api/sql/status\`);
  const stats = await res.json();
  console.log(stats);
};`}
                  </pre>
                </div>

              </div>

            </motion.div>
          )}
        </div>

        {/* Cookie Privacy & Live Consent Management */}
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between text-left flex-wrap sm:flex-nowrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
                <Cookie className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className={`font-extrabold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  Cookie Privacy & Consent Hub
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  View and manage active browser cookies used for workspace themes, telemetry metrics, and user preferences.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const btn = document.querySelector('[title="Open Cookie Preferences"]') as HTMLButtonElement | null;
                if (btn) {
                  btn.click();
                }
              }}
              className="px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-all flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <Settings className="w-3.5 h-3.5" /> Reconfigure Cookies
            </button>
          </div>
        </div>

        {/* Terms of Service & Privacy Policy Panel */}
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
          <button
            type="button"
            onClick={() => setTosOpen(!tosOpen)}
            className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-extrabold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  Terms of Service & Data Governance
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Understand how Auditor Pro protects your dataset privacy, ownership rights, and AI processing limits.
                </p>
              </div>
            </div>
            <div className={`p-1 rounded-lg ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
              {tosOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {tosOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 pt-6 border-t border-slate-800/40 space-y-6 text-xs text-slate-400 leading-relaxed"
            >
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Terms of Use */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-slate-200">
                    <BookOpen className="w-4 h-4 text-emerald-500" />
                    <span>Terms of Service</span>
                  </div>
                  
                  <div className="space-y-3 font-medium text-[11px]">
                    <div>
                      <span className="text-slate-300 block font-bold mb-0.5">1. Acceptance & Authorization Parameters</span>
                      By accessing the Auditor Pro spreadsheet hygiene pipeline, you authorize our platform to programmatically map structural cell models to a secure Google Cloud SQL PostgreSQL backend.
                    </div>
                    <div>
                      <span className="text-slate-300 block font-bold mb-0.5">2. User Ownership Rights</span>
                      We acknowledge that all CSV datasets, customized heuristics, structural schemas, data rows, and exported reports remain 100% the intellectual property and exclusive custody of the tenant.
                    </div>
                    <div>
                      <span className="text-slate-300 block font-bold mb-0.5">3. Regulatory Advisory & Disclaimers</span>
                      Suggestive remarks, formatting warnings, and compliance scores are generated for administrative diagnostics. These are suggestive recommendations and do not constitute legal or formal accounting audit certifications.
                    </div>
                  </div>
                </div>

                {/* Data Privacy */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-slate-200">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>Data Governance & Privacy</span>
                  </div>

                  <div className="space-y-3 font-medium text-[11px]">
                    <div>
                      <span className="text-slate-300 block font-bold mb-0.5">1. No Model Re-Training</span>
                      Any spreadsheet row evaluation performed using Google Gemini is completed via a private secure API session. Your custom datasets are never persistent-stored for LLM training or distributed model tuning.
                    </div>
                    <div>
                      <span className="text-slate-300 block font-bold mb-0.5">2. Safe Storage Encapsulation</span>
                      All database storage resides on custom Cloud SQL infrastructure with row-level ownership protections tied to your verified Firebase Authentication UID token.
                    </div>
                    <div>
                      <span className="text-slate-300 block font-bold mb-0.5">3. Account Cessation Guarantee</span>
                      Upon tenant account termination, all registered records, audit files, system timeline logs, and activity items linked to the unique workspace are completely purged from the active Postgres datastore.
                    </div>
                  </div>
                </div>

              </div>

              {/* Verified Badge */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-[10px] ${isDarkMode ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <span>Last Updated: June 2026 • Auditor Pro Regulatory & Dev Operations</span>
                <span className="font-extrabold uppercase text-[9px] tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">Verified Compliant</span>
              </div>

            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
}
