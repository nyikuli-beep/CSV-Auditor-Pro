import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './hooks/useAuth';
import { useTime } from './context/TimeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import AboutFounderPage from './pages/AboutFounderPage';
import LandingPage from './components/LandingPage';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  Trash2, 
  BarChart3, 
  Sparkles, 
  Users, 
  Settings, 
  Lock, 
  Mail, 
  UserCheck, 
  HelpCircle,
  FileText,
  Clock,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  PanelLeft,
  Menu,
  X,
  MessageSquare,
  History,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Keyboard,
  Compass,
  Wand2,
  AlertTriangle,
  RefreshCw,
  Bell,
  UserPlus,
  UserX,
  Palette
} from 'lucide-react';

import { ThemeInspector } from './components/ThemeInspector';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import AcceptInviteModal from './components/AcceptInviteModal';
import { applyThemeToDocument, getActivePreset, DEFAULT_THEME_CUSTOMIZATION } from './lib/themeEngine';

// Import Types
import { CSVFile, TeamMember, AuditActivity, ChatMessage, SystemSettings, SlotRequest, ThemeCustomization, AppNotification, OrganizationInvitation } from './types';
import { applyBatchFixAll } from './lib/auditFixEngine';
import { CSVProfilingEngine, AnalysisRouter } from './lib/ai';

// Import Notification Service & Billing Context
import {
  computeUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  clearAllNotifications
} from './lib/notificationService';
import { subscribeToOrganizationInvitations, DEFAULT_ORG_ID, getPersistedInvitations } from './lib/teamTenancyService';
import { bumpUserSyncVersion } from './lib/sessionSyncService';
import { useBilling } from './context/BillingContext';
import { useTeamTenancy } from './context/TeamTenancyContext';

// Import File Storage persistence engine
import { 
  saveFilesToStorage, 
  loadFilesFromStorage, 
  loadFilesFromLocalStorageSync, 
  saveActiveFileIdToStorage, 
  loadActiveFileIdFromStorage, 
  deleteFileFromStorage,
  saveWorkspaceFilesToStorage,
  loadWorkspaceFilesFromStorage,
  loadWorkspaceFilesFromLocalStorageSync
} from './lib/fileStorage';
import { executeScheduledRetentionCleanup } from './lib/retentionService';
import { recordActiveDatasetInMemory } from './lib/workspaceMemoryEngine';

// Import Profile Upload, Keyboard Shortcuts & Onboarding Tour Modals
import ProfileUploadModal from './components/ProfileUploadModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import OnboardingTourModal from './components/OnboardingTourModal';
import UpgradeModal from './components/UpgradeModal';
import EnterpriseContactModal from './components/EnterpriseContactModal';
import TrialExpirationBanner from './components/TrialExpirationBanner';
import TeamInviteBanner from './components/TeamInviteBanner';
import { SocialLinksGroup } from './components/SocialLinks';
import { runTrialExpirationCheck, dismissTrialAlert, TrialAlert } from './utils/trialChecker';
import { openPaddleCheckout } from './lib/paddle';


// Network Resilience, Error Boundary, 404 & State Persistence Imports
import { useNetworkStatus } from './hooks/useNetworkStatus';
import NetworkOfflineOverlay from './components/NetworkOfflineOverlay';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import BrandedNotFound from './components/BrandedNotFound';
import { 
  saveNavigationState, 
  loadNavigationState, 
  saveScrollPosition, 
  restoreScrollPosition 
} from './lib/appStatePersistence';
import { fetchWithRetry } from './lib/apiClient';

// Import Mock Initial Data
import { SAMPLE_MESSY_FILE, TEAM_MEMBERS, AUDIT_ACTIVITIES } from './sampleData';

import CookieBanner, { getCookie, setCookie } from './components/CookieBanner';

// Import Firebase integration
import { auth, db, rtdb, OperationType, handleFirestoreError, setGmailAccessToken } from './firebase';
import { ref, onValue, off, set } from 'firebase/database';
import { onAuthStateChanged, signOut, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';

// Safe lazy import wrapper that auto-reloads if dynamic module fetch fails after long idle/deployment
function safeLazy<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((err) => {
      console.warn('Dynamic chunk import failed (likely stale bundle after idle period). Recovering...', err);
      const reloaded = sessionStorage.getItem('chunk_reload_attempted');
      if (!reloaded) {
        sessionStorage.setItem('chunk_reload_attempted', 'true');
        window.location.reload();
      }
      throw err;
    })
  );
}

// Import Views (Lazy Loaded for Low-Memory Devices & Mobile Startup Performance)
import { AssistantProvider, useAssistant } from './context/AssistantContext';
import { FloatingAssistant } from './components/assistant';

const AuthView = safeLazy(() => import('./components/AuthView'));
const DashboardHome = safeLazy(() => import('./components/DashboardHome'));
const UploadCenter = safeLazy(() => import('./components/UploadCenter'));
const AuditResults = safeLazy(() => import('./components/AuditResults'));
const CleaningCenter = safeLazy(() => import('./components/CleaningCenter'));
const InsightsCenter = safeLazy(() => import('./components/InsightsCenter'));
const ReportGen = safeLazy(() => import('./components/ReportGen'));
const AuditHistory = safeLazy(() => import('./components/AuditHistory'));
const TeamCollaboration = safeLazy(() => import('./components/TeamCollaboration'));
const SettingsView = safeLazy(() => import('./components/SettingsView'));
const AdminPanel = safeLazy(() => import('./components/AdminPanel'));
const GmailCenter = safeLazy(() => import('./components/GmailCenter'));
const SchemaManager = safeLazy(() => import('./components/SchemaManager'));

// Public Legal & Information Pages (Lazy Loaded)
const PrivacyPolicyPage = safeLazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = safeLazy(() => import('./pages/TermsOfServicePage'));
const RefundPolicyPage = safeLazy(() => import('./pages/RefundPolicyPage'));
const AboutPage = safeLazy(() => import('./pages/AboutPage'));
const ContactPage = safeLazy(() => import('./pages/ContactPage'));

// Loading spinner fallback optimized for instant render on 2GB RAM devices
function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[400px]" id="loading-spinner">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-sm font-medium text-slate-500">{message}</span>
    </div>
  );
}

export function WorkspaceContent({ initialTab = 'dashboard' }: { initialTab?: string }) {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Network Status Monitor (Detect online/offline status, show full-screen recovery interface)
  const {
    isOnline,
    isReconnecting,
    reconnectAttempts,
    triggerManualRetry
  } = useNetworkStatus(() => {
    if (triggerShortcutToast) {
      triggerShortcutToast('Network restored! Resuming workspace session...', 'CONNECTIVITY #ONLINE');
    }
  });

  // Tab State inside SaaS workspace (Restores saved navigation state)
  const [activeTab, setActiveTab] = useState<string>(() => {
    const savedNav = loadNavigationState();
    const path = location.pathname.substring(1);
    if (path && ['dashboard', 'upload', 'schema', 'results', 'clean', 'insights', 'gmail', 'reports', 'history', 'team', 'admin', 'settings'].includes(path)) {
      return path;
    }
    if (savedNav && savedNav.activeTab) {
      return savedNav.activeTab;
    }
    return initialTab;
  });

  useEffect(() => {
    const currentPath = location.pathname.substring(1);
    if (currentPath && ['dashboard', 'upload', 'schema', 'results', 'clean', 'insights', 'gmail', 'reports', 'history', 'team', 'admin', 'settings'].includes(currentPath)) {
      setActiveTab(currentPath);
    } else if (currentPath === 'profile') {
      setActiveTab('settings');
    }
  }, [location.pathname]);

  // Persist navigation state and restore scroll position on tab change
  useEffect(() => {
    if (activeTab) {
      saveNavigationState(activeTab, location.pathname);
      restoreScrollPosition(activeTab, mainContentRef.current);
    }
  }, [activeTab, location.pathname]);

  const handleContentScroll = () => {
    if (mainContentRef.current && activeTab) {
      saveScrollPosition(activeTab, mainContentRef.current.scrollTop);
    }
  };
  
  // Session / Persona State
  const [user, setUser] = useState<{ uid: string; email: string; role: string; name?: string; avatar?: string } | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);
  const [themeInspectorOpen, setThemeInspectorOpen] = useState<boolean>(false);
  const [tourModalOpen, setTourModalOpen] = useState<boolean>(() => {
    return localStorage.getItem('onboarding_tour_completed') !== 'true';
  });
  const [shortcutToast, setShortcutToast] = useState<{ message: string; keyCombo: string } | null>(null);
  const [securityAlert, setSecurityAlert] = useState<{ title: string; message: string } | null>(null);
  const [slotRequests, setSlotRequests] = useState<SlotRequest[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState<boolean>(false);
  const [trialAlert, setTrialAlert] = useState<TrialAlert | null>(null);

  // Billing Context for quota and subscription depletion tracking
  const { billing, usage: billingUsage } = useBilling();

  // Multi-Tenant Tenancy Context Hook (Central Session Coordinator)
  const {
    uid: sessionUid,
    sessionId,
    deviceId,
    activeWorkspaceId,
    activeOrganization,
    incomingInvitations,
    pendingInviteForBanner,
    workspaceFiles,
    isFilesInitialized,
    filesDataState,
    currentMember,
    currentRole,
    permissions: tenancyPermissions,
    hasPermission: checkTenancyPermission,
    isOwnerOrAdmin,
    isPrimaryOwner,
    acceptInvite: executeAcceptInvite,
    dismissBannerInvite,
    synchronizationStatus,
    sessionVersion,
    isOnline: sessionIsOnline,
    reconcileSession
  } = useTeamTenancy();

  // Multi-Tenant Invitations & Accept Modal State
  const [workspaceInvitations, setWorkspaceInvitations] = useState<OrganizationInvitation[]>(() => {
    return getPersistedInvitations(DEFAULT_ORG_ID);
  });
  const [acceptInviteModalState, setAcceptInviteModalState] = useState<{ isOpen: boolean; prefilledToken: string }>({
    isOpen: false,
    prefilledToken: ''
  });
  const [notificationTick, setNotificationTick] = useState<number>(0);
  const [dismissedInviteIds, setDismissedInviteIds] = useState<Set<string>>(new Set());

  // Subscribe to organization invitations globally across workspace (with user-level refresh)
  useEffect(() => {
    const unsub = subscribeToOrganizationInvitations(DEFAULT_ORG_ID, (list) => {
      setWorkspaceInvitations(list);
    });
    return () => unsub();
  }, [user?.email]);

  // Background check utility upon user login to verify if a trial is within 7, 3, or 1 day(s) of expiry
  useEffect(() => {
    if (user?.email) {
      runTrialExpirationCheck(user.email).then(alert => {
        setTrialAlert(alert);
      });
    } else {
      setTrialAlert(null);
    }
  }, [user?.email]);

  const handleDismissTrialAlert = () => {
    if (user?.email && trialAlert) {
      dismissTrialAlert(user.email, trialAlert.daysRemaining);
    }
    setTrialAlert(null);
  };

  const PROTECTED_ADMIN_EMAILS = ['nyikulibramwel@gmail.com'];

  const triggerShortcutToast = (message: string, keyCombo: string) => {
    setShortcutToast({ message, keyCombo });
    setTimeout(() => {
      setShortcutToast(null);
    }, 2200);
  };

  const handleToggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  
  // Theme Toggle (Default to saved preference or false)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem('app_theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      const savedSettings = localStorage.getItem('app_system_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.theme) return parsed.theme === 'dark';
      }
      const themeCookie = getCookie('app_theme');
      if (themeCookie) return themeCookie === 'dark';
    } catch (e) {
      console.warn("Could not load theme from storage:", e);
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('csv_auditor_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('csv_auditor_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Files Registry (strictly workspace-scoped and synchronized in real-time)
  const [files, setFiles] = useState<CSVFile[]>(() => {
    return loadWorkspaceFilesFromLocalStorageSync(activeWorkspaceId);
  });
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [activeFileId, setActiveFileId] = useState<string>(() => {
    return loadActiveFileIdFromStorage();
  });
  const [isFixingActiveFile, setIsFixingActiveFile] = useState<boolean>(false);
  const [fixAllSuccessMsg, setFixAllSuccessMsg] = useState<string>('');

  // Synchronize authoritative workspace datasets across browsers in real-time
  useEffect(() => {
    if (isFilesInitialized && workspaceFiles !== undefined) {
      setFiles(workspaceFiles);
      saveWorkspaceFilesToStorage(activeWorkspaceId, workspaceFiles);

      if (workspaceFiles.length > 0) {
        // Validate and update activeFileId safely
        setActiveFileId(prev => {
          const fileStillExists = workspaceFiles.some(f => f.id === prev);
          if (fileStillExists) return prev;
          return workspaceFiles[0].id;
        });
      } else {
        setActiveFileId('');
      }
    }
  }, [workspaceFiles, isFilesInitialized, activeWorkspaceId]);

  // When workspace changes, load cached files for the specific workspace if available
  useEffect(() => {
    if (activeWorkspaceId) {
      const cached = loadWorkspaceFilesFromLocalStorageSync(activeWorkspaceId);
      if (cached && cached.length > 0) {
        setFiles(cached);
      }
      setActiveFileIndex(0);
    }
  }, [activeWorkspaceId]);

  // Auto-persist files whenever files state changes and record into workspace memory
  useEffect(() => {
    if (files && files.length > 0) {
      saveFilesToStorage(files);
      files.forEach(f => {
        if (f && f.name) {
          recordActiveDatasetInMemory(activeWorkspaceId || 'org-enterprise-root', {
            fileId: f.id,
            fileName: f.name,
            rowCount: f.rows?.length || 0,
            headers: f.headers || [],
            score: f.score || 95,
            duplicatesCount: f.issues?.filter(i => i.type === 'duplicate').length || 0,
            missingValuesCount: f.issues?.filter(i => i.type === 'missing_value').length || 0,
            formatErrorsCount: f.issues?.filter(i => i.type === 'invalid_format').length || 0,
            outliersCount: f.issues?.filter(i => i.type === 'outlier').length || 0,
            formulaRisksCount: f.issues?.filter(i => i.type === 'formula_injection' || i.type === 'malicious_content').length || 0
          });
        }
      });
    }
  }, [files, activeWorkspaceId]);

  // Auto-persist active file ID whenever activeFileId changes
  useEffect(() => {
    if (activeFileId) {
      saveActiveFileIdToStorage(activeFileId);
    }
  }, [activeFileId]);

  const isUserOwner = user?.email?.toLowerCase() === 'nyikulibramwel@gmail.com' || user?.role?.toLowerCase() === 'owner' || user?.role?.toLowerCase() === 'admin' || isOwnerOrAdmin || isPrimaryOwner;

  // Compute unified user notifications across invites, billing, quota, security, and tenancy
  const userNotifications = React.useMemo<AppNotification[]>(() => {
    if (!user?.email) return [];
    const mergedInvites = [...incomingInvitations, ...workspaceInvitations];
    const uniqueInvitesMap = new Map<string, OrganizationInvitation>();
    mergedInvites.forEach(inv => { if (inv && inv.id) uniqueInvitesMap.set(inv.id, inv); });

    return computeUserNotifications({
      userEmail: user.email,
      userRole: user.role || currentRole,
      userName: user.name,
      invitations: Array.from(uniqueInvitesMap.values()),
      billing: billing,
      usageMetrics: billingUsage,
      files: files,
      slotRequests: slotRequests,
      orgName: activeOrganization?.name || 'Enterprise Data Workspace',
      isOwner: isUserOwner
    });
  }, [user?.email, user?.role, user?.name, currentRole, incomingInvitations, workspaceInvitations, billing, billingUsage, files, slotRequests, activeOrganization?.name, isUserOwner, notificationTick]);

  const unreadNotificationCount = React.useMemo(() => {
    return userNotifications.filter(n => !n.read).length;
  }, [userNotifications]);

  const handleMarkNotificationAsRead = (id: string) => {
    if (!user?.email) return;
    markNotificationAsRead(user.email, id);
    setNotificationTick(t => t + 1);
  };

  const handleMarkAllNotificationsAsRead = () => {
    if (!user?.email) return;
    markAllNotificationsAsRead(user.email, userNotifications.map(n => n.id));
    setNotificationTick(t => t + 1);
  };

  const handleDismissNotification = (id: string) => {
    if (!user?.email) return;
    dismissNotification(user.email, id);
    setNotificationTick(t => t + 1);
  };

  const handleClearAllNotifications = () => {
    if (!user?.email) return;
    clearAllNotifications(user.email, userNotifications.map(n => n.id));
    setNotificationTick(t => t + 1);
  };

  const handleNotificationAction = (notification: AppNotification) => {
    if (notification.actionType === 'accept_invite') {
      setAcceptInviteModalState({
        isOpen: true,
        prefilledToken: notification.actionPayload?.inviteToken || ''
      });
    } else if (notification.actionType === 'view_subscription') {
      if (isUserOwner) {
        openPaddleCheckout('pro', user?.email || undefined);
      } else {
        handleNavigateTab('settings');
      }
    } else if (notification.actionType === 'view_team') {
      handleNavigateTab('team');
    } else if (notification.actionType === 'view_audit') {
      if (notification.actionPayload?.fileId) {
        setActiveFileId(notification.actionPayload.fileId);
      }
      handleNavigateTab('results');
    } else if (notification.actionType === 'view_security') {
      if (notification.actionPayload?.fileId) {
        setActiveFileId(notification.actionPayload.fileId);
      }
      handleNavigateTab('schema');
    } else if (notification.actionType === 'navigate' && notification.actionPayload?.tab) {
      if (notification.actionPayload?.fileId) {
        setActiveFileId(notification.actionPayload.fileId);
      }
      handleNavigateTab(notification.actionPayload.tab);
    }
  };

  // Pending invitation specifically targeting the active user
  const pendingUserInvite = React.useMemo(() => {
    if (pendingInviteForBanner) return pendingInviteForBanner;
    if (!user?.email) return null;
    const userLower = user.email.toLowerCase().trim();
    const merged = [...incomingInvitations, ...workspaceInvitations];
    return merged.find(
      inv => inv.email.toLowerCase().trim() === userLower &&
             inv.status === 'pending' &&
             !dismissedInviteIds.has(inv.id) &&
             new Date(inv.expiresAt).getTime() > Date.now()
    ) || null;
  }, [pendingInviteForBanner, user?.email, incomingInvitations, workspaceInvitations, dismissedInviteIds]);

  // Collaboration registry (with persistence from localStorage)
  const [members, setMembers] = useState<TeamMember[]>(() => {
    try {
      const saved = localStorage.getItem('app_team_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to parse cached app_team_members:", e);
    }
    return [];
  });
  const [activities, setActivities] = useState<AuditActivity[]>([]);
  const knownActiveMemberEmailsRef = useRef<Set<string>>(new Set());

  // Realtime Database Unread Count for Team Tenancy Navigation Link
  const [teamUnreadCount, setTeamUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!rtdb) return;

    const tenantId = 'default-tenant-01';
    const currentFileId = activeFileId || 'master-audit-01';
    const roomId = `tenant_${tenantId}_file_${currentFileId}`.replace(/[\.\#\$\/\[\]]/g, '_');
    const safeUid = (user?.uid || user?.email || 'anon-usr').replace(/[\.\#\$\/\[\]]/g, '_');

    // Mark room as read when user opens Team Tenancy tab
    if (activeTab === 'team') {
      setTeamUnreadCount(0);
      try {
        const unreadRef = ref(rtdb, `unread/${roomId}/${safeUid}`);
        set(unreadRef, { count: 0, lastReadTime: Date.now() });
        localStorage.setItem(`chat_last_read_${roomId}`, Date.now().toString());
      } catch (e) {
        console.warn("RTDB mark read error:", e);
      }
      return;
    }

    let unsubUnread: (() => void) | null = null;
    let unsubMessages: (() => void) | null = null;

    try {
      // 1. Direct RTDB unread count
      const userUnreadRef = ref(rtdb, `unread/${roomId}/${safeUid}`);
      onValue(userUnreadRef, (snap) => {
        const val = snap.val();
        if (val && typeof val.count === 'number') {
          setTeamUnreadCount(val.count);
        }
      });
      unsubUnread = () => off(userUnreadRef);

      // 2. Computed unread count from incoming RTDB messages
      const messagesRef = ref(rtdb, `chatRooms/${roomId}/messages`);
      onValue(messagesRef, (snap) => {
        const val = snap.val();
        if (val && activeTab !== 'team') {
          const lastReadStr = localStorage.getItem(`chat_last_read_${roomId}`) || '0';
          const lastReadTime = parseInt(lastReadStr, 10);
          const currentUserEmailLower = (user?.email || '').toLowerCase();

          let newMsgsCount = 0;
          Object.keys(val).forEach(msgKey => {
            const msg = val[msgKey];
            if (
              msg && 
              typeof msg.timestamp === 'number' && 
              msg.timestamp > lastReadTime && 
              msg.userEmail?.toLowerCase() !== currentUserEmailLower
            ) {
              newMsgsCount++;
            }
          });

          setTeamUnreadCount(prev => Math.max(prev, newMsgsCount));
        }
      });
      unsubMessages = () => off(messagesRef);

    } catch (err) {
      console.warn("RTDB unread badge listener error:", err);
    }

    return () => {
      if (unsubUnread) unsubUnread();
      if (unsubMessages) unsubMessages();
    };
  }, [activeTab, activeFileId, user?.email, user?.uid]);

  // Chat message stack
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      id: 'm-init', 
      role: 'assistant', 
      content: 'Greetings! I am ready to analyze your CSV datasets and guide you through data hygiene and compliance validation. Upload a CSV file to get started.', 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }
  ]);

  // System Config
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('app_system_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not parse app_system_settings from localStorage', e);
    }
    return {
      theme: 'light',
      accentColor: 'blue',
      apiKey: '',
      emailNotifications: {
        auditCompleted: true,
        teamInvites: true,
        weeklyDigest: false
      },
      language: 'en',
      timezone: 'auto'
    };
  });

  const activeFile = files.find(f => f.id === activeFileId) || files[activeFileIndex] || files[0] || null;

  // Real-time Centralized Time & Timezone Sync
  const { timeData, setConfiguredTimeZone, formatTime } = useTime();
  const currentTime = timeData.timeString;

  useEffect(() => {
    if (settings.timezone) {
      setConfiguredTimeZone(settings.timezone);
    }
  }, [settings.timezone, setConfiguredTimeZone]);

  // Global Floating AI Assistant Context Synchronization
  const { setPageContext, setDatasetContext, toggleAssistant, isOpen: isAssistantOpen } = useAssistant();

  useEffect(() => {
    setPageContext({
      page: activeTab,
      title: activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
    });
  }, [activeTab, setPageContext]);

  useEffect(() => {
    if (activeFile) {
      setDatasetContext({
        fileId: activeFile.id,
        fileName: activeFile.name,
        rowCount: activeFile.rows?.length || 0,
        columnCount: activeFile.headers?.length || (activeFile.rows?.[0] ? Object.keys(activeFile.rows[0]).length : 0),
        headers: activeFile.headers || (activeFile.rows?.[0] ? Object.keys(activeFile.rows[0]) : []),
        score: activeFile.score,
        dataQualitySummary: {
          missingCount: activeFile.issues?.filter(i => i.type === 'missing_value').length || 0,
          duplicateCount: activeFile.issues?.filter(i => i.type === 'duplicate').length || 0,
          formatErrorsCount: activeFile.issues?.filter(i => i.type === 'invalid_format').length || 0,
          formulaRisksCount: activeFile.issues?.filter(i => i.type === 'formula_injection').length || 0,
          outliersCount: activeFile.issues?.filter(i => i.type === 'outlier').length || 0
        }
      }, activeFile);
    } else {
      setDatasetContext(null, null);
    }
  }, [activeFile, setDatasetContext]);

  // Load state preferences from cookies if allowed on initial mount
  useEffect(() => {
    const consentPrefs = getCookie('cookie_consent_preferences');
    if (consentPrefs) {
      try {
        const parsed = JSON.parse(consentPrefs);
        if (parsed.personalization) {
          const themeCookie = getCookie('app_theme');
          const accentCookie = getCookie('app_accent');
          const tabCookie = getCookie('app_last_tab');
          
          if (themeCookie) {
            setIsDarkMode(themeCookie === 'dark');
          }
          if (accentCookie) {
            setSettings(prev => ({ ...prev, accentColor: accentCookie as any }));
          }
          if (tabCookie) {
            setActiveTab(tabCookie);
          }
        }
      } catch (e) {
        console.error("Failed to parse cookie preferences on startup", e);
      }
    }
  }, []);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is currently typing in an input field or textarea
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );

      // Escape key to close open modals
      if (e.key === 'Escape') {
        if (shortcutsModalOpen) {
          setShortcutsModalOpen(false);
          return;
        }
        if (profileModalOpen) {
          setProfileModalOpen(false);
          return;
        }
      }

      // '?' key (Shift + /) opens shortcuts guide when not inside an input
      if (e.key === '?' && !isInput && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShortcutsModalOpen(prev => !prev);
        return;
      }

      // Alt key modifier combinations
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();

        if (key === 'd') {
          e.preventDefault();
          setActiveTab('dashboard');
          triggerShortcutToast('Dashboard Home', 'Alt + D');
        } else if (key === 'u') {
          e.preventDefault();
          setActiveTab('upload');
          triggerShortcutToast('Upload Center', 'Alt + U');
        } else if (key === 's' && !e.shiftKey) {
          e.preventDefault();
          setActiveTab('schema');
          triggerShortcutToast('Schema Validator', 'Alt + S');
        } else if (key === 'r') {
          e.preventDefault();
          setActiveTab('results');
          triggerShortcutToast('Audit Findings', 'Alt + R');
        } else if (key === 'c') {
          e.preventDefault();
          setActiveTab('clean');
          triggerShortcutToast('Hygiene Workspace', 'Alt + C');
        } else if (key === 'i') {
          e.preventDefault();
          setActiveTab('insights');
          triggerShortcutToast('AI Intelligence', 'Alt + I');
        } else if (key === 'g') {
          e.preventDefault();
          setActiveTab('gmail');
          triggerShortcutToast('Gmail Compliance', 'Alt + G');
        } else if (key === 'p' && !e.shiftKey) {
          e.preventDefault();
          setActiveTab('reports');
          triggerShortcutToast('Branded Reports', 'Alt + P');
        } else if (key === 'h') {
          e.preventDefault();
          setActiveTab('history');
          triggerShortcutToast('File Archive', 'Alt + H');
        } else if (key === 't') {
          e.preventDefault();
          setActiveTab('team');
          triggerShortcutToast('Team Tenancy', 'Alt + T');
        } else if (key === 'j') {
          e.preventDefault();
          toggleAssistant();
          triggerShortcutToast(isAssistantOpen ? 'Closed CSV Auditor AI' : 'Opened CSV Auditor AI', 'Alt + J');
        } else if (key === 'a') {
          e.preventDefault();
          if (user?.role === 'Admin' || user?.role === 'Owner') {
            setActiveTab('admin');
            triggerShortcutToast('Admin Panel', 'Alt + A');
          }
        } else if (key === 'o' || key === ',') {
          e.preventDefault();
          setActiveTab('settings');
          triggerShortcutToast('API & Settings', 'Alt + O');
        } else if (key === 'k') {
          e.preventDefault();
          setShortcutsModalOpen(prev => !prev);
        } else if (key === 'p' && e.shiftKey) {
          e.preventDefault();
          setProfileModalOpen(true);
          triggerShortcutToast('Profile Picture Upload', 'Alt + Shift + P');
        } else if (key === 'l' && e.shiftKey) {
          e.preventDefault();
          handleToggleTheme();
          triggerShortcutToast('Switched Theme', 'Alt + Shift + L');
        } else if (key === '[' || e.code === 'BracketLeft') {
          e.preventDefault();
          toggleSidebarCollapse();
          triggerShortcutToast(isSidebarCollapsed ? 'Expanded Sidebar' : 'Collapsed Sidebar', 'Alt + [');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, shortcutsModalOpen, profileModalOpen]);

  // Prevent background scrolling when mobile menu drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Sync state preferences to cookies & localStorage when state changes
  useEffect(() => {
    localStorage.setItem('app_theme', isDarkMode ? 'dark' : 'light');
    setSettings(prev => {
      const newTheme: 'dark' | 'light' = isDarkMode ? 'dark' : 'light';
      if (prev.theme === newTheme) return prev;
      const next = { ...prev, theme: newTheme };
      try {
        localStorage.setItem('app_system_settings', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    const consentPrefs = getCookie('cookie_consent_preferences');
    if (consentPrefs) {
      try {
        const parsed = JSON.parse(consentPrefs);
        if (parsed.personalization) {
          setCookie('app_theme', isDarkMode ? 'dark' : 'light', 365);
          setCookie('app_accent', settings.accentColor, 365);
          setCookie('app_last_tab', activeTab, 365);
        }
      } catch (e) {
        console.error("Failed to save state to cookies", e);
      }
    }
  }, [isDarkMode, settings.accentColor, activeTab]);

  // Auto-sync user avatar and profile details to localStorage
  useEffect(() => {
    if (user?.avatar) {
      localStorage.setItem('user_profile_avatar', user.avatar);
    }
    if (user?.name) {
      localStorage.setItem('user_profile_name', user.name);
    }
  }, [user?.avatar, user?.name]);

  // Document class & background sync for dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }

    // Apply enterprise custom theme design tokens & active preset background
    const tc: ThemeCustomization = {
      ...DEFAULT_THEME_CUSTOMIZATION,
      ...(settings.themeCustomization || {}),
      accentColor: settings.accentColor || settings.themeCustomization?.accentColor || 'blue'
    };
    applyThemeToDocument(tc, isDarkMode);
    const activePreset = getActivePreset(tc, isDarkMode);
    document.documentElement.style.backgroundColor = activePreset.bgMain;
    document.body.style.backgroundColor = activePreset.bgMain;
  }, [isDarkMode, settings.themeCustomization, settings.accentColor]);

  // Capture incoming Firebase Auth redirect results (for Vercel & mobile browser OAuth redirects)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            setGmailAccessToken(credential.accessToken, Date.now());
          }
          if (result.user) {
            setFirebaseUser(result.user);
          }
        }
      })
      .catch((err) => {
        console.warn('[Firebase Auth Redirect Handler]:', err?.message || err);
      });
  }, []);

  // Monitor auth state changes & fetch Firestore profile
  useEffect(() => {
    let isCancelled = false;

    const unsubscribe = onAuthStateChanged(auth, (fUser) => {
      if (!fUser) {
        if (!isCancelled) {
          setFirebaseUser(null);
          setUser(null);
          setActivities([]);
          setMembers([]);
          setSlotRequests([]);
          localStorage.removeItem('user_profile_uid');
          localStorage.removeItem('user_profile_avatar');
          localStorage.removeItem('user_profile_name');
          sessionStorage.removeItem('auth_session_active');
          sessionStorage.removeItem('auth_last_verified');
          setAuthLoading(false);
        }
        return;
      }

      // 1. Maintain workspace files and update user session
      const lastUid = localStorage.getItem('user_profile_uid');
      if (lastUid && lastUid !== fUser.uid) {
        setActivities([]);
        setSlotRequests([]);
      }
      localStorage.setItem('user_profile_uid', fUser.uid);
      
      const isOwnerEmail = ['nyikulibramwel@gmail.com'].some(
        p => p.toLowerCase() === (fUser.email || '').trim().toLowerCase()
      );
      const initialRole = isOwnerEmail ? 'Owner' : 'Editor';
      const initialName = fUser.displayName || fUser.email?.split('@')[0] || 'Authenticated User';
      const initialAvatar = fUser.photoURL || '';

      // 2. Immediately render application shell with newly authenticated user (< 100ms response)
      if (!isCancelled) {
        setUser({ 
          uid: fUser.uid,
          email: fUser.email || `${fUser.uid}@demo.com`, 
          role: initialRole,
          name: initialName,
          avatar: initialAvatar
        });
        setFirebaseUser(fUser);
        setAuthLoading(false);

        localStorage.setItem('user_profile_uid', fUser.uid);
        localStorage.setItem('user_profile_avatar', initialAvatar);
        localStorage.setItem('user_profile_name', initialName);
      }

      // 3. Perform background profile fetch and tenancy slot sync in parallel (non-blocking)
      Promise.allSettled([
        // A. Background ID Token refresh check
        (async () => {
          try {
            const tokenResult = await fUser.getIdTokenResult();
            const expirationTime = new Date(tokenResult.expirationTime).getTime();
            if (expirationTime <= Date.now() + 5 * 60 * 1000) {
              await fUser.getIdToken(true);
            }
          } catch (e) {}
        })(),

        // B. Background Firestore Profile Fetch
        (async () => {
          try {
            const userRef = doc(db, 'users', fUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const data = userSnap.data();
              const updatedRole = isOwnerEmail ? 'Owner' : (data.role || 'Editor');
              let updatedAvatar = initialAvatar;
              if (fUser.photoURL) {
                updatedAvatar = fUser.photoURL;
              } else if (data.avatar && !data.avatar.includes('photo-1534528741775-53994a69daeb')) {
                updatedAvatar = data.avatar;
              }
              const updatedName = data.name || initialName;
              if (data.settings && typeof data.settings === 'object') {
                setSettings(prev => ({ ...prev, ...data.settings }));
              }

              if (!isCancelled) {
                setUser(prev => prev && prev.uid === fUser.uid ? {
                  ...prev,
                  role: updatedRole,
                  name: updatedName,
                  avatar: updatedAvatar
                } : prev);
                localStorage.setItem('user_profile_avatar', updatedAvatar);
                localStorage.setItem('user_profile_name', updatedName);
              }
            } else {
              const newProfile = {
                id: fUser.uid,
                uid: fUser.uid,
                name: initialName,
                email: fUser.email || `${fUser.uid}@demo.com`,
                role: initialRole,
                avatar: initialAvatar,
                createdAt: new Date().toISOString()
              };
              await setDoc(userRef, newProfile);
            }
          } catch (err) {
            console.warn("Firestore background profile sync warning:", err);
          }
        })(),

        // C. Background Tenancy Slot Sync
        (async () => {
          try {
            const emailLower = (fUser.email || `${fUser.uid}@demo.com`).toLowerCase().trim();
            const primaryOwnerEmail = 'nyikulibramwel@gmail.com';

            if (emailLower !== primaryOwnerEmail) {
              const membersColl = collection(db, 'members');
              const q = query(membersColl, where('email', '==', emailLower));
              const querySnap = await getDocs(q);

              if (!querySnap.empty) {
                const isDenied = querySnap.docs.some(docSnap => {
                  const d = docSnap.data();
                  return d.status === 'denied' || d.accessDenied === true;
                });

                if (isDenied && !isCancelled) {
                  setSecurityAlert({
                    title: 'Access Restricted: Login Denied',
                    message: `Security Protocol Active: Login access for '${emailLower}' has been revoked by workspace owner (${primaryOwnerEmail}). Access to the application is blocked.`
                  });
                  await logout();
                  setUser(null);
                  setFirebaseUser(null);
                  return;
                }

                for (const docSnap of querySnap.docs) {
                  const existingData = docSnap.data();
                  const updatedMember: TeamMember = {
                    id: docSnap.id,
                    name: initialName || existingData.name || emailLower.split('@')[0],
                    email: emailLower,
                    role: (existingData.role as any) || 'Editor',
                    status: 'active',
                    avatar: initialAvatar || existingData.avatar || ''
                  };
                  await setDoc(doc(db, 'members', docSnap.id), updatedMember);
                }
              } else {
                const memberRef = doc(db, 'members', fUser.uid);
                const memberRecord: TeamMember = {
                  id: fUser.uid,
                  name: initialName || emailLower.split('@')[0],
                  email: emailLower,
                  role: (initialRole as any) || 'Editor',
                  status: 'active',
                  avatar: initialAvatar || ''
                };
                await setDoc(memberRef, memberRecord);
              }
            } else {
              const memberRef = doc(db, 'members', fUser.uid);
              const ownerRecord: TeamMember = {
                id: fUser.uid,
                name: initialName || 'Nyikuli Bramwel',
                email: primaryOwnerEmail,
                role: 'Owner',
                status: 'active',
                avatar: initialAvatar || ''
              };
              await setDoc(memberRef, ownerRecord);
            }
          } catch (memberSyncErr) {
            console.warn("Firestore member sync fallback:", memberSyncErr);
          }
        })(),

        // D. Background Postgres User Record Sync
        (async () => {
          try {
            const idToken = await fUser.getIdToken();
            await fetch('/api/sql/sync-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({
                name: initialName,
                email: fUser.email || `${fUser.uid}@demo.com`,
                role: initialRole
              })
            });
          } catch (dbErr) {
            console.warn("Postgres sync warning:", dbErr);
          }
        })()
      ]);
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, []);

  // Sync collections in real-time with proper unsubscribes on user switch
  useEffect(() => {
    if (authLoading || !firebaseUser || !user || firebaseUser.uid !== user.uid) {
      return;
    }

    let isMounted = true;

    // 1. Team snapshot
    const membersQuery = collection(db, 'members');
    const unsubscribeMembers = onSnapshot(membersQuery, async (snapshot) => {
      if (!isMounted) return;
      const membersList: TeamMember[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as TeamMember;
        membersList.push({ ...data, id: docSnap.id || data.id });
      });

      const userEmailLower = (firebaseUser.email || '').toLowerCase().trim();
      const primaryOwnerEmail = 'nyikulibramwel@gmail.com';

      const memberMap = new Map<string, TeamMember>();

      const primaryOwnerMember: TeamMember = {
        id: userEmailLower === primaryOwnerEmail ? firebaseUser.uid : 'usr-primary-owner',
        name: userEmailLower === primaryOwnerEmail ? (user?.name || firebaseUser.displayName || 'Nyikuli Bramwel') : 'Nyikuli Bramwel',
        email: primaryOwnerEmail,
        role: 'Owner',
        status: 'active',
        avatar: userEmailLower === primaryOwnerEmail && firebaseUser.photoURL ? firebaseUser.photoURL : ''
      };
      memberMap.set(primaryOwnerEmail, primaryOwnerMember);

      membersList.forEach(m => {
        const emailKey = (m.email || '').toLowerCase().trim();
        if (!emailKey || emailKey === primaryOwnerEmail) return;

        const isDenied = m.status === 'denied' || m.accessDenied === true;
        memberMap.set(emailKey, {
          ...m,
          role: m.role || 'Editor',
          status: isDenied ? 'denied' : (m.status || 'active'),
          accessDenied: isDenied
        });
      });

      if (userEmailLower && userEmailLower !== primaryOwnerEmail) {
        const activeUserRecord = memberMap.get(userEmailLower);

        if (activeUserRecord && (activeUserRecord.status === 'denied' || activeUserRecord.accessDenied)) {
          setSecurityAlert({
            title: 'Access Revoked in Real Time',
            message: `Your login permissions for (${userEmailLower}) have been revoked/denied by workspace owner ${primaryOwnerEmail}. You have been signed out.`
          });
          handleLogout();
          return;
        }

        const existsInFirestore = membersList.some(m => (m.email || '').toLowerCase().trim() === userEmailLower);

        if (existsInFirestore) {
          knownActiveMemberEmailsRef.current.add(userEmailLower);
        } else if (knownActiveMemberEmailsRef.current.has(userEmailLower)) {
          setSecurityAlert({
            title: 'Account Deleted in Real Time',
            message: `Your workspace account (${userEmailLower}) was removed from team tenancy slots by owner ${primaryOwnerEmail}. You have been signed out.`
          });
          knownActiveMemberEmailsRef.current.delete(userEmailLower);
          handleLogout();
          return;
        }
      }

      const mergedList = Array.from(memberMap.values());
      setMembers(mergedList);
      try {
        localStorage.setItem('app_team_members', JSON.stringify(mergedList));
      } catch (e) {}
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'members');
    });

    // 3. Activities snapshot
    const activitiesQuery = query(collection(db, 'activities'), limit(25));
    const unsubscribeActivities = onSnapshot(activitiesQuery, async (snapshot) => {
      if (!isMounted) return;
      const activitiesList: AuditActivity[] = [];
      snapshot.forEach((docSnap) => {
        activitiesList.push(docSnap.data() as AuditActivity);
      });

      if (activitiesList.length === 0) {
        setActivities([]);
      } else {
        setActivities(activitiesList.sort((a, b) => b.id.localeCompare(a.id)));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'activities');
    });

    // 4. Slot requests snapshot
    const slotReqQuery = query(collection(db, 'slot_requests'), limit(50));
    const unsubscribeSlotReq = onSnapshot(slotReqQuery, (snapshot) => {
      if (!isMounted) return;
      const reqList: SlotRequest[] = [];
      snapshot.forEach((docSnap) => {
        reqList.push({ id: docSnap.id, ...docSnap.data() } as SlotRequest);
      });
      setSlotRequests(reqList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    }, (err) => {
      console.warn("Firestore slot_requests subscription warning:", err);
    });

    return () => {
      isMounted = false;
      unsubscribeMembers();
      unsubscribeActivities();
      unsubscribeSlotReq();
    };
  }, [firebaseUser?.uid, user?.uid, authLoading]);

  // Periodic background check for expired CSV file retention policies with strict expiration guardrails
  useEffect(() => {
    if (!files || files.length === 0) return;

    const interval = setInterval(() => {
      const { updatedFiles, deletedCount } = executeScheduledRetentionCleanup(
        files,
        (action, fileName) => {
          handleAddNewActivity(`${action}: ${fileName || 'dataset'}`);
        },
        (msg, type) => {
          triggerShortcutToast(msg, type === 'warning' ? 'RETENTION #WARNING' : 'RETENTION #CLEANUP');
        }
      );

      if (deletedCount > 0) {
        console.log(`[RETENTION] Automated cleanup purged ${deletedCount} genuinely expired dataset(s)`);
        setFiles(updatedFiles);
        saveFilesToStorage(updatedFiles);

        // Sync expired state for purged files to Firestore and bump version vector
        const targetOrgId = activeWorkspaceId || DEFAULT_ORG_ID;
        for (const f of updatedFiles) {
          if (f.retentionPolicy?.status === 'deleted_expired') {
            setDoc(doc(db, 'files', f.id), f).catch((err) =>
              console.warn('[RETENTION] Firestore update failed for expired file:', err)
            );
            syncToPostgres('sync-file', 'POST', f).catch(() => {});
          }
        }

        if (firebaseUser?.uid) {
          bumpUserSyncVersion({
            uid: firebaseUser.uid,
            workspaceVersion: true,
            activeWorkspaceId: targetOrgId,
            sessionId,
            reason: 'retention_auto_cleanup'
          });
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [files, activeWorkspaceId, firebaseUser?.uid, sessionId]);

  const handleApproveSlotRequest = async (req: SlotRequest) => {
    try {
      // 1. Update slot request status in Firestore
      await setDoc(doc(db, 'slot_requests', req.id), { status: 'approved' }, { merge: true });

      // 2. Automatically invite / provision user in members
      const newMember: TeamMember = {
        id: `usr-${Date.now()}`,
        name: req.userName,
        email: req.userEmail,
        role: 'Editor',
        status: 'active',
        avatar: req.userAvatar || ''
      };
      await handleInviteMember(newMember);

      // 3. Log audit activity
      const activityLog: AuditActivity = {
        id: `act-${Date.now()}`,
        userId: auth.currentUser?.uid || 'owner',
        userName: user?.name || 'Nyikuli Bramwel',
        userAvatar: user?.avatar || '',
        action: `Approved & provisioned team tenancy user slot for ${req.userName} (${req.userEmail})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      await setDoc(doc(db, 'activities', activityLog.id), activityLog);

      triggerShortcutToast(`Approved & provisioned team slot for ${req.userEmail}`, 'SLOT #APPROVED');
    } catch (err) {
      console.error("Error approving slot request:", err);
    }
  };

  const handleDeclineSlotRequest = async (req: SlotRequest) => {
    try {
      // 1. Update slot request status in Firestore
      await setDoc(doc(db, 'slot_requests', req.id), { status: 'declined' }, { merge: true });

      // 2. Log audit activity
      const activityLog: AuditActivity = {
        id: `act-${Date.now()}`,
        userId: auth.currentUser?.uid || 'owner',
        userName: user?.name || 'Nyikuli Bramwel',
        userAvatar: user?.avatar || '',
        action: `Declined team tenancy user slot request from ${req.userName} (${req.userEmail})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      await setDoc(doc(db, 'activities', activityLog.id), activityLog);

      triggerShortcutToast(`Declined slot request from ${req.userEmail}`, 'SLOT #DECLINED');
    } catch (err) {
      console.error("Error declining slot request:", err);
    }
  };

  // Map accents to Tailwind classes
  const getAccentColorClass = () => {
    switch (settings.accentColor) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-700 text-emerald-500';
      case 'violet': return 'bg-violet-600 hover:bg-violet-700 text-violet-500';
      case 'amber': return 'bg-amber-600 hover:bg-amber-700 text-amber-500';
      case 'purple': return 'bg-purple-600 hover:bg-purple-700 text-purple-500';
      case 'orange': return 'bg-orange-600 hover:bg-orange-700 text-orange-500';
      case 'red': return 'bg-red-600 hover:bg-red-700 text-red-500';
      case 'cyan': return 'bg-cyan-600 hover:bg-cyan-700 text-cyan-500';
      case 'indigo': return 'bg-indigo-600 hover:bg-indigo-700 text-indigo-500';
      case 'blue':
      default: return 'bg-blue-600 hover:bg-blue-700 text-blue-500';
    }
  };

  const accentClass = getAccentColorClass();

  // Helper to sync mutations with our secure PostgreSQL Cloud SQL database
  const syncToPostgres = async (path: string, method: 'POST' | 'GET' | 'DELETE', body?: any) => {
    if (!firebaseUser) return null;
    try {
      const token = await firebaseUser.getIdToken();
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const res = await fetchWithRetry(`/api/sql/${path}`, options, { maxRetries: 2, initialDelayMs: 800 });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`Postgres sync failed for ${path} (safe offline/local fallback active):`, err);
    }
    return null;
  };

  // Handle successful registration/auth
  const handleAuthSuccess = async (userInfo: { name: string; email: string; role: 'Owner' | 'Admin' | 'Editor' | 'Viewer' }) => {
    // If we've authenticated in Firebase, onAuthStateChanged handles routing
    const savedAvatar = localStorage.getItem('user_profile_avatar') || '/macbook_code.jpg';
    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        const userRef = doc(db, 'users', activeUser.uid);
        await setDoc(userRef, {
          id: activeUser.uid,
          name: userInfo.name,
          email: userInfo.email,
          role: userInfo.role,
          avatar: savedAvatar,
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Error setting user profile in Firestore:", err);
      }
    }
    localStorage.setItem('user_profile_name', userInfo.name);
    setUser({ uid: activeUser?.uid || '', email: userInfo.email, role: userInfo.role, name: userInfo.name, avatar: savedAvatar });
    navigate('/dashboard');
    setActiveTab('dashboard');

    // Prepend user activation activity log
    const activationLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: activeUser?.uid || 'usr-nyikuli',
      userName: userInfo.name,
      action: 'Authenticated to workspace segment',
      timestamp: 'Just now'
    };
    try {
      await setDoc(doc(db, 'activities', activationLog.id), activationLog);
      await syncToPostgres('sync-activity', 'POST', activationLog);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `activities/${activationLog.id}`);
    }
  };

  // Log Out Sequence
  const handleLogout = async () => {
    setAuthLoading(true);
    setUser(null);
    setFirebaseUser(null);
    setFiles([]);
    setActivities([]);
    setMembers([]);
    setSlotRequests([]);
    localStorage.removeItem('user_profile_uid');
    localStorage.removeItem('user_profile_avatar');
    localStorage.removeItem('user_profile_name');
    sessionStorage.removeItem('auth_session_active');
    sessionStorage.removeItem('auth_last_verified');
    try {
      await logout();
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      setAuthLoading(false);
      navigate('/login', { replace: true });
    }
  };

  // Add newly uploaded CSV to registry
  const handleNewFileUpload = async (newFile: CSVFile) => {
    const fileId = newFile.id || `file-${Date.now()}`;
    const targetOrgId = activeWorkspaceId || DEFAULT_ORG_ID;
    const fileToUpload: CSVFile = {
      ...newFile,
      id: fileId,
      ownerId: firebaseUser?.uid || auth.currentUser?.uid || 'usr-nyikuli',
      workspaceId: targetOrgId,
      organizationId: targetOrgId
    };

    // Optimistically update files and transition immediately for instant, high-performance UI feedback
    setFiles(prev => {
      const filtered = prev.filter(f => f.id !== fileId);
      const updated = [fileToUpload, ...filtered];
      saveFilesToStorage(updated);
      return updated;
    });

    setActiveFileId(fileId);
    saveActiveFileIdToStorage(fileId);
    setActiveFileIndex(0);
    setActiveTab('clean'); // Switch directly to the Cleaning Center for cleaning

    const actionDesc = (newFile as any).isQuickCleaned 
      ? `Uploaded, ingested, and auto-sanitized "${newFile.name}" (Quick Clean applied)`
      : `Uploaded & ingested new dataset "${newFile.name}"`;

    const uploadLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || 'usr-nyikuli',
      userName: user?.email || 'Nyikuli Bramwel',
      action: actionDesc,
      timestamp: 'Just now'
    };

    // Update activities locally immediately
    setActivities(prev => [uploadLog, ...prev]);

    // Save in firestore and sync to postgres in the background without blocking the UI navigation
    try {
      console.log(`[SYNC] Explicit mutation: Upload dataset "${fileToUpload.name}" (${fileId})`);
      console.log(`[SYNC] Firestore write: files/${fileId}`);
      await setDoc(doc(db, 'files', fileId), fileToUpload);
      await syncToPostgres('sync-file', 'POST', fileToUpload);

      if (firebaseUser?.uid) {
        bumpUserSyncVersion({
          uid: firebaseUser.uid,
          workspaceVersion: true,
          activeWorkspaceId: targetOrgId,
          sessionId,
          reason: 'upload_dataset'
        });
      }
    } catch (err) {
      console.warn('Firestore write failed, using local fallback state:', err);
    }

    try {
      await setDoc(doc(db, 'activities', uploadLog.id), uploadLog);
      await syncToPostgres('sync-activity', 'POST', uploadLog);
    } catch (err) {
      console.warn('Firestore write activity failed:', err);
    }
  };

  // Update file row values post cleaning
  const handleUpdateFile = async (updatedFile: CSVFile) => {
    const targetOrgId = updatedFile.workspaceId || activeWorkspaceId || DEFAULT_ORG_ID;
    const filePayload: CSVFile = {
      ...updatedFile,
      ownerId: updatedFile.ownerId || firebaseUser?.uid || auth.currentUser?.uid || 'usr-nyikuli',
      workspaceId: targetOrgId,
      organizationId: targetOrgId
    };

    try {
      console.log(`[SYNC] Explicit mutation: Update dataset "${filePayload.name}" (${filePayload.id})`);
      console.log(`[SYNC] Firestore write: files/${filePayload.id}`);
      await setDoc(doc(db, 'files', filePayload.id), filePayload);
      await syncToPostgres('sync-file', 'POST', filePayload);

      if (firebaseUser?.uid) {
        bumpUserSyncVersion({
          uid: firebaseUser.uid,
          workspaceVersion: true,
          activeWorkspaceId: targetOrgId,
          sessionId,
          reason: 'update_dataset'
        });
      }
    } catch (err) {
      console.warn('Firestore update failed, using local fallback state:', err);
    }

    // Always update local state
    setFiles(prev => {
      const updated = prev.map(f => f.id === filePayload.id ? filePayload : f);
      saveFilesToStorage(updated);
      return updated;
    });

    const cleanLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || '',
      userName: user?.name || user?.email?.split('@')[0] || 'User',
      action: `Executed data hygiene algorithms on "${updatedFile.name}"`,
      timestamp: 'Just now'
    };
    try {
      await setDoc(doc(db, 'activities', cleanLog.id), cleanLog);
      await syncToPostgres('sync-activity', 'POST', cleanLog);
    } catch (err) {
      console.warn('Firestore write activity failed:', err);
    }

    setActivities(prev => [cleanLog, ...prev]);
  };

  // Batch repair all open auto-fixable issues for the currently active file
  const handleAutoFixAllActiveFile = async () => {
    if (!activeFile) return;
    const openIssues = activeFile.issues ? activeFile.issues.filter(i => i.status === 'open') : [];
    if (openIssues.length === 0) return;

    setIsFixingActiveFile(true);

    // Brief delay to provide tactile visual feedback during cleaning
    await new Promise(r => setTimeout(r, 350));

    const result = applyBatchFixAll(activeFile);
    await handleUpdateFile(result.updatedFile);
    
    setIsFixingActiveFile(false);
    setFixAllSuccessMsg(result.summaryMessage || `Auto-fixed ${result.fixedCount} issue(s)!`);
    setTimeout(() => setFixAllSuccessMsg(''), 4500);
  };

  // Render Miniature Active File Gauge Component with Hover Fix-All Action
  const renderActiveFileGauge = (file: CSVFile, isCollapsed: boolean = false) => {
    const openIssuesCount = file.issues ? file.issues.filter(i => i.status === 'open').length : 0;
    const isAuditingOrProcessing = file.status === 'auditing' || file.status === 'pending' || (isFixingActiveFile && activeFile?.id === file.id);

    if (isCollapsed) {
      return (
        <button
          onClick={() => {
            setActiveFileId(file.id);
            setActiveTab('clean');
          }}
          title={`Active Dataset: ${file.name} (${openIssuesCount} issues open, ${file.score}% score)`}
          className={`w-10 h-10 mx-auto rounded-[10px] border flex items-center justify-center relative cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            isDarkMode 
              ? 'bg-[#374151] border-[#374151] text-[#F9FAFB] hover:bg-slate-700' 
              : 'bg-[#F3F4F6] border-[#E5E7EB] text-[#111827] hover:bg-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" />
          {openIssuesCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-[#2563EB] text-white flex items-center justify-center border border-white dark:border-[#1F2937]">
              {openIssuesCount > 9 ? '9+' : openIssuesCount}
            </span>
          )}
        </button>
      );
    }

    return (
      <motion.div 
        whileHover={{ scale: 1.02 }}
        animate={isAuditingOrProcessing ? {
          boxShadow: [
            isDarkMode ? "0 0 0px rgba(59, 130, 246, 0.2)" : "0 0 0px rgba(59, 130, 246, 0.15)",
            isDarkMode ? "0 0 18px rgba(59, 130, 246, 0.6)" : "0 0 14px rgba(59, 130, 246, 0.45)",
            isDarkMode ? "0 0 0px rgba(59, 130, 246, 0.2)" : "0 0 0px rgba(59, 130, 246, 0.15)",
          ],
          borderColor: [
            isDarkMode ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.3)",
            isDarkMode ? "rgba(59, 130, 246, 0.95)" : "rgba(59, 130, 246, 0.8)",
            isDarkMode ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.3)",
          ]
        } : {}}
        transition={isAuditingOrProcessing ? {
          boxShadow: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
          borderColor: { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
        } : { type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => {
          setActiveFileId(file.id);
          setActiveTab('clean');
        }}
        className={`group relative p-3.5 rounded-xl border space-y-2 text-xs text-left transition-all cursor-pointer overflow-hidden ${
          isDarkMode 
            ? 'bg-[#1e293b]/40 border-slate-800/80 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10' 
            : 'bg-slate-50 border-slate-200/80 hover:border-blue-400 hover:shadow-md'
        }`}
      >
        {/* Subtle glowing animated backdrop overlay during processing */}
        {isAuditingOrProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.25, 0.6, 0.25] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-xl bg-blue-500/10 pointer-events-none"
          />
        )}

        <div className="flex justify-between items-center relative z-10">
          <span className={`font-bold block max-w-[125px] truncate transition-colors ${isDarkMode ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'}`} title={file.name}>
            {file.name}
          </span>
          {isAuditingOrProcessing ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-blue-500/20 text-blue-400 flex items-center gap-1 border border-blue-500/30 animate-pulse">
              <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-400" />
              <span>{file.status === 'auditing' ? 'Auditing...' : isFixingActiveFile ? 'Fixing...' : 'Processing...'}</span>
            </span>
          ) : (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
              {file.rows.length} rows
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] relative z-10">
          <span className="text-slate-400 font-semibold">Integrity rating:</span>
          <span className={`font-black ${file.score > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>
            {file.score}%
          </span>
        </div>

        <div className={`w-full h-1.5 rounded-full overflow-hidden relative z-10 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
          <div 
            className={`h-full rounded-full transition-all duration-500 ${isAuditingOrProcessing ? 'bg-blue-600 animate-pulse' : file.score > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
            style={{ width: `${file.score}%` }}
          />
        </div>

        {/* Action Row / Hover Fix All Button */}
        <AnimatePresence mode="wait">
          {fixAllSuccessMsg ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="pt-1 flex items-center justify-between text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20"
            >
              <span className="flex items-center gap-1 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{fixAllSuccessMsg}</span>
              </span>
            </motion.div>
          ) : openIssuesCount > 0 ? (
            <motion.div 
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 1 }}
              className="pt-1 flex items-center justify-between gap-1"
            >
              <span className="text-[10px] font-semibold text-rose-400/90 group-hover:text-rose-400 flex items-center gap-1 truncate">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>{openIssuesCount} issue{openIssuesCount > 1 ? 's' : ''}</span>
              </span>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAutoFixAllActiveFile();
                }}
                disabled={isFixingActiveFile}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all shadow-md shrink-0 cursor-pointer ${
                  isFixingActiveFile
                    ? 'bg-blue-600 text-white opacity-80 cursor-wait'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border border-blue-500/30'
                }`}
                title="Batch repair all auto-fixable issues"
              >
                {isFixingActiveFile ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Fixing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3 h-3 text-amber-300" />
                    <span>Fix All</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          ) : (
            <div className="pt-1 flex items-center justify-between text-[10px] text-emerald-500 font-semibold">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> All issues resolved
              </span>
              <span className="text-[9px] text-slate-400 font-mono">100% Clean</span>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // Update multiple files post batch cleaning
  const handleUpdateFiles = async (updatedFiles: CSVFile[]) => {
    const targetOrgId = activeWorkspaceId || DEFAULT_ORG_ID;
    const scopedFiles = updatedFiles.map(file => ({
      ...file,
      ownerId: file.ownerId || firebaseUser?.uid || auth.currentUser?.uid || 'usr-nyikuli',
      workspaceId: file.workspaceId || targetOrgId,
      organizationId: file.organizationId || targetOrgId
    }));

    try {
      console.log(`[SYNC] Explicit mutation: Batch update ${scopedFiles.length} dataset(s)`);
      for (const file of scopedFiles) {
        console.log(`[SYNC] Firestore write: files/${file.id}`);
        await setDoc(doc(db, 'files', file.id), file);
        await syncToPostgres('sync-file', 'POST', file);
      }

      if (firebaseUser?.uid) {
        bumpUserSyncVersion({
          uid: firebaseUser.uid,
          workspaceVersion: true,
          activeWorkspaceId: targetOrgId,
          sessionId,
          reason: 'batch_update_datasets'
        });
      }
    } catch (err) {
      console.warn('Firestore batch update failed, using local fallback state:', err);
    }

    // Always update local state
    setFiles(prev => {
      const updated = prev.map(f => {
        const match = scopedFiles.find(uf => uf.id === f.id);
        return match ? match : f;
      });
      saveFilesToStorage(updated);
      return updated;
    });

    const batchCleanLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || '',
      userName: user?.name || user?.email?.split('@')[0] || 'User',
      action: `Executed batch data hygiene algorithms on ${updatedFiles.length} file(s)`,
      timestamp: 'Just now'
    };
    try {
      await setDoc(doc(db, 'activities', batchCleanLog.id), batchCleanLog);
      await syncToPostgres('sync-activity', 'POST', batchCleanLog);
    } catch (err) {
      console.warn('Firestore write batch activity failed:', err);
    }

    setActivities(prev => [batchCleanLog, ...prev]);
  };

  // Delete file from workspace registry
  const handleDeleteFile = async (id: string, name: string) => {
    deleteFileFromStorage(id);

    try {
      console.log(`[SYNC] Explicit mutation: Delete dataset "${name}" (${id})`);
      console.log(`[SYNC] Firestore delete: files/${id}`);
      await deleteDoc(doc(db, 'files', id));
      await syncToPostgres(`delete-file/${id}`, 'DELETE');

      if (firebaseUser?.uid) {
        bumpUserSyncVersion({
          uid: firebaseUser.uid,
          workspaceVersion: true,
          activeWorkspaceId: activeWorkspaceId || DEFAULT_ORG_ID,
          sessionId,
          reason: 'delete_dataset'
        });
      }
    } catch (err) {
      console.warn('Firestore delete failed, using local fallback state:', err);
    }

    // Always update local state first
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      saveFilesToStorage(updated);
      return updated;
    });

    // Safely shift active file index and ID
    const deletedIndex = files.findIndex(f => f.id === id);
    if (deletedIndex !== -1) {
      const remainingFiles = files.filter(f => f.id !== id);
      if (activeFileId === id) {
        if (remainingFiles.length > 0) {
          const nextActiveIdx = Math.min(deletedIndex, remainingFiles.length - 1);
          setActiveFileId(remainingFiles[nextActiveIdx].id);
          setActiveFileIndex(nextActiveIdx);
        } else {
          setActiveFileId('');
          setActiveFileIndex(0);
        }
      } else {
        const nextActiveIdx = remainingFiles.findIndex(f => f.id === activeFileId);
        if (nextActiveIdx !== -1) {
          setActiveFileIndex(nextActiveIdx);
        }
      }
    }

    const deleteLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || '',
      userName: user?.name || user?.email?.split('@')[0] || 'User',
      action: `Deleted dataset file "${name}"`,
      timestamp: 'Just now'
    };
    try {
      await setDoc(doc(db, 'activities', deleteLog.id), deleteLog);
      await syncToPostgres('sync-activity', 'POST', deleteLog);
    } catch (err) {
      console.warn('Firestore activity delete failed:', err);
    }

    setActivities(prev => [deleteLog, ...prev]);
  };

  // Invite user to group workspace
  const handleInviteMember = async (newMember: TeamMember) => {
    const emailLower = (newMember.email || '').toLowerCase().trim();
    if (!emailLower) return;

    const sanitizedMember: TeamMember = {
      id: newMember.id || `usr-${Date.now()}`,
      name: newMember.name || emailLower.split('@')[0],
      email: emailLower,
      role: newMember.role || 'Editor',
      status: newMember.status || 'invited',
      avatar: newMember.avatar || ''
    };

    // Optimistically update local members state & localStorage
    setMembers(prev => {
      const filtered = prev.filter(m => m.email.toLowerCase().trim() !== emailLower);
      const updated = [...filtered, sanitizedMember];
      try {
        localStorage.setItem('app_team_members', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      const membersColl = collection(db, 'members');
      const q = query(membersColl, where('email', '==', emailLower));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        let isFirst = true;
        for (const docSnap of querySnap.docs) {
          if (isFirst) {
            const existing = docSnap.data();
            const recordToSave: TeamMember = {
              id: docSnap.id,
              name: sanitizedMember.name || existing.name || emailLower.split('@')[0],
              email: emailLower,
              role: sanitizedMember.role || existing.role || 'Editor',
              status: sanitizedMember.status || existing.status || 'invited',
              avatar: sanitizedMember.avatar || existing.avatar || ''
            };
            await setDoc(doc(db, 'members', docSnap.id), recordToSave);
            isFirst = false;
          } else {
            await deleteDoc(doc(db, 'members', docSnap.id));
          }
        }
      } else {
        const newDocId = sanitizedMember.id;
        await setDoc(doc(db, 'members', newDocId), sanitizedMember);
      }

      await syncToPostgres('sync-member', 'POST', sanitizedMember);
    } catch (err) {
      console.warn("Firestore member invite write warning:", err);
    }

    const inviteLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || '',
      userName: user?.name || user?.email?.split('@')[0] || 'User',
      action: `Dispatched tenancy invitation to ${sanitizedMember.email}`,
      timestamp: 'Just now'
    };
    try {
      await setDoc(doc(db, 'activities', inviteLog.id), inviteLog);
      await syncToPostgres('sync-activity', 'POST', inviteLog);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `activities/${inviteLog.id}`);
    }
  };

  // Delete user from group workspace
  const handleDeleteMember = async (id: string, email: string) => {
    const emailLower = (email || '').toLowerCase().trim();

    // Optimistically update local members state & localStorage
    setMembers(prev => {
      const updated = prev.filter(m => m.id !== id && m.email.toLowerCase().trim() !== emailLower);
      try {
        localStorage.setItem('app_team_members', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      if (id) {
        await deleteDoc(doc(db, 'members', id)).catch(() => {});
        await deleteDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'members', id)).catch(() => {});
      }

      if (emailLower) {
        const q = query(collection(db, 'members'), where('email', '==', emailLower));
        const querySnap = await getDocs(q).catch(() => null);
        if (querySnap) {
          for (const docSnap of querySnap.docs) {
            await deleteDoc(doc(db, 'members', docSnap.id)).catch(() => {});
          }
        }

        const orgMembersQ = query(collection(db, 'organizations', DEFAULT_ORG_ID, 'members'), where('email', '==', emailLower));
        const orgMembersSnap = await getDocs(orgMembersQ).catch(() => null);
        if (orgMembersSnap) {
          for (const docSnap of orgMembersSnap.docs) {
            await deleteDoc(doc(db, 'organizations', DEFAULT_ORG_ID, 'members', docSnap.id)).catch(() => {});
          }
        }
      }

      await syncToPostgres(`delete-member/${id}`, 'DELETE').catch(() => {});
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `members/${id}`);
    }

    const deleteLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || '',
      userName: user?.name || user?.email?.split('@')[0] || 'User',
      action: `Deleted workspace member ${email}`,
      timestamp: 'Just now'
    };
    try {
      await setDoc(doc(db, 'activities', deleteLog.id), deleteLog);
      await syncToPostgres('sync-activity', 'POST', deleteLog);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `activities/${deleteLog.id}`);
    }

    // If currently logged-in user email was deleted, evict session immediately
    if (user?.email.toLowerCase() === emailLower) {
      setSecurityAlert({
        title: 'Account Deleted',
        message: `Your workspace account (${email}) has been deleted by the owner. You have been signed out.`
      });
      handleLogout();
    }
  };

  // Toggle member logging access (Allow vs Deny sign-in access)
  const handleToggleMemberAccess = async (id: string, email: string, accessDenied: boolean) => {
    const emailLower = (email || '').toLowerCase().trim();
    const targetMember = members.find(m => m.id === id || m.email.toLowerCase().trim() === emailLower);
    if (!targetMember) return;

    const updatedMember: TeamMember = {
      id: targetMember.id,
      name: targetMember.name,
      email: emailLower,
      role: targetMember.role || 'Editor',
      status: accessDenied ? 'denied' : 'active',
      avatar: targetMember.avatar || '',
      accessDenied: accessDenied,
      deniedAt: accessDenied ? new Date().toISOString() : undefined,
      deniedBy: accessDenied ? (user?.email || 'admin') : undefined
    };

    // Optimistically update local members state & localStorage
    setMembers(prev => {
      const updated = prev.map(m => (m.id === id || m.email.toLowerCase().trim() === emailLower) ? updatedMember : m);
      try {
        localStorage.setItem('app_team_members', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      if (id) {
        await setDoc(doc(db, 'members', id), updatedMember);
      }

      if (emailLower) {
        const q = query(collection(db, 'members'), where('email', '==', emailLower));
        const querySnap = await getDocs(q);
        for (const docSnap of querySnap.docs) {
          await setDoc(doc(db, 'members', docSnap.id), updatedMember);
        }
      }

      await syncToPostgres('sync-member', 'POST', updatedMember);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `members/${id}`);
    }

    const logAction = accessDenied
      ? `Revoked / Denied login access for ${email}`
      : `Restored / Allowed login access for ${email}`;

    const accessLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || '',
      userName: user?.name || user?.email?.split('@')[0] || 'User',
      action: logAction,
      timestamp: 'Just now'
    };

    try {
      await setDoc(doc(db, 'activities', accessLog.id), accessLog);
      await syncToPostgres('sync-activity', 'POST', accessLog);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `activities/${accessLog.id}`);
    }

    // If currently logged-in user email was denied, evict session immediately
    if (user?.email.toLowerCase() === email.toLowerCase() && accessDenied) {
      setSecurityAlert({
        title: 'Access Revoked',
        message: `Your login permissions for ${email} have been revoked by the workspace owner. You will now be signed out.`
      });
      handleLogout();
    }
  };

  // Switch active user persona for multi-user session testing with security checks
  const handleSwitchActiveUser = (member: TeamMember) => {
    // Check if target member has access denied
    if (member.status === 'denied' || member.accessDenied) {
      setSecurityAlert({
        title: 'Access Denied: Login Revoked',
        message: `Security Protocol Active: Logging access for '${member.email}' has been revoked / denied by the workspace owner (nyikulibramwel@gmail.com). Access to the application is blocked.`
      });
      return;
    }

    const isTargetProtected = PROTECTED_ADMIN_EMAILS.some(
      e => e.toLowerCase() === member.email.toLowerCase().trim()
    );

    // Get active authenticated session email (firebase authenticated user or active session)
    const activeAuthEmail = firebaseUser?.email || user?.email || '';
    const isSessionAuthorized = PROTECTED_ADMIN_EMAILS.some(
      e => e.toLowerCase() === activeAuthEmail.toLowerCase().trim()
    );

    if (!isSessionAuthorized) {
      setSecurityAlert({
        title: 'Access Restricted: Persona Switcher',
        message: `Security Protocol Active: Persona switching is strictly restricted to workspace owners. Non-owner accounts cannot test or switch active email sessions.`
      });
      return;
    }

    setUser({
      uid: member.id || firebaseUser?.uid || '',
      email: member.email,
      role: member.role,
      name: member.name,
      avatar: member.avatar
    });
    if (member.avatar) {
      localStorage.setItem('user_profile_avatar', member.avatar);
    }
    if (member.name) {
      localStorage.setItem('user_profile_name', member.name);
    }
  };

  // Profile Picture Upload and Account Sync handler
  const handleSaveProfile = async (updated: { name?: string; avatar?: string }) => {
    const newAvatar = updated.avatar || user?.avatar || localStorage.getItem('user_profile_avatar') || '';
    const newName = updated.name || user?.name || user?.email.split('@')[0] || 'User';

    localStorage.setItem('user_profile_avatar', newAvatar);
    localStorage.setItem('user_profile_name', newName);

    setUser(prev => prev ? { ...prev, name: newName, avatar: newAvatar } : null);

    // Sync with members array
    if (user?.email) {
      setMembers(prevMembers => prevMembers.map(m => {
        if (m.email.toLowerCase() === user.email.toLowerCase()) {
          return {
            ...m,
            name: newName,
            avatar: newAvatar
          };
        }
        return m;
      }));
    }

    // Append activity log
    const profileLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || '',
      userName: newName,
      action: 'Updated profile picture photo & account avatar',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setActivities(prev => [profileLog, ...prev]);

    // Save to Firestore if available
    const activeUid = firebaseUser?.uid || auth.currentUser?.uid;
    if (activeUid) {
      try {
        const userRef = doc(db, 'users', activeUid);
        await setDoc(userRef, {
          name: newName,
          avatar: newAvatar
        }, { merge: true });
      } catch (err) {
        console.warn("Firestore profile avatar sync fallback:", err);
      }
    }
  };

  // Sync user and API settings to Firestore and backend Postgres database
  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('app_system_settings', JSON.stringify(newSettings));
    } catch (e) {}

    const activeUid = firebaseUser?.uid || auth.currentUser?.uid;
    if (activeUid) {
      try {
        const userRef = doc(db, 'users', activeUid);
        await setDoc(userRef, { settings: newSettings }, { merge: true });
      } catch (err) {
        console.warn("Firestore settings sync fallback:", err);
      }
    }

    try {
      await syncToPostgres('settings', 'POST', newSettings);
    } catch (err) {
      console.warn("Postgres settings sync fallback:", err);
    }
  };

  const handleAddNewActivity = async (actionText: string) => {
    const newLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || '',
      userName: user?.name || user?.email?.split('@')[0] || 'User',
      action: actionText,
      timestamp: 'Just now'
    };
    try {
      await setDoc(doc(db, 'activities', newLog.id), newLog);
      await syncToPostgres('sync-activity', 'POST', newLog);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `activities/${newLog.id}`);
    }
  };

  const handleClearActivities = async () => {
    try {
      for (const act of activities) {
        await deleteDoc(doc(db, 'activities', act.id));
        await syncToPostgres(`delete-activity/${act.id}`, 'DELETE').catch(() => {});
      }
    } catch (err) {
      console.error("Error clearing activities:", err);
    }
    setActivities([]);
  };

  const handleClearChat = () => {
    setChatMessages([
      { 
        id: 'm-init', 
        role: 'assistant', 
        content: 'Greetings! I am ready to analyze your CSV datasets and guide you through data hygiene and compliance validation. Upload a CSV file to get started.', 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }
    ]);
  };

  const handlePurgeInactiveFiles = async () => {
    const inactiveFiles = files.filter(f => f.id !== activeFileId);
    console.log(`[SYNC] Explicit mutation: Purge ${inactiveFiles.length} inactive dataset(s)`);
    for (const file of inactiveFiles) {
      deleteFileFromStorage(file.id);
      try {
        console.log(`[SYNC] Firestore delete: files/${file.id}`);
        await deleteDoc(doc(db, 'files', file.id));
        await syncToPostgres(`delete-file/${file.id}`, 'DELETE').catch(() => {});
      } catch (err) {
        console.error(`Error purging file ${file.name}:`, err);
      }
    }

    if (firebaseUser?.uid) {
      bumpUserSyncVersion({
        uid: firebaseUser.uid,
        workspaceVersion: true,
        activeWorkspaceId: activeWorkspaceId || DEFAULT_ORG_ID,
        sessionId,
        reason: 'purge_inactive_files'
      });
    }

    setFiles(prev => {
      const remaining = prev.filter(f => f.id === activeFileId);
      saveFilesToStorage(remaining);
      return remaining;
    });
  };


  // Dispatch prompt context to full-stack backend with RAG Knowledge Base and rich dataset context
  const handleSendChatMessage = async (
    msgContent: string, 
    model: string = 'gemini-3.7-flash', 
    persona: string = 'auditor',
    image: { data: string; mimeType: string } | null = null,
    thinkingMode: boolean = false,
    enableSearchGrounding: boolean = false,
    knowledgeBaseId?: string,
    explicitAgent?: string
  ) => {
    const isOwner = !user || user?.role === 'Owner' || user?.role === 'Admin' || (user?.email?.toLowerCase().trim() === 'nyikulibramwel@gmail.com');
    if (!isOwner) {
      const earlyAccessNotice: ChatMessage = {
        id: `msg-ai-notice-${Date.now()}`,
        role: 'assistant',
        content: 'Artificial Intelligence features (Conversational Auditor, Autonomous Multi-Agent Forensics, and 1-Click Anomaly Remediation) are currently active in Early Access exclusively for the Workspace Owner (nyikulibramwel@gmail.com). Team-wide multi-seat AI capability is coming soon for all non-owner roles.',
        timestamp: formatTime(new Date()),
        citations: [{ type: 'product', label: 'Coming Soon • Multi-Seat AI' }]
      };
      setChatMessages(prev => [...prev, earlyAccessNotice]);
      return;
    }

    const userMsg: ChatMessage = {
      id: `msg-usr-${Date.now()}`,
      role: 'user',
      content: msgContent,
      timestamp: formatTime(new Date())
    };

    const initialCitations: Array<{ type: string; label: string; url?: string }> = [
      { type: 'product', label: 'CSV Auditor Pro Enterprise Engine' },
      { type: 'doc', label: 'Orchestrating Specialist Agents...' }
    ];

    if (enableSearchGrounding) {
      initialCitations.push({ type: 'web', label: 'Google Search Fact-Checking' });
    }

    const aiThinkingMsg: ChatMessage = {
      id: `msg-ai-think-${Date.now()}`,
      role: 'assistant',
      content: enableSearchGrounding ? 'Performing Google Search fact-checking & orchestrating specialist agents...' : 'Orchestrating enterprise specialist agents & gathering audit evidence...',
      timestamp: formatTime(new Date()),
      citations: initialCitations
    };

    // Capture current message history before state updates
    const historyToSend = chatMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Update state with user message and thinking status
    setChatMessages(prev => [...prev, userMsg, aiThinkingMsg]);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: msgContent,
          history: historyToSend,
          model: model,
          persona: persona,
          image: image,
          thinkingMode: thinkingMode,
          enableSearchGrounding: enableSearchGrounding,
          knowledgeBaseId: knowledgeBaseId,
          explicitAgent: explicitAgent,
          userContext: {
            uid: user?.uid,
            email: user?.email,
            name: user?.name || user?.email?.split('@')[0] || 'User',
            role: 'Admin',
            workspaceName: 'CSV Auditor Pro Workspace',
            teamMembersCount: members?.length || 1
          },
          fileContext: activeFile ? {
            id: activeFile.id,
            name: activeFile.name,
            fileName: activeFile.name,
            headers: activeFile.headers || (activeFile.rows.length > 0 ? Object.keys(activeFile.rows[0]) : []),
            rows: activeFile.rows.slice(0, 300),
            rowCount: activeFile.rows.length,
            issues: activeFile.issues,
            issuesCount: activeFile.issues.length,
            score: activeFile.score,
            duplicatesCount: activeFile.issues.filter(i => i.type === 'duplicate').length,
            missingValuesCount: activeFile.issues.filter(i => i.type === 'missing_value').length,
            formatErrorsCount: activeFile.issues.filter(i => i.type === 'invalid_format').length,
            outliersCount: activeFile.issues.filter(i => i.type === 'outlier').length
          } : null
        })
      });

      if (!response.ok || !response.body) throw new Error('API server unavailable or stream error');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let currentCitations: any[] = aiThinkingMsg.citations || [];
      let retrievedDocs: string[] = [];
      let intent = '';
      let intentCategory: any = undefined;
      let confidenceScore: number | undefined = undefined;
      let confidenceDetails: any = undefined;
      let riskAssessment: any = undefined;
      let recommendations: any[] | undefined = undefined;
      let proactiveInsights: any[] | undefined = undefined;
      let explainability: any = undefined;
      let followUpSuggestions: any[] | undefined = undefined;
      let executiveReport: any = undefined;
      let executedTools: string[] = [];
      let reasoning: string | undefined = undefined;
      let activeAgent: string | undefined = undefined;
      let activeAgentName: string | undefined = undefined;
      let activeAgentTitle: string | undefined = undefined;
      let collaboratingAgents: Array<{ id: string; name: string; role: string }> | undefined = undefined;
      let isCompoundQuery: boolean | undefined = undefined;
      let routingRationale: string | undefined = undefined;
      let evidenceCollected: any[] | undefined = undefined;
      let sseBuffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'meta') {
              if (parsed.citations) currentCitations = parsed.citations;
              if (parsed.retrievedDocs) retrievedDocs = parsed.retrievedDocs;
              if (parsed.intent) intent = parsed.intent;
              if (parsed.intentCategory) intentCategory = parsed.intentCategory;
              if (parsed.confidenceScore) confidenceScore = parsed.confidenceScore;
              if (parsed.confidenceDetails) confidenceDetails = parsed.confidenceDetails;
              if (parsed.riskAssessment) riskAssessment = parsed.riskAssessment;
              if (parsed.recommendations) recommendations = parsed.recommendations;
              if (parsed.proactiveInsights) proactiveInsights = parsed.proactiveInsights;
              if (parsed.explainability) explainability = parsed.explainability;
              if (parsed.followUpSuggestions) followUpSuggestions = parsed.followUpSuggestions;
              if (parsed.executiveReport) executiveReport = parsed.executiveReport;
              if (parsed.executedTools) executedTools = parsed.executedTools;
              if (parsed.reasoning) reasoning = parsed.reasoning;
              if (parsed.activeAgent) activeAgent = parsed.activeAgent;
              if (parsed.activeAgentName) activeAgentName = parsed.activeAgentName;
              if (parsed.activeAgentTitle) activeAgentTitle = parsed.activeAgentTitle;
              if (parsed.collaboratingAgents) collaboratingAgents = parsed.collaboratingAgents;
              if (parsed.isCompoundQuery !== undefined) isCompoundQuery = parsed.isCompoundQuery;
              if (parsed.routingRationale) routingRationale = parsed.routingRationale;
              if (parsed.evidenceCollected) evidenceCollected = parsed.evidenceCollected;
            } else if (parsed.type === 'chunk' && parsed.text) {
              accumulatedText += parsed.text;
            } else if (parsed.type === 'error') {
              throw new Error(parsed.error || 'Stream error');
            }

            setChatMessages(prev => prev.map(m => 
              m.id === aiThinkingMsg.id 
                ? { 
                    ...m, 
                    content: accumulatedText || m.content, 
                    citations: currentCitations,
                    retrievedDocs: retrievedDocs,
                    intent: intent,
                    intentCategory,
                    confidenceScore,
                    confidenceDetails,
                    riskAssessment,
                    recommendations,
                    proactiveInsights,
                    explainability,
                    followUpSuggestions,
                    executiveReport,
                    executedTools,
                    reasoning,
                    activeAgent,
                    activeAgentName,
                    activeAgentTitle,
                    collaboratingAgents,
                    isCompoundQuery,
                    routingRationale,
                    evidenceCollected,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                  }
                : m
            ));
          } catch (e) {
            console.warn('Error parsing stream event:', e);
          }
        }
      }

      // Handle any leftover trailing data in buffer
      if (sseBuffer.trim().startsWith('data:')) {
        const jsonStr = sseBuffer.trim().slice(5).trim();
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'chunk' && parsed.text) {
              accumulatedText += parsed.text;
              setChatMessages(prev => prev.map(m => 
                m.id === aiThinkingMsg.id ? { ...m, content: accumulatedText } : m
              ));
            }
          } catch (e) {}
        }
      }
    } catch (err: any) {
      // Deterministic calculation fallback if Gemini stream is interrupted
      let fallbackText = "Audit query processed.";
      if (activeFile && activeFile.rows && activeFile.rows.length > 0) {
        try {
          const profile = CSVProfilingEngine.profileDataset(activeFile.rows, activeFile.headers || []);
          const { routePlan, results } = AnalysisRouter.planAndExecute(msgContent, activeFile.rows, activeFile.headers || [], profile);
          
          if (results.aggregation) {
            const agg = results.aggregation;
            fallbackText = `Calculated ${agg.operation.toUpperCase()} for column "${agg.targetColumn}": ${agg.overallTotal !== undefined ? agg.overallTotal.toLocaleString() : (agg.overallMean !== undefined ? agg.overallMean.toFixed(2) : 'N/A')}.\n\nEvaluated across ${agg.sampleSize.toLocaleString()} records in "${activeFile.name}".`;
          } else if (results.ranking) {
            const rk = results.ranking;
            fallbackText = `Top ${rk.items.length} records by "${rk.metricColumn}":\n` + 
              rk.items.map((it: any) => `${it.rank}. ${it.key}: ${it.value.toLocaleString()}`).join('\n');
          } else {
            fallbackText = `Dataset "${activeFile.name}" contains ${activeFile.rows.length.toLocaleString()} rows, score ${activeFile.score}/100, with ${activeFile.issues.length} detected issues.`;
          }
        } catch (calcErr) {
          fallbackText = `Analysis complete for ${activeFile.name} (${activeFile.rows.length} rows evaluated).`;
        }
      } else {
        fallbackText = "Please upload or select a CSV dataset to execute auditor queries.";
      }

      setChatMessages(prev => prev.map(m => 
        m.id === aiThinkingMsg.id 
          ? { 
              ...m, 
              content: fallbackText, 
              citations: [
                { type: 'dataset', label: activeFile?.name || 'Local Dataset' },
                { type: 'system', label: 'Deterministic Engine' }
              ],
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            }
          : m
      ));
    }
  };

  // Nav helper for internal tab redirection
  const handleNavigateTab = (tab: string) => {
    setActiveTab(tab);
    navigate(`/${tab}`);
  };

  // Select file from history to set as active in workspace
  const handleSelectActiveFile = (file: CSVFile) => {
    const foundIdx = files.findIndex(f => f.id === file.id);
    if (foundIdx !== -1) {
      setActiveFileIndex(foundIdx);
      setActiveFileId(file.id);
    }
  };

  // Full-screen loading protection during initial auth initialization or account switching profile fetch
  if (authLoading || !user || !firebaseUser || user.uid !== firebaseUser.uid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-6 select-none">
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <div className="absolute w-8 h-8 rounded-full bg-blue-600/30 animate-ping" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-bold text-slate-300 tracking-wide uppercase">CSV Auditor Pro</span>
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-slate-100 text-center">
          Loading Account Profile & Workspace Session
        </h3>
        <p className="text-xs text-slate-400 mt-1 text-center max-w-sm">
          Securing tenant isolation and validating profile credentials...
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`min-h-screen w-full max-w-full overflow-x-hidden font-sans transition-colors duration-500 ease-in-out ${isDarkMode ? 'bg-[#0b0f19] text-slate-100' : 'bg-[#F8FAFC] text-[#1E293B]'}`}
    >
      {/* Network Resilience Full-Screen Recovery Overlay */}
      <NetworkOfflineOverlay 
        isOffline={!isOnline}
        isReconnecting={isReconnecting}
        reconnectAttempts={reconnectAttempts}
        onRetry={() => triggerManualRetry()}
        onReturnToDashboard={() => handleNavigateTab('dashboard')}
        cachedFiles={files}
        onSelectRecentProject={(fileId) => setActiveFileId(fileId)}
        isDarkMode={isDarkMode}
      />

      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
          
          {/* Mobile Drawer Backdrop Overlay */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="fixed inset-0 h-screen h-dvh w-screen w-dvh bg-slate-950/60 backdrop-blur-md z-40 md:hidden touch-none"
                />
                
                <motion.aside 
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] h-screen h-dvh z-50 p-5 flex flex-col justify-between md:hidden shadow-2xl overflow-y-auto ${
                    isDarkMode 
                      ? 'bg-[#1F2937] border-r border-[#374151] text-[#F9FAFB]' 
                      : 'bg-[#FFFFFF] border-r border-[#E5E7EB] text-[#111827]'
                  }`}
                  aria-label="Mobile Navigation"
                  role="navigation"
                >
                  <div className="space-y-6">
                    {/* Brand with Close Trigger */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#374151] dark:border-[#374151] border-[#E5E7EB]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
                          <FileSpreadsheet className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h2 className={`font-bold text-sm tracking-tight ${isDarkMode ? 'text-[#F9FAFB]' : 'text-[#111827]'}`}>Auditor Pro</h2>
                          <span className={`text-[9px] block font-bold tracking-wider ${isDarkMode ? 'text-[#D1D5DB]' : 'text-[#4B5563]'}`}>WORKSPACE LEVEL</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Close mobile navigation menu"
                        className={`p-1.5 rounded-[10px] cursor-pointer transition-colors ${
                          isDarkMode 
                            ? 'bg-[#374151] text-[#F9FAFB] hover:bg-slate-700' 
                            : 'bg-[#F3F4F6] text-[#111827] hover:bg-slate-200'
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Mapped Active File Miniature Gauge */}
                    {activeFile && renderActiveFileGauge(activeFile, false)}

                    {/* Mobile Navigation Tabs Stack */}
                    <nav className="space-y-1.5">
                      {[
                        { id: 'dashboard', label: 'Dashboard Home', icon: BarChart3 },
                        { id: 'upload', label: 'Upload Center', icon: Upload },
                        { id: 'schema', label: 'Schema Validator', icon: ShieldCheck },
                        { id: 'results', label: 'Audit Findings', icon: Sparkles, badge: activeFile ? activeFile.issues.length : 0 },
                        { id: 'clean', label: 'Hygiene Workspace', icon: Trash2 },
                        { 
                          id: 'insights', 
                          label: 'AI Intelligence', 
                          icon: MessageSquare, 
                          badgeText: !(user?.role === 'Owner' || (user?.email?.toLowerCase().trim() === 'nyikulibramwel@gmail.com')) ? 'Coming Soon' : undefined 
                        },
                        { id: 'gmail', label: 'Email Compliance', icon: Mail },
                        { id: 'reports', label: 'Branded Reports', icon: FileText },
                        { id: 'history', label: 'File Archive', icon: History },
                        { id: 'team', label: 'Team Tenancy', icon: Users, badge: teamUnreadCount },
                        ...(user?.role === 'Admin' || user?.role === 'Owner' ? [{ id: 'admin', label: 'Admin Panel', icon: Lock }] : []),
                        { id: 'settings', label: 'API & settings', icon: Settings }
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setActiveTab(tab.id);
                              setMobileMenuOpen(false);
                            }}
                            aria-current={isActive ? 'page' : undefined}
                            className={`w-full px-3 py-2.5 rounded-[10px] text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                              isActive 
                                ? 'bg-[#2563EB] text-[#FFFFFF] font-bold shadow-sm' 
                                : isDarkMode 
                                  ? 'text-[#F9FAFB] hover:bg-[#374151]' 
                                  : 'text-[#111827] hover:bg-[#F3F4F6]'
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <Icon className={`w-4 h-4 shrink-0 ${
                                isActive 
                                  ? 'text-[#FFFFFF]' 
                                  : isDarkMode 
                                    ? 'text-[#D1D5DB]' 
                                    : 'text-[#6B7280]'
                              }`} />
                              <span>{tab.label}</span>
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {tab.badgeText && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FEF3C7] text-[#B45309] dark:bg-[#78350F]/50 dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#92400E]">
                                  {tab.badgeText}
                                </span>
                              )}
                              {tab.badge !== undefined && tab.badge > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#2563EB] text-white">
                                  {tab.badge}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Mobile Logout Panel */}
                  <div className={`pt-4 border-t ${isDarkMode ? 'border-[#374151]' : 'border-[#E5E7EB]'}`}>
                    <button 
                      onClick={() => setProfileModalOpen(true)}
                      className={`w-full flex items-center gap-3 mb-3 text-xs text-left p-2 rounded-[10px] transition-colors group cursor-pointer ${
                        isDarkMode ? 'hover:bg-[#374151]' : 'hover:bg-[#F3F4F6]'
                      }`}
                    >
                      <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-blue-500/40 shrink-0">
                        <img src={user?.avatar || '/macbook_code.jpg'} alt={user?.name || "User Profile"} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`font-bold block truncate max-w-[120px] ${isDarkMode ? 'text-[#F9FAFB]' : 'text-[#111827]'}`}>
                          {user?.name || user?.email || 'nyikulibramwel@gmail.com'}
                        </span>
                        <span className={`text-[9px] block font-mono font-bold uppercase ${isDarkMode ? 'text-[#D1D5DB]' : 'text-[#4B5563]'}`}>
                          {user?.role || 'Owner'} • Edit Avatar
                        </span>
                      </div>
                    </button>
                    <button 
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full py-2.5 rounded-[10px] border text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                        isDarkMode 
                          ? 'border-[#374151] text-[#D1D5DB] hover:bg-[#374151] hover:text-[#F9FAFB]' 
                          : 'border-[#E5E7EB] text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5" /> Logout Session
                    </button>
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
          
          {/* Left Collapsing Desktop Navigation Sidebar */}
          <motion.aside 
            initial={{ opacity: 0, x: -16 }}
            animate={{ 
              opacity: 1, 
              x: 0,
              width: isSidebarCollapsed ? 72 : (settings.themeCustomization?.sidebarWidth === 'compact' ? 208 : settings.themeCustomization?.sidebarWidth === 'expanded' ? 288 : 256)
            }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`border-r hidden md:flex flex-col justify-between shrink-0 transition-colors duration-200 overflow-x-hidden ${
              isSidebarCollapsed ? 'p-3' : 'p-4'
            } ${
              isDarkMode 
                ? 'bg-[#1F2937] border-[#374151] text-[#F9FAFB]' 
                : 'bg-[#FFFFFF] border-[#E5E7EB] text-[#111827]'
            }`}
            aria-label="Main Navigation"
            role="navigation"
            aria-expanded={!isSidebarCollapsed}
          >
            <div className="space-y-5">
              
              {/* Branding Header & Collapse Toggle */}
              {isSidebarCollapsed ? (
                <div className="flex flex-col items-center gap-3.5 w-full pb-2 border-b border-[#374151] dark:border-[#374151] border-[#E5E7EB]">
                  <div 
                    onClick={toggleSidebarCollapse}
                    title="Click to expand navigation sidebar (Alt + [)"
                    className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center text-white shrink-0 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <button
                    onClick={toggleSidebarCollapse}
                    aria-label="Expand navigation sidebar"
                    title="Expand Navigation Sidebar (Alt + [)"
                    className={`p-1.5 rounded-[10px] cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-[#374151] text-[#F9FAFB] hover:bg-slate-700' 
                        : 'bg-[#F3F4F6] text-[#111827] hover:bg-slate-200'
                    }`}
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between pb-2 border-b border-[#374151] dark:border-[#374151] border-[#E5E7EB]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
                      <FileSpreadsheet className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 truncate">
                      <h2 className={`font-bold text-sm tracking-tight truncate ${isDarkMode ? 'text-[#F9FAFB]' : 'text-[#111827]'}`}>Auditor Pro</h2>
                      <span className={`text-[9px] block font-bold tracking-wider truncate ${isDarkMode ? 'text-[#D1D5DB]' : 'text-[#4B5563]'}`}>WORKSPACE LEVEL</span>
                    </div>
                  </div>
                  <button
                    onClick={toggleSidebarCollapse}
                    aria-label="Collapse navigation sidebar"
                    title="Collapse Navigation Sidebar (Alt + [)"
                    className={`p-1.5 rounded-[10px] cursor-pointer transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-[#374151] text-[#F9FAFB] hover:bg-slate-700' 
                        : 'bg-[#F3F4F6] text-[#111827] hover:bg-slate-200'
                    }`}
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Mapped Active File Miniature Gauge */}
              {activeFile && renderActiveFileGauge(activeFile, isSidebarCollapsed)}

              {/* Navigation Tabs Stack */}
              <nav className="space-y-1.5">
                {[
                  { id: 'dashboard', label: 'Dashboard Home', icon: BarChart3, shortcut: 'Alt+D' },
                  { id: 'upload', label: 'Upload Center', icon: Upload, shortcut: 'Alt+U' },
                  { id: 'schema', label: 'Schema Validator', icon: ShieldCheck, shortcut: 'Alt+S' },
                  { id: 'results', label: 'Audit Findings', icon: Sparkles, badge: activeFile ? activeFile.issues.length : 0, shortcut: 'Alt+R' },
                  { id: 'clean', label: 'Hygiene Workspace', icon: Trash2, shortcut: 'Alt+C' },
                  { 
                    id: 'insights', 
                    label: 'AI Intelligence', 
                    icon: MessageSquare, 
                    badgeText: !(user?.role === 'Owner' || (user?.email?.toLowerCase().trim() === 'nyikulibramwel@gmail.com')) ? 'Coming Soon' : undefined,
                    shortcut: 'Alt+I' 
                  },
                  { id: 'gmail', label: 'Email Compliance', icon: Mail, shortcut: 'Alt+G' },
                  { id: 'reports', label: 'Branded Reports', icon: FileText, shortcut: 'Alt+P' },
                  { id: 'history', label: 'File Archive', icon: History, shortcut: 'Alt+H' },
                  { id: 'team', label: 'Team Tenancy', icon: Users, badge: teamUnreadCount, shortcut: 'Alt+T' },
                  // Admin panel toggleable
                  ...(user?.role === 'Admin' || user?.role === 'Owner' ? [{ id: 'admin', label: 'Admin Panel', icon: Lock, shortcut: 'Alt+A' }] : []),
                  { id: 'settings', label: 'API & settings', icon: Settings, shortcut: 'Alt+O' }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  if (isSidebarCollapsed) {
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-10 h-10 mx-auto rounded-[10px] flex items-center justify-center relative cursor-pointer group transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          isActive 
                            ? 'bg-[#2563EB] text-[#FFFFFF] font-bold shadow-sm' 
                            : isDarkMode 
                              ? 'text-[#D1D5DB] hover:bg-[#374151] hover:text-[#F9FAFB]' 
                              : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
                        }`}
                        title={`${tab.label}${tab.badgeText ? ` (${tab.badgeText})` : ''} (${tab.shortcut})`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive 
                            ? 'text-[#FFFFFF]' 
                            : isDarkMode 
                              ? 'text-[#D1D5DB] group-hover:text-[#F9FAFB]' 
                              : 'text-[#6B7280] group-hover:text-[#111827]'
                        }`} />
                        {tab.badge !== undefined && tab.badge > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-[#2563EB] text-white flex items-center justify-center border border-white dark:border-[#1F2937]">
                            {tab.badge > 9 ? '9+' : tab.badge}
                          </span>
                        )}
                        {tab.badgeText && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#D97706] border border-white dark:border-[#1F2937]" />
                        )}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full px-3 py-2.5 rounded-[10px] text-xs font-medium flex items-center justify-between transition-colors cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isActive 
                          ? 'bg-[#2563EB] text-[#FFFFFF] font-bold shadow-sm' 
                          : isDarkMode 
                            ? 'text-[#F9FAFB] hover:bg-[#374151]' 
                            : 'text-[#111827] hover:bg-[#F3F4F6]'
                      }`}
                      title={`Navigate to ${tab.label} (${tab.shortcut})`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive 
                            ? 'text-[#FFFFFF]' 
                            : isDarkMode 
                              ? 'text-[#D1D5DB] group-hover:text-[#F9FAFB]' 
                              : 'text-[#6B7280] group-hover:text-[#111827]'
                        }`} />
                        <span className="truncate">{tab.label}</span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {tab.badgeText && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FEF3C7] text-[#B45309] dark:bg-[#78350F]/50 dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#92400E]">
                            {tab.badgeText}
                          </span>
                        )}
                        {tab.badge !== undefined && tab.badge > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#2563EB] text-white font-mono shrink-0">
                            {tab.badge}
                          </span>
                        )}
                        <span className={`text-[9px] font-mono font-semibold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          isDarkMode ? 'bg-[#374151] text-[#D1D5DB]' : 'bg-[#F3F4F6] text-[#4B5563]'
                        }`}>
                          {tab.shortcut}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </nav>

            </div>

            {/* Logout & Profile panel */}
            <div className={`pt-4 border-t ${isDarkMode ? 'border-[#374151]' : 'border-[#E5E7EB]'}`}>
              {isSidebarCollapsed ? (
                <div className="flex flex-col items-center gap-3">
                  <button 
                    onClick={() => setProfileModalOpen(true)}
                    className="w-9 h-9 rounded-full overflow-hidden border-2 border-blue-500/40 relative group cursor-pointer block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    title="Edit profile picture & account details"
                  >
                    <img src={user?.avatar || '/macbook_code.jpg'} alt={user?.name || "User Profile"} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                  </button>
                  <button 
                    onClick={handleLogout}
                    title="Logout Session"
                    aria-label="Logout session"
                    className={`w-10 h-10 rounded-[10px] border transition-colors flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isDarkMode 
                        ? 'border-[#374151] text-[#D1D5DB] hover:bg-[#374151] hover:text-[#F9FAFB]' 
                        : 'border-[#E5E7EB] text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setProfileModalOpen(true)}
                    className={`w-full flex items-center gap-3 mb-3 text-xs text-left p-2 rounded-[10px] transition-colors group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isDarkMode ? 'hover:bg-[#374151]' : 'hover:bg-[#F3F4F6]'
                    }`}
                    title="Click to edit profile picture & account details"
                  >
                    <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-blue-500/40 shrink-0">
                      <img src={user?.avatar || '/macbook_code.jpg'} alt={user?.name || "User Profile"} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Camera className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`font-bold block truncate max-w-[120px] ${isDarkMode ? 'text-[#F9FAFB]' : 'text-[#111827]'}`}>
                        {user?.name || user?.email?.split('@')[0] || 'Nyikuli B.'}
                      </span>
                      <span className={`text-[9px] block font-mono font-bold uppercase tracking-wider ${isDarkMode ? 'text-[#D1D5DB]' : 'text-[#4B5563]'}`}>
                        {user?.role || 'Owner'} • Edit Avatar
                      </span>
                    </div>
                  </button>
                  <button 
                    onClick={handleLogout}
                    className={`w-full py-2.5 rounded-[10px] border text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isDarkMode 
                        ? 'border-[#374151] text-[#D1D5DB] hover:bg-[#374151] hover:text-[#F9FAFB]' 
                        : 'border-[#E5E7EB] text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout Session
                  </button>
                </>
              )}
            </div>
          </motion.aside>

          {/* Right Workstation frame */}
          <motion.main 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden ${isDarkMode ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'}`}
          >
            {/* Trial Expiration Background Check Alert Banner */}
            {trialAlert && (
              <TrialExpirationBanner
                alert={trialAlert}
                isDarkMode={isDarkMode}
                onUpgrade={() => {
                  openPaddleCheckout('pro', user?.email || undefined);
                }}
                onDismiss={handleDismissTrialAlert}
              />
            )}

            {/* Non-Owner Team Invitation Alert Banner */}
            {pendingUserInvite && (
              <TeamInviteBanner
                invitation={pendingUserInvite}
                isDarkMode={isDarkMode}
                onAccept={(inv) => {
                  setAcceptInviteModalState({
                    isOpen: true,
                    prefilledToken: inv.token
                  });
                }}
                onDismiss={() => {
                  if (pendingUserInvite?.id) {
                    dismissBannerInvite(pendingUserInvite.id);
                  }
                  setDismissedInviteIds(prev => new Set([...prev, pendingUserInvite.id]));
                }}
              />
            )}

            {/* Top Workspace Header */}
            <WorkspaceHeader
              activeTab={activeTab}
              onNavigate={handleNavigateTab}
              onOpenMobileMenu={() => setMobileMenuOpen(true)}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={toggleSidebarCollapse}
              currentTime={currentTime}
              isDarkMode={isDarkMode}
              onToggleTheme={() => setIsDarkMode(!isDarkMode)}
              themeInspectorOpen={themeInspectorOpen}
              onToggleThemeInspector={() => setThemeInspectorOpen(!themeInspectorOpen)}
              onOpenTour={() => setTourModalOpen(true)}
              onOpenShortcuts={() => setShortcutsModalOpen(true)}
              onOpenProfile={() => setProfileModalOpen(true)}
              slotRequests={slotRequests}
              onApproveSlotRequest={handleApproveSlotRequest}
              onDeclineSlotRequest={handleDeclineSlotRequest}
              user={user}
              notifications={userNotifications}
              unreadNotificationCount={unreadNotificationCount}
              onMarkNotificationAsRead={handleMarkNotificationAsRead}
              onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
              onDismissNotification={handleDismissNotification}
              onClearAllNotifications={handleClearAllNotifications}
              onNotificationAction={handleNotificationAction}
              onOpenAcceptInviteModal={(prefilledToken) => setAcceptInviteModalState({ isOpen: true, prefilledToken: prefilledToken || '' })}
            />

            {/* Container for active view tabs */}
            <div ref={mainContentRef} onScroll={handleContentScroll} className="p-3 sm:p-6 flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full mx-auto max-w-7xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="w-full max-w-full overflow-x-hidden"
                >
                  <Suspense fallback={<LoadingSpinner message={`Loading visual components...`} />}>
                    {activeTab === 'dashboard' && (
                      <DashboardHome 
                        files={files}
                        activeFile={activeFile}
                        activities={activities}
                        onNavigate={handleNavigateTab}
                        onSelectFile={handleSelectActiveFile}
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                        slotRequests={slotRequests}
                        onApproveSlotRequest={handleApproveSlotRequest}
                        onDeclineSlotRequest={handleDeclineSlotRequest}
                        currentUserEmail={user?.email || ''}
                      />
                    )}

                    {activeTab === 'upload' && (
                      <UploadCenter 
                        onFileUpload={handleNewFileUpload}
                        files={files}
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                        userRole={user?.role || 'Owner'}
                      />
                    )}

                    {activeTab === 'schema' && (
                      <SchemaManager 
                        files={files}
                        activeFile={activeFile}
                        onSelectFile={handleSelectActiveFile}
                        onNavigate={handleNavigateTab}
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                      />
                    )}

                    {activeTab === 'results' && (
                      <AuditResults 
                        activeFile={activeFile}
                        allFiles={files}
                        onNavigate={handleNavigateTab}
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                        onUpdateFile={handleUpdateFile}
                        userRole={user?.role || 'Owner'}
                        logAuditActivity={(action) => handleAddNewActivity(action)}
                      />
                    )}

                    {activeTab === 'clean' && (
                      <CleaningCenter 
                        activeFile={activeFile}
                        files={files}
                        onUpdateFile={handleUpdateFile}
                        onUpdateFiles={handleUpdateFiles}
                        onSelectFile={handleSelectActiveFile}
                        onNavigate={handleNavigateTab}
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                        userRole={user?.role || 'Owner'}
                      />
                    )}

                    {activeTab === 'insights' && (
                      <InsightsCenter 
                        activeFile={activeFile}
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                        isOwner={!user || user?.role === 'Owner' || user?.role === 'Admin' || (user?.email?.toLowerCase().trim() === 'nyikulibramwel@gmail.com')}
                        userRole={user?.role || 'Owner'}
                        userEmail={user?.email || ''}
                        onNavigate={handleNavigateTab}
                      />
                    )}

                    {activeTab === 'gmail' && (
                      <GmailCenter 
                        activeFile={activeFile}
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                        onNavigate={handleNavigateTab}
                        onAddActivity={handleAddNewActivity}
                      />
                    )}

                    {activeTab === 'reports' && (
                      <ReportGen 
                        activeFile={activeFile}
                        onNavigate={handleNavigateTab}
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                        members={members}
                        settings={settings}
                        onUpdateSettings={(newSettings) => {
                          setSettings(prev => {
                            const updated = { ...prev, ...newSettings };
                            localStorage.setItem('app_system_settings', JSON.stringify(updated));
                            return updated;
                          });
                        }}
                      />
                    )}

                    {activeTab === 'history' && (
                      <AuditHistory 
                        files={files}
                        onSelectFile={handleSelectActiveFile}
                        onDeleteFile={handleDeleteFile}
                        onNavigate={handleNavigateTab}
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                      />
                    )}

                    {activeTab === 'team' && (
                      <TeamCollaboration 
                        members={members}
                        onInviteMember={handleInviteMember}
                        onDeleteMember={handleDeleteMember}
                        onUpdateMemberAccess={handleToggleMemberAccess}
                        activities={activities}
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                        currentUserEmail={user?.email || ''}
                        currentUserRole={user?.role}
                        onSwitchActiveUser={handleSwitchActiveUser}
                        slotRequests={slotRequests}
                        onApproveSlotRequest={handleApproveSlotRequest}
                        onDeclineSlotRequest={handleDeclineSlotRequest}
                        activeFileId={activeFileId}
                        activeFileName={activeFile?.name}
                      />
                    )}

                    {activeTab === 'settings' && (
                      <SettingsView 
                        settings={settings}
                        onUpdateSettings={handleUpdateSettings}
                        isDarkMode={isDarkMode}
                        toggleTheme={() => setIsDarkMode(!isDarkMode)}
                        accentClass={accentClass}
                        files={files}
                        activeFileId={activeFileId}
                        activities={activities}
                        chatMessages={chatMessages}
                        onClearActivities={handleClearActivities}
                        onClearChat={handleClearChat}
                        onPurgeInactiveFiles={handlePurgeInactiveFiles}
                        currentUser={user}
                        onOpenProfileModal={() => setProfileModalOpen(true)}
                      />
                    )}

                    {activeTab === 'admin' && (
                      <AdminPanel 
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                        currentUserEmail={user?.email || ''}
                        currentUserRole={user?.role}
                        activities={activities}
                      />
                    )}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Custom High Density Footer */}
            <footer className={`mt-auto border-t px-3 sm:px-6 py-3.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest shrink-0 max-w-full overflow-x-hidden ${isDarkMode ? 'bg-[#0f172a] border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>
              <div>&copy; 2026 CSV Auditor Pro Inc.</div>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="border-r border-slate-300 dark:border-slate-800 pr-3 sm:pr-4">
                  <SocialLinksGroup isDarkMode={isDarkMode} iconSize={15} className="flex items-center gap-1.5 sm:gap-2.5" />
                </div>
                <div className="flex gap-4 sm:gap-6">
                  <button onClick={() => setActiveTab('settings')} className="hover:text-blue-500 transition-colors uppercase cursor-pointer">API Documentation</button>
                  <button onClick={() => setActiveTab('settings')} className="hover:text-blue-500 transition-colors uppercase cursor-pointer">Terms of Service</button>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Status: Operational</span>
                </div>
              </div>
            </footer>
          </motion.main>

        </div>

      {/* Keyboard Shortcuts Guide Modal */}
      <KeyboardShortcutsModal 
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
        onNavigate={(tabId) => setActiveTab(tabId)}
        onToggleTheme={handleToggleTheme}
        onOpenProfileUpload={() => setProfileModalOpen(true)}
        isDarkMode={isDarkMode}
        isAdmin={user?.role === 'Admin' || user?.role === 'Owner'}
      />

      {/* Interactive Onboarding Tour Overlay Modal */}
      <OnboardingTourModal
        isOpen={tourModalOpen}
        onClose={() => setTourModalOpen(false)}
        onNavigateTab={(tabId) => setActiveTab(tabId)}
        isDarkMode={isDarkMode}
      />

      {/* Floating Keyboard Shortcut Notification Toast */}
      <AnimatePresence>
        {shortcutToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900/90 text-white shadow-xl border border-slate-700/80 backdrop-blur-md flex items-center gap-3"
          >
            <div className="p-1 rounded-md bg-blue-500/20 text-blue-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-slate-100">{shortcutToast.message}</span>
              <span className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700 font-bold">
                {shortcutToast.keyCombo}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Picture Upload Modal */}
      <ProfileUploadModal 
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        currentUser={user}
        onSaveProfile={handleSaveProfile}
        isDarkMode={isDarkMode}
        accentClass={accentClass}
      />

      {/* Theme & Accessibility Inspector Developer Tool */}
      <ThemeInspector 
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        isOpen={themeInspectorOpen}
        onClose={() => setThemeInspectorOpen(false)}
      />

      {/* Cookie Consent & Preferences Inspector Control */}
      <CookieBanner 
        isDarkMode={isDarkMode} 
        accentClass={accentClass}
        onPreferencesChange={(updatedPrefs) => {
          // If personalization was newly accepted or rejected, sync
          if (updatedPrefs.personalization) {
            setCookie('app_theme', isDarkMode ? 'dark' : 'light', 365);
            setCookie('app_accent', settings.accentColor, 365);
            setCookie('app_last_tab', activeTab, 365);
          }
        }}
      />

      {/* Security Protection Enforcement Modal */}
      <AnimatePresence>
        {securityAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl relative ${
                isDarkMode ? 'bg-slate-900 border-rose-500/30 text-slate-100' : 'bg-white border-rose-200 text-slate-900'
              }`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500 shrink-0 border border-rose-500/20">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-rose-500 leading-tight">
                    {securityAlert.title}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                    Owner Account Protection Active
                  </p>
                </div>
              </div>

              <div className={`p-4 rounded-xl border text-xs leading-relaxed mb-6 ${
                isDarkMode ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                {securityAlert.message}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSecurityAlert(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-all cursor-pointer"
                >
                  Acknowledge & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Multi-Tenant Accept Invite Modal */}
      {acceptInviteModalState.isOpen && (
        <AcceptInviteModal
          isOpen={acceptInviteModalState.isOpen}
          onClose={() => setAcceptInviteModalState({ isOpen: false, prefilledToken: '' })}
          orgId={activeWorkspaceId || DEFAULT_ORG_ID}
          user={firebaseUser || auth.currentUser || (user ? { uid: user.uid, email: user.email, displayName: user.name } as any : null)}
          isDarkMode={isDarkMode}
          prefilledToken={acceptInviteModalState.prefilledToken}
          onJoined={(member) => {
            triggerShortcutToast(`Joined organization as ${member.role}!`, 'Tenancy Success');
            handleNavigateTab('team');
          }}
        />
      )}

      {/* Global Floating AI Assistant */}
      <FloatingAssistant
        isDarkMode={isDarkMode}
        accentClass={accentClass}
        onNavigate={handleNavigateTab}
      />

    </motion.div>
  );
}

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    sessionStorage.removeItem('chunk_reload_attempted');
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#0F172A';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#FFFFFF';
    }
  }, [isDarkMode]);

  return (
    <GlobalErrorBoundary>
      <AssistantProvider>
        <Routes>
          <Route 
            path="/" 
            element={
              user ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Suspense fallback={<LoadingSpinner message="Initializing CSV Auditor Pro..." />}>
                  <LandingPage 
                    onStartTrial={() => navigate('/login')}
                    isDarkMode={isDarkMode}
                    toggleTheme={() => setIsDarkMode(!isDarkMode)}
                    accentClass="bg-blue-600 hover:bg-blue-700"
                    onSelectPlan={(plan) => {
                      if (plan === 'pro' || plan === 'enterprise') {
                        openPaddleCheckout(plan, user?.email || undefined);
                      } else {
                        navigate('/login');
                      }
                    }}
                  />

                </Suspense>
              )
            } 
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/about-founder" element={<AboutFounderPage />} />
          <Route path="/founder" element={<AboutFounderPage />} />

          {/* Public Legal & Informational Pages */}
          <Route path="/privacy" element={<Suspense fallback={<LoadingSpinner message="Loading Privacy Policy..." />}><PrivacyPolicyPage /></Suspense>} />
          <Route path="/terms" element={<Suspense fallback={<LoadingSpinner message="Loading Terms of Service..." />}><TermsOfServicePage /></Suspense>} />
          <Route path="/refund-policy" element={<Suspense fallback={<LoadingSpinner message="Loading Refund Policy..." />}><RefundPolicyPage /></Suspense>} />
          <Route path="/about" element={<Suspense fallback={<LoadingSpinner message="Loading About Us..." />}><AboutPage /></Suspense>} />
          <Route path="/contact" element={<Suspense fallback={<LoadingSpinner message="Loading Contact Support..." />}><ContactPage /></Suspense>} />

          {/* Protected Workspace Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><WorkspaceContent initialTab="dashboard" /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><WorkspaceContent initialTab="upload" /></ProtectedRoute>} />
          <Route path="/schema" element={<ProtectedRoute><WorkspaceContent initialTab="schema" /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><WorkspaceContent initialTab="results" /></ProtectedRoute>} />
          <Route path="/clean" element={<ProtectedRoute><WorkspaceContent initialTab="clean" /></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><WorkspaceContent initialTab="insights" /></ProtectedRoute>} />
          <Route path="/gmail" element={<ProtectedRoute><WorkspaceContent initialTab="gmail" /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><WorkspaceContent initialTab="reports" /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><WorkspaceContent initialTab="history" /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><WorkspaceContent initialTab="team" /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><WorkspaceContent initialTab="settings" /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><WorkspaceContent initialTab="settings" /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><WorkspaceContent initialTab="admin" /></ProtectedRoute>} />

          {/* Branded CSV Auditor Pro 404 Route */}
          <Route path="/404" element={<BrandedNotFound isDarkMode={isDarkMode} />} />
          <Route path="*" element={<BrandedNotFound isDarkMode={isDarkMode} />} />
        </Routes>
      </AssistantProvider>
    </GlobalErrorBoundary>
  );
}
