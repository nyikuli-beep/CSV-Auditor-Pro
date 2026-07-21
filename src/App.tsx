import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Menu,
  X,
  MessageSquare,
  History
} from 'lucide-react';

// Import Types
import { CSVFile, TeamMember, AuditActivity, ChatMessage, SystemSettings } from './types';

// Import Mock Initial Data
import { SAMPLE_MESSY_FILE, TEAM_MEMBERS, AUDIT_ACTIVITIES } from './sampleData';

// Import Views (Lazy Loaded for Low-Memory Devices & Mobile Startup Performance)
const LandingPage = lazy(() => import('./components/LandingPage'));
const AuthView = lazy(() => import('./components/AuthView'));
const DashboardHome = lazy(() => import('./components/DashboardHome'));
const UploadCenter = lazy(() => import('./components/UploadCenter'));
const AuditResults = lazy(() => import('./components/AuditResults'));
const CleaningCenter = lazy(() => import('./components/CleaningCenter'));
const InsightsCenter = lazy(() => import('./components/InsightsCenter'));
const ReportGen = lazy(() => import('./components/ReportGen'));
const AuditHistory = lazy(() => import('./components/AuditHistory'));
const TeamCollaboration = lazy(() => import('./components/TeamCollaboration'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const GmailCenter = lazy(() => import('./components/GmailCenter'));
import CookieBanner, { getCookie, setCookie } from './components/CookieBanner';

// Loading spinner fallback optimized for instant render on 2GB RAM devices
function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[400px]" id="loading-spinner">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-sm font-medium text-slate-500">{message}</span>
    </div>
  );
}

// Import Firebase integration
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc,
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';

export default function App() {
  // Global View State: 'landing' | 'auth' | 'workspace'
  const [view, setView] = useState<'landing' | 'auth' | 'workspace'>('landing');
  
  // Tab State inside SaaS workspace
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Session / Persona State
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  
  // Theme Toggle (Default to high-density light mode)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Files Registry (Initial mock messy CSV loaded by default)
  const [files, setFiles] = useState<CSVFile[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [activeFileId, setActiveFileId] = useState<string>('file-active');

  // Collaboration registry
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<AuditActivity[]>([]);

  // Chat message stack
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
      id: 'm-init', 
      role: 'assistant', 
      content: 'Greetings Sarah! I have analyzed "Company_Q2_Transactions_Messy.csv". I found 3 critical duplicate transaction keys, missing budget metrics, and outdated ISO calendar formatting. How shall we begin clean operations?', 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }
  ]);

  // System Config
  const [settings, setSettings] = useState<SystemSettings>({
    accentColor: 'blue',
    apiKey: '',
    emailNotifications: {
      auditCompleted: true,
      teamInvites: true,
      weeklyDigest: false
    },
    language: 'en',
    timezone: 'UTC'
  });

  const activeFile = files.find(f => f.id === activeFileId) || files[activeFileIndex] || files[0] || null;

  // Real-time Clock UTC state
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Sync state preferences to cookies when state changes
  useEffect(() => {
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

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setAuthLoading(true);
      if (fUser) {
        setFirebaseUser(fUser);
        setActiveFileId('file-active-' + fUser.uid);
        
        // Fetch or create user doc
        const userRef = doc(db, 'users', fUser.uid);
        let userRole = 'Owner';
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            userRole = userSnap.data().role || 'Owner';
          } else {
            const newProfile = {
              id: fUser.uid,
              name: fUser.displayName || fUser.email?.split('@')[0] || 'Nyikuli Bramwel',
              email: fUser.email || `${fUser.uid}@demo.com`,
              role: 'Owner'
            };
            await setDoc(userRef, newProfile);
          }
        } catch (err) {
          console.error("Error loading profile from Firestore:", err);
        }
        
        setUser({ email: fUser.email || `${fUser.uid}@demo.com`, role: userRole });
        
        // Sync user profile to Postgres
        try {
          const idToken = await fUser.getIdToken();
          await fetch('/api/sql/sync-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              name: fUser.displayName || fUser.email?.split('@')[0] || 'Nyikuli Bramwel',
              email: fUser.email || `${fUser.uid}@demo.com`,
              role: userRole
            })
          });
        } catch (dbErr) {
          console.warn("Error syncing user to Postgres on login (safe fallback to local state active):", dbErr);
        }

        setView('workspace');
      } else {
        setFirebaseUser(null);
        setUser(null);
        setView('landing');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync collections in real-time
  useEffect(() => {
    if (!firebaseUser) return;

    // 1. Files snapshot
    const filesQuery = query(collection(db, 'files'), where('ownerId', '==', firebaseUser.uid));
    const unsubscribeFiles = onSnapshot(filesQuery, async (snapshot) => {
      const filesList: CSVFile[] = [];
      snapshot.forEach((docSnap) => {
        filesList.push(docSnap.data() as CSVFile);
      });

      if (filesList.length === 0) {
        if (!snapshot.metadata.fromCache) {
          try {
            const seedFile: CSVFile = {
              ...SAMPLE_MESSY_FILE,
              id: 'file-active-' + firebaseUser.uid,
              ownerId: firebaseUser.uid,
              uploadedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            await setDoc(doc(db, 'files', 'file-active-' + firebaseUser.uid), seedFile);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, 'files/file-active-' + firebaseUser.uid);
          }
        }
      } else {
        // Keep any unsynced local files that haven't registered in the Firestore snapshot yet
        setFiles(prev => {
          const unsynced = prev.filter(p => !filesList.some(f => f.id === p.id) && !p.id.startsWith('file-active'));
          const combined = [...unsynced, ...filesList];
          
          combined.sort((a, b) => {
            let timeA = 0;
            let timeB = 0;
            
            if (a.uploadedAt) {
              const parsed = Date.parse(a.uploadedAt);
              if (!isNaN(parsed)) timeA = parsed;
            }
            if (b.uploadedAt) {
              const parsed = Date.parse(b.uploadedAt);
              if (!isNaN(parsed)) timeB = parsed;
            }
            
            if (timeA === timeB) {
              const matchA = a.id.match(/\d+/g);
              const matchB = b.id.match(/\d+/g);
              const numA = matchA ? parseInt(matchA.join(''), 10) : 0;
              const numB = matchB ? parseInt(matchB.join(''), 10) : 0;
              timeA = numA;
              timeB = numB;
            }
            
            return timeB - timeA; // Newest first
          });
          return combined;
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'files');
    });

    // 2. Team snapshot
    const membersQuery = collection(db, 'members');
    const unsubscribeMembers = onSnapshot(membersQuery, async (snapshot) => {
      const membersList: TeamMember[] = [];
      snapshot.forEach((docSnap) => {
        membersList.push(docSnap.data() as TeamMember);
      });

      if (membersList.length === 0) {
        if (!snapshot.metadata.fromCache) {
          try {
            for (const m of TEAM_MEMBERS) {
              await setDoc(doc(db, 'members', m.id), m);
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, 'members');
          }
        }
      } else {
        setMembers(membersList);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'members');
    });

    // 3. Activities snapshot
    const activitiesQuery = query(collection(db, 'activities'), limit(25));
    const unsubscribeActivities = onSnapshot(activitiesQuery, async (snapshot) => {
      const activitiesList: AuditActivity[] = [];
      snapshot.forEach((docSnap) => {
        activitiesList.push(docSnap.data() as AuditActivity);
      });

      if (activitiesList.length === 0) {
        if (!snapshot.metadata.fromCache) {
          try {
            const currentUid = firebaseUser?.uid || auth.currentUser?.uid;
            for (const act of AUDIT_ACTIVITIES) {
              const seedAct = {
                ...act,
                userId: currentUid || act.userId
              };
              await setDoc(doc(db, 'activities', act.id), seedAct);
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, 'activities');
          }
        }
      } else {
        setActivities(activitiesList.sort((a, b) => b.id.localeCompare(a.id)));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'activities');
    });

    return () => {
      unsubscribeFiles();
      unsubscribeMembers();
      unsubscribeActivities();
    };
  }, [firebaseUser]);

  // Map accents to Tailwind classes
  const getAccentColorClass = () => {
    switch (settings.accentColor) {
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-700 text-emerald-500';
      case 'violet': return 'bg-violet-600 hover:bg-violet-700 text-violet-500';
      case 'amber': return 'bg-amber-600 hover:bg-amber-700 text-amber-500';
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
      const res = await fetch(`/api/sql/${path}`, options);
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
    const activeUser = firebaseUser || auth.currentUser;
    if (activeUser) {
      try {
        const userRef = doc(db, 'users', activeUser.uid);
        await setDoc(userRef, {
          id: activeUser.uid,
          name: userInfo.name,
          email: userInfo.email,
          role: userInfo.role,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Error setting user profile in Firestore:", err);
      }
    }
    setUser({ email: userInfo.email, role: userInfo.role });
    setView('workspace');
    setActiveTab('dashboard');

    // Prepend user activation activity log
    const activationLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: activeUser?.uid || 'usr-sarah',
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
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
    setUser(null);
    setView('landing');
  };

  // Add newly uploaded CSV to registry
  const handleNewFileUpload = async (newFile: CSVFile) => {
    const fileId = newFile.id || `file-${Date.now()}`;
    const fileToUpload: CSVFile = {
      ...newFile,
      id: fileId,
      ownerId: firebaseUser?.uid || 'usr-sarah'
    };

    // Optimistically update files and transition immediately for instant, high-performance UI feedback
    setFiles(prev => {
      const filtered = prev.filter(f => f.id !== fileId);
      return [fileToUpload, ...filtered];
    });

    setActiveFileId(fileId);
    setActiveFileIndex(0);
    setActiveTab('clean'); // Switch directly to the Cleaning Center for cleaning

    const actionDesc = (newFile as any).isQuickCleaned 
      ? `Uploaded, ingested, and auto-sanitized "${newFile.name}" (Quick Clean applied)`
      : `Uploaded & ingested new dataset "${newFile.name}"`;

    const uploadLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || 'usr-sarah',
      userName: user?.email || 'Nyikuli Bramwel',
      action: actionDesc,
      timestamp: 'Just now'
    };

    // Update activities locally immediately
    setActivities(prev => [uploadLog, ...prev]);

    // Save in firestore and sync to postgres in the background without blocking the UI navigation
    try {
      await setDoc(doc(db, 'files', fileId), fileToUpload);
      await syncToPostgres('sync-file', 'POST', fileToUpload);
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
    try {
      await setDoc(doc(db, 'files', updatedFile.id), updatedFile);
      await syncToPostgres('sync-file', 'POST', updatedFile);
    } catch (err) {
      console.warn('Firestore update failed, using local fallback state:', err);
    }

    // Always update local state
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));

    const cleanLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || 'usr-sarah',
      userName: user?.email || 'Nyikuli Bramwel',
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

  // Update multiple files post batch cleaning
  const handleUpdateFiles = async (updatedFiles: CSVFile[]) => {
    try {
      for (const file of updatedFiles) {
        await setDoc(doc(db, 'files', file.id), file);
        await syncToPostgres('sync-file', 'POST', file);
      }
    } catch (err) {
      console.warn('Firestore batch update failed, using local fallback state:', err);
    }

    // Always update local state
    setFiles(prev => prev.map(f => {
      const match = updatedFiles.find(uf => uf.id === f.id);
      return match ? match : f;
    }));

    const batchCleanLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || 'usr-sarah',
      userName: user?.email || 'Nyikuli Bramwel',
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
    try {
      await deleteDoc(doc(db, 'files', id));
      await syncToPostgres(`delete-file/${id}`, 'DELETE');
    } catch (err) {
      console.warn('Firestore delete failed, using local fallback state:', err);
    }

    // Always update local state first
    setFiles(prev => prev.filter(f => f.id !== id));

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
      userId: firebaseUser?.uid || auth.currentUser?.uid || 'usr-sarah',
      userName: user?.email || 'Nyikuli Bramwel',
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
    try {
      await setDoc(doc(db, 'members', newMember.id), newMember);
      await syncToPostgres('sync-member', 'POST', newMember);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `members/${newMember.id}`);
    }

    const inviteLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || 'usr-sarah',
      userName: user?.email || 'Nyikuli Bramwel',
      action: `Dispatched tenancy invitation to ${newMember.email}`,
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
    try {
      await deleteDoc(doc(db, 'members', id));
      await syncToPostgres(`delete-member/${id}`, 'DELETE');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `members/${id}`);
    }

    const deleteLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || 'usr-sarah',
      userName: user?.email || 'Nyikuli Bramwel',
      action: `Deleted workspace member ${email}`,
      timestamp: 'Just now'
    };
    try {
      await setDoc(doc(db, 'activities', deleteLog.id), deleteLog);
      await syncToPostgres('sync-activity', 'POST', deleteLog);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `activities/${deleteLog.id}`);
    }
  };

  const handleAddNewActivity = async (actionText: string) => {
    const newLog: AuditActivity = {
      id: `act-${Date.now()}`,
      userId: firebaseUser?.uid || auth.currentUser?.uid || 'usr-sarah',
      userName: user?.email || 'Nyikuli Bramwel',
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
        content: 'Greetings Sarah! I have analyzed "Company_Q2_Transactions_Messy.csv". I found 3 critical duplicate transaction keys, missing budget metrics, and outdated ISO calendar formatting. How shall we begin clean operations?', 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }
    ]);
  };

  const handlePurgeInactiveFiles = async () => {
    const inactiveFiles = files.filter(f => f.id !== activeFileId);
    for (const file of inactiveFiles) {
      try {
        await deleteDoc(doc(db, 'files', file.id));
        await syncToPostgres(`delete-file/${file.id}`, 'DELETE').catch(() => {});
      } catch (err) {
        console.error(`Error purging file ${file.name}:`, err);
      }
    }
    setFiles(files.filter(f => f.id === activeFileId));
  };


  // Dispatch prompt context to full-stack backend with multi-turn and custom model/persona support
  const handleSendChatMessage = async (
    msgContent: string, 
    model: string = 'gemini-3.5-flash', 
    persona: string = 'auditor',
    image: { data: string; mimeType: string } | null = null,
    thinkingMode: boolean = false
  ) => {
    const userMsg: ChatMessage = {
      id: `msg-usr-${Date.now()}`,
      role: 'user',
      content: msgContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const aiThinkingMsg: ChatMessage = {
      id: `msg-ai-think-${Date.now()}`,
      role: 'assistant',
      content: 'Consulting Gemini API for compliance insights...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
          fileContext: activeFile ? {
            fileName: activeFile.name,
            headers: activeFile.headers,
            rowCount: activeFile.rows.length,
            issuesCount: activeFile.issues.length
          } : null
        })
      });

      if (!response.ok) throw new Error('API server unavailable');
      const data = await response.json();

      setChatMessages(prev => prev.map(m => 
        m.id === aiThinkingMsg.id 
          ? { ...m, content: data.text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          : m
      ));
    } catch (err) {
      // Graceful offline fallback
      setTimeout(() => {
        setChatMessages(prev => prev.map(m => 
          m.id === aiThinkingMsg.id 
            ? { 
                ...m, 
                content: `[Expert Fallback] I received: "${msgContent}". Active dataset metrics suggest running standard cleaning routines. If you need standard PostgreSQL migration DDLs, let me know!`, 
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
              }
            : m
        ));
      }, 1000);
    }
  };

  // Nav helper for internal tab redirection
  const handleNavigateTab = (tab: string) => {
    setActiveTab(tab);
  };

  // Select file from history to set as active in workspace
  const handleSelectActiveFile = (file: CSVFile) => {
    const foundIdx = files.findIndex(f => f.id === file.id);
    if (foundIdx !== -1) {
      setActiveFileIndex(foundIdx);
      setActiveFileId(file.id);
    }
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${isDarkMode ? 'bg-[#0b0f19] text-slate-100' : 'bg-[#F8FAFC] text-[#1E293B]'}`}>
      
      {/* 1. Landing View */}
      {view === 'landing' && (
        <Suspense fallback={<LoadingSpinner message="Initializing CSV Auditor Pro..." />}>
          <LandingPage 
            onStartTrial={() => setView('auth')}
            isDarkMode={isDarkMode}
            toggleTheme={() => setIsDarkMode(!isDarkMode)}
            accentClass={accentClass}
          />
        </Suspense>
      )}

      {/* 2. Authentication view */}
      {view === 'auth' && (
        <Suspense fallback={<LoadingSpinner message="Setting up secure workspace portal..." />}>
          <AuthView 
            onLoginSuccess={handleAuthSuccess}
            onBackToLanding={() => setView('landing')}
            isDarkMode={isDarkMode}
            accentClass={accentClass}
          />
        </Suspense>
      )}

      {/* 3. SaaS Active Workspace Segment */}
      {view === 'workspace' && (
        <div className="flex min-h-screen">
          
          {/* Mobile Drawer Backdrop Overlay */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="fixed inset-0 bg-black z-40 md:hidden"
                />
                
                <motion.aside 
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className={`fixed inset-y-0 left-0 w-64 z-50 p-5 flex flex-col justify-between md:hidden shadow-2xl ${isDarkMode ? 'bg-[#0f172a] border-r border-slate-800 text-slate-100' : 'bg-white border-r border-slate-200 text-[#1E293B]'}`}
                >
                  <div className="space-y-6">
                    {/* Brand with Close Trigger */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
                          <FileSpreadsheet className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h2 className={`font-bold text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Auditor Pro</h2>
                          <span className="text-[9px] text-slate-400 block font-bold tracking-wider">WORKSPACE LEVEL</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setMobileMenuOpen(false)}
                        className={`p-1.5 rounded-lg border cursor-pointer transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Mapped Active File Miniature Gauge */}
                    {activeFile && (
                      <div className={`p-3.5 rounded-xl border space-y-2 text-xs text-left ${isDarkMode ? 'bg-[#1e293b]/40 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'}`}>
                        <div className="flex justify-between items-center">
                          <span className={`font-bold block max-w-[125px] truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`} title={activeFile.name}>
                            {activeFile.name}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>{activeFile.rows.length} rows</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-semibold">Integrity rating:</span>
                          <span className={`font-black ${activeFile.score > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{activeFile.score}%</span>
                        </div>
                        <div className={`w-full h-1 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                          <div className={`h-full rounded-full ${activeFile.score > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${activeFile.score}%` }}></div>
                        </div>
                      </div>
                    )}

                    {/* Mobile Navigation Tabs Stack */}
                    <nav className="space-y-1">
                      {[
                        { id: 'dashboard', label: 'Dashboard Home', icon: BarChart3 },
                        { id: 'upload', label: 'Upload Center', icon: Upload },
                        { id: 'results', label: 'Audit Findings', icon: Sparkles, badge: activeFile ? activeFile.issues.length : 0 },
                        { id: 'clean', label: 'Hygiene Workspace', icon: Trash2 },
                        { id: 'insights', label: 'AI Intelligence', icon: MessageSquare },
                        { id: 'gmail', label: 'Gmail Compliance', icon: Mail },
                        { id: 'reports', label: 'Branded Reports', icon: FileText },
                        { id: 'history', label: 'File Archive', icon: History },
                        { id: 'team', label: 'Team Tenancy', icon: Users },
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
                            className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${isActive ? isDarkMode ? 'bg-[#1e293b]/80 text-blue-400 font-bold border-l-2 border-blue-500 pl-2.5' : 'bg-blue-50/80 text-blue-700 font-bold border-l-2 border-blue-600 pl-2.5' : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800/40' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                          >
                            <span className="flex items-center gap-2.5">
                              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : ''}`} />
                              <span>{tab.label}</span>
                            </span>
                            {tab.badge !== undefined && tab.badge > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500 text-white font-mono shrink-0">
                                {tab.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Mobile Logout Panel */}
                  <div className="pt-6 border-t border-slate-900/80">
                    <div className="flex items-center gap-3 mb-4 text-xs text-left">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-[10px] text-white">
                        {user?.email ? user.email.slice(0, 2).toUpperCase() : 'ME'}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold block truncate max-w-[110px]">{user?.email || 'sarah@Jenkins.com'}</span>
                        <span className="text-[9px] text-slate-500 block font-mono font-bold uppercase">{user?.role || 'Owner'}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Logout Session
                    </button>
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
          
          {/* Left Navigation Sidebar */}
          <aside className={`w-64 border-r hidden md:flex flex-col justify-between p-5 shrink-0 ${isDarkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="space-y-6">
              
              {/* Branding Header */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
                  <FileSpreadsheet className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className={`font-bold text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Auditor Pro</h2>
                  <span className="text-[9px] text-slate-400 block font-bold tracking-wider">WORKSPACE LEVEL</span>
                </div>
              </div>

              {/* Mapped Active File Miniature Gauge */}
              {activeFile && (
                <div className={`p-3.5 rounded-xl border space-y-2 text-xs text-left ${isDarkMode ? 'bg-[#1e293b]/40 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-bold block max-w-[125px] truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`} title={activeFile.name}>
                      {activeFile.name}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>{activeFile.rows.length} rows</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-semibold">Integrity rating:</span>
                    <span className={`font-black ${activeFile.score > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{activeFile.score}%</span>
                  </div>
                  <div className={`w-full h-1 rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div className={`h-full rounded-full ${activeFile.score > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${activeFile.score}%` }}></div>
                  </div>
                </div>
              )}

              {/* Navigation Tabs Stack */}
              <nav className="space-y-1">
                {[
                  { id: 'dashboard', label: 'Dashboard Home', icon: BarChart3 },
                  { id: 'upload', label: 'Upload Center', icon: Upload },
                  { id: 'results', label: 'Audit Findings', icon: Sparkles, badge: activeFile ? activeFile.issues.length : 0 },
                  { id: 'clean', label: 'Hygiene Workspace', icon: Trash2 },
                  { id: 'insights', label: 'AI Intelligence', icon: MessageSquare },
                  { id: 'gmail', label: 'Gmail Compliance', icon: Mail },
                  { id: 'reports', label: 'Branded Reports', icon: FileText },
                  { id: 'history', label: 'File Archive', icon: History },
                  { id: 'team', label: 'Team Tenancy', icon: Users },
                  // Admin panel toggleable
                  ...(user?.role === 'Admin' || user?.role === 'Owner' ? [{ id: 'admin', label: 'Admin Panel', icon: Lock }] : []),
                  { id: 'settings', label: 'API & settings', icon: Settings }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${isActive ? isDarkMode ? 'bg-[#1e293b]/80 text-blue-400 font-bold border-l-2 border-blue-500 pl-2.5' : 'bg-blue-50/80 text-blue-700 font-bold border-l-2 border-blue-600 pl-2.5' : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800/40' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : ''}`} />
                        <span>{tab.label}</span>
                      </span>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500 text-white font-mono shrink-0">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

            </div>

            {/* Logout panel */}
            <div className="pt-6 border-t border-slate-900/80">
              <div className="flex items-center gap-3 mb-4 text-xs text-left">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-[10px] text-white">
                  {user?.email ? user.email.slice(0, 2).toUpperCase() : 'ME'}
                </div>
                <div className="min-w-0">
                  <span className="font-bold block truncate max-w-[110px]">{user?.email || 'sarah@Jenkins.com'}</span>
                  <span className="text-[9px] text-slate-500 block font-mono font-bold uppercase">{user?.role || 'Owner'}</span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-900/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout Session
              </button>
            </div>
          </aside>

          {/* Right Workstation frame */}
          <main className={`flex-1 flex flex-col min-w-0 ${isDarkMode ? 'bg-[#0b0f19]' : 'bg-[#F8FAFC]'}`}>
            {/* Top Workspace Header */}
            <header className={`h-14 px-6 border-b flex items-center justify-between gap-4 shrink-0 ${isDarkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setMobileMenuOpen(true)}
                  className={`md:hidden p-1.5 rounded cursor-pointer transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <Menu className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2.5">
                  <h2 className={`text-sm md:text-base font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {activeTab === 'dashboard' && 'Main Workspace'}
                    {activeTab === 'upload' && 'Spreadsheet Ingestion'}
                    {activeTab === 'results' && 'Audit Findings'}
                    {activeTab === 'clean' && 'Hygiene Laboratory'}
                    {activeTab === 'insights' && 'AI Intelligence Core'}
                    {activeTab === 'gmail' && 'Gmail Compliance Hub'}
                    {activeTab === 'reports' && 'Branded PDF Reports'}
                    {activeTab === 'history' && 'File Archive Repository'}
                    {activeTab === 'team' && 'Tenancy Collaboration'}
                    {activeTab === 'settings' && 'Workspace Credentials'}
                    {activeTab === 'admin' && 'Compliance Administration'}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-wide uppercase ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                      All Systems Normal
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile card & quick dials */}
              <div className="flex items-center gap-3.5">
                <div className="hidden lg:flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[10px] text-slate-400 font-mono font-bold">{currentTime}</span>
                </div>

                {/* Mode toggle */}
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`p-1.5 rounded-lg border cursor-pointer hover:scale-[1.03] transition-all ${isDarkMode ? 'bg-[#1e293b]/50 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'}`}
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center font-bold text-[9px] text-white border border-slate-200/20 shadow-sm">
                    {user?.email ? user.email.slice(0, 2).toUpperCase() : 'SJ'}
                  </div>
                  <div className="hidden sm:flex flex-col text-left text-xs leading-tight">
                    <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{user?.email?.split('@')[0] || 'Sarah J.'}</span>
                    <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">{user?.role || 'Owner'}</span>
                  </div>
                </div>
              </div>
            </header>

            {/* Container for active view tabs */}
            <div className="p-6 flex-1 overflow-y-auto w-full mx-auto max-w-7xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
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
                      />
                    )}

                    {activeTab === 'upload' && (
                      <UploadCenter 
                        onFileUpload={handleNewFileUpload}
                        files={files}
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                      />
                    )}

                    {activeTab === 'results' && (
                      <AuditResults 
                        activeFile={activeFile}
                        onNavigate={handleNavigateTab}
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                        onUpdateFile={handleUpdateFile}
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
                        chatMessages={chatMessages}
                        onSendMessage={handleSendChatMessage}
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
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
                        activities={activities}
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                      />
                    )}

                    {activeTab === 'settings' && (
                      <SettingsView 
                        settings={settings}
                        onUpdateSettings={setSettings}
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
                      />
                    )}

                    {activeTab === 'admin' && (
                      <AdminPanel 
                        isDarkMode={isDarkMode}
                        accentClass={accentClass}
                      />
                    )}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
            
            {/* Custom High Density Footer */}
            <footer className={`mt-auto border-t px-6 py-3.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest shrink-0 ${isDarkMode ? 'bg-[#0f172a] border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>
              <div>&copy; 2026 CSV Auditor Pro Inc.</div>
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex gap-3 sm:gap-4 border-r border-slate-300 dark:border-slate-800 pr-4 sm:pr-6">
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">Twitter</a>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">GitHub</a>
                  <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">LinkedIn</a>
                </div>
                <div className="flex gap-4 sm:gap-6">
                  <button onClick={() => setActiveTab('settings')} className="hover:text-blue-500 transition-colors uppercase cursor-pointer">API Documentation</button>
                  <button onClick={() => setActiveTab('settings')} className="hover:text-blue-500 transition-colors uppercase cursor-pointer">Terms of Service</button>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Status: Operational</span>
                </div>
              </div>
            </footer>
          </main>

        </div>
      )}

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

    </div>
  );
}
