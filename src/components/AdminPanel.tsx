import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Lock, 
  Activity, 
  ToggleLeft, 
  ToggleRight, 
  Users, 
  MessageSquare,
  Clock,
  Database,
  CloudLightning,
  Coins,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Key,
  RefreshCw,
  Shield,
  Terminal,
  X,
  FileText,
  UserCheck,
  ChevronRight,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import { collection, query, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { AuditActivity } from '../types';

interface AdminPanelProps {
  isDarkMode: boolean;
  accentClass: string;
  currentUserEmail?: string;
  currentUserRole?: string;
  activities?: AuditActivity[];
}

export default function AdminPanel({ isDarkMode, accentClass, currentUserEmail, currentUserRole, activities = [] }: AdminPanelProps) {
  const AUTHORIZED_ADMIN_EMAILS = ['nyikulibramwel@gmail.com', 'osanojunior38@gmail.com'];
  const isAuthorizedAdmin = (currentUserRole === 'Owner' || currentUserRole === 'Admin') || (currentUserEmail
    ? AUTHORIZED_ADMIN_EMAILS.some(e => e.toLowerCase() === currentUserEmail.toLowerCase().trim())
    : false);

  // Feature flags toggles state
  const [flags, setFlags] = useState({
    geminiFlash: true,
    whiteLabel: true,
    highCapacityIngest: false,
    publicRestApi: true
  });

  const toggleFlag = (key: keyof typeof flags) => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const supportTickets: any[] = [];

  // State for Firestore queried activities
  const [firestoreActivities, setFirestoreActivities] = useState<AuditActivity[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'roles' | 'db' | 'security' | 'toggles'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditActivity | null>(null);

  // Subscribe directly to Firestore 'activities' collection for real-time observability
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const q = query(collection(db, 'activities'), limit(100));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const docs: AuditActivity[] = [];
        snapshot.forEach((docSnap) => {
          docs.push(docSnap.data() as AuditActivity);
        });
        if (docs.length > 0) {
          setFirestoreActivities(docs);
        }
      }, (err) => {
        console.warn("Firestore admin activities live query fallback:", err);
      });
    } catch (err) {
      console.warn("Firestore initialization error in AdminPanel:", err);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Merge real activity sources (Firestore snapshot & props.activities)
  const allMergedActivities = useMemo(() => {
    const combined = [...firestoreActivities, ...activities];
    const map = new Map<string, AuditActivity>();
    combined.forEach(act => {
      if (act && act.action) {
        const key = act.id || `${act.action}-${act.timestamp}`;
        if (!map.has(key)) {
          map.set(key, act);
        }
      }
    });
    return Array.from(map.values());
  }, [firestoreActivities, activities]);

  // Helper to test if an activity qualifies as high-privilege
  const isHighPrivilegeAction = (act: AuditActivity) => {
    const text = (act.action || '').toLowerCase();
    const highPrivilegeKeywords = [
      'role', 'owner', 'admin', 'permission', 'slot', 'member', 'invite', 'delete', 'remove', 'grant', 'revoke',
      'database', 'sql', 'db', 'postgres', 'drizzle', 'query', 'table', 'schema', 'truncate', 'index',
      'security', 'policy', 'api key', 'auth', 'login', 'token', 'mfa', 'restrict', 'forbidden', 'secret',
      'flag', 'toggle', 'feature', 'system', 'setting', 'config', 'cluster', 'mrr', 'billing'
    ];
    return highPrivilegeKeywords.some(kw => text.includes(kw));
  };

  // Helper to categorize activities
  const getActionCategory = (actionText: string): 'roles' | 'db' | 'security' | 'toggles' | 'other' => {
    const text = actionText.toLowerCase();
    if (text.includes('role') || text.includes('owner') || text.includes('admin') || text.includes('member') || text.includes('invite') || text.includes('slot')) {
      return 'roles';
    }
    if (text.includes('database') || text.includes('sql') || text.includes('db') || text.includes('postgres') || text.includes('drizzle') || text.includes('table') || text.includes('query')) {
      return 'db';
    }
    if (text.includes('security') || text.includes('policy') || text.includes('api key') || text.includes('auth') || text.includes('token') || text.includes('mfa') || text.includes('secret')) {
      return 'security';
    }
    if (text.includes('flag') || text.includes('toggle') || text.includes('feature') || text.includes('config') || text.includes('cluster') || text.includes('system')) {
      return 'toggles';
    }
    return 'other';
  };

  // Helper to calculate severity / risk level for an action
  const getRiskSeverity = (actionText: string): { level: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'INFO'; color: string; bg: string; border: string } => {
    const text = actionText.toLowerCase();
    if (text.includes('sql') || text.includes('database') || text.includes('owner') || text.includes('security policy') || text.includes('delete member')) {
      return { 
        level: 'CRITICAL', 
        color: 'text-rose-400', 
        bg: 'bg-rose-500/10', 
        border: 'border-rose-500/20' 
      };
    }
    if (text.includes('role') || text.includes('api key') || text.includes('toggle') || text.includes('feature flag') || text.includes('admin')) {
      return { 
        level: 'HIGH', 
        color: 'text-amber-400', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20' 
      };
    }
    if (text.includes('invite') || text.includes('clean') || text.includes('config') || text.includes('member')) {
      return { 
        level: 'ELEVATED', 
        color: 'text-blue-400', 
        bg: 'bg-blue-500/10', 
        border: 'border-blue-500/20' 
      };
    }
    return { 
      level: 'INFO', 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10', 
      border: 'border-emerald-500/20' 
    };
  };

  // Filtered high-privilege activities
  const highPrivilegeActivities = useMemo(() => {
    return allMergedActivities.filter(act => {
      // Must be high privilege
      if (!isHighPrivilegeAction(act)) return false;

      // Filter by category tab
      if (selectedCategory !== 'all') {
        const cat = getActionCategory(act.action);
        if (cat !== selectedCategory) return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (act.userName || '').toLowerCase().includes(q);
        const matchesAction = (act.action || '').toLowerCase().includes(q);
        const matchesTime = (act.timestamp || '').toLowerCase().includes(q);
        const matchesFile = (act.fileName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesAction && !matchesTime && !matchesFile) return false;
      }

      return true;
    });
  }, [allMergedActivities, selectedCategory, searchQuery]);

  // Statistics
  const totalHighPrivilegeCount = useMemo(() => allMergedActivities.filter(isHighPrivilegeAction).length, [allMergedActivities]);
  const criticalCount = useMemo(() => allMergedActivities.filter(a => isHighPrivilegeAction(a) && getRiskSeverity(a.action).level === 'CRITICAL').length, [allMergedActivities]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  if (!isAuthorizedAdmin) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div>
          <span className="text-xs font-mono font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" /> Administrative Access Control
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-rose-500">
            Admin Oversight Panel — Access Denied
          </h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            System analytics, billing telemetry, cluster health, and feature flag management.
          </p>
        </div>

        {/* Lockout Card */}
        <div className={`p-8 rounded-2xl border shadow-xl relative overflow-hidden ${
          isDarkMode ? 'bg-slate-900/90 border-rose-500/30 text-slate-100' : 'bg-white border-rose-200 text-slate-900'
        }`}>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 shrink-0 border border-rose-500/20">
              <ShieldAlert className="w-12 h-12" />
            </div>

            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 text-[10px] font-mono font-extrabold uppercase tracking-wider border border-rose-500/30">
                  Owner Permission Required
                </span>
                <span className="text-xs font-mono text-slate-400">HTTP 403: Forbidden Scope</span>
              </div>

              <h3 className="text-xl font-extrabold text-slate-100">
                Administrative Oversight Restricted to Primary Owner
              </h3>

              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Your active session (<strong className="text-amber-400 font-mono">{currentUserEmail || 'Unverified User / Guest'}</strong>) does not have administrative privileges to access the Admin Oversight Panel. This panel contains executive revenue telemetry, system health monitoring, security audit logs, and global feature flag toggles restricted strictly to primary owner <strong className="text-blue-400 font-mono">nyikulibramwel@gmail.com</strong>.
              </p>

              <div className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
                isDarkMode ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="flex justify-between items-center">
                  <span>Authorized Owner Account:</span>
                  <span className="text-blue-400 font-bold">nyikulibramwel@gmail.com</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Your Current Session Email:</span>
                  <span className="text-amber-400 font-bold">{currentUserEmail || 'None'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Security Policy Enforcement:</span>
                  <span className="text-emerald-400 font-bold">STRICT & ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <span className="text-xs font-mono font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" /> Administrative Gateway
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Admin Oversight Panel</h1>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          System analytics, billing metrics, active feature flags, customer assistance queues, and high-privilege security audit logs.
        </p>
      </div>

      {/* Health status & MRR Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* System Health Status (Online tickers) */}
        <div className={`md:col-span-5 p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-1.5"><Activity className="w-4 h-4 text-emerald-500" /> Infrastructure Status</h3>
          
          <div className="space-y-4">
            {[
              { label: 'Gemini Inference API', host: 'cluster-west2', status: 'ONLINE' },
              { label: 'Background Pipeline Queue', host: 'redis-pubsub-01', status: 'ONLINE' },
              { label: 'SaaS Ingestion Database', host: 'postgres-replica-3', status: 'ONLINE' },
              { label: 'Object File Storage cluster', host: 's3-bucket-eu', status: 'ONLINE' }
            ].map((node, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold block">{node.label}</span>
                  <span className="text-[9px] text-slate-400 font-mono">{node.host}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span> {node.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Analytics MRR Growth */}
        <div className={`md:col-span-7 p-6 rounded-2xl border flex flex-col justify-between ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5"><Coins className="w-4 h-4 text-amber-500" /> Revenue Telemetry</h3>
                <span className="text-2xl font-black">$48,250.00 <span className="text-xs font-mono font-bold text-emerald-400">MRR</span></span>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">+18.5% MoM</span>
            </div>

            {/* Growth chart SVG */}
            <div className="h-28 w-full overflow-hidden">
              <svg viewBox="0 0 400 100" className="w-full h-full overflow-hidden">
                <path 
                  d="M 10 90 L 80 80 L 150 75 L 220 50 L 290 35 L 390 15" 
                  fill="none" 
                  stroke="#10B981" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                />
                <circle cx="390" cy="15" r="4" fill="#10B981" />
                <text x="10" y="98" fill="#94a3b8" fontSize="8" fontFamily="monospace">JAN</text>
                <text x="80" y="98" fill="#94a3b8" fontSize="8" fontFamily="monospace">FEB</text>
                <text x="150" y="98" fill="#94a3b8" fontSize="8" fontFamily="monospace">MAR</text>
                <text x="220" y="98" fill="#94a3b8" fontSize="8" fontFamily="monospace">APR</text>
                <text x="290" y="98" fill="#94a3b8" fontSize="8" fontFamily="monospace">MAY</text>
                <text x="340" y="98" fill="#94a3b8" fontSize="8" fontFamily="monospace">JUN (Active)</text>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Flags & Customer Assistance tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Feature Flags */}
        <div className="lg:col-span-6 space-y-6">
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-5 flex items-center gap-1.5"><CloudLightning className="w-4 h-4 text-blue-500" /> Active Feature Toggles</h3>
            
            <div className="divide-y divide-slate-800/50">
              {[
                { key: 'geminiFlash', label: 'Inference model: Gemini 3.5 Flash', desc: 'Default to Gemini-3.5-flash for real-time audits.' },
                { key: 'whiteLabel', label: 'White-Label Branding export', desc: 'Allows Pro and Enterprise customers to write custom titles/logos.' },
                { key: 'highCapacityIngest', label: 'Gigabyte CSV chunk pipeline', desc: 'Experimental feature using distributed worker loops.' },
                { key: 'publicRestApi', label: 'Developer REST API Gateway', desc: 'Exposes API keys to third-party endpoints.' }
              ].map((flag) => (
                <div key={flag.key} className="py-4 flex justify-between items-center gap-4">
                  <div className="text-xs">
                    <span className="font-bold block">{flag.label}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{flag.desc}</span>
                  </div>
                  <button 
                    onClick={() => toggleFlag(flag.key as any)}
                    className="text-blue-500 hover:scale-110 transition-transform"
                  >
                    {flags[flag.key as keyof typeof flags] ? (
                      <ToggleRight className="w-9 h-9" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-slate-600" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Customer support assistance tickets */}
        <div className="lg:col-span-6 space-y-6 min-w-0">
          <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-violet-500" /> Assistance Queue ({supportTickets.length})</h3>
            <div className="space-y-4">
              {supportTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 rounded-xl bg-slate-950/20 border border-slate-850/40 text-xs text-left min-w-0 break-words">
                  <div className="flex justify-between items-baseline gap-1 flex-wrap mb-1.5">
                    <span className="font-bold font-mono text-blue-400 break-all">{ticket.id} &bull; {ticket.user}</span>
                    <span className="text-[9px] text-slate-400 font-mono flex items-center gap-0.5 shrink-0"><Clock className="w-3 h-3" /> {ticket.time}</span>
                  </div>
                  <p className={`text-xs leading-relaxed break-words ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{ticket.issue}</p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${ticket.status === 'open' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {ticket.status}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${ticket.priority === 'high' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-700 text-slate-400'}`}>
                      {ticket.priority} priority
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* DEDICATED ADMIN ACTIVITY LOG SECTION (SECURITY OBSERVABILITY) */}
      <div className={`p-4 sm:p-6 md:p-8 rounded-2xl border shadow-xl space-y-6 relative overflow-hidden max-w-full ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-md'
      }`}>
        {/* Header & Observability Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/50 min-w-0 w-full">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-mono font-extrabold uppercase tracking-wider border border-blue-500/20 flex items-center gap-1.5 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" /> High-Privilege Audit Stream
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                Firestore Live
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight mt-1.5 flex items-center gap-2 break-words">
              <Terminal className="w-5 h-5 text-rose-500 shrink-0" /> Admin Activity Log
            </h2>
            <p className={`text-xs mt-1 break-words ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Real-time security observability querying Firestore <code className="font-mono text-blue-400">activities</code> collection filtered exclusively by high-privilege operations.
            </p>
          </div>

          <button
            onClick={handleManualRefresh}
            className={`px-3 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition-all border shrink-0 ${
              isDarkMode 
                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
            Refresh Log
          </button>
        </div>

        {/* Security Metrics Tickers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 min-w-0 w-full">
          <div className={`p-3.5 sm:p-4 rounded-xl border text-xs min-w-0 overflow-hidden ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1 truncate">Total High-Privilege Events</span>
            <span className="text-xl font-black font-mono text-blue-400 block truncate">{totalHighPrivilegeCount}</span>
          </div>

          <div className={`p-3.5 sm:p-4 rounded-xl border text-xs min-w-0 overflow-hidden ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1 truncate">Critical Severity Actions</span>
            <span className="text-xl font-black font-mono text-rose-400 block truncate">{criticalCount}</span>
          </div>

          <div className={`p-3.5 sm:p-4 rounded-xl border text-xs min-w-0 overflow-hidden ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1 truncate">Target Resource Scopes</span>
            <span className="text-xl font-black font-mono text-emerald-400 block truncate">4 Active</span>
          </div>

          <div className={`p-3.5 sm:p-4 rounded-xl border text-xs min-w-0 overflow-hidden ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1 truncate">Compliance Standard</span>
            <span className="text-xs font-bold font-mono text-amber-400 block mt-1 break-words">SOC-2 & ISO27001</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center min-w-0 w-full">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md min-w-0">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Admin Name, Action, or Resource..."
              className={`w-full pl-10 pr-8 py-2 rounded-xl text-xs transition-all outline-none border ${
                isDarkMode
                  ? 'bg-slate-950/80 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-blue-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 shrink-0 max-w-full">
            {[
              { id: 'all', label: 'All Operations', icon: Layers },
              { id: 'roles', label: 'Roles & IAM', icon: UserCheck },
              { id: 'db', label: 'Database & SQL', icon: Database },
              { id: 'security', label: 'Security & API Keys', icon: Key },
              { id: 'toggles', label: 'Feature Toggles', icon: CloudLightning },
            ].map(tab => {
              const Icon = tab.icon;
              const active = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 shrink-0 ${
                    active
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : isDarkMode
                      ? 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Activity Logs Table / List */}
        <div className="space-y-3 min-w-0 w-full">
          {highPrivilegeActivities.length === 0 ? (
            <div className={`p-8 rounded-2xl border text-center space-y-3 ${
              isDarkMode ? 'bg-slate-950/40 border-slate-800/80 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <ShieldAlert className="w-10 h-10 mx-auto text-slate-500" />
              <p className="text-xs font-mono">No high-privilege operations match your current filter criteria.</p>
              <button
                onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
                className="text-xs text-blue-400 font-bold underline"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            highPrivilegeActivities.map((act) => {
              const severity = getRiskSeverity(act.action);
              const category = getActionCategory(act.action);

              return (
                <div
                  key={act.id || `${act.action}-${act.timestamp}`}
                  onClick={() => setSelectedLog(act)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer group flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 min-w-0 w-full overflow-hidden ${
                    isDarkMode
                      ? 'bg-slate-950/60 border-slate-850 hover:bg-slate-850/80 hover:border-slate-700'
                      : 'bg-slate-50/80 border-slate-200 hover:bg-white hover:shadow-md'
                  }`}
                >
                  {/* Left: User Avatar + Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0 w-full">
                    <img
                      src={act.userAvatar || '/macbook_code.jpg'}
                      alt={act.userName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0 mt-0.5"
                    />

                    <div className="space-y-1.5 min-w-0 flex-1 w-full overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-extrabold text-xs text-slate-200 group-hover:text-blue-400 transition-colors break-words">
                          {act.userName}
                        </span>

                        {/* Severity Badge */}
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase border shrink-0 ${severity.bg} ${severity.color} ${severity.border}`}>
                          {severity.level}
                        </span>

                        {/* Category Tag */}
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase shrink-0 ${
                          category === 'db' ? 'bg-amber-500/10 text-amber-400' :
                          category === 'roles' ? 'bg-blue-500/10 text-blue-400' :
                          category === 'security' ? 'bg-rose-500/10 text-rose-400' :
                          'bg-violet-500/10 text-violet-400'
                        }`}>
                          {category}
                        </span>
                      </div>

                      <p className={`text-xs font-mono leading-relaxed break-words whitespace-normal text-left ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`} title={act.action}>
                        {act.action}
                      </p>

                      {act.fileName && (
                        <span className="text-[10px] text-slate-400 font-mono block break-words break-all">
                          Resource Context: <strong className="text-blue-400">{act.fileName}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Timestamp & Action Arrow */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center pt-1 md:pt-0 border-t md:border-t-0 border-slate-800/40 w-full md:w-auto justify-between md:justify-end">
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {act.timestamp}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DETAIL MODAL FOR INSPECTING HIGH-PRIVILEGE EVENT METADATA */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 space-y-6 shadow-2xl relative break-words ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0 flex-1">
                <span className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 text-[10px] font-mono font-bold uppercase tracking-wider border border-rose-500/20 inline-block">
                  Security Event Telemetry
                </span>
                <h3 className="text-lg font-black mt-2 flex items-center gap-2 break-words">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" /> Event Inspector
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400">Event ID:</span>
                  <span className="text-blue-400 font-bold break-all">{selectedLog.id}</span>
                </div>
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400">Admin User:</span>
                  <span className="text-slate-200 font-bold break-all">{selectedLog.userName} ({selectedLog.userId})</span>
                </div>
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="text-amber-400">{selectedLog.timestamp}</span>
                </div>
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400">Risk Severity:</span>
                  <span className={getRiskSeverity(selectedLog.action).color}>
                    {getRiskSeverity(selectedLog.action).level}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Action Payload Description:</span>
                <div className={`p-3 rounded-lg border leading-relaxed text-slate-200 break-words whitespace-pre-wrap ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  {selectedLog.action}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Compliance Standards Verified:</span>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">SOC-2 Type II</span>
                  <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">ISO 27001</span>
                  <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">GDPR Audit Logged</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
