import { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine
} from 'recharts';
import { TrendingUp, Activity, BarChart2, ShieldCheck, CheckCircle2, Sparkles, Layers } from 'lucide-react';
import { CSVFile } from '../types';

interface QualityTrendChartProps {
  activeFile: CSVFile | null;
  allFiles?: CSVFile[];
  isDarkMode: boolean;
}

type TrendMode = 'cleaning_lifecycle' | 'history_timeline' | 'velocity';

export default function QualityTrendChart({ activeFile, allFiles = [], isDarkMode }: QualityTrendChartProps) {
  const [mode, setMode] = useState<TrendMode>('cleaning_lifecycle');
  const [chartType, setChartType] = useState<'area' | 'line'>('area');

  // Generate Lifecycle progression data for the current active file
  const lifecycleData = useMemo(() => {
    if (!activeFile) return [];

    const currentScore = activeFile.score;
    const resolvedCount = activeFile.issues.filter(i => i.status === 'resolved').length;
    const totalIssues = activeFile.issues.length;

    // Estimate initial raw score before fixes
    const rawScore = Math.max(15, Math.min(65, currentScore - (resolvedCount * 5 || 25)));
    const stage1Score = Math.min(currentScore, rawScore + Math.round((currentScore - rawScore) * 0.3));
    const stage2Score = Math.min(currentScore, rawScore + Math.round((currentScore - rawScore) * 0.65));

    return [
      {
        stage: 'Raw Ingestion',
        timeLabel: 'Ingestion',
        score: rawScore,
        issuesCount: totalIssues,
        resolved: 0,
        status: 'Uncleaned',
        description: 'Raw dataset uploaded with unformatted cells and duplicates'
      },
      {
        stage: 'Format Standardization',
        timeLabel: 'Formatting',
        score: stage1Score,
        issuesCount: Math.round(totalIssues * 0.7),
        resolved: Math.round(resolvedCount * 0.3),
        status: 'In Progress',
        description: 'Dates and currencies standardized to ISO-8601'
      },
      {
        stage: 'Deduplication & Nulls',
        timeLabel: 'Deduplication',
        score: stage2Score,
        issuesCount: Math.round(totalIssues * 0.35),
        resolved: Math.round(resolvedCount * 0.7),
        status: 'In Progress',
        description: 'Duplicate rows removed and missing values imputed'
      },
      {
        stage: 'Current Audit Score',
        timeLabel: 'Current Audit',
        score: currentScore,
        issuesCount: totalIssues - resolvedCount,
        resolved: resolvedCount,
        status: currentScore >= 80 ? 'Compliant' : 'Needs Review',
        description: 'Latest verified audit state'
      },
      {
        stage: 'Compliance Goal',
        timeLabel: 'Target 100%',
        score: 100,
        issuesCount: 0,
        resolved: totalIssues,
        status: 'Target',
        description: 'Zero unresolved compliance issues target'
      }
    ];
  }, [activeFile]);

  // Generate dataset history timeline across all audited files
  const historyData = useMemo(() => {
    const list = allFiles.length > 0 ? allFiles : (activeFile ? [activeFile] : []);
    
    if (list.length === 0) return [];

    // Sort files by uploadedAt if possible
    const sorted = [...list].sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());

    if (sorted.length === 1) {
      // Mock historical timeline for single file to show trend over 5 audit checkpoints
      const base = sorted[0];
      const s = base.score;
      const dateObj = new Date(base.uploadedAt || Date.now());
      
      return [
        {
          name: 'Audit #1',
          timeLabel: '7 Days Ago',
          score: Math.max(30, s - 28),
          file: base.name,
          issuesCount: base.issues.length + 12,
          resolved: 0
        },
        {
          name: 'Audit #2',
          timeLabel: '5 Days Ago',
          score: Math.max(45, s - 18),
          file: base.name,
          issuesCount: base.issues.length + 6,
          resolved: 4
        },
        {
          name: 'Audit #3',
          timeLabel: '3 Days Ago',
          score: Math.max(58, s - 8),
          file: base.name,
          issuesCount: base.issues.length + 2,
          resolved: 8
        },
        {
          name: 'Audit #4',
          timeLabel: 'Yesterday',
          score: Math.max(70, s - 3),
          file: base.name,
          issuesCount: base.issues.length,
          resolved: base.issues.filter(i => i.status === 'resolved').length
        },
        {
          name: 'Current State',
          timeLabel: 'Today',
          score: s,
          file: base.name,
          issuesCount: base.issues.filter(i => i.status === 'open').length,
          resolved: base.issues.filter(i => i.status === 'resolved').length
        }
      ];
    }

    return sorted.map((file, idx) => {
      const d = new Date(file.uploadedAt);
      const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString([], { month: 'short', day: 'numeric' }) : `Audit #${idx + 1}`;
      return {
        name: file.name.length > 15 ? `${file.name.substring(0, 12)}...` : file.name,
        timeLabel: dateStr,
        score: file.score,
        file: file.name,
        issuesCount: file.issues.filter(i => i.status === 'open').length,
        resolved: file.issues.filter(i => i.status === 'resolved').length
      };
    });
  }, [allFiles, activeFile]);

  // Generate 14-day quality velocity trend
  const velocityData = useMemo(() => {
    const activeScore = activeFile?.score || 75;
    const days = 14;
    const result = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      // Calculate realistic smooth trend curve leading to active score
      const progressRatio = (days - 1 - i) / (days - 1);
      const simulatedBaseline = Math.max(40, activeScore - 30);
      const randomNoise = (Math.sin(i * 1.5) * 3);
      const score = Math.min(100, Math.max(20, Math.round(simulatedBaseline + (activeScore - simulatedBaseline) * progressRatio + randomNoise)));

      result.push({
        timeLabel: dayLabel,
        score: i === 0 ? activeScore : score,
        target: 80,
        complianceRate: `${score}%`
      });
    }
    return result;
  }, [activeFile]);

  const activeChartData = mode === 'cleaning_lifecycle' 
    ? lifecycleData 
    : (mode === 'history_timeline' ? historyData : velocityData);

  const baselineScore = lifecycleData.length > 0 ? lifecycleData[0].score : 50;
  const currentScore = activeFile?.score || 0;
  const scoreImprovement = currentScore - baselineScore;

  return (
    <div className={`p-6 rounded-3xl border transition-all ${
      isDarkMode ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Chart Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-2xl border border-blue-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base tracking-tight">Data Quality Score Trend</h3>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 font-mono font-bold px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1">
                <Activity className="w-3 h-3" /> Recharts Analytics
              </span>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Monitor data health trajectory, cleaning milestones, and compliance benchmark velocity over time.
            </p>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Tabs */}
          <div className={`p-1 rounded-xl border flex gap-1 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <button
              type="button"
              onClick={() => setMode('cleaning_lifecycle')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                mode === 'cleaning_lifecycle'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Show active dataset quality progression through hygiene stages"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cleaning Lifecycle</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('history_timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                mode === 'history_timeline'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Show audit score history across uploaded datasets"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Dataset History</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('velocity')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                mode === 'velocity'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="14-day daily data quality velocity curve"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>14-Day Velocity</span>
            </button>
          </div>

          {/* Chart Style Toggle */}
          <button
            type="button"
            onClick={() => setChartType(prev => prev === 'area' ? 'line' : 'area')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isDarkMode 
                ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Toggle between Area fill and Line curve"
          >
            {chartType === 'area' ? 'Area Fill' : 'Line Curve'}
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Baseline Score</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black">{baselineScore}%</span>
            <span className="text-[10px] text-slate-400 font-mono">Raw</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Current Score</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-blue-500">{currentScore}%</span>
            <span className="text-[10px] text-emerald-400 font-bold font-mono">
              {scoreImprovement >= 0 ? `+${scoreImprovement}%` : `${scoreImprovement}%`}
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Target Benchmark</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-500">80%</span>
            <span className="text-[10px] text-emerald-400 font-bold font-mono flex items-center gap-0.5">
              <ShieldCheck className="w-3 h-3" /> Minimum
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Quality Health</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-black ${
              currentScore >= 80 ? 'text-emerald-400' : currentScore >= 60 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {currentScore >= 80 ? 'Compliant' : currentScore >= 60 ? 'Moderate' : 'At Risk'}
            </span>
            <Sparkles className="w-3 h-3 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Main Recharts Area / Line Chart Container */}
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={activeChartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} opacity={0.5} />
              <XAxis 
                dataKey="timeLabel" 
                stroke={isDarkMode ? '#94a3b8' : '#64748b'} 
                fontSize={11} 
                tickLine={false} 
              />
              <YAxis 
                domain={[0, 100]} 
                stroke={isDarkMode ? '#94a3b8' : '#64748b'} 
                fontSize={11} 
                tickFormatter={(val) => `${val}%`} 
              />
              <Tooltip content={<CustomRechartsTooltip isDarkMode={isDarkMode} />} />
              <ReferenceLine 
                y={80} 
                stroke="#10b981" 
                strokeDasharray="4 4" 
                label={{ value: 'Target 80%', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} 
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#scoreAreaGradient)" 
                activeDot={{ r: 6, fill: '#60a5fa', stroke: '#1e3a8a', strokeWidth: 2 }} 
              />
            </AreaChart>
          ) : (
            <LineChart data={activeChartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} opacity={0.5} />
              <XAxis 
                dataKey="timeLabel" 
                stroke={isDarkMode ? '#94a3b8' : '#64748b'} 
                fontSize={11} 
                tickLine={false} 
              />
              <YAxis 
                domain={[0, 100]} 
                stroke={isDarkMode ? '#94a3b8' : '#64748b'} 
                fontSize={11} 
                tickFormatter={(val) => `${val}%`} 
              />
              <Tooltip content={<CustomRechartsTooltip isDarkMode={isDarkMode} />} />
              <ReferenceLine 
                y={80} 
                stroke="#10b981" 
                strokeDasharray="4 4" 
                label={{ value: 'Target 80%', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }} 
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#3b82f6' }} 
                activeDot={{ r: 7, fill: '#60a5fa', stroke: '#1d4ed8', strokeWidth: 2 }} 
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Indicator */}
      <div className="mt-4 pt-3 border-t border-slate-800/30 flex flex-wrap justify-between items-center text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Real-time score updates dynamically as issues are fixed in the Cleaning Center.</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Quality Score Curve
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-emerald-500 inline-block" /> 80% Compliance Benchmark
          </span>
        </div>
      </div>
    </div>
  );
}

// Custom Tooltip component for Recharts
function CustomRechartsTooltip({ active, payload, label, isDarkMode }: any) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const score = data.score;

  return (
    <div className={`p-3 rounded-xl border shadow-xl text-xs font-sans max-w-xs space-y-1.5 ${
      isDarkMode 
        ? 'bg-slate-950 border-slate-800 text-slate-200' 
        : 'bg-white border-slate-200 text-slate-800'
    }`}>
      <div className="flex justify-between items-center border-b border-slate-800/40 pb-1 gap-4">
        <span className="font-extrabold text-blue-400">{data.stage || data.name || label}</span>
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
          score >= 80 ? 'bg-emerald-500/20 text-emerald-400' : score >= 60 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
        }`}>
          {score}% Score
        </span>
      </div>

      {data.description && (
        <p className="text-[11px] text-slate-400">{data.description}</p>
      )}

      {data.file && (
        <p className="text-[10px] text-slate-400 font-mono">Dataset: {data.file}</p>
      )}

      {data.issuesCount !== undefined && (
        <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
          <span>Open Issues: <strong className="text-rose-400">{data.issuesCount}</strong></span>
          {data.resolved !== undefined && <span>Resolved: <strong className="text-emerald-400">{data.resolved}</strong></span>}
        </div>
      )}
    </div>
  );
}
