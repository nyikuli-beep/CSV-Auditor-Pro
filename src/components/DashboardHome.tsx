import { useState, useMemo } from 'react';
import { CSVFile, AuditActivity } from '../types';
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
  ArrowRight, 
  AlertTriangle, 
  Users, 
  Activity,
  ArrowUpRight,
  Database,
  Calculator
} from 'lucide-react';

interface DashboardHomeProps {
  files: CSVFile[];
  activeFile: CSVFile | null;
  activities: AuditActivity[];
  onNavigate: (tab: string) => void;
  onSelectFile?: (file: CSVFile) => void;
  isDarkMode: boolean;
  accentClass: string;
}

export default function DashboardHome({ files, activeFile, activities, onNavigate, onSelectFile, isDarkMode, accentClass }: DashboardHomeProps) {
  // Formulate data points for the last 30 days
  const trendData = useMemo(() => {
    // Base historical audits over last 30 days
    const baseAudits = [
      { name: 'marketing_leads_raw.csv', date: '06-12', score: 45, errors: 28 },
      { name: 'ngo_donors_v1.csv', date: '06-16', score: 58, errors: 19 },
      { name: 'payroll_temp_unclean.csv', date: '06-20', score: 72, errors: 11 },
      { name: 'Company_Q2_Transactions_Messy.csv', date: '06-23', score: 68, errors: 12 },
      { name: 'office_supplies_invent.csv', date: '06-28', score: 84, errors: 6 },
      { name: 'billing_statement_q2.csv', date: '07-02', score: 91, errors: 4 },
      { name: 'employee_roster_final.csv', date: '07-08', score: 97, errors: 1 },
    ];

    // Map any files that are currently uploaded and completed/failed
    const userAudits = files
      .filter(f => f.status === 'completed' || f.status === 'failed')
      .map(f => {
        let displayDate = '07-10';
        try {
          if (f.uploadedAt) {
            const parts = f.uploadedAt.split(' ');
            if (parts[0]) {
              const dateParts = parts[0].split('-');
              if (dateParts.length === 3) {
                displayDate = `${dateParts[1]}-${dateParts[2]}`; // MM-DD
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
      });

    // Merge them: filter out base audits that have the same name as user uploaded files
    const userFileNames = new Set(userAudits.map(u => u.name));
    const cleanBaseAudits = baseAudits.filter(b => !userFileNames.has(b.name));

    const combined = [...cleanBaseAudits, ...userAudits];

    // Sort by date (MM-DD)
    return combined.sort((a, b) => a.date.localeCompare(b.date));
  }, [files]);

  // Custom Tooltip for recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-3 rounded-xl border shadow-xl text-xs leading-relaxed ${
          isDarkMode 
            ? 'bg-slate-950 border-slate-800 text-slate-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <p className="font-bold truncate max-w-[180px] mb-1 text-slate-400 text-[10px] uppercase tracking-wider">{data.name}</p>
          <p className="font-mono text-[9px] text-slate-500 mb-2">Audit Date: {data.date}</p>
          <div className="space-y-1">
            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1 text-slate-400 font-medium"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Hygiene Score:</span>
              <span className="font-bold text-blue-500">{data.score}%</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1 text-slate-400 font-medium"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Anomalies:</span>
              <span className="font-bold text-rose-500">{data.errors}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const [activePanel, setActivePanel] = useState<'records' | 'issues' | 'savings' | null>(null);
  const [hourlyRate, setHourlyRate] = useState<number>(75);

  const totalAuditedFiles = files.length;
  const completedAudits = files.filter(f => f.status === 'completed').length;
  
  // Calculate aggregate score
  const completedWithScore = files.filter(f => f.status === 'completed' && f.score > 0);
  const avgScore = completedWithScore.length > 0 
    ? Math.round(completedWithScore.reduce((sum, f) => sum + f.score, 0) / completedWithScore.length) 
    : 100;

  // Real-time Calculation 1: Total Records Audited
  const totalRecords = useMemo(() => {
    return files.reduce((sum, f) => sum + (f.rows ? f.rows.length : 0), 0);
  }, [files]);

  // Real-time Calculation 2: Active Hygiene Issues Breakdown
  const { activeIssuesCount, criticalIssuesCount, warningIssuesCount, infoIssuesCount } = useMemo(() => {
    let active = 0;
    let crit = 0;
    let warn = 0;
    let info = 0;
    files.forEach(f => {
      if (f.issues) {
        f.issues.forEach(i => {
          if (i.status === 'open') {
            active++;
            if (i.severity === 'critical') crit++;
            else if (i.severity === 'warning') warn++;
            else info++;
          }
        });
      }
    });
    return { 
      activeIssuesCount: active, 
      criticalIssuesCount: crit, 
      warningIssuesCount: warn, 
      infoIssuesCount: info 
    };
  }, [files]);

  // Real-time Calculation 3: Time Saved with AI
  const timeSavedMinutes = useMemo(() => {
    let totalMins = 0;
    files.forEach(f => {
      // 15 minutes base per audited file (delimiter scanning, structural mapping, etc.)
      totalMins += 15;
      if (f.issues) {
        f.issues.forEach(i => {
          if (i.status === 'resolved') {
            totalMins += 5; // 5 minutes per automated resolution action
          } else if (i.status === 'open') {
            totalMins += 2; // 2 minutes saved by real-time scanning & dynamic recommendation
          }
        });
      }
    });
    return totalMins;
  }, [files]);

  const hoursSaved = (timeSavedMinutes / 60).toFixed(1);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Audit Workspace</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Overview of your corporate spreadsheet compliance and quality scoring.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => onNavigate('upload')}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-xl flex items-center gap-2 shadow hover:opacity-90 transition-all cursor-pointer ${accentClass}`}
          >
            <Upload className="w-4 h-4" /> Upload CSV
          </button>
          <button 
            onClick={() => onNavigate('insights')}
            className={`px-4 py-2 text-sm font-semibold border rounded-xl flex items-center gap-2 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
          >
            <Sparkles className="w-4 h-4 text-blue-500" /> AI Insights
          </button>
        </div>
      </div>

      {/* Interactive KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Records Audited */}
        <div 
          onClick={() => setActivePanel(activePanel === 'records' ? null : 'records')}
          className={`p-5 rounded-xl border cursor-pointer select-none transition-all duration-300 relative overflow-hidden group ${
            activePanel === 'records' 
              ? isDarkMode 
                ? 'bg-blue-950/40 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30' 
                : 'bg-blue-50/70 border-blue-500 shadow-sm ring-1 ring-blue-500/20'
              : isDarkMode 
                ? 'bg-[#131b2e] border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/40' 
                : 'bg-white border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md'
          }`}
          id="kpi-records-card"
        >
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Records Audited</span>
            <div className={`p-2 rounded-xl transition-colors ${
              activePanel === 'records' 
                ? 'bg-blue-500 text-white' 
                : isDarkMode ? 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
            }`}>
              <Database className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {totalRecords.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] mt-2">
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                Across {files.length} dataset{files.length === 1 ? '' : 's'}
              </span>
              <span className="text-blue-500 font-bold flex items-center gap-0.5 group-hover:underline">
                {activePanel === 'records' ? 'Collapse' : 'Breakdown'} &rarr;
              </span>
            </div>
          </div>
          {/* Bottom highlight bar */}
          <div className={`absolute bottom-0 left-0 right-0 h-1 transition-all ${activePanel === 'records' ? 'bg-blue-500' : 'bg-transparent group-hover:bg-blue-500/30'}`} />
        </div>

        {/* Card 2: Active Hygiene Issues */}
        <div 
          onClick={() => setActivePanel(activePanel === 'issues' ? null : 'issues')}
          className={`p-5 rounded-xl border cursor-pointer select-none transition-all duration-300 relative overflow-hidden group ${
            activePanel === 'issues' 
              ? isDarkMode 
                ? 'bg-rose-950/30 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30' 
                : 'bg-rose-50/60 border-rose-500 shadow-sm ring-1 ring-rose-500/20'
              : isDarkMode 
                ? 'bg-[#131b2e] border-slate-800 hover:border-rose-500/50 hover:bg-slate-900/40' 
                : 'bg-white border-slate-200 shadow-sm hover:border-rose-300 hover:shadow-md'
          }`}
          id="kpi-issues-card"
        >
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active Hygiene Issues</span>
            <div className={`p-2 rounded-xl transition-colors ${
              activePanel === 'issues' 
                ? 'bg-rose-500 text-white' 
                : isDarkMode ? 'bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'
            }`}>
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black tracking-tight ${activeIssuesCount > 0 ? 'text-rose-500' : isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {activeIssuesCount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] mt-2">
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                {criticalIssuesCount} critical threats
              </span>
              <span className="text-rose-500 font-bold flex items-center gap-0.5 group-hover:underline">
                {activePanel === 'issues' ? 'Collapse' : 'Severity Matrix'} &rarr;
              </span>
            </div>
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-1 transition-all ${activePanel === 'issues' ? 'bg-rose-500' : 'bg-transparent group-hover:bg-rose-500/30'}`} />
        </div>

        {/* Card 3: Time Saved with AI */}
        <div 
          onClick={() => setActivePanel(activePanel === 'savings' ? null : 'savings')}
          className={`p-5 rounded-xl border cursor-pointer select-none transition-all duration-300 relative overflow-hidden group ${
            activePanel === 'savings' 
              ? isDarkMode 
                ? 'bg-violet-950/30 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/30' 
                : 'bg-violet-50/60 border-violet-500 shadow-sm ring-1 ring-violet-500/20'
              : isDarkMode 
                ? 'bg-[#131b2e] border-slate-800 hover:border-violet-500/50 hover:bg-slate-900/40' 
                : 'bg-white border-slate-200 shadow-sm hover:border-violet-300 hover:shadow-md'
          }`}
          id="kpi-savings-card"
        >
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Time Saved with AI</span>
            <div className={`p-2 rounded-xl transition-colors ${
              activePanel === 'savings' 
                ? 'bg-violet-500 text-white' 
                : isDarkMode ? 'bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20' : 'bg-violet-50 text-violet-600 group-hover:bg-violet-100'
            }`}>
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-violet-500">
                {hoursSaved} hrs
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] mt-2">
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                Auto-rules &amp; cleanups
              </span>
              <span className="text-violet-500 font-bold flex items-center gap-0.5 group-hover:underline">
                {activePanel === 'savings' ? 'Collapse ROI' : 'Calculate ROI'} &rarr;
              </span>
            </div>
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-1 transition-all ${activePanel === 'savings' ? 'bg-violet-500' : 'bg-transparent group-hover:bg-violet-500/30'}`} />
        </div>

        {/* Card 4: Average Data Quality Score */}
        <div className={`p-5 rounded-xl border relative overflow-hidden group ${
          isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`} id="kpi-score-card">
          <div className="flex justify-between items-start mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Data Quality Score</span>
            <div className={`p-2 rounded-xl ${
              isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-emerald-500">{avgScore}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] mt-2">
              <span className={`font-bold px-1.5 py-0.25 rounded ${
                avgScore > 80 
                  ? isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                  : isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'
              }`}>
                {avgScore > 80 ? 'Excellent' : 'Needs Action'}
              </span>
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Compliance</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/30" />
        </div>
      </div>

      {/* Drill-down Interactive Panels */}
      {activePanel === 'records' && (
        <div className={`p-6 rounded-xl border animate-fadeIn transition-all ${
          isDarkMode ? 'bg-[#0f172a] border-blue-500/30' : 'bg-blue-50/30 border-blue-200 shadow-sm'
        }`} id="drilldown-records">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-extrabold text-sm md:text-base flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" /> Total Records Audited Breakdown
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Parsed row volume, column dimensions, and contribution weights per active dataset.
              </p>
            </div>
            <button 
              onClick={() => setActivePanel(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-500 px-2 py-1 rounded hover:bg-slate-500/10"
            >
              Close Panel &times;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'} font-bold`}>
                  <th className="pb-3 pl-2">SPREADSHEET NAME</th>
                  <th className="pb-3">FILE SIZE</th>
                  <th className="pb-3">COLUMNS (HEADERS)</th>
                  <th className="pb-3 text-right pr-4">ROWS PARSED</th>
                  <th className="pb-3 text-center">VOLUME CONTRIBUTION</th>
                  <th className="pb-3 text-right pr-2">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/20">
                {files.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                      No spreadsheets uploaded. Upload your first dataset to start parsing records!
                    </td>
                  </tr>
                ) : (
                  files.map((file) => {
                    const rowCount = file.rows ? file.rows.length : 0;
                    const contributionPct = totalRecords > 0 ? (rowCount / totalRecords) * 100 : 0;
                    const formattedSize = file.size > 1024 * 1024 
                      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
                      : `${(file.size / 1024).toFixed(1)} KB`;
                    
                    return (
                      <tr 
                        key={file.id} 
                        className={`group hover:bg-slate-500/5 transition-colors`}
                      >
                        <td className="py-3 pl-2 font-bold truncate max-w-[200px]">{file.name}</td>
                        <td className="py-3 font-mono text-slate-400">{formattedSize}</td>
                        <td className="py-3 font-mono">
                          <span className="font-bold">{file.headers?.length || 0}</span> columns
                        </td>
                        <td className="py-3 text-right pr-4 font-black text-blue-500 font-mono">
                          {rowCount.toLocaleString()}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2 justify-center max-w-[150px] mx-auto">
                            <div className="w-full bg-slate-700/20 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-blue-500 h-1.5 rounded-full" 
                                style={{ width: `${contributionPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 min-w-[30px] text-right">
                              {contributionPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right pr-2">
                          <button
                            onClick={() => {
                              if (onSelectFile) onSelectFile(file);
                              onNavigate('clean');
                            }}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white' 
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white'
                            }`}
                          >
                            Hygiene Controls &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activePanel === 'issues' && (
        <div className={`p-6 rounded-xl border animate-fadeIn transition-all ${
          isDarkMode ? 'bg-[#0f172a] border-rose-500/30' : 'bg-rose-50/30 border-rose-200 shadow-sm'
        }`} id="drilldown-issues">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-extrabold text-sm md:text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" /> Active Hygiene Anomaly Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Real-time severity classification and categorization of open errors across current workspace datasets.
              </p>
            </div>
            <button 
              onClick={() => setActivePanel(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-500 px-2 py-1 rounded hover:bg-slate-500/10"
            >
              Close Panel &times;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Severity Distribution */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5">Severity Distribution</h4>
              <div className="space-y-3">
                {/* Critical */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-rose-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      Critical Threats
                    </span>
                    <span className="font-mono font-bold">{criticalIssuesCount}</span>
                  </div>
                  <div className="w-full bg-slate-700/20 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-2 rounded-full" 
                      style={{ width: `${activeIssuesCount > 0 ? (criticalIssuesCount / activeIssuesCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Warning */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-amber-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      Warnings
                    </span>
                    <span className="font-mono font-bold">{warningIssuesCount}</span>
                  </div>
                  <div className="w-full bg-slate-700/20 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-2 rounded-full" 
                      style={{ width: `${activeIssuesCount > 0 ? (warningIssuesCount / activeIssuesCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Info */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold flex items-center gap-1.5 text-blue-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
                      Informational
                    </span>
                    <span className="font-mono font-bold">{infoIssuesCount}</span>
                  </div>
                  <div className="w-full bg-slate-700/20 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-400 h-2 rounded-full" 
                      style={{ width: `${activeIssuesCount > 0 ? (infoIssuesCount / activeIssuesCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Anomaly Type Categorization */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'} md:col-span-2`}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Category Prevalence</h4>
              <div className="grid grid-cols-2 gap-3">
                {/* We compute counts of each issue type across all files */}
                {(() => {
                  const typeCounts: Record<string, number> = {
                    duplicate: 0,
                    missing_value: 0,
                    invalid_format: 0,
                    outlier: 0,
                    column_inconsistency: 0
                  };
                  files.forEach(f => {
                    if (f.issues) {
                      f.issues.forEach(i => {
                        if (i.status === 'open') {
                          typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
                        }
                      });
                    }
                  });

                  const typesMeta = [
                    { key: 'duplicate', label: 'Duplicate Rows', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
                    { key: 'missing_value', label: 'Missing Values', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                    { key: 'invalid_format', label: 'Invalid Formats', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                    { key: 'outlier', label: 'Outlier Anomalies', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
                    { key: 'column_inconsistency', label: 'Inconsistencies', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
                  ];

                  return typesMeta.map(t => (
                    <div 
                      key={t.key}
                      className={`p-3 rounded-lg border flex justify-between items-center ${t.color}`}
                    >
                      <span className="text-xs font-semibold">{t.label}</span>
                      <span className="text-sm font-black font-mono">{typeCounts[t.key] || 0}</span>
                    </div>
                  ));
                })()}
              </div>

              {/* Quick file audit link list */}
              <div className="mt-4 pt-3 border-t border-slate-800/30 flex justify-between items-center text-xs">
                <span className="text-[10px] text-slate-400">Select any spreadsheet to inspect and fix immediately.</span>
                <button 
                  onClick={() => onNavigate('results')} 
                  className="text-xs text-rose-500 font-bold hover:underline cursor-pointer"
                >
                  View full anomaly reports &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activePanel === 'savings' && (
        <div className={`p-6 rounded-xl border animate-fadeIn transition-all ${
          isDarkMode ? 'bg-[#0f172a] border-violet-500/30' : 'bg-violet-50/30 border-violet-200 shadow-sm'
        }`} id="drilldown-savings">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-extrabold text-sm md:text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-violet-500" /> AI Productivity &amp; ROI Calculator
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Calculate the real-world operational cost and labor-hours saved using Automated CSV Auditor hygiene loops.
              </p>
            </div>
            <button 
              onClick={() => setActivePanel(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-500 px-2 py-1 rounded hover:bg-slate-500/10"
            >
              Close Panel &times;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Slider Controls */}
            <div className={`md:col-span-7 p-4 rounded-xl border ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            } space-y-4`}>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Hourly Labor Rate (USD)</span>
                  <span className="font-mono font-black text-violet-500 text-sm">${hourlyRate} / hour</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="200" 
                  step="5"
                  value={hourlyRate} 
                  onChange={(e) => setHourlyRate(Number(e.target.value))} 
                  className="w-full h-1.5 bg-violet-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500" 
                  id="roi-rate-slider"
                />
                <p className="text-[10px] text-slate-500">
                  Adjust slider to estimate blended analyst, auditor, or engineer rates for manual verification workflows.
                </p>
              </div>

              {/* Labor Saving Breakdown factors */}
              <div className="space-y-2 border-t border-slate-800/20 pt-3.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time-Saving Formula Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] text-slate-400">
                  <div className="p-2 rounded bg-slate-500/5">
                    <p className="text-violet-500 font-bold mb-0.5">15m / file</p>
                    <span>Parsing structure &amp; column schemas</span>
                  </div>
                  <div className="p-2 rounded bg-slate-500/5">
                    <p className="text-violet-500 font-bold mb-0.5">2m / issue</p>
                    <span>Automated scanning &amp; recommendations</span>
                  </div>
                  <div className="p-2 rounded bg-slate-500/5">
                    <p className="text-violet-500 font-bold mb-0.5">5m / resolution</p>
                    <span>Instant regex/trim bulk fixes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Incurred ROI Banner */}
            <div className="md:col-span-5 bg-gradient-to-br from-violet-600 to-indigo-700 p-5 rounded-xl text-white shadow-lg space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-100">Estimated Reclaimed Value</p>
                <h4 className="text-3xl font-black tracking-tight mt-1">
                  ${Math.round((timeSavedMinutes / 60) * hourlyRate).toLocaleString()}
                </h4>
                <p className="text-xs text-violet-200 mt-1">
                  Saved {hoursSaved} operational hours through automated compliance.
                </p>
              </div>

              <div className="bg-white/10 p-3 rounded-lg space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span>Manual Time Spent:</span>
                  <span className="line-through text-red-300">{(timeSavedMinutes / 60 * 4.5).toFixed(1)} hrs</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono font-bold">
                  <span>AI Audit Cycle:</span>
                  <span className="text-emerald-300">Under 1 minute</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Analytics and Critical Files Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Analytics Box */}
        <div className={`lg:col-span-8 p-4 rounded-xl border flex flex-col justify-between ${isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
              <div>
                <h3 className={`font-bold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>30-Day Audit Trend</h3>
                <p className="text-xs text-slate-400 mt-0.5">Average data hygiene scores vs error trends per file audit.</p>
              </div>
              
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5 text-blue-500">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Score (%)
                </div>
                <div className="flex items-center gap-1.5 text-rose-500">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Anomalies
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>Last 30 Days</span>
              </div>
            </div>

            {/* Recharts Area and Line Dual Axis Chart */}
            <div className="h-56 relative w-full mt-2 select-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={isDarkMode ? 0.25 : 0.15}/>
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0"/>
                    </linearGradient>
                    <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F43F5E" stopOpacity={isDarkMode ? 0.1 : 0.05}/>
                      <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0"/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    vertical={false} 
                    stroke={isDarkMode ? "rgba(30, 41, 59, 0.5)" : "rgba(226, 232, 240, 0.8)"} 
                  />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 'auto']}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3B82F6" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#scoreGrad)" 
                    name="Hygiene Score"
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="errors" 
                    stroke="#F43F5E" 
                    strokeWidth={1.5} 
                    strokeDasharray="4 4"
                    fillOpacity={1} 
                    fill="url(#errorGrad)" 
                    name="Anomalies Found"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className={`mt-4 pt-3 border-t flex flex-wrap gap-4 items-center justify-between text-[11px] text-slate-400 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
            <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-blue-400" /> Compliance scoring is calibrated daily.</span>
            <button onClick={() => onNavigate('history')} className="text-blue-500 font-bold hover:underline flex items-center gap-1">
              View History logs <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Files Requiring Attention / Quick Actions list */}
        <div className={`lg:col-span-4 p-4 rounded-xl border flex flex-col justify-between ${isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div>
            <h3 className={`font-bold text-sm mb-3.5 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Audited Datasets</h3>
            <div className="space-y-3">
              {files.map((file) => (
                <div 
                  key={file.id}
                  onClick={() => {
                    if (onSelectFile) {
                      onSelectFile(file);
                    }
                    onNavigate('clean');
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.01] ${activeFile?.id === file.id ? isDarkMode ? 'bg-blue-500/10 border-blue-500/40' : 'bg-blue-50 border-blue-200' : isDarkMode ? 'bg-[#1e293b]/30 border-slate-800/80 hover:bg-[#1e293b]/50' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold truncate max-w-[130px]">{file.name}</span>
                    {file.status === 'completed' ? (
                      <span className={`text-[9px] px-1.5 py-0.25 rounded font-bold ${file.score > 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        Score {file.score}
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.25 rounded bg-rose-500/10 text-rose-400 font-bold">Failed</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span>
                      {file.size > 1024 * 1024 
                        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
                        : `${(file.size / 1024).toFixed(1)} KB`}
                    </span>
                    <span>{file.uploadedAt.split(' ')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <button 
              onClick={() => onNavigate('upload')}
              className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border hover:opacity-90 transition-all cursor-pointer ${isDarkMode ? 'bg-[#0f172a] border-slate-800 text-slate-200 hover:bg-[#1e293b]' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <Upload className="w-3.5 h-3.5" /> Upload spreadsheet
            </button>
          </div>
        </div>
      </div>

      {/* Collaboration Timeline Feed (Screen 10 Component) */}
      <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 text-purple-500 rounded-lg"><Activity className="w-4 h-4" /></div>
            <h3 className={`font-bold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Workspace Activity Timeline</h3>
          </div>
          <button onClick={() => onNavigate('team')} className="text-xs text-blue-500 font-bold hover:underline">
            Manage Team
          </button>
        </div>

        <div className="space-y-4">
          {activities.slice(0, 3).map((act) => (
            <div key={act.id} className="flex gap-3 text-xs items-start">
              <div className="w-7 h-7 rounded-full bg-slate-800 shrink-0 font-bold text-[9px] flex items-center justify-center text-white border border-slate-700/50">
                {act.userName.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex flex-wrap justify-between gap-1 items-baseline">
                  <span className="font-bold">{act.userName}</span>
                  <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1"><Clock className="w-3 h-3" /> {act.timestamp}</span>
                </div>
                <p className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
                  {act.action}
                  {act.fileName && <span className="font-bold text-blue-500 ml-1">({act.fileName})</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
