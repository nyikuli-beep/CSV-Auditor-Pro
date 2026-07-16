import { useMemo } from 'react';
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
  ArrowUpRight
} from 'lucide-react';

interface DashboardHomeProps {
  files: CSVFile[];
  activeFile: CSVFile | null;
  activities: AuditActivity[];
  onNavigate: (tab: string) => void;
  isDarkMode: boolean;
  accentClass: string;
}

export default function DashboardHome({ files, activeFile, activities, onNavigate, isDarkMode, accentClass }: DashboardHomeProps) {
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

  const totalAuditedFiles = files.length;
  const completedAudits = files.filter(f => f.status === 'completed').length;
  
  // Calculate aggregate score
  const completedWithScore = files.filter(f => f.status === 'completed' && f.score > 0);
  const avgScore = completedWithScore.length > 0 
    ? Math.round(completedWithScore.reduce((sum, f) => sum + f.score, 0) / completedWithScore.length) 
    : 100;

  // Calculate total critical and warning issues
  let totalCritical = 0;
  let totalWarnings = 0;
  files.forEach(f => {
    f.issues.forEach(i => {
      if (i.status === 'open') {
        if (i.severity === 'critical') totalCritical++;
        if (i.severity === 'warning') totalWarnings++;
      }
    });
  });

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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Files Audited */}
        <div className={`p-4 rounded-xl border transition-all hover:shadow-sm ${isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-center mb-2.5">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Files Audited</span>
            <div className="p-1.5 rounded bg-blue-500/10 text-blue-500"><FileCheck className="w-4 h-4" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{totalAuditedFiles}</span>
            <div className="text-[11px] text-emerald-600 font-medium flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> 12% vs last month
            </div>
          </div>
        </div>

        {/* Average Compliance Score */}
        <div className={`p-4 rounded-xl border transition-all hover:shadow-sm ${isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-center mb-2.5">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Data Quality Score</span>
            <div className="p-1.5 rounded bg-blue-500/10 text-blue-500"><TrendingUp className="w-4 h-4" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{avgScore}%</span>
            <div className={`text-[10px] font-bold px-1.5 py-0.25 rounded-full ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>Above average</div>
          </div>
        </div>

        {/* Critical issues pending */}
        <div className={`p-4 rounded-xl border transition-all hover:shadow-sm ${isDarkMode ? 'bg-[#131b2e] border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-center mb-2.5">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Anomalies Detected</span>
            <div className="p-1.5 rounded bg-rose-500/10 text-rose-500"><ShieldAlert className="w-4 h-4" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{totalCritical + totalWarnings}</span>
            <div className="text-[11px] text-amber-600 font-medium">{totalCritical} require immediate action</div>
          </div>
        </div>

        {/* High Density Blue Quick action card */}
        <div className="bg-blue-600 p-4 rounded-xl shadow-sm flex flex-col justify-between text-white hover:bg-blue-700 transition-colors">
          <p className="text-xs font-medium text-blue-100">Quick Start</p>
          <button 
            onClick={() => onNavigate('upload')}
            className="bg-white text-blue-700 rounded-lg py-1.5 px-3 font-bold text-xs hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Upload CSV
          </button>
        </div>
      </div>

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
                    onNavigate('results');
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
