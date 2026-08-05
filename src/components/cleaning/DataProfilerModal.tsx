import { useState } from 'react';
import { X, Sparkles, CheckCircle2, BarChart2, ShieldCheck, ArrowRight, Zap } from 'lucide-react';
import { FullDatasetProfile } from '../../lib/cleaning/dataProfiler';

interface DataProfilerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FullDatasetProfile | null;
  onApplyRecommendation: (rec: any) => void;
  isDarkMode: boolean;
}

export default function DataProfilerModal({
  isOpen,
  onClose,
  profile,
  onApplyRecommendation,
  isDarkMode
}: DataProfilerModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'columns' | 'recommendations'>('overview');
  const [columnSearch, setColumnSearch] = useState('');

  if (!isOpen || !profile) return null;

  const { qualityMetrics, columns, recommendations } = profile;

  const filteredColumns = Object.values(columns).filter((c) =>
    c.columnName.toLowerCase().includes(columnSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-5xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Column Profiling & Quality Intelligence
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {profile.totalRows} Rows · {profile.totalColumns} Cols
                </span>
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Automated statistical diagnostics and 7-vector data health scoring.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg cursor-pointer transition-colors ${
              isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`px-5 pt-3 border-b flex items-center gap-2 ${isDarkMode ? 'border-slate-800 bg-slate-950/20' : 'border-slate-100 bg-white'}`}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Quality Score Overview ({qualityMetrics.overallScore}/100)
          </button>
          <button
            onClick={() => setActiveTab('columns')}
            className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${
              activeTab === 'columns'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Column Diagnostics ({profile.totalColumns})
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'recommendations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Smart Recommendations ({recommendations.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Score Hero Card */}
              <div
                className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-5">
                  <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-blue-600 text-white shadow-lg">
                    <span className="text-3xl font-extrabold font-mono">{qualityMetrics.overallScore}</span>
                    <span className="absolute bottom-1 text-[10px] font-bold uppercase tracking-widest text-blue-200">/ 100</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-500 font-mono">
                      Overall Health Score
                    </span>
                    <h3 className="text-xl font-black">
                      {qualityMetrics.overallScore >= 90
                        ? 'Production Ready'
                        : qualityMetrics.overallScore >= 75
                        ? 'Good Quality (Needs Minor Hygiene)'
                        : 'Action Required (High Flaw Density)'}
                    </h3>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Evaluated across 7 structural standards: Completeness, Consistency, Accuracy, Validity, Uniqueness, Integrity, and Timeliness.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('recommendations')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4" /> View {recommendations.length} Recommended Fixes
                </button>
              </div>

              {/* 7 Metrics Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Completeness', score: qualityMetrics.completeness, desc: 'Non-missing cell coverage' },
                  { label: 'Consistency', score: qualityMetrics.consistency, desc: 'Data type uniformity' },
                  { label: 'Accuracy', score: qualityMetrics.accuracy, desc: 'Low outlier frequency' },
                  { label: 'Validity', score: qualityMetrics.validity, desc: 'Standard format compliance' },
                  { label: 'Uniqueness', score: qualityMetrics.uniqueness, desc: 'Non-duplicate rows' },
                  { label: 'Integrity', score: qualityMetrics.integrity, desc: 'Cross-column logical match' },
                  { label: 'Timeliness', score: qualityMetrics.timeliness, desc: 'Recent date ranges' },
                ].map((m) => (
                  <div
                    key={m.label}
                    className={`p-4 rounded-xl border space-y-2 ${
                      isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{m.label}</span>
                      <span className="font-mono font-bold text-blue-500">{m.score}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          m.score >= 85 ? 'bg-emerald-500' : m.score >= 65 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${m.score}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'columns' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Search column diagnostics..."
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                className={`w-full px-4 py-2 rounded-xl border text-xs outline-none ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              />

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b text-[11px] uppercase font-mono font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    <tr>
                      <th className="p-3">Column Name</th>
                      <th className="p-3">Data Type</th>
                      <th className="p-3">Missing %</th>
                      <th className="p-3">Distinct Count</th>
                      <th className="p-3">Avg Length</th>
                      <th className="p-3">Top Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredColumns.map((c) => (
                      <tr key={c.columnName} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        <td className="p-3 font-bold">{c.columnName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            {c.dataType}
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          <span className={c.missingPercentage > 20 ? 'text-rose-500 font-bold' : 'text-slate-400'}>
                            {c.missingCount} ({c.missingPercentage}%)
                          </span>
                        </td>
                        <td className="p-3 font-mono">{c.distinctCount}</td>
                        <td className="p-3 font-mono">{c.avgLength} chars</td>
                        <td className="p-3 truncate max-w-[150px] font-mono text-slate-400">
                          {c.frequentValues[0]?.value || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-3">
              {recommendations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No automated recommendations required. Dataset meets standard quality metrics!
                </div>
              ) : (
                recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          {rec.category}
                        </span>
                        <h4 className="text-xs font-bold">{rec.title}</h4>
                      </div>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {rec.description}
                      </p>
                    </div>

                    <button
                      onClick={() => onApplyRecommendation(rec)}
                      className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow"
                    >
                      <Zap className="w-3.5 h-3.5" /> 1-Click Fix
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
