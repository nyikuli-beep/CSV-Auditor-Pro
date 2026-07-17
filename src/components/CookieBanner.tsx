import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Settings, 
  Check, 
  X, 
  Info, 
  Trash2, 
  Cookie, 
  Plus, 
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';

// Cookie Utility Helpers
export function setCookie(name: string, value: string, days: number = 365) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}

export function eraseCookie(name: string) {   
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
}

export interface CookiePreferences {
  essential: boolean;
  personalization: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieBannerProps {
  isDarkMode: boolean;
  onPreferencesChange?: (prefs: CookiePreferences) => void;
  onThemeCookieUpdate?: (theme: 'dark' | 'light') => void;
  onAccentCookieUpdate?: (accent: string) => void;
  onTabCookieUpdate?: (tab: string) => void;
  accentClass: string;
}

export default function CookieBanner({ 
  isDarkMode, 
  onPreferencesChange,
  onThemeCookieUpdate,
  onAccentCookieUpdate,
  onTabCookieUpdate,
  accentClass 
}: CookieBannerProps) {
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  
  // Consent categories state
  const [prefs, setPrefs] = useState<CookiePreferences>({
    essential: true,
    personalization: true,
    analytics: true,
    marketing: false
  });

  // Active Browser Cookies (For our real-time audit inspector tool!)
  const [activeCookies, setActiveCookies] = useState<{ name: string; value: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'preferences' | 'inspector' | 'details'>('preferences');
  
  // Custom Cookie Creator State
  const [newCookieName, setNewCookieName] = useState('');
  const [newCookieValue, setNewCookieValue] = useState('');
  const [inspectorSuccessMsg, setInspectorSuccessMsg] = useState('');

  // Initial load effect
  useEffect(() => {
    const savedConsent = getCookie('cookie_consent_choice');
    const savedPrefs = getCookie('cookie_consent_preferences');
    
    if (!savedConsent) {
      // No consent choice stored yet, show the banner
      setShowBanner(true);
    } else {
      if (savedPrefs) {
        try {
          const parsed = JSON.parse(savedPrefs) as CookiePreferences;
          setPrefs(parsed);
          if (onPreferencesChange) {
            onPreferencesChange(parsed);
          }
        } catch (e) {
          console.error("Error parsing cookie preferences", e);
        }
      }
    }
    
    refreshCookiesList();
  }, []);

  const refreshCookiesList = () => {
    const cookies = document.cookie.split(';');
    // Let's get real names and values
    const listWithValues = cookies.map(c => {
      const [name, ...valParts] = c.trim().split('=');
      return {
        name: name || '',
        value: decodeURIComponent(valParts.join('='))
      };
    }).filter(item => item.name !== '');

    setActiveCookies(listWithValues);
  };

  const savePreferences = (updatedPrefs: CookiePreferences) => {
    setPrefs(updatedPrefs);
    setCookie('cookie_consent_choice', 'true', 365);
    setCookie('cookie_consent_preferences', JSON.stringify(updatedPrefs), 365);
    
    if (onPreferencesChange) {
      onPreferencesChange(updatedPrefs);
    }

    // If personalization is rejected, remove the personalization-related cookies
    if (!updatedPrefs.personalization) {
      eraseCookie('app_theme');
      eraseCookie('app_accent');
      eraseCookie('app_last_tab');
    }

    setShowBanner(false);
    setShowModal(false);
    refreshCookiesList();
  };

  const handleAcceptAll = () => {
    const allPrefs: CookiePreferences = {
      essential: true,
      personalization: true,
      analytics: true,
      marketing: true
    };
    savePreferences(allPrefs);
  };

  const handleDeclineAll = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      personalization: false,
      analytics: false,
      marketing: false
    };
    savePreferences(essentialOnly);
  };

  const handleSavePreferencesClick = () => {
    savePreferences(prefs);
  };

  // Live Cookie Audit operations
  const handleCreateCustomCookie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCookieName.trim()) return;
    setCookie(newCookieName.trim(), newCookieValue.trim(), 1);
    setNewCookieName('');
    setNewCookieValue('');
    setInspectorSuccessMsg(`Cookie "${newCookieName.trim()}" created successfully!`);
    refreshCookiesList();
    setTimeout(() => setInspectorSuccessMsg(''), 3000);
  };

  const handleDeleteCookie = (name: string) => {
    eraseCookie(name);
    refreshCookiesList();
    setInspectorSuccessMsg(`Deleted cookie "${name}"`);
    setTimeout(() => setInspectorSuccessMsg(''), 3000);
  };

  const handleClearAllCookies = () => {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      eraseCookie(name);
    }
    refreshCookiesList();
    setInspectorSuccessMsg('All browser cookies wiped successfully!');
    setTimeout(() => setInspectorSuccessMsg(''), 3000);
  };

  return (
    <>
      {/* 1. BOTTOM FLOATING CONSENT BANNER */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className="fixed bottom-5 left-5 right-5 md:left-auto md:right-5 md:max-w-md z-50 shadow-2xl"
          >
            <div className={`p-5 rounded-2xl border ${
              isDarkMode 
                ? 'bg-[#0f172a] border-slate-800 text-slate-100 shadow-slate-950/40' 
                : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
            }`}>
              <div className="flex gap-3">
                <div className="p-2 bg-indigo-500/15 rounded-xl text-indigo-500 shrink-0 self-start">
                  <Cookie className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-extrabold text-xs tracking-tight uppercase">Cookie Privacy Guard</h4>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    We use cookies to optimize workspace theme state, persist layout preferences, and stream analytical insights. Decide which standard identifiers you allow.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-4 pt-4 border-t border-slate-500/10 text-[10px] font-bold">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="py-1.5 rounded-lg text-center bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-all"
                  >
                    Accept All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeclineAll}
                    className={`py-1.5 rounded-lg text-center border cursor-pointer transition-all ${
                      isDarkMode 
                        ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    Essential Only
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(true);
                    refreshCookiesList();
                  }}
                  className={`py-1.5 w-full rounded-lg text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 border-dashed border ${
                    isDarkMode 
                      ? 'bg-slate-950/40 border-slate-800 hover:bg-slate-900 text-indigo-400' 
                      : 'bg-white border-slate-300 hover:bg-slate-50 text-indigo-600'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" /> Customize Cookie Preferences
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. GRANULAR PREFERENCES MODAL & LIVE AUDITOR */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
                isDarkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-500/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/15 text-indigo-400 rounded-xl">
                    <Shield className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider">Cookie Governance & Preferences</h3>
                    <p className="text-[10px] text-slate-400">Configure cookies, view active storage, and audit compliance metrics.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 hover:bg-slate-800/10 dark:hover:bg-slate-800 rounded-full text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Tabs */}
              <div className={`px-5 py-2 border-b border-slate-500/10 flex gap-2 shrink-0 text-[10px] font-extrabold uppercase tracking-widest ${
                isDarkMode ? 'bg-slate-950/60' : 'bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={() => setActiveTab('preferences')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'preferences' 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:text-indigo-400'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" /> Consent Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('inspector');
                    refreshCookiesList();
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'inspector' 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:text-indigo-400'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Live Cookie Inspector
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'details' 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:text-indigo-400'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" /> Cookie Policy details
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1 min-h-0">
                {activeTab === 'preferences' && (
                  <div className="space-y-4">
                    <p className="text-[11px] leading-relaxed text-slate-400">
                      Our system relies on local storage identifiers to customize and persist your CSV cleanup workflow. Choose which categories you authorize:
                    </p>

                    <div className="space-y-3">
                      {/* 1. Essential */}
                      <div className={`p-3.5 rounded-xl border flex items-start justify-between gap-4 ${
                        isDarkMode ? 'bg-slate-950/60 border-slate-850' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">1. Essential Operations (Required)</span>
                            <span className="text-[8px] uppercase tracking-wider bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">Always Active</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Strictly necessary for security validation, cookie consent preferences management, and session identification. Cannot be disabled.
                          </p>
                          <span className="text-[9px] font-mono text-indigo-400 block font-bold">Stored cookies: cookie_consent_choice, cookie_consent_preferences</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={true}
                          disabled={true}
                          className="h-4 w-4 rounded text-indigo-600 bg-slate-950 border-slate-800 disabled:opacity-50 mt-1 cursor-not-allowed"
                        />
                      </div>

                      {/* 2. Personalization */}
                      <div className={`p-3.5 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                        prefs.personalization 
                          ? (isDarkMode ? 'bg-slate-950 border-indigo-500/20' : 'bg-indigo-50/20 border-indigo-200') 
                          : (isDarkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-white border-slate-200')
                      }`}>
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-200">2. Theme & Workspace Personalization</span>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Enables storage of your chosen workspace accent theme, active workspace tab, and dark mode state in the browser. Authorizing this preserves settings across visits.
                          </p>
                          <span className="text-[9px] font-mono text-indigo-400 block font-bold">Stored cookies: app_theme, app_accent, app_last_tab</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer mt-1">
                          <input
                            type="checkbox"
                            checked={prefs.personalization}
                            onChange={(e) => setPrefs({ ...prefs, personalization: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {/* 3. Analytics */}
                      <div className={`p-3.5 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                        prefs.analytics 
                          ? (isDarkMode ? 'bg-slate-950 border-indigo-500/20' : 'bg-indigo-50/20 border-indigo-200') 
                          : (isDarkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-white border-slate-200')
                      }`}>
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-200">3. Workspace & Pipeline Analytics</span>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Allows logging of audit speeds, ingest capacities, and clean activity counts inside the secure PostgreSQL Cloud SQL database. This details your metrics.
                          </p>
                          <span className="text-[9px] font-mono text-indigo-400 block font-bold">Stored cookies: analytics_client_id, session_event_counter</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer mt-1">
                          <input
                            type="checkbox"
                            checked={prefs.analytics}
                            onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {/* 4. Marketing */}
                      <div className={`p-3.5 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                        prefs.marketing 
                          ? (isDarkMode ? 'bg-slate-950 border-indigo-500/20' : 'bg-indigo-50/20 border-indigo-200') 
                          : (isDarkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-white border-slate-200')
                      }`}>
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-200">4. Marketing & Integration Feeds</span>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Supports GSC dynamic verification feeds, real-time Slack and email notification triggers, and specialized integrations.
                          </p>
                          <span className="text-[9px] font-mono text-indigo-400 block font-bold">Stored cookies: marketing_integration_token</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer mt-1">
                          <input
                            type="checkbox"
                            checked={prefs.marketing}
                            onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'inspector' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Live Client Browser Cookies Audit ({activeCookies.length})
                      </span>
                      <button
                        type="button"
                        onClick={refreshCookiesList}
                        className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-indigo-400" /> Refresh Table
                      </button>
                    </div>

                    {inspectorSuccessMsg && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
                        <span>{inspectorSuccessMsg}</span>
                      </div>
                    )}

                    {/* Interactive Cookie Table */}
                    <div className={`border rounded-xl overflow-hidden ${
                      isDarkMode ? 'border-slate-800' : 'border-slate-200'
                    }`}>
                      <table className="w-full text-left text-[11px] font-semibold border-collapse">
                        <thead>
                          <tr className={`border-b text-[9px] font-extrabold uppercase tracking-wider text-slate-400 ${
                            isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <th className="p-2.5">Key Name</th>
                            <th className="p-2.5">Stored Value String</th>
                            <th className="p-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeCookies.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-6 text-center text-slate-500 italic">
                                No cookies are currently active or readable in this document frame.
                              </td>
                            </tr>
                          ) : (
                            activeCookies.map((cookie, idx) => (
                              <tr 
                                key={idx}
                                className={`border-b transition-colors ${
                                  isDarkMode ? 'border-slate-850 hover:bg-slate-950/40 text-slate-200' : 'border-slate-100 hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <td className="p-2.5 font-mono text-indigo-400 font-bold">{cookie.name}</td>
                                <td className="p-2.5 font-mono max-w-xs truncate" title={cookie.value}>
                                  {cookie.value}
                                </td>
                                <td className="p-2.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCookie(cookie.name)}
                                    className="p-1 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded transition-all cursor-pointer"
                                    title={`Wipe cookie: ${cookie.name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Manual Cookie Creator Box */}
                    <form onSubmit={handleCreateCustomCookie} className={`p-4 rounded-xl border space-y-3 ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-850' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Cookie Testing Sandbox</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Cookie Key</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. debug_mode"
                            value={newCookieName}
                            onChange={(e) => setNewCookieName(e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none ${
                              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-950 border'
                            }`}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Cookie Value</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. active"
                            value={newCookieValue}
                            onChange={(e) => setNewCookieValue(e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none ${
                              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-950 border'
                            }`}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center gap-4 pt-1">
                        <button
                          type="button"
                          onClick={handleClearAllCookies}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Wipe All Cookies
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" /> Inject Test Cookie
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === 'details' && (
                  <div className="space-y-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Detailed Cookie Disclosure Policy</span>
                    
                    <div className="space-y-3 text-[11px] leading-relaxed text-slate-400">
                      <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="font-bold text-slate-300 block mb-1">What are cookies?</span>
                        <p>
                          Cookies are small text files downloaded by your browser to record settings, session IDs, and active preferences. They ensure a fluid, secure user experience.
                        </p>
                      </div>

                      <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="font-bold text-slate-300 block mb-1">How can you opt out?</span>
                        <p>
                          You can edit your preferences at any time under settings. Disabling personalization or analytics will cause the application to utilize fallback single-session states only.
                        </p>
                      </div>

                      <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="font-bold text-slate-300 block mb-1">Do we share cookie details?</span>
                        <p>
                          No. All analytical data is retained inside our secure, direct-linked Cloud SQL PostgreSQL database. No marketing metrics are distributed to third-party brokers.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-500/10 flex justify-between items-center shrink-0">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-md"
                  >
                    Accept All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeclineAll}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isDarkMode 
                        ? 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-400' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    Reject Optional
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isDarkMode 
                        ? 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-400' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePreferencesClick}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all cursor-pointer flex items-center gap-1 shadow-md"
                  >
                    <Check className="w-4 h-4 text-white" /> Save Chosen Preferences
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating settings shortcut to access cookie options instantly */}
      <button
        type="button"
        onClick={() => {
          setShowModal(true);
          refreshCookiesList();
        }}
        className={`fixed bottom-5 left-5 p-2.5 rounded-full shadow-lg border cursor-pointer z-40 transition-transform hover:scale-105 ${
          isDarkMode 
            ? 'bg-[#0f172a] border-slate-800 text-indigo-400 hover:text-indigo-300 shadow-slate-950/40' 
            : 'bg-white border-slate-200 text-indigo-600 hover:text-indigo-500 shadow-slate-200/50'
        }`}
        title="Open Cookie Preferences"
      >
        <Cookie className="w-5 h-5 text-indigo-500 animate-pulse" />
      </button>
    </>
  );
}
