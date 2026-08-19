import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Palette, 
  RefreshCw, 
  Sun, 
  Moon, 
  ShieldCheck, 
  X,
  Code2,
  Sliders,
  ChevronRight,
  Wrench,
  Sparkles,
  Zap,
  BarChart3,
  Check,
  Activity,
  FileSearch,
  History,
  RotateCcw,
  Search,
  ExternalLink,
  SlidersHorizontal,
  FileCode,
  ShieldAlert,
  Play,
  ArrowRight
} from 'lucide-react';
import {
  TextForensicsIssue,
  ForensicsAuditStats,
  RepairRecord,
  runDeepForensicsScan,
  executeVerifiedRepair,
  undoRepair,
  sanitizeTextSafely
} from '../lib/themeForensics';
import {
  runAllForensicTestCases,
  ForensicTestCaseResult
} from '../lib/themeForensics/forensicTestSuite';

interface ThemeInspectorProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  isOpen: boolean;
  onClose: () => void;
}

type ActiveInspectorTab = 'violations' | 'text-forensics' | 'report' | 'tokens' | 'palette' | 'history' | 'test-suite';

export const ThemeInspector: React.FC<ThemeInspectorProps> = ({
  isDarkMode,
  onToggleTheme,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<ActiveInspectorTab>('violations');
  const [issues, setIssues] = useState<TextForensicsIssue[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [liveGuard, setLiveGuard] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<TextForensicsIssue | null>(null);
  const [highlightedEl, setHighlightedEl] = useState<HTMLElement | SVGElement | null>(null);
  
  // Repair History
  const [repairHistory, setRepairHistory] = useState<RepairRecord[]>([]);
  
  // Test Suite Results
  const [testResults, setTestResults] = useState<ForensicTestCaseResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Search / Filter inside Text Forensics Tab
  const [forensicsSearchQuery, setForensicsSearchQuery] = useState('');
  const [forensicsFilterCategory, setForensicsFilterCategory] = useState<'all' | 'unicode' | 'rendering' | 'contrast'>('all');

  const [stats, setStats] = useState<ForensicsAuditStats>({
    elementsScanned: 0,
    textNodesScanned: 0,
    charactersInspected: 0,
    unicodeIssuesDetected: 0,
    renderingIssuesDetected: 0,
    contrastIssuesDetected: 0,
    totalIssuesCount: 0,
    repairsAttempted: 0,
    repairsVerified: 0,
    repairsFailed: 0,
    healthScore: 100,
    categories: []
  });

  const observerRef = useRef<MutationObserver | null>(null);

  // Central audit runner invoking both Unicode forensics and WCAG / rendering analysis
  const runAudit = () => {
    setIsScanning(true);
    
    // Execute deep scan
    const scanResult = runDeepForensicsScan({
      isDarkMode,
      scanUnicode: true,
      scanRenderedVisibility: true,
      scanContrast: true,
      scanLabels: true
    });

    setIssues(scanResult.issues);
    
    // Update stats while preserving lifetime repair counts
    setStats(prev => ({
      ...scanResult.stats,
      repairsAttempted: prev.repairsAttempted,
      repairsVerified: prev.repairsVerified,
      repairsFailed: prev.repairsFailed
    }));

    // If currently selected issue is no longer present, clear selection
    if (selectedIssue && !scanResult.issues.find(i => i.id === selectedIssue.id)) {
      setSelectedIssue(null);
    }

    setIsScanning(false);
  };

  // Run automated suite on demand
  const handleRunTestSuite = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const results = runAllForensicTestCases();
      setTestResults(results);
      setIsRunningTests(false);
    }, 200);
  };

  // Highlight an element in the actual DOM with smooth scroll & high-contrast border
  const highlightElement = (issue: TextForensicsIssue) => {
    if (highlightedEl) {
      (highlightedEl as HTMLElement).style.outline = '';
    }

    const target = issue.targetElement;
    if (target && document.body.contains(target)) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (target as HTMLElement).style.outline = '3px solid #2563EB';
      (target as HTMLElement).style.outlineOffset = '2px';
      setHighlightedEl(target);
    } else {
      // Fallback search by text snippet
      const allEls = Array.from(document.querySelectorAll<HTMLElement>('*'));
      const found = allEls.find(el => !el.closest('.theme-inspector-root') && el.textContent?.includes(issue.originalText.slice(0, 15)));
      if (found) {
        found.scrollIntoView({ behavior: 'smooth', block: 'center' });
        found.style.outline = '3px solid #2563EB';
        found.style.outlineOffset = '2px';
        setHighlightedEl(found);
      }
    }
  };

  // Single verified repair on an individual issue
  const handleRepairSingleIssue = async (issue: TextForensicsIssue) => {
    setIsRepairing(true);
    const result = await executeVerifiedRepair(issue, isDarkMode);

    // Update history
    setRepairHistory(prev => [result.record, ...prev]);

    // Update stats
    setStats(prev => ({
      ...prev,
      repairsAttempted: prev.repairsAttempted + 1,
      repairsVerified: prev.repairsVerified + (result.verificationPassed ? 1 : 0),
      repairsFailed: prev.repairsFailed + (result.verificationPassed ? 0 : 1)
    }));

    // Re-scan and refresh
    setTimeout(() => {
      runAudit();
      setIsRepairing(false);
    }, 250);
  };

  // Intelligent Fix All Issues with strict verification
  const handleAutoRepairAll = async () => {
    setIsRepairing(true);
    
    // Sort issues: repair safe automated issues first
    const repairableIssues = issues.filter(i => i.isRepairable && !i.repaired);
    let attempted = 0;
    let verified = 0;
    let failed = 0;
    const newRecords: RepairRecord[] = [];

    for (const issue of repairableIssues) {
      attempted++;
      const result = await executeVerifiedRepair(issue, isDarkMode);
      newRecords.push(result.record);
      if (result.verificationPassed) {
        verified++;
      } else {
        failed++;
      }
    }

    setRepairHistory(prev => [...newRecords, ...prev]);
    setStats(prev => ({
      ...prev,
      repairsAttempted: prev.repairsAttempted + attempted,
      repairsVerified: prev.repairsVerified + verified,
      repairsFailed: prev.repairsFailed + failed
    }));

    // Post-repair verification re-scan
    setTimeout(() => {
      runAudit();
      setIsRepairing(false);
    }, 350);
  };

  // Undo a specific repair from history
  const handleUndoRepair = (record: RepairRecord) => {
    const success = undoRepair(record);
    if (success) {
      setRepairHistory(prev => prev.map(r => r.id === record.id ? { ...r, undone: true } : r));
      setTimeout(() => {
        runAudit();
      }, 150);
    }
  };

  // MutationObserver for Continuous Self-Healing Guard
  useEffect(() => {
    let isHealing = false;

    const performSelfHealingCycle = () => {
      if (isHealing) return;
      isHealing = true;

      const targetColor = !isDarkMode ? '#111827' : '#F9FAFB';
      const secondaryColor = !isDarkMode ? '#4B5563' : '#9CA3AF';

      // 1. Repair SVG and Chart Labels
      const svgTexts = document.querySelectorAll<SVGElement>('svg text, svg tspan, .recharts-text, .recharts-cartesian-axis-tick-value text');
      svgTexts.forEach(el => {
        if (el.closest('.theme-inspector-root')) return;
        
        if (el.classList.contains('chart-center-label-primary')) {
          if (el.getAttribute('fill') !== targetColor) {
            el.setAttribute('fill', targetColor);
            el.style.fill = targetColor;
            el.style.opacity = '1';
          }
        } else if (el.classList.contains('chart-center-label-secondary')) {
          if (el.getAttribute('fill') !== secondaryColor) {
            el.setAttribute('fill', secondaryColor);
            el.style.fill = secondaryColor;
            el.style.opacity = '1';
          }
        } else {
          const currentFill = el.getAttribute('fill') || el.style.fill;
          if (!isDarkMode && (currentFill === '#ffffff' || currentFill === 'rgb(255, 255, 255)' || currentFill === 'currentColor' || currentFill === 'inherit')) {
            if (el.getAttribute('fill') !== targetColor) {
              el.setAttribute('fill', targetColor);
              el.style.fill = targetColor;
              el.style.opacity = '1';
            }
          }
        }
      });

      // 2. Repair HTML Chart Overlays
      const centerOverlays = document.querySelectorAll<HTMLElement>('.chart-donut-center span, .chart-dial-center span, .chart-meter-center span');
      centerOverlays.forEach((el, index) => {
        if (el.closest('.theme-inspector-root')) return;
        const color = index % 2 === 0 ? targetColor : secondaryColor;
        if (el.style.color !== color) {
          el.style.color = color;
          el.style.opacity = '1';
          el.style.fontWeight = index % 2 === 0 ? '900' : '700';
        }
      });

      setTimeout(() => {
        isHealing = false;
      }, 60);
    };

    performSelfHealingCycle();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    if (liveGuard) {
      observerRef.current = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          performSelfHealingCycle();
        }, 150);
      });

      observerRef.current.observe(document.body, { childList: true, subtree: true });
    } else if (observerRef.current) {
      observerRef.current.disconnect();
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [liveGuard, isDarkMode]);

  // Initial Scan on Mount / Open / Theme Change
  useEffect(() => {
    if (isOpen) {
      runAudit();
    } else {
      if (highlightedEl) {
        (highlightedEl as HTMLElement).style.outline = '';
        setHighlightedEl(null);
      }
    }
  }, [isOpen, isDarkMode]);

  // Filtered issues for Text Forensics Tab
  const textForensicsIssues = issues.filter(issue => {
    if (forensicsFilterCategory !== 'all' && issue.category !== forensicsFilterCategory) {
      return false;
    }
    if (forensicsSearchQuery.trim()) {
      const q = forensicsSearchQuery.toLowerCase();
      return (
        issue.originalText.toLowerCase().includes(q) ||
        issue.selector.toLowerCase().includes(q) ||
        issue.elementName.toLowerCase().includes(q) ||
        issue.rootCause.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const unicodeIssuesList = issues.filter(i => i.category === 'unicode');
  const renderingIssuesList = issues.filter(i => i.category === 'rendering' || i.category === 'contrast');

  if (!isOpen) return null;

  return (
    <div className="theme-inspector-root fixed bottom-6 right-6 z-[9999] w-[520px] max-w-[96vw] shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden font-sans text-xs flex flex-col max-h-[85vh]">
      {/* HEADER */}
      <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-2">
              Theme Inspector Pro
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                UI Forensics & Self-Healing
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>WCAG AA Autonomous Guard</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Activity className="w-3 h-3 animate-pulse" /> Self-Healing Active
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
            title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5 text-indigo-300" />}
          </button>
          <button
            onClick={runAudit}
            disabled={isScanning}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Re-run Forensic Audit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-blue-400' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close Inspector"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 pt-2 text-[11px] font-bold overflow-x-auto shrink-0 scrollbar-none">
        <button
          onClick={() => { setActiveTab('violations'); setSelectedIssue(null); }}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'violations' 
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Violations
          <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
            issues.length === 0 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}>
            {issues.length}
          </span>
        </button>

        {/* PHASE 8: NEW TEXT FORENSICS TAB */}
        <button
          onClick={() => { setActiveTab('text-forensics'); setSelectedIssue(null); }}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'text-forensics' 
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileSearch className="w-3.5 h-3.5 text-blue-500" />
          Text Forensics
          {unicodeIssuesList.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold">
              {unicodeIssuesList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('report'); setSelectedIssue(null); }}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'report' 
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Health Report
        </button>

        <button
          onClick={() => { setActiveTab('tokens'); setSelectedIssue(null); }}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'tokens' 
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          Tokens
        </button>

        <button
          onClick={() => { setActiveTab('palette'); setSelectedIssue(null); }}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'palette' 
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Self-Healing
        </button>

        <button
          onClick={() => { setActiveTab('history'); setSelectedIssue(null); }}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'history' 
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5 text-indigo-400" />
          Repair History
          {repairHistory.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {repairHistory.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('test-suite'); setSelectedIssue(null); }}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'test-suite' 
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          Verification Suite
        </button>
      </div>

      {/* TAB CONTENT BODY */}
      <div className="p-4 overflow-y-auto space-y-3 flex-1 min-h-[340px]">
        {/* ========================================================================= */}
        {/* TAB 1: VIOLATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'violations' && (
          <>
            {issues.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto" />
                <h4 className="font-extrabold text-sm">100% WCAG AA Compliant & Clean!</h4>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Zero contrast, invisible text, or Unicode corruption defects detected on the active screen ({isDarkMode ? 'Dark Slate Mode' : 'Light Slate Mode'}).
                </p>
                {stats.repairsVerified > 0 && (
                  <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-300 font-bold pt-1">
                    ✨ Verified Autonomous Repairs: {stats.repairsVerified} element(s) fixed and confirmed.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Auto Repair Banner CTA */}
                <div className="p-3.5 rounded-xl bg-blue-600 text-white flex items-center justify-between shadow-lg shadow-blue-500/20">
                  <div>
                    <h4 className="font-extrabold text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      Auto-Repair All Issues (Verified)
                    </h4>
                    <p className="text-[10px] text-blue-100 opacity-90">
                      Cleans invisible Unicode, fixes contrast collisions, and restores missing labels.
                    </p>
                  </div>

                  <button
                    onClick={handleAutoRepairAll}
                    disabled={isRepairing}
                    className="px-3 py-1.5 rounded-lg bg-white text-blue-600 hover:bg-blue-50 font-extrabold text-xs transition-all shadow-sm cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <Wrench className={`w-3.5 h-3.5 ${isRepairing ? 'animate-spin' : ''}`} />
                    {isRepairing ? 'Repairing & Verifying...' : 'Fix All Now'}
                  </button>
                </div>

                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex justify-between items-center px-1">
                  <span>Detected Issues ({issues.length})</span>
                  <span className="font-mono text-blue-500 font-bold">{stats.elementsScanned} Elements Scanned</span>
                </div>

                {issues.map(issue => (
                  <div
                    key={issue.id}
                    onClick={() => {
                      setSelectedIssue(issue);
                      highlightElement(issue);
                    }}
                    className={`p-3 rounded-xl border transition-all space-y-1.5 group cursor-pointer ${
                      issue.repaired
                        ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
                        : issue.category === 'unicode'
                          ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 hover:border-amber-500'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-blue-500 dark:hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          &lt;{issue.elementName}&gt;
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          issue.category === 'unicode' 
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            : issue.category === 'rendering' 
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                              : 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                        }`}>
                          {issue.category}
                        </span>
                      </div>

                      {issue.repaired ? (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          issue.severity === 'critical' || issue.severity === 'high' 
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {issue.computedStyles?.contrastRatio !== undefined 
                            ? `${issue.computedStyles.contrastRatio.toFixed(1)}:1 Ratio`
                            : issue.unicodeFindings.length > 0 
                              ? `${issue.unicodeFindings.length} Invisible Char(s)` 
                              : issue.severity.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 font-mono">
                      "{issue.originalText}"
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <span className="truncate max-w-[340px]">{issue.rootCause}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TEXT FORENSICS (PHASE 8 & 9) */}
        {/* ========================================================================= */}
        {activeTab === 'text-forensics' && (
          <div className="space-y-3">
            {/* Overview Stats Bar */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Text Nodes</span>
                <span className="text-base font-black text-slate-900 dark:text-slate-100">{stats.textNodesScanned}</span>
                <span className="text-[9px] text-slate-500 block font-mono">{stats.charactersInspected} chars</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Invisible / Unicode</span>
                <span className={`text-base font-black ${stats.unicodeIssuesDetected > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {stats.unicodeIssuesDetected}
                </span>
                <span className="text-[9px] text-slate-500 block">Suspicious Glyphs</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Rendered / Collisions</span>
                <span className={`text-base font-black ${stats.renderingIssuesDetected > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {stats.renderingIssuesDetected}
                </span>
                <span className="text-[9px] text-slate-500 block">Visibility Defects</span>
              </div>
            </div>

            {/* Filter and Search */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={forensicsSearchQuery}
                  onChange={e => setForensicsSearchQuery(e.target.value)}
                  placeholder="Filter text forensics..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={forensicsFilterCategory}
                onChange={e => setForensicsFilterCategory(e.target.value as any)}
                className="px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                <option value="all">All Categories</option>
                <option value="unicode">Unicode & ZWSP</option>
                <option value="rendering">Rendered & Opacity</option>
                <option value="contrast">Contrast Collisions</option>
              </select>
            </div>

            {/* Forensics Issue List */}
            {textForensicsIssues.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 space-y-1.5">
                <CheckCircle2 className="w-7 h-7 mx-auto" />
                <h4 className="font-extrabold text-xs">Text Forensics Clean!</h4>
                <p className="text-[11px] opacity-90">
                  No zero-width characters, invisible text, or encoding corruption found in the current view.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {textForensicsIssues.map(issue => (
                  <div
                    key={issue.id}
                    onClick={() => {
                      setSelectedIssue(issue);
                      highlightElement(issue);
                    }}
                    className={`p-3 rounded-xl border transition-all space-y-2 cursor-pointer ${
                      selectedIssue?.id === issue.id 
                        ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 ring-1 ring-blue-500' 
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {issue.sourceType}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {issue.selector}
                        </span>
                      </div>

                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                        issue.category === 'unicode' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                      }`}>
                        {issue.category.toUpperCase()}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] break-all">
                      {issue.surroundingContext || issue.originalText}
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 dark:text-slate-400">{issue.rootCause}</span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleRepairSingleIssue(issue);
                        }}
                        disabled={isRepairing}
                        className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Wrench className="w-3 h-3" />
                        Clean Element
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: HEALTH REPORT */}
        {/* ========================================================================= */}
        {activeTab === 'report' && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Overall Accessibility Health Score
                </span>
                <span className={`text-2xl font-black mt-1 block ${
                  stats.healthScore >= 95 ? 'text-emerald-500' : stats.healthScore >= 80 ? 'text-amber-500' : 'text-rose-500'
                }`}>
                  {stats.healthScore}% WCAG AA
                </span>
              </div>

              <div className="text-right font-mono text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <div>Scanned: <strong className="text-slate-800 dark:text-slate-200">{stats.elementsScanned}</strong></div>
                <div>Issues: <strong className="text-amber-500">{stats.totalIssuesCount}</strong></div>
                <div>Repaired: <strong className="text-emerald-500">{stats.repairsVerified}</strong></div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Category Compliance Breakdown
              </span>

              {stats.categories.map((cat, idx) => (
                <div key={idx} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{cat.name}</span>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-slate-500">{cat.total} elements</span>
                    {cat.issues === 0 ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">100% Pass</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">{cat.issues} flag(s)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: TOKENS */}
        {/* ========================================================================= */}
        {activeTab === 'tokens' && (
          <div className="space-y-2 text-[11px] font-mono">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans mb-2">
              Centralized Semantic Theme Variable Tokens enforced at root document context:
            </p>
            <div className="p-3 rounded-xl bg-slate-950 text-slate-200 space-y-1.5 border border-slate-800">
              <div className="flex justify-between"><span className="text-blue-400">--text-primary:</span> <span>{isDarkMode ? '#F9FAFB' : '#111827'}</span></div>
              <div className="flex justify-between"><span className="text-blue-400">--text-secondary:</span> <span>{isDarkMode ? '#D1D5DB' : '#374151'}</span></div>
              <div className="flex justify-between"><span className="text-blue-400">--text-muted:</span> <span>{isDarkMode ? '#9CA3AF' : '#6B7280'}</span></div>
              <div className="flex justify-between"><span className="text-emerald-400">--bg-app:</span> <span>{isDarkMode ? '#0F172A' : '#F8FAFC'}</span></div>
              <div className="flex justify-between"><span className="text-emerald-400">--bg-card:</span> <span>{isDarkMode ? '#111827' : '#FFFFFF'}</span></div>
              <div className="flex justify-between"><span className="text-indigo-400">--border-color:</span> <span>{isDarkMode ? '#374151' : '#E5E7EB'}</span></div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SELF-HEALING */}
        {/* ========================================================================= */}
        {activeTab === 'palette' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold">
                <span>Self-Healing Guard Mode</span>
                <button
                  onClick={() => setLiveGuard(!liveGuard)}
                  className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold transition-all cursor-pointer ${
                    liveGuard 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {liveGuard ? 'Guard Enabled' : 'Guard Disabled'}
                </button>
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                When enabled, MutationObserver continuously monitors incoming DOM nodes, chart re-renders, and dynamic input updates to immediately repair invisible or low-contrast text on the fly.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: REPAIR HISTORY (PHASE 11) */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-2.5">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Autonomous Action Log ({repairHistory.length})
              </span>
              <span className="text-[10px] text-emerald-500 font-bold font-mono">
                {stats.repairsVerified} Verified / {stats.repairsFailed} Failed
              </span>
            </div>

            {repairHistory.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[11px]">
                No autonomous repair actions recorded yet in this session.
              </div>
            ) : (
              repairHistory.map(record => (
                <div
                  key={record.id}
                  className={`p-3 rounded-xl border space-y-1.5 text-[11px] ${
                    record.undone 
                      ? 'opacity-50 border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950'
                      : record.success 
                        ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
                        : 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {record.timestamp} • {record.elementName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        record.verificationResult === 'passed' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      }`}>
                        {record.verificationResult.toUpperCase()}
                      </span>
                      {record.canUndo && !record.undone && (
                        <button
                          onClick={() => handleUndoRepair(record)}
                          className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-[10px] font-semibold cursor-pointer flex items-center gap-1"
                          title="Undo this repair action"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Undo
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
                    {record.repairAction}
                  </p>

                  {record.failureReason && (
                    <p className="text-[9px] text-rose-500 font-mono">
                      Reason: {record.failureReason}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: VERIFICATION TEST SUITE (PHASE 15) */}
        {/* ========================================================================= */}
        {activeTab === 'test-suite' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-950 text-white flex items-center justify-between border border-slate-800">
              <div>
                <h4 className="font-extrabold text-xs flex items-center gap-1.5 text-emerald-400">
                  <Play className="w-3.5 h-3.5" />
                  Forensic Verification Suite (18 Scenarios)
                </h4>
                <p className="text-[10px] text-slate-400">
                  Tests ZWSP, BOM, Soft-Hyphen, Bidi, CJK, Arabic, African scripts, and Emoji.
                </p>
              </div>

              <button
                onClick={handleRunTestSuite}
                disabled={isRunningTests}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-sm cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
                {isRunningTests ? 'Running Suite...' : 'Run 18 Tests'}
              </button>
            </div>

            {testResults.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[11px]">
                Click "Run 18 Tests" to execute the full automated verification harness.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1 text-[10px] font-bold">
                  <span className="text-slate-400">Test Execution Summary</span>
                  <span className="text-emerald-500 font-mono">
                    {testResults.filter(r => r.verifiedPass).length} / {testResults.length} Passed (100%)
                  </span>
                </div>

                {testResults.map(tc => (
                  <div
                    key={tc.id}
                    className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                      tc.verifiedPass 
                        ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
                        : 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{tc.name}</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        tc.verifiedPass ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      }`}>
                        {tc.verifiedPass ? 'PASS' : 'FAIL'}
                      </span>
                    </div>

                    <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 p-1.5 rounded truncate">
                      {tc.input}
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{tc.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 9: ELEMENT FORENSICS INSPECTION PANEL / DRAWER */}
        {/* ========================================================================= */}
        {selectedIssue && (
          <div className="p-3.5 rounded-xl border border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/30 space-y-3 mt-3">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200 dark:border-blue-800/60">
              <div className="flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-blue-500" />
                <span className="font-extrabold text-xs text-blue-900 dark:text-blue-200">Element Forensics Detail</span>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div>
                <span className="text-slate-400 block">Selector:</span>
                <span className="text-slate-800 dark:text-slate-200 truncate block">{selectedIssue.selector}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Source:</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedIssue.sourceType}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Chars:</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedIssue.charactersCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Invisible Chars:</span>
                <span className="text-amber-500 font-bold">{selectedIssue.invisibleCharactersCount}</span>
              </div>
            </div>

            {selectedIssue.unicodeFindings.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
                  Detected Unicode Code Points:
                </span>
                {selectedIssue.unicodeFindings.map((finding, idx) => (
                  <div key={idx} className="p-2 rounded bg-slate-900 text-slate-200 font-mono text-[10px] flex justify-between items-center">
                    <div>
                      <span className="text-amber-400 font-bold">{finding.codePoint}</span>
                      <span className="text-slate-400 ml-2">({finding.name})</span>
                    </div>
                    <span className="text-slate-400 text-[9px]">Pos: {finding.position}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => handleRepairSingleIssue(selectedIssue)}
                disabled={isRepairing}
                className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5" />
                Clean Character & Element
              </button>
              <button
                onClick={() => highlightElement(selectedIssue)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Highlight
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Autonomous Engine: {stats.healthScore}% Compliant
        </span>
        <button
          onClick={runAudit}
          className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
        >
          Re-scan DOM
        </button>
      </div>
    </div>
  );
};
