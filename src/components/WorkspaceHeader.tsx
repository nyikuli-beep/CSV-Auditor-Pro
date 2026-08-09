import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu,
  Clock,
  Compass,
  Keyboard,
  Bell,
  Sun,
  Moon,
  Palette,
  Camera,
  X,
  UserPlus,
  UserX,
  MoreVertical,
  Settings,
  Activity,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { SlotRequest } from '../types';

interface WorkspaceHeaderProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  onOpenMobileMenu: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  currentTime: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  themeInspectorOpen: boolean;
  onToggleThemeInspector: () => void;
  onOpenTour: () => void;
  onOpenShortcuts: () => void;
  onOpenProfile: () => void;
  slotRequests: SlotRequest[];
  onApproveSlotRequest: (req: SlotRequest) => void;
  onDeclineSlotRequest: (req: SlotRequest) => void;
  user: { uid: string; email: string; role: string; name?: string; avatar?: string } | null;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  activeTab,
  onNavigate,
  onOpenMobileMenu,
  isSidebarCollapsed = false,
  onToggleSidebar,
  currentTime,
  isDarkMode,
  onToggleTheme,
  themeInspectorOpen,
  onToggleThemeInspector,
  onOpenTour,
  onOpenShortcuts,
  onOpenProfile,
  slotRequests,
  onApproveSlotRequest,
  onDeclineSlotRequest,
  user
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);

  const pendingSlotRequests = slotRequests.filter(r => r.status === 'pending');
  const isOwner = user?.email?.toLowerCase() === 'nyikulibramwel@gmail.com' || user?.role?.toLowerCase() === 'owner' || user?.role?.toLowerCase() === 'admin';

  // Handle outside clicks to close popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
        setShowOverflowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Main Workspace';
      case 'upload': return 'Spreadsheet Ingestion';
      case 'schema': return 'Schema Compliance';
      case 'results': return 'Audit Findings';
      case 'clean': return 'Hygiene Laboratory';
      case 'insights': return 'AI Intelligence Core';
      case 'gmail': return 'Gmail Compliance Hub';
      case 'reports': return 'Branded PDF Reports';
      case 'history': return 'File Archive Repository';
      case 'team': return 'Tenancy Collaboration';
      case 'settings': return 'Workspace Credentials';
      case 'admin': return 'Compliance Administration';
      default: return 'Main Workspace';
    }
  };

  return (
    <header className={`h-14 px-3 sm:px-5 border-b flex items-center justify-between gap-2 sm:gap-4 shrink-0 w-full max-w-full relative z-30 transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0f172a] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* LEFT SECTION: Hamburger + Workspace Title + Status Badge */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 shrink">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open sidebar menu"
          className={`p-2 rounded-xl border flex items-center justify-center min-w-[40px] min-h-[40px] md:hidden cursor-pointer transition-colors ${
            isDarkMode 
              ? 'bg-[#374151] border-[#374151] text-[#F9FAFB] hover:bg-slate-700' 
              : 'bg-[#F3F4F6] border-[#E5E7EB] text-[#111827] hover:bg-slate-200'
          }`}
          title="Open Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            aria-label={isSidebarCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
            className={`hidden md:flex p-2 rounded-xl border items-center justify-center min-w-[36px] min-h-[36px] cursor-pointer transition-colors ${
              isDarkMode 
                ? 'bg-[#374151] border-[#374151] text-[#F9FAFB] hover:bg-slate-700' 
                : 'bg-[#F3F4F6] border-[#E5E7EB] text-[#111827] hover:bg-slate-200'
            }`}
            title={isSidebarCollapsed ? "Expand Sidebar (Alt + [)" : "Collapse Sidebar (Alt + [)"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        <div className="flex items-center gap-2 sm:gap-3 min-w-0 truncate">
          <h1 className={`font-bold text-xs sm:text-sm md:text-base tracking-tight truncate max-w-[130px] sm:max-w-[220px] md:max-w-[320px] lg:max-w-[420px] ${
            isDarkMode ? 'text-slate-100' : 'text-slate-900'
          }`} title={getTitle()}>
            {getTitle()}
          </h1>

          {/* Compact Single-Line Status Badge */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${
            isDarkMode 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">All Systems Normal</span>
          </div>
        </div>
      </div>

      {/* RIGHT ACTION TOOLBAR */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        
        {/* Desktop-Only: System Clock */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-mono text-[11px] text-slate-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-bold">{currentTime}</span>
        </div>

        {/* Desktop & Tablet: Interactive Tour Button */}
        <button
          onClick={onOpenTour}
          aria-label="Start Onboarding Tour"
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border cursor-pointer font-mono font-bold text-xs transition-all ${
            isDarkMode 
              ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' 
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
          }`}
          title="Take Interactive Onboarding Tour"
        >
          <Compass className="w-4 h-4 text-emerald-500" />
          <span className="hidden lg:inline">Tour</span>
        </button>

        {/* Desktop & Tablet: Keyboard Shortcuts Button */}
        <button
          onClick={onOpenShortcuts}
          aria-label="Keyboard Shortcuts"
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border cursor-pointer font-mono font-bold text-xs transition-all ${
            isDarkMode 
              ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' 
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
          }`}
          title="Keyboard Shortcuts Guide (Alt + K)"
        >
          <Keyboard className="w-4 h-4 text-blue-500" />
          <span className="hidden lg:inline">Alt+K</span>
        </button>

        {/* Notifications Bell Button & Popover (Owner or Pending Slot Requests) */}
        {isOwner && (
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
              className={`p-2 sm:px-2.5 sm:py-2 rounded-xl border cursor-pointer transition-all relative flex items-center justify-center min-w-[38px] min-h-[38px] ${
                isDarkMode 
                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              }`}
              title="Tenancy Notifications"
            >
              <Bell className="w-4 h-4 text-amber-500" />
              {pendingSlotRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center animate-bounce">
                  {pendingSlotRequests.length}
                </span>
              )}
            </button>

            {/* Notifications Popover Menu */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl border shadow-2xl p-4 z-50 ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-500" />
                      <span className="font-extrabold text-xs uppercase tracking-wider">Owner Notifications</span>
                    </div>
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {pendingSlotRequests.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 font-mono">
                      No pending user slot requests.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {pendingSlotRequests.map(req => (
                        <div key={req.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-amber-500/30 text-left space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-amber-600 dark:text-amber-300 truncate">{req.userName}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{req.requestedAt}</span>
                          </div>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-mono truncate">{req.userEmail}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{req.message || 'Requested team slot invitation.'}</p>
                          
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                            <button
                              onClick={() => {
                                onApproveSlotRequest(req);
                                setShowNotifications(false);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                            >
                              <UserPlus className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                onDeclineSlotRequest(req);
                                setShowNotifications(false);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-rose-600 font-bold text-[10px] flex items-center gap-1 cursor-pointer border border-slate-300 dark:border-slate-700"
                            >
                              <UserX className="w-3 h-3" /> Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Light / Dark Mode Toggle */}
        <motion.button
          onClick={onToggleTheme}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          aria-label={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
          className={`p-2 sm:px-2.5 sm:py-2 rounded-xl border cursor-pointer transition-colors relative overflow-hidden flex items-center justify-center min-w-[38px] min-h-[38px] ${
            isDarkMode 
              ? 'bg-slate-900/80 border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-800' 
              : 'bg-slate-50 border-slate-200 text-indigo-600 hover:text-indigo-800 hover:bg-slate-100'
          }`}
          title={`Toggle Theme Mode (${isDarkMode ? 'Light' : 'Dark'})`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isDarkMode ? 'dark' : 'light'}
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        {/* Desktop-Only: Theme Inspector (WCAG AA Tool) */}
        <button
          onClick={onToggleThemeInspector}
          aria-label="Theme & Accessibility Inspector"
          className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border cursor-pointer font-mono font-bold text-xs transition-all ${
            themeInspectorOpen 
              ? 'bg-blue-600 border-blue-500 text-white' 
              : isDarkMode 
                ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' 
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
          }`}
          title="Theme & Accessibility Inspector (WCAG AA)"
        >
          <Palette className="w-4 h-4 text-blue-500" />
          <span className="hidden lg:inline">WCAG AA</span>
        </button>

        {/* User Profile Action */}
        <button
          onClick={onOpenProfile}
          aria-label="User Profile Settings"
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer group"
          title="User Profile Settings"
        >
          <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-blue-500/60 shadow-sm shrink-0">
            <img src={user?.avatar || '/macbook_code.jpg'} alt={user?.name || "User Avatar"} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
              <Camera className="w-3 h-3" />
            </div>
          </div>
          <div className="hidden lg:flex flex-col text-left text-xs leading-tight">
            <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Nyikuli B.'}
            </span>
            <span className="text-[9px] font-mono text-blue-500 font-bold uppercase">{user?.role || 'Owner'}</span>
          </div>
        </button>

        {/* OVERFLOW MENU BUTTON (⋮ More) */}
        <div className="relative z-50" ref={overflowRef}>
          <button
            onClick={() => setShowOverflowMenu(!showOverflowMenu)}
            aria-label="More Actions Menu"
            className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-center min-w-[38px] min-h-[38px] ${
              showOverflowMenu
                ? 'bg-blue-600 border-blue-500 text-white'
                : isDarkMode 
                  ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
            }`}
            title="More Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* OVERFLOW DROPDOWN POPOVER */}
          <AnimatePresence>
            {showOverflowMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border shadow-2xl p-2 z-50 space-y-1 ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800/80 mb-1">
                  Workspace Actions
                </div>

                <button
                  onClick={() => {
                    onOpenTour();
                    setShowOverflowMenu(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Compass className="w-4 h-4 text-emerald-500" />
                  <span>Onboarding Tour</span>
                </button>

                <button
                  onClick={() => {
                    onOpenShortcuts();
                    setShowOverflowMenu(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Keyboard className="w-4 h-4 text-sky-500" />
                  <span>Keyboard Shortcuts</span>
                </button>

                <button
                  onClick={() => {
                    onToggleThemeInspector();
                    setShowOverflowMenu(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Palette className="w-4 h-4 text-amber-500" />
                  <span>Theme & Accessibility (WCAG AA)</span>
                </button>

                <button
                  onClick={() => {
                    onNavigate('settings');
                    setShowOverflowMenu(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Settings className="w-4 h-4 text-blue-500" />
                  <span>Workspace Settings</span>
                </button>

                <button
                  onClick={() => {
                    onNavigate('history');
                    setShowOverflowMenu(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span>Audit Logs & Archive</span>
                </button>

                <button
                  onClick={() => {
                    onOpenProfile();
                    setShowOverflowMenu(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Camera className="w-4 h-4 text-indigo-400" />
                  <span>User Profile Settings</span>
                </button>

                {isOwner && (
                  <button
                    onClick={() => {
                      onNavigate('admin');
                      setShowOverflowMenu(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                      isDarkMode ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>Compliance Administration</span>
                  </button>
                )}

                <div className="pt-1 mt-1 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 px-3 py-1 font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-500" /> System Time:
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{currentTime}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </header>
  );
};
