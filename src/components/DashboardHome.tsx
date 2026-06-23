import { CSVFile, AuditActivity } from '../types';
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
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className={`font-bold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Corporate Quality Scoring</h3>
                <p className="text-xs text-slate-400 mt-0.5">Historical trend of sheet standards over the past 6 months.</p>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}>This Year</span>
            </div>

            {/* Glowing Custom Area Chart SVG */}
            <div className="h-52 relative w-full pr-4">
              <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                {/* Horizontal Grid lines */}
                <line x1="0" y1="20" x2="500" y2="20" stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} strokeWidth="1" />
                <line x1="0" y1="70" x2="500" y2="70" stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} strokeWidth="1" />
                <line x1="0" y1="120" x2="500" y2="120" stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} strokeWidth="1" />
                <line x1="0" y1="170" x2="500" y2="170" stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} strokeWidth="1" />

                {/* Main Score Line Path */}
                <path 
                  d="M 10 160 C 100 130, 150 145, 200 90 C 250 60, 320 85, 400 45 L 490 35 L 490 200 L 10 200 Z" 
                  fill="url(#areaGrad)" 
                />
                <path 
                  d="M 10 160 C 100 130, 150 145, 200 90 C 250 60, 320 85, 400 45 L 490 35" 
                  fill="none" 
                  stroke="#3B82F6" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                />

                {/* Glowing Highlight Dots */}
                <circle cx="200" cy="90" r="5" fill="#3B82F6" stroke={isDarkMode ? "#131b2e" : "#ffffff"} strokeWidth="1.5" className="animate-pulse" />
                <circle cx="490" cy="35" r="5" fill="#10B981" stroke={isDarkMode ? "#131b2e" : "#ffffff"} strokeWidth="1.5" />

                {/* X Axis Labels */}
                <text x="10" y="195" fill="#94a3b8" fontSize="9" fontFamily="monospace">JAN</text>
                <text x="100" y="195" fill="#94a3b8" fontSize="9" fontFamily="monospace">FEB</text>
                <text x="200" y="195" fill="#94a3b8" fontSize="9" fontFamily="monospace">MAR</text>
                <text x="300" y="195" fill="#94a3b8" fontSize="9" fontFamily="monospace">APR</text>
                <text x="400" y="195" fill="#94a3b8" fontSize="9" fontFamily="monospace">MAY</text>
                <text x="470" y="195" fill="#94a3b8" fontSize="9" fontFamily="monospace">JUN</text>

                {/* Y Axis Labels */}
                <text x="475" y="15" fill="#10B981" fontSize="9" fontWeight="bold">98%</text>
                <text x="185" y="75" fill="#3B82F6" fontSize="9" fontWeight="bold">75%</text>
              </svg>
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
                    <span>{(file.size / 1024).toFixed(1)} KB</span>
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
