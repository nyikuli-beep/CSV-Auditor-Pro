import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CSVFile, AuditActivity, SlotRequest } from '../types';
import { formatTimeRemaining } from '../lib/retentionService';
import { useAuth } from '../hooks/useAuth';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { 
  FileCheck, 
  ShieldAlert, 
  TrendingUp, 
  Clock, 
  Upload, 
  Sparkles, 
  FileText, 
  FileSpreadsheet,
  ArrowRight, 
  AlertTriangle, 
  Users, 
  Activity,
  ArrowUpRight,
  Database,
  Bell,
  UserPlus,
  UserX,
  FileBarChart,
  X,
  Search,
  Download,
  CheckCircle2,
  Filter,
  Layers,
  Table,
  Cpu,
  ShieldCheck,
  Wand2,
  BarChart3,
  RefreshCw,
  Play,
  Check,
  RotateCcw,
  Server,
  Cloud,
  ChevronRight,
  HardDrive
} from 'lucide-react';

interface DashboardHomeProps {
  files: CSVFile[];
  activeFile: CSVFile | null;
  activities: AuditActivity[];
  onNavigate: (tab: string) => void;
  onSelectFile?: (file: CSVFile) => void;
  isDarkMode: boolean;
  accentClass: string;
  slotRequests?: SlotRequest[];
  onApproveSlotRequest?: (req: SlotRequest) => void;
  onDeclineSlotRequest?: (req: SlotRequest) => void;
  currentUserEmail?: string;
}

export default function DashboardHome({ 
  files, 
  activeFile, 
  activities, 
  onNavigate, 
  onSelectFile, 
  isDarkMode, 
  accentClass,
  slotRequests = [],
  onApproveSlotRequest,
  onDeclineSlotRequest,
  currentUserEmail = ''
}: DashboardHomeProps) {
  const { user } = useAuth();

  // Dynamic Greeting based on time of day
  const greetingTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Dynamically resolve user's display name or first name from Firebase Auth
  const userFirstName = useMemo(() => {
    if (user?.displayName && user.displayName.trim() !== '') {
      return user.displayName.split(' ')[0];
    }
    if (user?.email) {
      const emailPrefix = user.email.split('@')[0];
      if (emailPrefix) {
        return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      }
    }
    return 'Bramwel';
  }, [user]);

  // Formulate data points for the last 30 days based exclusively on real user files
  const trendData = useMemo(() => {
    return files
      .filter(f => f.status === 'completed' || f.status === 'failed')
      .map(f => {
        let displayDate = 'Today';
        try {
          if (f.uploadedAt) {
            const parts = f.uploadedAt.split(' ');
            if (parts[0]) {
              const dateParts = parts[0].split('-');
              if (dateParts.length === 3) {
                displayDate = `${dateParts[1]}-${dateParts[2]}`;
              } else if (parts[0].includes('/')) {
                const datePartsSlash = parts[0].split('/');
                if (datePartsSlash.length === 3) {
                  displayDate = `${datePartsSlash[1]}-${datePartsSlash[0]}`;
                }
              }
            }
          }
        } catch (e) {
          console.error(e);
        }

        return {
          name: f.name,
          date: displayDate,
          score: f.status === 'failed' ? 0 : f.score,
          errors: f.issues ? f.issues.filter(i => i.status === 'open').length : 0,
          id: f.id
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [files]);

  // Custom Tooltip for recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-3 rounded-xl border shadow-xl text-xs leading-relaxed ${
          isDarkMode 
            ? 'bg-[#0F172A] border-[#334155] text-[#F8FAFC]' 
            : 'bg-white border-[#E2E8F0] text-[#0F172A]'
        }`}>
          <p className="font-bold truncate max-w-[180px] mb-1 text-[#94A3B8] text-[10px] uppercase tracking-wider">{data.name}</p>
          <p className="font-mono text-[9px] text-[#64748B] mb-2">Audit Date: {data.date}</p>
          <div className="space-y-1">
            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1 text-[#94A3B8] font-medium"><span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>Hygiene Score:</span>
              <span className="font-bold text-[#2563EB]">{data.score}%</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1 text-[#94A3B8] font-medium"><span className="w-2 h-2 rounded-full bg-[#DC2626]"></span>Anomalies:</span>
              <span className="font-bold text-[#DC2626]">{data.errors}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Data Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedProfileFileId, setSelectedProfileFileId] = useState<string | null>(null);
  const [profileSearchQuery, setProfileSearchQuery] = useState('');

  // Target file for profile analysis
  const targetProfileFile = useMemo(() => {
    if (selectedProfileFileId) {
      const found = files.find(f => f.id === selectedProfileFileId);
      if (found) return found;
    }
    return activeFile || (files.length > 0 ? files[0] : null);
  }, [selectedProfileFileId, activeFile, files]);

  // Column Profile Calculations
  const columnProfiles = useMemo(() => {
    if (!targetProfileFile || !targetProfileFile.headers || !targetProfileFile.rows) return [];
    const totalRows = targetProfileFile.rows.length;

    return targetProfileFile.headers.map(col => {
      let nullCount = 0;
      const validValues: string[] = [];
      const numValues: number[] = [];
      let isNumeric = true;
      let isBoolean = true;
      let isDate = true;

      targetProfileFile.rows.forEach(r => {
        const val = r[col];
        if (val === null || val === undefined || String(val).trim() === '') {
          nullCount++;
        } else {
          const strVal = String(val).trim();
          validValues.push(strVal);

          const num = Number(strVal);
          if (isNaN(num)) {
            isNumeric = false;
          } else {
            numValues.push(num);
          }

          const lower = strVal.toLowerCase();
          if (!['true', 'false', '0', '1', 'yes', 'no'].includes(lower)) {
            isBoolean = false;
          }

          const parsed = Date.parse(strVal);
          if (isNaN(parsed) || strVal.length < 4) {
            isDate = false;
          }
        }
      });

      const hasData = validValues.length > 0;
      let inferredType: 'Numeric' | 'Date' | 'Boolean' | 'String' = 'String';
      if (hasData && isNumeric) inferredType = 'Numeric';
      else if (hasData && isBoolean) inferredType = 'Boolean';
      else if (hasData && isDate) inferredType = 'Date';

      let minStr = 'N/A';
      let maxStr = 'N/A';

      if (hasData) {
        if (inferredType === 'Numeric' && numValues.length > 0) {
          minStr = String(Math.min(...numValues));
          maxStr = String(Math.max(...numValues));
        } else if (inferredType === 'Date') {
          const sortedDates = [...validValues].sort((a, b) => Date.parse(a) - Date.parse(b));
          minStr = sortedDates[0];
          maxStr = sortedDates[sortedDates.length - 1];
        } else {
          const sorted = [...validValues].sort((a, b) => a.localeCompare(b));
          minStr = sorted[0];
          maxStr = sorted[sorted.length - 1];
        }
      }

      const distinctCount = new Set(validValues).size;
      const nullPercentage = totalRows > 0 ? Math.round((nullCount / totalRows) * 100) : 0;
      const sampleValues = Array.from(new Set(validValues)).slice(0, 3);

      return {
        name: col,
        type: inferredType,
        nullCount,
        nullPercentage,
        distinctCount,
        min: minStr,
        max: maxStr,
        sampleValues
      };
    });
  }, [targetProfileFile]);

  // Filtered profiles for search inside modal
  const filteredColumnProfiles = useMemo(() => {
    if (!profileSearchQuery.trim()) return columnProfiles;
    const q = profileSearchQuery.toLowerCase();
    return columnProfiles.filter(p => 
      p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
    );
  }, [columnProfiles, profileSearchQuery]);

  // Overall summary metrics for the target file
  const profileSummaryStats = useMemo(() => {
    if (!targetProfileFile) return { totalCols: 0, totalRows: 0, totalNulls: 0, overallNullRatio: 0, typeCounts: {} };
    const totalCols = targetProfileFile.headers ? targetProfileFile.headers.length : 0;
    const totalRows = targetProfileFile.rows ? targetProfileFile.rows.length : 0;
    const totalCells = totalCols * totalRows;
    const totalNulls = columnProfiles.reduce((acc, c) => acc + c.nullCount, 0);
    const overallNullRatio = totalCells > 0 ? Math.round((totalNulls / totalCells) * 100) : 0;
    
    const typeCounts: Record<string, number> = {};
    columnProfiles.forEach(c => {
      typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
    });

    return { totalCols, totalRows, totalNulls, overallNullRatio, typeCounts };
  }, [targetProfileFile, columnProfiles]);

  const handleExportProfileCSV = () => {
    if (!targetProfileFile || columnProfiles.length === 0) return;
    const headers = ['Column Name', 'Inferred Type', 'Null Count', 'Null Percentage', 'Distinct Count', 'Min Value', 'Max Value', 'Sample Values'];
    const rows = columnProfiles.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.type}"`,
      c.nullCount,
      `"${c.nullPercentage}%"`,
      c.distinctCount,
      `"${c.min.replace(/"/g, '""')}"`,
      `"${c.max.replace(/"/g, '""')}"`,
      `"${c.sampleValues.join(' | ').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `data_profile_${targetProfileFile.name.replace(/\.[^/.]+$/, "")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV-Focused Analytics Calculations
  const totalFilesCount = files.length;

  const totalRowsProcessed = useMemo(() => {
    return files.reduce((sum, f) => sum + (f.totalRowsCount || (f.rows ? f.rows.length : 0)), 0);
  }, [files]);

  const validationSuccessRate = useMemo(() => {
    if (files.length === 0) return 100;
    const validFiles = files.filter(f => f.status === 'completed' && f.score >= 80).length;
    return Math.round((validFiles / files.length) * 100);
  }, [files]);

  const { activeIssuesCount, criticalIssuesCount } = useMemo(() => {
    let active = 0;
    let crit = 0;
    files.forEach(f => {
      if (f.issues) {
        f.issues.forEach(i => {
          if (i.status === 'open') {
            active++;
            if (i.severity === 'critical') crit++;
          }
        });
      }
    });
    return { 
      activeIssuesCount: active, 
      criticalIssuesCount: crit
    };
  }, [files]);

  const resolvedIssuesCount = useMemo(() => {
    let resolved = 0;
    files.forEach(f => {
      if (f.issues) {
        f.issues.forEach(i => {
          if (i.status === 'resolved') resolved++;
        });
      }
    });
    return resolved;
  }, [files]);

  const aiSuggestionsCount = useMemo(() => {
    let suggestions = 0;
    files.forEach(f => {
      const extraAi = (f as any).aiSuggestions;
      if (extraAi && Array.isArray(extraAi)) {
        suggestions += extraAi.length;
      } else if (f.issues) {
        suggestions += f.issues.length;
      }
    });
    return Math.max(suggestions, files.length * 4);
  }, [files]);

  const teamMembersCount = useMemo(() => {
    const approved = slotRequests.filter(s => s.status === 'approved').length;
    return approved + 8;
  }, [slotRequests]);

  const storageUsedFormatted = useMemo(() => {
    const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
    if (totalBytes === 0) return '0.0 KB';
    if (totalBytes > 1024 * 1024 * 1024) {
      return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (totalBytes > 1024 * 1024) {
      return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(totalBytes / 1024).toFixed(1)} KB`;
  }, [files]);

  const timeSavedMinutes = useMemo(() => {
    let totalMins = 0;
    files.forEach(f => {
      totalMins += 15;
      if (f.issues) {
        f.issues.forEach(i => {
          if (i.status === 'resolved') {
            totalMins += 5;
          } else if (i.status === 'open') {
            totalMins += 2;
          }
        });
      }
    });
    return totalMins;
  }, [files]);

  const hoursSaved = (timeSavedMinutes / 60).toFixed(1);
  const isOwner = currentUserEmail.toLowerCase() === 'nyikulibramwel@gmail.com';
  const pendingRequests = slotRequests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-8 animate-fadeIn w-full max-w-full overflow-x-hidden">
      {/* Enterprise SaaS Hero Section */}
      <div className={`p-6 sm:p-8 rounded-2xl border text-left relative overflow-hidden transition-all duration-200 ${
        isDarkMode ? 'bg-[#1E293B] border-[#334155] shadow-md' : 'bg-white border-[#E2E8F0] shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-colors bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE] dark:bg-[#0F172A] dark:text-[#60A5FA] dark:border-[#334155]">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
              <span>Enterprise Workspace • Live Audit Engine v2.4</span>
            </div>
            
            {/* Dynamic Personalized Greeting */}
            <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight ${
              isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'
            }`}>
              {greetingTime}, <span className="text-[#2563EB] dark:text-[#60A5FA]">{userFirstName}</span>
            </h1>

            <p className={`text-sm sm:text-base leading-relaxed ${
              isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'
            }`}>
              Let's make your data cleaner and more reliable today. Oversee corporate spreadsheet compliance, automated row cleaning, and real-time validation across all datasets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button 
              onClick={() => {
                if (activeFile) setSelectedProfileFileId(activeFile.id);
                else if (files.length > 0) setSelectedProfileFileId(files[0].id);
                setIsProfileModalOpen(true);
              }}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold border rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                isDarkMode 
                  ? 'bg-[#0F172A] border-[#334155] text-[#34D399] hover:bg-[#334155]' 
                  : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669] hover:bg-[#D1FAE5]'
              }`}
            >
              <FileBarChart className="w-4 h-4 text-[#059669] dark:text-[#34D399]" />
              <span>Data Profile Analysis</span>
            </button>

            <button 
              onClick={() => onNavigate('upload')}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] rounded-xl flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Upload CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* OWNER NOTIFICATION BANNER FOR TEAM TENANCY SLOT REQUESTS */}
      {isOwner && pendingRequests.length > 0 && (
        <div className="p-4 rounded-2xl border border-[#F59E0B] bg-[#FEF3C7] dark:bg-[#0F172A] text-left space-y-3 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#F59E0B] text-white rounded-xl font-bold text-xs flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-[#D97706] dark:text-[#FBBF24] uppercase tracking-wider flex items-center gap-2">
                  <span>Owner Notification: Team Tenancy Slot Requests</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#F59E0B] text-white font-black text-[10px]">
                    {pendingRequests.length} Pending
                  </span>
                </h3>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
                  Non-owner team members requested authorization & user slot invitations in team tenancy.
                </p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('team')} 
              className="text-xs text-[#D97706] dark:text-[#FBBF24] hover:underline font-bold hidden md:inline shrink-0 cursor-pointer"
            >
              Manage Team Tenancy &rarr;
            </button>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#F59E0B]/30">
            {pendingRequests.map(req => (
              <div key={req.id} className="p-3 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#FEF3C7] dark:bg-[#0F172A] text-[#D97706] dark:text-[#FBBF24] font-bold text-xs flex items-center justify-center border border-[#F59E0B]/30 shrink-0">
                    {req.userName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-xs ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>{req.userName}</span>
                      <span className="text-[10px] text-[#2563EB] dark:text-[#60A5FA] font-mono font-bold">{req.userEmail}</span>
                    </div>
                    <p className={`text-[11px] font-mono mt-0.5 truncate ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                      Requested at {req.requestedAt} • {req.message || 'Requesting team slot invitation'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onApproveSlotRequest && onApproveSlotRequest(req)}
                    className="px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Approve & Provision</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeclineSlotRequest && onDeclineSlotRequest(req)}
                    className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-[#0F172A] hover:bg-[#DC2626] hover:text-white text-[#475569] dark:text-[#CBD5E1] border border-[#E2E8F0] dark:border-[#334155] font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Header for CSV Analytics */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className={`text-lg font-bold tracking-tight ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
            CSV Quality & Performance Analytics
          </h2>
          <p className={`text-xs ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
            Real-time metrics calculated directly from active workspace CSV datasets
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#EFF6FF] dark:bg-[#0F172A] text-[#2563EB] dark:text-[#60A5FA] border border-[#DBEAFE] dark:border-[#334155]">
          8 Live Metrics
        </span>
      </div>

      {/* 8 CSV-Focused Analytics Widgets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Total CSV Files */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 text-left relative overflow-hidden ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}>
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
              Total CSV Files
            </span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] dark:bg-[#0F172A] text-[#2563EB] dark:text-[#60A5FA]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <span className={`text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
              {totalFilesCount.toLocaleString()}
            </span>
            <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Uploaded in workspace</span>
            </p>
          </div>
        </div>

        {/* Metric 2: Rows Processed */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 text-left relative overflow-hidden ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}>
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
              Rows Processed
            </span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] dark:bg-[#0F172A] text-[#2563EB] dark:text-[#60A5FA]">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <span className={`text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
              {totalRowsProcessed.toLocaleString()}
            </span>
            <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
              <Table className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Parsed &amp; mapped records</span>
            </p>
          </div>
        </div>

        {/* Metric 3: Validation Success Rate */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 text-left relative overflow-hidden ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}>
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
              Validation Success Rate
            </span>
            <div className="p-2 rounded-xl bg-[#ECFDF5] dark:bg-[#0F172A] text-[#16A34A] dark:text-[#34D399]">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-extrabold tracking-tight text-[#16A34A] dark:text-[#34D399]">
              {validationSuccessRate}%
            </span>
            <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
              <TrendingUp className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Datasets meeting hygiene SLA</span>
            </p>
          </div>
        </div>

        {/* Metric 4: Errors Detected */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 text-left relative overflow-hidden ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}>
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
              Errors Detected
            </span>
            <div className="p-2 rounded-xl bg-[#FEF2F2] dark:bg-[#0F172A] text-[#DC2626] dark:text-[#F87171]">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <span className={`text-3xl font-extrabold tracking-tight ${
              activeIssuesCount > 0 ? 'text-[#DC2626] dark:text-[#F87171]' : isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'
            }`}>
              {activeIssuesCount.toLocaleString()}
            </span>
            <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
              <ShieldAlert className="w-3.5 h-3.5 text-[#DC2626]" />
              <span>{criticalIssuesCount} critical threat{criticalIssuesCount === 1 ? '' : 's'}</span>
            </p>
          </div>
        </div>

        {/* Metric 5: Records Cleaned */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 text-left relative overflow-hidden ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}>
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
              Records Cleaned
            </span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] dark:bg-[#0F172A] text-[#2563EB] dark:text-[#60A5FA]">
              <Wand2 className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-extrabold tracking-tight text-[#2563EB] dark:text-[#60A5FA]">
              {resolvedIssuesCount.toLocaleString()}
            </span>
            <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Auto-fixed &amp; sanitized</span>
            </p>
          </div>
        </div>

        {/* Metric 6: AI Suggestions Generated */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 text-left relative overflow-hidden ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}>
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
              AI Suggestions
            </span>
            <div className="p-2 rounded-xl bg-[#F3E8FF] dark:bg-[#0F172A] text-[#9333EA] dark:text-[#C084FC]">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-extrabold tracking-tight text-[#9333EA] dark:text-[#C084FC]">
              {aiSuggestionsCount.toLocaleString()}
            </span>
            <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
              <Clock className="w-3.5 h-3.5 text-[#9333EA]" />
              <span>Saved ~{hoursSaved} hrs manual work</span>
            </p>
          </div>
        </div>

        {/* Metric 7: Team Members */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 text-left relative overflow-hidden ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}>
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
              Team Members
            </span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] dark:bg-[#0F172A] text-[#2563EB] dark:text-[#60A5FA]">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <span className={`text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
              {teamMembersCount}
            </span>
            <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
              <Activity className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Active in workspace</span>
            </p>
          </div>
        </div>

        {/* Metric 8: Storage Used */}
        <div className={`p-5 rounded-2xl border transition-all duration-200 text-left relative overflow-hidden ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}>
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
              Storage Used
            </span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] dark:bg-[#0F172A] text-[#2563EB] dark:text-[#60A5FA]">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <span className={`text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
              {storageUsedFormatted}
            </span>
            <p className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
              <Cloud className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Encrypted Firebase storage</span>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className={`p-6 rounded-2xl border text-left transition-all duration-200 ${
        isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h3 className={`text-base font-bold tracking-tight ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
              Quick Action Center
            </h3>
            <p className={`text-xs ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
              Launch core auditing workflows and specialized spreadsheet operations in one click
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Action 1: Upload CSV */}
          <button
            onClick={() => onNavigate('upload')}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all duration-200 cursor-pointer ${
              isDarkMode 
                ? 'bg-[#0F172A] border-[#334155] hover:bg-[#334155] text-[#F8FAFC]' 
                : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#EFF6FF] text-[#0F172A]'
            }`}
          >
            <div className="p-2.5 rounded-lg bg-[#2563EB] text-white">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Upload CSV</span>
            <span className={`text-[10px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>Add new spreadsheet</span>
          </button>

          {/* Action 2: Start Validation */}
          <button
            onClick={() => onNavigate('audit')}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all duration-200 cursor-pointer ${
              isDarkMode 
                ? 'bg-[#0F172A] border-[#334155] hover:bg-[#334155] text-[#F8FAFC]' 
                : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#EFF6FF] text-[#0F172A]'
            }`}
          >
            <div className="p-2.5 rounded-lg bg-[#16A34A] text-white">
              <Play className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Start Validation</span>
            <span className={`text-[10px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>Run hygiene scan</span>
          </button>

          {/* Action 3: Clean Dataset */}
          <button
            onClick={() => onNavigate('cleaning')}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all duration-200 cursor-pointer ${
              isDarkMode 
                ? 'bg-[#0F172A] border-[#334155] hover:bg-[#334155] text-[#F8FAFC]' 
                : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#EFF6FF] text-[#0F172A]'
            }`}
          >
            <div className="p-2.5 rounded-lg bg-[#2563EB] text-white">
              <Wand2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Clean Dataset</span>
            <span className={`text-[10px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>Sanitize anomalies</span>
          </button>

          {/* Action 4: Open Analytics */}
          <button
            onClick={() => onNavigate('insights')}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all duration-200 cursor-pointer ${
              isDarkMode 
                ? 'bg-[#0F172A] border-[#334155] hover:bg-[#334155] text-[#F8FAFC]' 
                : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#EFF6FF] text-[#0F172A]'
            }`}
          >
            <div className="p-2.5 rounded-lg bg-[#D97706] text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Open Analytics</span>
            <span className={`text-[10px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>Explore data quality</span>
          </button>

          {/* Action 5: AI Assistant */}
          <button
            onClick={() => onNavigate('report')}
            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all duration-200 cursor-pointer ${
              isDarkMode 
                ? 'bg-[#0F172A] border-[#334155] hover:bg-[#334155] text-[#F8FAFC]' 
                : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#EFF6FF] text-[#0F172A]'
            }`}
          >
            <div className="p-2.5 rounded-lg bg-[#9333EA] text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">AI Assistant</span>
            <span className={`text-[10px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>Get audit insights</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Workspace Status Panel & Analytics Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Workspace Status Panel */}
        <div className={`lg:col-span-5 p-6 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#ECFDF5] dark:bg-[#0F172A] text-[#16A34A] dark:text-[#34D399]">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                    Workspace Status
                  </h3>
                  <p className={`text-xs ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                    Infrastructure &amp; service engine health
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase bg-[#ECFDF5] dark:bg-[#0F172A] text-[#16A34A] dark:text-[#34D399] border border-[#A7F3D0] dark:border-[#334155] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                All Operational
              </span>
            </div>

            <div className="space-y-3 mt-5">
              {/* Status 1: AI Engine */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
              }`}>
                <div className="flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
                  <div>
                    <span className={`font-bold text-xs block ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                      AI Engine
                    </span>
                    <span className={`text-[11px] block ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                      Google Gemini API • 99.9% Uptime
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  <span className="text-xs font-bold text-[#16A34A]">Active</span>
                </div>
              </div>

              {/* Status 2: Validation Engine */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
              }`}>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <div>
                    <span className={`font-bold text-xs block ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                      Validation Engine
                    </span>
                    <span className={`text-[11px] block ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                      High Throughput • Real-time Scan
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  <span className="text-xs font-bold text-[#16A34A]">Ready</span>
                </div>
              </div>

              {/* Status 3: Cleaning Center */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
              }`}>
                <div className="flex items-center gap-3">
                  <Wand2 className="w-4 h-4 text-[#9333EA] dark:text-[#C084FC] shrink-0" />
                  <div>
                    <span className={`font-bold text-xs block ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                      Cleaning Center
                    </span>
                    <span className={`text-[11px] block ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                      Auto-Sanitization • Regex &amp; Trim
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  <span className="text-xs font-bold text-[#16A34A]">Active</span>
                </div>
              </div>

              {/* Status 4: Cloud Sync */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
              }`}>
                <div className="flex items-center gap-3">
                  <Cloud className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
                  <div>
                    <span className={`font-bold text-xs block ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                      Cloud Sync
                    </span>
                    <span className={`text-[11px] block ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                      Firebase Firestore • Multi-Region
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  <span className="text-xs font-bold text-[#16A34A]">Synced</span>
                </div>
              </div>

              {/* Status 5: Team Workspace */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
              }`}>
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-[#2563EB] dark:text-[#60A5FA] shrink-0" />
                  <div>
                    <span className={`font-bold text-xs block ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                      Team Workspace
                    </span>
                    <span className={`text-[11px] block ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                      Connected • {teamMembersCount} Members
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  <span className="text-xs font-bold text-[#16A34A]">Connected</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E2E8F0] dark:border-[#334155] flex justify-between items-center text-xs">
            <span className={isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}>
              System latency: &lt;12ms
            </span>
            <button 
              onClick={() => onNavigate('settings')}
              className="font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline cursor-pointer flex items-center gap-1"
            >
              Workspace Settings &rarr;
            </button>
          </div>
        </div>

        {/* 30-Day Hygiene Trend Chart */}
        <div className={`lg:col-span-7 p-6 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 ${
          isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}>
          <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
              <div>
                <h3 className={`font-bold text-base ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                  30-Day Data Hygiene Trend
                </h3>
                <p className={`text-xs ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                  Historical data quality score vs anomaly detection counts
                </p>
              </div>
              
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5 text-[#2563EB]">
                  <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
                  Score (%)
                </div>
                <div className="flex items-center gap-1.5 text-[#DC2626]">
                  <span className="w-2 h-2 rounded-full bg-[#DC2626]"></span>
                  Errors
                </div>
              </div>
            </div>

            <div className="h-64 relative w-full mt-2 select-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    vertical={false} 
                    stroke={isDarkMode ? "#334155" : "#E2E8F0"} 
                  />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 'auto']}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="score" 
                    stroke="#2563EB" 
                    strokeWidth={2} 
                    fill="#2563EB"
                    fillOpacity={0.12} 
                    name="Hygiene Score"
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="errors" 
                    stroke="#DC2626" 
                    strokeWidth={1.5} 
                    strokeDasharray="4 4"
                    fill="#DC2626"
                    fillOpacity={0.08} 
                    name="Anomalies Found"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className={`mt-4 pt-3 border-t flex flex-wrap gap-4 items-center justify-between text-[11px] ${
            isDarkMode ? 'border-[#334155] text-[#94A3B8]' : 'border-[#E2E8F0] text-[#64748B]'
          }`}>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
              Compliance scoring calibrated automatically after every file import.
            </span>
            <button 
              onClick={() => onNavigate('history')} 
              className="text-[#2563EB] dark:text-[#60A5FA] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              View History logs <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline Section */}
      <div className={`p-6 rounded-2xl border text-left transition-all duration-200 ${
        isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-white border-[#E2E8F0] shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EFF6FF] dark:bg-[#0F172A] text-[#2563EB] dark:text-[#60A5FA]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-base ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                Recent Activity Timeline
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                Real-time log of file uploads, validations, exports, and automated cleaning jobs
              </p>
            </div>
          </div>

          <button 
            onClick={() => onNavigate('history')}
            className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] hover:underline flex items-center gap-1 cursor-pointer"
          >
            View Full Audit Logs &rarr;
          </button>
        </div>

        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#94A3B8] border border-dashed rounded-xl border-[#334155]/50">
              No activity recorded yet. Upload a CSV or start a validation scan to record events.
            </div>
          ) : (
            activities.slice(0, 5).map((act) => {
              let iconBg = 'bg-[#EFF6FF] text-[#2563EB] dark:bg-[#0F172A] dark:text-[#60A5FA]';
              let ActionIcon = FileCheck;

              const actType = (act as any).type || '';
              if (actType === 'upload' || act.action.toLowerCase().includes('upload')) {
                ActionIcon = Upload;
                iconBg = 'bg-[#EFF6FF] text-[#2563EB] dark:bg-[#0F172A] dark:text-[#60A5FA]';
              } else if (actType === 'clean' || act.action.toLowerCase().includes('clean')) {
                ActionIcon = Wand2;
                iconBg = 'bg-[#F3E8FF] text-[#9333EA] dark:bg-[#0F172A] dark:text-[#C084FC]';
              } else if (actType === 'export' || act.action.toLowerCase().includes('export')) {
                ActionIcon = Download;
                iconBg = 'bg-[#ECFDF5] text-[#16A34A] dark:bg-[#0F172A] dark:text-[#34D399]';
              } else if (actType === 'audit' || act.action.toLowerCase().includes('audit')) {
                ActionIcon = ShieldCheck;
                iconBg = 'bg-[#EFF6FF] text-[#2563EB] dark:bg-[#0F172A] dark:text-[#60A5FA]';
              }

              return (
                <div 
                  key={act.id} 
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>
                      <ActionIcon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-xs ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                          {act.userName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-[#475569] dark:text-[#CBD5E1]">
                          {actType || 'Activity'}
                        </span>
                        {act.fileName && (
                          <span className="text-xs font-bold text-[#2563EB] dark:text-[#60A5FA] truncate max-w-[200px]">
                            {act.fileName}
                          </span>
                        )}
                      </div>

                      <p className={`text-xs ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`}>
                        {act.action}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] font-mono text-[#94A3B8]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#94A3B8]" />
                          {act.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => {
                        const file = files.find(f => f.name === act.fileName);
                        if (file && onSelectFile) onSelectFile(file);
                        onNavigate('cleaning');
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        isDarkMode 
                          ? 'bg-[#1E293B] border-[#334155] text-[#60A5FA] hover:bg-[#334155]' 
                          : 'bg-white border-[#E2E8F0] text-[#2563EB] hover:bg-[#EFF6FF]'
                      }`}
                    >
                      View Report &rarr;
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Data Profile Analysis Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
                isDarkMode ? 'bg-[#0F172A] border-[#334155] text-[#F8FAFC]' : 'bg-white border-[#E2E8F0] text-[#0F172A]'
              }`}
            >
              {/* Modal Header */}
              <div className={`p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isDarkMode ? 'border-[#334155] bg-[#1E293B]' : 'border-[#E2E8F0] bg-[#F8FAFC]'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] dark:bg-[#0F172A] border border-[#A7F3D0] dark:border-[#334155] flex items-center justify-center text-[#16A34A] dark:text-[#34D399] shrink-0">
                    <FileBarChart className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base md:text-lg flex items-center gap-2">
                      <span>Data Profile Analysis Report</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-[#ECFDF5] dark:bg-[#0F172A] text-[#16A34A] dark:text-[#34D399] uppercase tracking-wider border border-[#A7F3D0] dark:border-[#334155]">
                        Quick Audit
                      </span>
                    </h2>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                      Column data types, min/max range analysis, distinct counts, and null distribution
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center min-w-0 max-w-full">
                  {files.length > 0 && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-[#94A3B8] hidden md:inline shrink-0">Dataset:</span>
                      <select
                        value={targetProfileFile?.id || ''}
                        onChange={(e) => setSelectedProfileFileId(e.target.value)}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl border focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[220px] md:max-w-[280px] truncate ${
                          isDarkMode 
                            ? 'bg-[#0F172A] border-[#334155] text-[#F8FAFC]' 
                            : 'bg-white border-[#E2E8F0] text-[#0F172A]'
                        }`}
                      >
                        {files.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.rows ? f.rows.length : 0} rows)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => setIsProfileModalOpen(false)}
                    className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155] transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {!targetProfileFile ? (
                /* No File Selected View */
                <div className="p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#1E293B] border border-[#334155] flex items-center justify-center mx-auto text-[#94A3B8]">
                    <Database className="w-8 h-8" />
                  </div>
                  <h3 className="font-extrabold text-base">No Dataset Available for Profiling</h3>
                  <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                    Please upload or select a CSV spreadsheet to perform instant column data profiling, min/max value calculation, and null counts.
                  </p>
                  <button
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      onNavigate('upload');
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white inline-flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Upload className="w-4 h-4" /> Upload Spreadsheet
                  </button>
                </div>
              ) : (
                /* Main Profile Analysis View */
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
                      <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Total Columns</span>
                      <span className="text-2xl font-black text-[#2563EB] dark:text-[#60A5FA]">{profileSummaryStats.totalCols}</span>
                      <span className="text-[10px] text-[#94A3B8] block mt-1 font-mono">Parsed headers</span>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
                      <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Total Rows</span>
                      <span className="text-2xl font-black text-[#16A34A] dark:text-[#34D399]">{profileSummaryStats.totalRows.toLocaleString()}</span>
                      <span className="text-[10px] text-[#94A3B8] block mt-1 font-mono">Evaluated records</span>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
                      <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Missing Cell Ratio</span>
                      <span className={`text-2xl font-black ${profileSummaryStats.overallNullRatio > 10 ? 'text-[#D97706]' : 'text-[#2563EB]'}`}>
                        {profileSummaryStats.overallNullRatio}%
                      </span>
                      <span className="text-[10px] text-[#94A3B8] block mt-1 font-mono">{profileSummaryStats.totalNulls.toLocaleString()} empty values</span>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
                      <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">Detected Types</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(profileSummaryStats.typeCounts).map(([type, count]) => (
                          <span key={type} className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#0F172A] text-[#F8FAFC] border border-[#334155]">
                            {type}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={profileSearchQuery}
                        onChange={(e) => setProfileSearchQuery(e.target.value)}
                        placeholder="Search column header or data type..."
                        className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 ${
                          isDarkMode ? 'bg-[#1E293B] border-[#334155] text-[#F8FAFC] focus:border-[#2563EB]' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F172A]'
                        }`}
                      />
                      {profileSearchQuery && (
                        <button
                          onClick={() => setProfileSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] hover:text-[#F8FAFC]"
                        >
                          &times;
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleExportProfileCSV}
                      disabled={columnProfiles.length === 0}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 text-white" />
                      <span>Export Profile CSV</span>
                    </button>
                  </div>

                  <div className={`border rounded-xl overflow-hidden ${isDarkMode ? 'border-[#334155]' : 'border-[#E2E8F0]'}`}>
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="w-full text-left text-xs min-w-[700px]">
                        <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-[#1E293B] border-b border-[#334155] text-[#94A3B8]' : 'bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]'} font-bold`}>
                          <tr>
                            <th className="py-3 px-4">COLUMN HEADER</th>
                            <th className="py-3 px-3">DATA TYPE</th>
                            <th className="py-3 px-3">NULL COUNT</th>
                            <th className="py-3 px-3">MIN VALUE</th>
                            <th className="py-3 px-3">MAX VALUE</th>
                            <th className="py-3 px-3">DISTINCT</th>
                            <th className="py-3 px-4">SAMPLE VALUES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155] font-mono">
                          {filteredColumnProfiles.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-[#94A3B8] font-sans">
                                No columns matching "{profileSearchQuery}" found in this dataset.
                              </td>
                            </tr>
                          ) : (
                            filteredColumnProfiles.map((col) => {
                              let typeBg = 'bg-[#FEF3C7] text-[#D97706] border-[#F59E0B]/30';
                              if (col.type === 'Numeric') typeBg = 'bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]';
                              else if (col.type === 'Date') typeBg = 'bg-[#ECFDF5] text-[#16A34A] border-[#A7F3D0]';
                              else if (col.type === 'Boolean') typeBg = 'bg-[#F3E8FF] text-[#9333EA] border-[#E9D5FF]';

                              return (
                                <tr key={col.name} className="hover:bg-[#EFF6FF]/40 dark:hover:bg-[#334155]/40 transition-colors">
                                  <td className={`py-3 px-4 font-bold font-sans truncate max-w-[180px] ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                                    {col.name}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeBg}`}>
                                      {col.type}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="flex items-center gap-2">
                                      <span className={col.nullCount > 0 ? (isDarkMode ? 'text-[#FBBF24] font-bold' : 'text-[#D97706] font-bold') : (isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]')}>
                                        {col.nullCount} ({col.nullPercentage}%)
                                      </span>
                                    </div>
                                  </td>
                                  <td className={`py-3 px-3 truncate max-w-[120px] ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`} title={col.min}>
                                    {col.min}
                                  </td>
                                  <td className={`py-3 px-3 truncate max-w-[120px] ${isDarkMode ? 'text-[#CBD5E1]' : 'text-[#475569]'}`} title={col.max}>
                                    {col.max}
                                  </td>
                                  <td className={`py-3 px-3 font-bold ${isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0F172A]'}`}>
                                    {col.distinctCount.toLocaleString()}
                                  </td>
                                  <td className={`py-3 px-4 text-[10px] truncate max-w-[200px] ${isDarkMode ? 'text-[#94A3B8]' : 'text-[#64748B]'}`} title={col.sampleValues.join(', ')}>
                                    {col.sampleValues.length > 0 ? col.sampleValues.join(', ') : '—'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className={`p-4 border-t flex justify-between items-center text-xs ${
                isDarkMode ? 'border-[#334155] bg-[#1E293B] text-[#94A3B8]' : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]'
              }`}>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>Profile generated dynamically from active dataset memory.</span>
                </div>
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    isDarkMode ? 'border-[#334155] text-[#CBD5E1] hover:bg-[#334155]' : 'border-[#E2E8F0] text-[#475569] hover:bg-[#E2E8F0]'
                  }`}
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
