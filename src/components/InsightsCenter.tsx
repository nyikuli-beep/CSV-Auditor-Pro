import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  HelpCircle, 
  Zap, 
  Database, 
  Upload, 
  Copy, 
  Check, 
  RefreshCw, 
  ChevronRight
} from 'lucide-react';
import { CSVFile } from '../types';
import { InsightsEngine, FullDatasetInsightsPayload } from '../lib/ai/insightsEngine';
import ExecutiveSummaryTab from './insights/ExecutiveSummaryTab';
import DataQualityTab from './insights/DataQualityTab';
import StatisticalTab from './insights/StatisticalTab';
import TrendsPatternsTab from './insights/TrendsPatternsTab';
import AnomaliesTab from './insights/AnomaliesTab';
import RecommendationsTab from './insights/RecommendationsTab';
import { useAssistant } from '../context/AssistantContext';

interface InsightsCenterProps {
  activeFile: CSVFile | null;
  isDarkMode: boolean;
  accentClass: string;
  isOwner?: boolean;
  userRole?: string;
  userEmail?: string;
  onNavigate?: (tabId: string) => void;
}

type ActiveInsightView = 
  | 'executive' 
  | 'quality' 
  | 'statistical' 
  | 'trends' 
  | 'anomalies' 
  | 'recommendations';

export default function InsightsCenter({
  activeFile,
  isDarkMode,
  accentClass,
  isOwner,
  userRole,
  userEmail,
  onNavigate
}: InsightsCenterProps) {
  const [activeView, setActiveView] = useState<ActiveInsightView>('executive');
  const [loadingStage, setLoadingStage] = useState<'idle' | 'profiling' | 'analyzing' | 'generating'>('idle');
  const [insightsPayload, setInsightsPayload] = useState<FullDatasetInsightsPayload | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const { openAssistant, setRecommendationContext } = useAssistant();

  // Compute deterministic insights whenever the activeFile changes
  useEffect(() => {
    if (!activeFile || !activeFile.rows || activeFile.rows.length === 0) {
      setInsightsPayload(null);
      setLoadingStage('idle');
      return;
    }

    setLoadingStage('profiling');
    const timer1 = setTimeout(() => {
      setLoadingStage('analyzing');
      const timer2 = setTimeout(() => {
        setLoadingStage('generating');
        const timer3 = setTimeout(() => {
          try {
            const payload = InsightsEngine.generateInsights(
              activeFile.rows,
              activeFile.headers || [],
              activeFile.name,
              activeFile.id
            );
            setInsightsPayload(payload);
          } catch (err) {
            console.error('Error computing dataset insights:', err);
          } finally {
            setLoadingStage('idle');
          }
        }, 150);
        return () => clearTimeout(timer3);
      }, 150);
      return () => clearTimeout(timer2);
    }, 100);

    return () => clearTimeout(timer1);
  }, [activeFile?.id, activeFile?.rows, activeFile?.name]);

  const handleAskAssistant = (prompt: string) => {
    openAssistant(prompt);
  };

  const handleCopyMarkdownReport = () => {
    if (!insightsPayload) return;
    const p = insightsPayload;

    const md = `# AI Dataset Audit & Insights Report
**Dataset:** ${p.fileName}
**Generated:** ${new Date(p.generatedAt).toLocaleString()}
**Overall Health Score:** ${p.executiveSummary.overallScore}/100 (Grade ${p.executiveSummary.healthGrade})
**Readiness Status:** ${p.executiveSummary.readinessStatus}
**Total Records:** ${p.executiveSummary.totalRecords.toLocaleString()} | **Total Columns:** ${p.executiveSummary.totalColumns}

---

## 1. Executive Summary
${p.executiveSummary.narrative}

### Key Strengths:
${p.executiveSummary.keyStrengths.map(s => `- ${s}`).join('\n')}

### Primary Vulnerabilities:
${p.executiveSummary.primaryVulnerabilities.map(v => `- ${v}`).join('\n')}

---

## 2. Data Quality Analysis
- **Missing Values:** ${p.dataQuality.missingValuesSummary.totalMissingCells.toLocaleString()} missing cells across ${p.dataQuality.missingValuesSummary.affectedColumnsCount} columns.
- **Duplicate Rows:** ${p.dataQuality.duplicatesSummary.duplicateRows.toLocaleString()} rows (${p.dataQuality.duplicatesSummary.percentage.toFixed(1)}%).
- **Formula Risks:** ${p.dataQuality.formattingSummary.formulaRisks} spreadsheet injection risks.

---

## 3. Statistical Profiles
${Object.entries(p.statisticalInsights.columnProfiles).map(([col, stats]) => (
  `- **${col}:** Mean = ${stats.mean.toFixed(2)}, Median = ${stats.median.toFixed(2)}, Range = [${stats.min}, ${stats.max}], StdDev = ${stats.stdDev.toFixed(2)}`
)).join('\n')}

---

## 4. Potential Anomalies & Outliers
- Total potential anomalies flagged for review: ${p.potentialAnomalies.totalPotentialAnomalies.toLocaleString()} (${p.potentialAnomalies.anomalyRate.toFixed(1)}% of rows).
- *Disclaimer: ${p.potentialAnomalies.disclaimer}*

---

## 5. Recommended Priority Remediation
${p.recommendations.priorityActions.map((a, i) => (
  `### ${i + 1}. ${a.title} (${a.urgency} - Gain: +${a.estimatedQualityGain} score)\n${a.description}`
)).join('\n\n')}

---
*Report certified by CSV Auditor Pro Grounded Intelligence Engine.*
`;

    navigator.clipboard.writeText(md);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const navItems = [
    { id: 'executive', label: 'Executive Summary', icon: FileText, badge: insightsPayload ? `${insightsPayload.executiveSummary.overallScore}/100` : undefined },
    { id: 'quality', label: 'Data Quality', icon: ShieldCheck, badge: insightsPayload?.dataQuality.totalFindings ? `${insightsPayload.dataQuality.totalFindings}` : undefined },
    { id: 'statistical', label: 'Statistical Profile', icon: BarChart3, badge: insightsPayload ? `${insightsPayload.statisticalInsights.numericColumnsCount} cols` : undefined },
    { id: 'trends', label: 'Trends & Patterns', icon: TrendingUp },
    { id: 'anomalies', label: 'Potential Anomalies', icon: HelpCircle, badge: insightsPayload?.potentialAnomalies.totalPotentialAnomalies ? `${insightsPayload.potentialAnomalies.totalPotentialAnomalies}` : undefined },
    { id: 'recommendations', label: 'Recommendations', icon: Zap, badge: insightsPayload ? `${insightsPayload.recommendations.priorityActions.length}` : undefined }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* Header Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              AI Intelligence & Insights Hub
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data-grounded forensic analysis, deterministic statistical profiles, and automated remediation intelligence.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeFile && insightsPayload && (
            <button
              onClick={handleCopyMarkdownReport}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy complete verified report in Markdown"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Report Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Report (MD)</span>
                </>
              )}
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate('upload')}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload New CSV
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Segmented Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as ActiveInsightView)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {item.badge && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive
                    ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div>
        {/* Loading Progress State */}
        {loadingStage !== 'idle' && (
          <div className="p-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-4 shadow-sm">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">
                {loadingStage === 'profiling' && 'Profiling dataset schema & distributions...'}
                {loadingStage === 'analyzing' && 'Analyzing data quality & computing IQR fences...'}
                {loadingStage === 'generating' && 'Generating verified grounded insights...'}
              </h3>
              <p className="text-xs text-slate-500">
                Deterministic calculations are running securely in your workspace.
              </p>
            </div>
            {/* Multi-step progress tracker */}
            <div className="max-w-xs mx-auto flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2">
              <span className={loadingStage === 'profiling' || loadingStage === 'analyzing' || loadingStage === 'generating' ? 'text-blue-500 font-bold' : ''}>
                1. Profile
              </span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className={loadingStage === 'analyzing' || loadingStage === 'generating' ? 'text-blue-500 font-bold' : ''}>
                2. Analyze
              </span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className={loadingStage === 'generating' ? 'text-blue-500 font-bold' : ''}>
                3. Insights
              </span>
            </div>
          </div>
        )}

        {/* Empty State when no CSV is loaded */}
        {!activeFile && loadingStage === 'idle' && (
          <div className="p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto border border-blue-500/20">
              <Database className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Upload or select a CSV to generate data insights
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect a dataset to run deterministic profiling, calculate metric distributions, scan for formula injection vulnerabilities, and review recommended remediation steps.
              </p>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('upload')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Go to File Upload
              </button>
            )}
          </div>
        )}

        {/* View Switcher Container */}
        {activeFile && insightsPayload && loadingStage === 'idle' && (
          <>
            {activeView === 'executive' && (
              <ExecutiveSummaryTab 
                data={insightsPayload.executiveSummary}
                isDarkMode={isDarkMode}
                onAskAuditor={handleAskAssistant}
              />
            )}

            {activeView === 'quality' && (
              <DataQualityTab
                data={insightsPayload.dataQuality}
                isDarkMode={isDarkMode}
                onAskAuditor={handleAskAssistant}
                onNavigateClean={onNavigate ? () => onNavigate('clean') : undefined}
              />
            )}

            {activeView === 'statistical' && (
              <StatisticalTab
                data={insightsPayload.statisticalInsights}
                isDarkMode={isDarkMode}
                onAskAuditor={handleAskAssistant}
              />
            )}

            {activeView === 'trends' && (
              <TrendsPatternsTab
                data={insightsPayload.trendsPatterns}
                isDarkMode={isDarkMode}
                onAskAuditor={handleAskAssistant}
              />
            )}

            {activeView === 'anomalies' && (
              <AnomaliesTab
                data={insightsPayload.potentialAnomalies}
                isDarkMode={isDarkMode}
                onAskAuditor={handleAskAssistant}
              />
            )}

            {activeView === 'recommendations' && (
              <RecommendationsTab
                data={insightsPayload.recommendations}
                isDarkMode={isDarkMode}
                onAskAuditor={(prompt) => {
                  handleAskAssistant(prompt);
                }}
                onNavigateClean={onNavigate ? () => onNavigate('clean') : undefined}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

