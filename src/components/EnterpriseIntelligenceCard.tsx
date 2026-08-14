/**
 * CSV Auditor Pro - Enterprise Intelligence Visual Components
 * Phase 3: High-craft UI for Confidence, Risk, Recommendations, Explainable AI & Reports
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  HelpCircle, 
  FileText, 
  Zap, 
  Layers, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Activity, 
  Lock,
  ArrowRight,
  Database,
  Search,
  ExternalLink
} from 'lucide-react';
import { ConfidenceAssessment } from '../lib/confidenceScoringEngine';
import { EnterpriseRiskAssessment, EnterpriseRiskItem } from '../lib/riskAssessmentEngine';
import { ActionableRecommendation, ProactiveInsight, FollowUpSuggestion } from '../lib/recommendationEngine';
import { ExplainabilityPackage } from '../lib/explainableEngine';
import { ExecutiveReportData, formatReportAsMarkdown } from '../lib/executiveReportEngine';

interface EnterpriseIntelligenceCardProps {
  confidenceDetails?: ConfidenceAssessment;
  riskAssessment?: EnterpriseRiskAssessment;
  recommendations?: ActionableRecommendation[];
  proactiveInsights?: ProactiveInsight[];
  explainability?: ExplainabilityPackage;
  followUpSuggestions?: FollowUpSuggestion[];
  executiveReport?: ExecutiveReportData;
  isDarkMode: boolean;
  onExecutePrompt?: (prompt: string) => void;
}

export default function EnterpriseIntelligenceCard({
  confidenceDetails,
  riskAssessment,
  recommendations,
  proactiveInsights,
  explainability,
  followUpSuggestions,
  executiveReport,
  isDarkMode,
  onExecutePrompt
}: EnterpriseIntelligenceCardProps) {
  const [showConfidenceDetails, setShowConfidenceDetails] = useState(false);
  const [showRiskDetails, setShowRiskDetails] = useState(false);
  const [showExplainability, setShowExplainability] = useState(false);
  const [showExecutiveReport, setShowExecutiveReport] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  const hasAnyPhase3Data = Boolean(
    confidenceDetails ||
    (riskAssessment && riskAssessment.risks && riskAssessment.risks.length > 0) ||
    (recommendations && recommendations.length > 0) ||
    (proactiveInsights && proactiveInsights.length > 0) ||
    explainability ||
    (followUpSuggestions && followUpSuggestions.length > 0) ||
    executiveReport
  );

  if (!hasAnyPhase3Data) {
    return null;
  }

  const handleCopyReport = (report: ExecutiveReportData) => {
    const md = formatReportAsMarkdown(report);
    navigator.clipboard.writeText(md);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#334155]/30 space-y-3 font-sans text-xs">
      
      {/* 1. Header Badges: Confidence Gauge & Enterprise Risk Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Confidence Score Pill */}
          {confidenceDetails && (
            <button
              type="button"
              onClick={() => setShowConfidenceDetails(!showConfidenceDetails)}
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                confidenceDetails.percentage >= 85
                  ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] hover:bg-[#D1FAE5]'
                  : confidenceDetails.percentage >= 65
                  ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A] hover:bg-[#FDE68A]'
                  : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] hover:bg-[#FEE2E2]'
              }`}
              title="Click to view multi-factor confidence breakdown"
            >
              <Activity className="w-3 h-3 shrink-0" />
              <span>Confidence: {confidenceDetails.percentage}% ({confidenceDetails.levelLabel})</span>
              {showConfidenceDetails ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          )}

          {/* Enterprise Risk Posture Badge */}
          {riskAssessment && (
            <button
              type="button"
              onClick={() => setShowRiskDetails(!showRiskDetails)}
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                riskAssessment.overallRisk === 'critical'
                  ? 'bg-[#FEF2F2] text-[#991B1B] border-[#F87171] hover:bg-[#FEE2E2]'
                  : riskAssessment.overallRisk === 'high'
                  ? 'bg-[#FFF7ED] text-[#C2410C] border-[#FDBA74] hover:bg-[#FFEDD5]'
                  : riskAssessment.overallRisk === 'medium'
                  ? 'bg-[#FEFCE8] text-[#854D0E] border-[#FDE047] hover:bg-[#FEF9C3]'
                  : 'bg-[#F0FDF4] text-[#166534] border-[#86EFAC] hover:bg-[#DCFCE7]'
              }`}
              title="Click to view risk assessment profile"
            >
              {riskAssessment.overallRisk === 'critical' ? (
                <ShieldAlert className="w-3 h-3 text-[#991B1B] shrink-0" />
              ) : riskAssessment.overallRisk === 'high' || riskAssessment.overallRisk === 'medium' ? (
                <AlertTriangle className="w-3 h-3 text-[#C2410C] shrink-0" />
              ) : (
                <ShieldCheck className="w-3 h-3 text-[#166534] shrink-0" />
              )}
              <span>Risk: {riskAssessment.overallRisk.toUpperCase()} ({riskAssessment.risks.length} threats)</span>
              {showRiskDetails ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            </button>
          )}
        </div>

        {/* Explainable AI & Executive Report Quick Actions */}
        <div className="flex items-center gap-1.5">
          {explainability && (
            <button
              type="button"
              onClick={() => setShowExplainability(!showExplainability)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium border flex items-center gap-1 cursor-pointer transition-colors ${
                isDarkMode 
                  ? 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC]' 
                  : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:text-[#0F172A]'
              }`}
              title="View transparent algorithmic methodology and heuristics"
            >
              <Sparkles className="w-3 h-3 text-[#2563EB]" />
              <span>Explainable AI</span>
            </button>
          )}

          {executiveReport && (
            <button
              type="button"
              onClick={() => setShowExecutiveReport(!showExecutiveReport)}
              className="px-2.5 py-1 rounded-md text-[10px] font-bold border bg-[#EFF6FF] text-[#1D4ED8] border-[#93C5FD] hover:bg-[#DBEAFE] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <FileText className="w-3 h-3 text-[#1D4ED8]" />
              <span>Executive Brief</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Confidence Assessment Multi-Factor Breakdown Drawer */}
      {showConfidenceDetails && confidenceDetails && (
        <div className={`p-3 rounded-xl border text-xs space-y-2 ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
          <div className="flex justify-between items-center">
            <span className="font-bold text-[11px] text-[#2563EB] uppercase tracking-wider">
              Confidence Factor Evaluation
            </span>
            <span className="text-[10px] text-[#64748B] font-mono">
              Composite: {confidenceDetails.percentage}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(confidenceDetails.factors || []).map((f, i) => (
              <div key={i} className={`p-2 rounded-lg border ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#FFFFFF] border-[#E2E8F0]'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-[10px]">{f.name}</span>
                  <span className="font-mono text-[9px] font-bold text-[#059669]">
                    {Math.round(f.score * 100)}% (w: {Math.round(f.weight * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-[#E2E8F0] dark:bg-[#334155] rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-[#2563EB] h-1.5 rounded-full" 
                    style={{ width: `${Math.min(100, Math.max(5, f.score * 100))}%` }} 
                  />
                </div>
                <p className="text-[9px] text-[#64748B] mt-1 line-clamp-1">{f.description}</p>
              </div>
            ))}
          </div>

          {confidenceDetails.justification && (
            <div className="text-[9px] text-[#64748B] pt-1 border-t border-[#334155]/20">
              <span className="font-bold">Evaluation: </span>{confidenceDetails.justification}
            </div>
          )}
        </div>
      )}

      {/* 3. Enterprise Risk Assessment Profile Details */}
      {showRiskDetails && riskAssessment && (
        <div className={`p-3 rounded-xl border text-xs space-y-2 ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
          <div className="flex justify-between items-center">
            <span className="font-bold text-[11px] text-[#B91C1C] uppercase tracking-wider">
              Enterprise Risk Profile (Score: {riskAssessment.riskScore}/100)
            </span>
            <span className="text-[10px] font-mono font-bold text-[#475569]">
              Compliance: {riskAssessment.complianceStatus.toUpperCase()}
            </span>
          </div>

          <div className="space-y-1.5">
            {riskAssessment.risks.map((risk, i) => (
              <div 
                key={i} 
                className={`p-2.5 rounded-lg border ${
                  risk.severity === 'critical'
                    ? isDarkMode ? 'bg-[#7F1D1D]/20 border-[#991B1B]' : 'bg-[#FEF2F2] border-[#FCA5A5]'
                    : risk.severity === 'high'
                    ? isDarkMode ? 'bg-[#7C2D12]/20 border-[#C2410C]' : 'bg-[#FFF7ED] border-[#FDBA74]'
                    : isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#FFFFFF] border-[#E2E8F0]'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                      risk.severity === 'critical' ? 'bg-[#EF4444] text-white' :
                      risk.severity === 'high' ? 'bg-[#F97316] text-white' :
                      risk.severity === 'medium' ? 'bg-[#FBBF24] text-[#78350F]' :
                      'bg-[#3B82F6] text-white'
                    }`}>
                      {risk.severity}
                    </span>
                    <span className="font-bold text-[10px]">{risk.title}</span>
                  </div>
                  <span className="text-[9px] font-mono text-[#64748B]">
                    Urgency: {risk.remediationUrgency.toUpperCase()}
                  </span>
                </div>
                <p className="text-[10px] text-[#64748B] mt-1">{risk.rationale}</p>
                <div className="flex justify-between items-center text-[9px] text-[#475569] dark:text-[#94A3B8] mt-1 pt-1 border-t border-[#334155]/20">
                  <span>Impact: {risk.businessImpact}</span>
                  {risk.affectedColumns && risk.affectedColumns.length > 0 && (
                    <span className="font-mono truncate max-w-[200px]">Cols: {risk.affectedColumns.join(', ')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Proactive Intelligence Alerts (Confirmed Findings vs Hypotheses) */}
      {proactiveInsights && proactiveInsights.length > 0 && (
        <div className="space-y-1.5">
          {proactiveInsights.map((insight, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                insight.severity === 'critical'
                  ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                  : insight.severity === 'warning'
                  ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                  : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
              }`}
            >
              <div className="p-1 rounded-md bg-white/60 shrink-0 mt-0.5">
                {insight.severity === 'critical' ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-[#DC2626]" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 justify-between">
                  <span className="font-bold text-[10px] uppercase tracking-wide">
                    {insight.type === 'confirmed_finding' ? 'Confirmed Finding' : 'Investigation Recommended'}
                  </span>
                  <span className="font-mono text-[9px] opacity-80">{insight.evidenceMetric}</span>
                </div>
                <p className="text-[10px] mt-0.5 leading-relaxed opacity-90">{insight.description}</p>
                {insight.suggestedAction && onExecutePrompt && (
                  <button
                    type="button"
                    onClick={() => onExecutePrompt(insight.suggestedAction)}
                    className="mt-1.5 text-[9px] font-bold underline hover:opacity-80 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Action: {insight.suggestedAction}</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Prioritized Actionable Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#2563EB]" /> Prioritized Remediation Recipe
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {recommendations.slice(0, 3).map((rec, i) => (
              <div 
                key={i}
                className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#FFFFFF] border-[#E2E8F0]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                      rec.priority === 'critical' ? 'bg-[#EF4444] text-white' :
                      rec.priority === 'high' ? 'bg-[#F97316] text-white' :
                      'bg-[#3B82F6] text-white'
                    }`}>
                      {rec.priority}
                    </span>
                    <span className="font-bold text-[11px] text-[#0F172A] dark:text-[#F8FAFC] truncate">
                      {rec.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#64748B] line-clamp-1">{rec.expectedImpact}</p>
                </div>

                {rec.remediationCommandPrompt && onExecutePrompt && (
                  <button
                    type="button"
                    onClick={() => onExecutePrompt(rec.remediationCommandPrompt!)}
                    className="px-2.5 py-1 rounded-lg text-[9px] font-bold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Execute Fix</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Explainable AI Methodology Modal / Card */}
      {showExplainability && explainability && (
        <div className={`p-3 rounded-xl border text-xs space-y-2 ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#F8FAFC] border-[#E2E8F0]'}`}>
          <div className="flex justify-between items-center">
            <span className="font-bold text-[11px] text-[#2563EB] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#2563EB]" /> Transparent Algorithmic Methodology
            </span>
            <button
              type="button"
              onClick={() => setShowExplainability(false)}
              className="text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <p className="text-[10px] text-[#64748B]">{explainability.summaryRationale}</p>

          <div className="space-y-1.5">
            {explainability.methodologiesApplied.map((m, i) => (
              <div key={i} className={`p-2 rounded-lg border ${isDarkMode ? 'bg-[#1E293B] border-[#334155]' : 'bg-[#FFFFFF] border-[#E2E8F0]'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[10px] text-[#0F172A] dark:text-[#F8FAFC]">{m.title}</span>
                  <span className="text-[9px] font-mono text-[#2563EB]">{m.algorithm}</span>
                </div>
                <p className="text-[9px] text-[#64748B] mt-0.5">{m.explanation}</p>
                <div className="text-[8px] font-mono text-[#475569] dark:text-[#94A3B8] mt-1">
                  Params: {m.parametersApplied}
                </div>
              </div>
            ))}
          </div>

          {explainability.rulesEvaluated.length > 0 && (
            <div className="pt-1 border-t border-[#334155]/20">
              <span className="text-[9px] font-bold text-[#64748B] uppercase">Rules Evaluated:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {explainability.rulesEvaluated.map((r, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-[#E2E8F0] dark:bg-[#334155] text-[#334155] dark:text-[#CBD5E1]">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. Executive Report Preview Modal / Card */}
      {showExecutiveReport && executiveReport && (
        <div className={`p-4 rounded-2xl border text-xs space-y-3 ${isDarkMode ? 'bg-[#0F172A] border-[#334155]' : 'bg-[#FFFFFF] border-[#E2E8F0] shadow-md'}`}>
          <div className="flex justify-between items-center border-b pb-2 dark:border-[#334155]">
            <div>
              <h4 className="font-bold text-sm text-[#0F172A] dark:text-[#F8FAFC]">{executiveReport.title}</h4>
              <p className="text-[10px] text-[#64748B]">Dataset: {executiveReport.datasetName} • Score: {executiveReport.overallScore}%</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyReport(executiveReport)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] hover:bg-[#DBEAFE] flex items-center gap-1 cursor-pointer"
              >
                {copiedReport ? <Check className="w-3 h-3 text-[#059669]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedReport ? 'Copied MD' : 'Copy Report'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowExecutiveReport(false)}
                className="text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            <div>
              <span className="font-bold text-[10px] uppercase text-[#2563EB]">1. Executive Summary</span>
              <p className="text-[10px] text-[#475569] dark:text-[#CBD5E1] mt-0.5 leading-relaxed">{executiveReport.executiveSummary}</p>
            </div>

            <div>
              <span className="font-bold text-[10px] uppercase text-[#2563EB]">2. Data Quality Rating</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                <div className="p-2 rounded border dark:border-[#334155] text-center">
                  <span className="text-[9px] text-[#64748B] block">Completeness</span>
                  <span className="font-mono font-bold text-xs text-[#059669]">{executiveReport.dataQualityAssessment.completenessRate}</span>
                </div>
                <div className="p-2 rounded border dark:border-[#334155] text-center">
                  <span className="text-[9px] text-[#64748B] block">Uniqueness</span>
                  <span className="font-mono font-bold text-xs text-[#059669]">{executiveReport.dataQualityAssessment.uniquenessRate}</span>
                </div>
                <div className="p-2 rounded border dark:border-[#334155] text-center">
                  <span className="text-[9px] text-[#64748B] block">Syntax</span>
                  <span className="font-mono font-bold text-xs text-[#059669]">{executiveReport.dataQualityAssessment.syntaxValidityRate}</span>
                </div>
                <div className="p-2 rounded border dark:border-[#334155] text-center">
                  <span className="text-[9px] text-[#64748B] block">Health Score</span>
                  <span className="font-mono font-bold text-xs text-[#2563EB]">{executiveReport.overallScore}/100</span>
                </div>
              </div>
            </div>

            <div>
              <span className="font-bold text-[10px] uppercase text-[#2563EB]">3. Next Steps</span>
              <ul className="text-[10px] text-[#475569] dark:text-[#CBD5E1] space-y-0.5 mt-1 list-disc pl-4">
                {executiveReport.nextActions.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 8. Contextual Follow-Up Suggestions */}
      {followUpSuggestions && followUpSuggestions.length > 0 && onExecutePrompt && (
        <div className="pt-2 border-t border-[#334155]/20">
          <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">
            Suggested Follow-Up Inquiries:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {followUpSuggestions.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onExecutePrompt(sug.prompt)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium border flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                  isDarkMode
                    ? 'bg-[#1E293B] border-[#334155] text-[#CBD5E1] hover:bg-[#2563EB] hover:text-white hover:border-[#2563EB]'
                    : 'bg-[#F1F5F9] border-[#E2E8F0] text-[#334155] hover:bg-[#2563EB] hover:text-white hover:border-[#2563EB]'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5 text-[#2563EB] shrink-0" />
                <span>{sug.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
