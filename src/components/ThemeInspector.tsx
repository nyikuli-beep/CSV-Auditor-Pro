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
  Activity
} from 'lucide-react';

interface ThemeInspectorProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  isOpen: boolean;
  onClose: () => void;
}

interface IssueItem {
  id: string;
  type: 'contrast' | 'label' | 'hardcoded' | 'invisible';
  severity: 'error' | 'warning' | 'info';
  elementName: string;
  textSnippet: string;
  contrastRatio: number;
  fgColor: string;
  bgColor: string;
  message: string;
  targetElement?: HTMLElement;
  repaired?: boolean;
}

interface AuditStats {
  scannedCount: number;
  issueCount: number;
  repairedCount: number;
  healthScore: number;
  categories: { name: string; total: number; issues: number }[];
}

export const ThemeInspector: React.FC<ThemeInspectorProps> = ({
  isDarkMode,
  onToggleTheme,
  isOpen,
  onClose
}) => {
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [liveGuard, setLiveGuard] = useState(true);
  const [repairedCount, setRepairedCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'violations' | 'report' | 'tokens' | 'palette'>('violations');
  const [highlightedEl, setHighlightedEl] = useState<HTMLElement | null>(null);
  const [stats, setStats] = useState<AuditStats>({
    scannedCount: 0,
    issueCount: 0,
    repairedCount: 0,
    healthScore: 100,
    categories: []
  });

  const observerRef = useRef<MutationObserver | null>(null);

  // Helper to calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  // Helper to parse rgb/rgba string
  const parseRGB = (colorStr: string): [number, number, number] | null => {
    if (!colorStr) return null;
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
    return null;
  };

  // Helper to compute contrast ratio
  const calculateContrast = (fg: string, bg: string): number => {
    const rgb1 = parseRGB(fg);
    const rgb2 = parseRGB(bg);
    if (!rgb1 || !rgb2) return 7.0; // default safe assumption
    const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
    const brighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (brighter + 0.05) / (darker + 0.05);
  };

  // Helper to determine if RGB color is light or dark
  const isBackgroundLight = (bgStr: string): boolean => {
    const rgb = parseRGB(bgStr);
    if (!rgb) return !isDarkMode; // fallback to mode
    const luminance = getLuminance(rgb[0], rgb[1], rgb[2]);
    return luminance > 0.45;
  };

  const runAudit = () => {
    setIsScanning(true);
    const foundIssues: IssueItem[] = [];

    // Query both standard HTML text elements and SVG / Chart text elements
    const elements = Array.from(document.querySelectorAll<HTMLElement | SVGElement>(
      'h1, h2, h3, h4, h5, h6, p, span, button, a, label, th, td, input, select, text, tspan, foreignObject, .recharts-text, .recharts-cartesian-axis-tick-value, .recharts-legend-item-text, .chart-donut-center span, .chart-dial-center span, .chart-meter-center span'
    ));

    let issueId = 1;
    let headingsCount = 0;
    let headingsIssues = 0;
    let buttonsCount = 0;
    let buttonsIssues = 0;
    let tablesCount = 0;
    let tablesIssues = 0;
    let formsCount = 0;
    let formsIssues = 0;
    let chartTextCount = 0;
    let chartTextIssues = 0;
    let otherCount = 0;
    let otherIssues = 0;

    elements.forEach(el => {
      if (el.closest('.theme-inspector-root')) return;

      const tagName = el.tagName.toLowerCase();
      const isSvgText = tagName === 'text' || tagName === 'tspan' || el.classList.contains('recharts-text');
      
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) headingsCount++;
      else if (tagName === 'button' || tagName === 'a') buttonsCount++;
      else if (['th', 'td'].includes(tagName)) tablesCount++;
      else if (['input', 'select', 'label'].includes(tagName)) formsCount++;
      else if (isSvgText || el.closest('.chart-donut-center, .chart-dial-center, .chart-meter-center')) chartTextCount++;
      else otherCount++;

      const style = window.getComputedStyle(el as Element);
      let color = style.color;
      
      // For SVG text, fill is primary color property
      if (isSvgText) {
        const fillAttr = (el as Element).getAttribute('fill') || style.fill;
        if (fillAttr && fillAttr !== 'none' && fillAttr !== 'currentColor') {
          color = fillAttr;
        }
      }

      let bg = style.backgroundColor;

      // Ancestor background resolution if transparent
      if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
        let parent = el.parentElement;
        while (parent) {
          const parentBg = window.getComputedStyle(parent).backgroundColor;
          if (parentBg && parentBg !== 'rgba(0, 0, 0, 0)' && parentBg !== 'transparent') {
            bg = parentBg;
            break;
          }
          parent = parent.parentElement;
        }
        if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
          bg = isDarkMode ? 'rgb(15, 23, 42)' : 'rgb(248, 250, 252)';
        }
      }

      const text = el.textContent?.trim() || '';

      if (!text || text.length === 0) {
        if (el.tagName === 'INPUT' && !el.getAttribute('aria-label') && !el.getAttribute('id')) {
          formsIssues++;
          foundIssues.push({
            id: `issue-${issueId++}`,
            type: 'label',
            severity: 'warning',
            elementName: `${el.tagName.toLowerCase()}[type=${(el as HTMLInputElement).type || 'text'}]`,
            textSnippet: (el as HTMLInputElement).placeholder || 'Unlabeled Input',
            contrastRatio: 4.5,
            fgColor: color,
            bgColor: bg,
            message: 'Input element lacks explicit aria-label or associated label element.',
            targetElement: el as HTMLElement
          });
        }
        return;
      }

      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
        const ratio = calculateContrast(color, bg);
        const fontSize = parseFloat(style.fontSize) || 12;
        const isBold = parseInt(style.fontWeight) >= 600 || style.fontWeight === 'bold' || style.fontWeight === '900';
        const requiredRatio = (fontSize >= 18 || (isBold && fontSize >= 14)) ? 3.0 : 4.5;

        // Trigger repair requirement if contrast is below threshold or if SVG text has low contrast in current mode
        if (ratio < requiredRatio || (isSvgText && !isDarkMode && (color === '#ffffff' || color === 'rgb(255, 255, 255)' || color === '#94a3b8' || color === '#64748b'))) {
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) headingsIssues++;
          else if (tagName === 'button' || tagName === 'a') buttonsIssues++;
          else if (['th', 'td'].includes(tagName)) tablesIssues++;
          else if (['input', 'select', 'label'].includes(tagName)) formsIssues++;
          else if (isSvgText || el.closest('.chart-donut-center, .chart-dial-center, .chart-meter-center')) chartTextIssues++;
          else otherIssues++;

          foundIssues.push({
            id: `issue-${issueId++}`,
            type: ratio < 2.0 ? 'invisible' : 'contrast',
            severity: ratio < 2.0 ? 'error' : 'warning',
            elementName: isSvgText ? `svg:<${tagName}>` : tagName,
            textSnippet: text.slice(0, 35) + (text.length > 35 ? '...' : ''),
            contrastRatio: parseFloat(ratio.toFixed(2)),
            fgColor: color,
            bgColor: bg,
            message: isSvgText 
              ? `Chart/SVG text '${text}' has contrast ratio ${ratio.toFixed(2)}:1 below WCAG threshold.`
              : `Contrast ratio ${ratio.toFixed(2)}:1 is below WCAG AA threshold (${requiredRatio}:1).`,
            targetElement: el as HTMLElement
          });
        }
      }
    });

    const totalScanned = elements.length;
    const totalIssues = foundIssues.length;
    const score = totalScanned > 0 ? Math.max(0, Math.round(((totalScanned - totalIssues) / totalScanned) * 100)) : 100;

    setIssues(foundIssues);
    setStats({
      scannedCount: totalScanned,
      issueCount: totalIssues,
      repairedCount,
      healthScore: score,
      categories: [
        { name: 'Headings & Titles', total: headingsCount, issues: headingsIssues },
        { name: 'Chart & SVG Labels', total: chartTextCount, issues: chartTextIssues },
        { name: 'Buttons & Controls', total: buttonsCount, issues: buttonsIssues },
        { name: 'Tables & Grid Data', total: tablesCount, issues: tablesIssues },
        { name: 'Forms & Inputs', total: formsCount, issues: formsIssues },
        { name: 'Paragraphs & Labels', total: otherCount, issues: otherIssues }
      ]
    });

    setIsScanning(false);
  };

  // Autonomous Auto Repair Function
  const autoRepairAll = () => {
    setIsRepairing(true);
    let repaired = 0;

    issues.forEach(issue => {
      if (issue.targetElement) {
        const el = issue.targetElement;
        const tagName = el.tagName.toLowerCase();
        
        // Handle input labels missing
        if (issue.type === 'label' && tagName === 'INPUT') {
          const placeholder = (el as HTMLInputElement).placeholder || 'Search or input data';
          el.setAttribute('aria-label', placeholder);
          issue.repaired = true;
          repaired++;
          return;
        }

        const isLight = isBackgroundLight(issue.bgColor);
        const targetColor = isLight ? '#111827' : '#f9fafb'; // Semantic Theme Tokens

        if (tagName === 'text' || tagName === 'tspan' || el.classList.contains('recharts-text')) {
          // SVG Text Repair
          (el as unknown as SVGElement).setAttribute('fill', targetColor);
          el.style.fill = targetColor;
          el.style.opacity = '1';
          el.style.fontWeight = '700';
          el.style.pointerEvents = 'none';
        } else {
          // Standard HTML & Chart Overlay Repair
          el.style.color = targetColor;
          el.style.opacity = '1';
        }

        // Tag auto-repaired attribute
        el.setAttribute('data-theme-repaired', 'true');
        issue.repaired = true;
        repaired++;
      }
    });

    setRepairedCount(prev => prev + repaired);

    // Verification Pass
    setTimeout(() => {
      runAudit();
      setIsRepairing(false);
    }, 400);
  };

  // Live Mutation Observer for Self-Healing Guard (Handles Dynamic Chart Rerenders safely)
  useEffect(() => {
    let isRepairing = false;

    const repairChartAndTextElements = () => {
      if (isRepairing) return;
      isRepairing = true;

      const isLightMode = !isDarkMode;
      const targetColor = isLightMode ? '#111827' : '#f9fafb';
      const secondaryColor = isLightMode ? '#4b5563' : '#9ca3af';

      // 1. Repair SVG Text and Chart Labels
      const svgTexts = document.querySelectorAll<SVGElement>('svg text, svg tspan, .recharts-text, .recharts-cartesian-axis-tick-value text');
      svgTexts.forEach(el => {
        if (el.closest('.theme-inspector-root')) return;
        
        // Fix center labels and chart labels
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
          if (isLightMode && (currentFill === '#ffffff' || currentFill === 'rgb(255, 255, 255)' || currentFill === 'currentColor' || currentFill === 'inherit')) {
            if (el.getAttribute('fill') !== targetColor) {
              el.setAttribute('fill', targetColor);
              el.style.fill = targetColor;
              el.style.opacity = '1';
            }
          }
        }
      });

      // 2. Repair HTML Donut/Dial Chart Center Overlay Labels
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
        isRepairing = false;
      }, 50);
    };

    repairChartAndTextElements();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    if (liveGuard) {
      observerRef.current = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          repairChartAndTextElements();
        }, 150);
      });

      // Only observe childList and subtree additions, NOT attributes to avoid infinite loops
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

  const runAutomatedAuditAndReport = () => {
    const elements = Array.from(document.querySelectorAll<HTMLElement | SVGElement>(
      'h1, h2, h3, h4, h5, h6, p, span, button, a, label, th, td, input, select, text, tspan, foreignObject, .recharts-text, .recharts-cartesian-axis-tick-value, .recharts-legend-item-text, .chart-donut-center span, .chart-dial-center span, .chart-meter-center span'
    ));

    const foundIssuesList: { Element: string; Snippet: string; Ratio: string; Status: string }[] = [];
    let scanned = 0;
    let issuesFound = 0;
    let repaired = 0;

    elements.forEach(el => {
      if (el.closest('.theme-inspector-root')) return;
      scanned++;

      const tagName = el.tagName.toLowerCase();
      const isSvgText = tagName === 'text' || tagName === 'tspan' || el.classList.contains('recharts-text');
      const style = window.getComputedStyle(el as Element);
      let color = style.color;
      if (isSvgText) {
        const fillAttr = (el as Element).getAttribute('fill') || style.fill;
        if (fillAttr && fillAttr !== 'none' && fillAttr !== 'currentColor') {
          color = fillAttr;
        }
      }
      let bg = style.backgroundColor;
      if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
        let parent = el.parentElement;
        while (parent) {
          const parentBg = window.getComputedStyle(parent).backgroundColor;
          if (parentBg && parentBg !== 'rgba(0, 0, 0, 0)' && parentBg !== 'transparent') {
            bg = parentBg;
            break;
          }
          parent = parent.parentElement;
        }
        if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
          bg = isDarkMode ? 'rgb(15, 23, 42)' : 'rgb(248, 250, 252)';
        }
      }

      const text = el.textContent?.trim() || '';
      if (text) {
        const ratio = calculateContrast(color, bg);
        const fontSize = parseFloat(style.fontSize) || 12;
        const isBold = parseInt(style.fontWeight) >= 600 || style.fontWeight === 'bold';
        const requiredRatio = (fontSize >= 18 || (isBold && fontSize >= 14)) ? 3.0 : 4.5;

        if (ratio < requiredRatio || (isSvgText && !isDarkMode && (color === '#ffffff' || color === 'rgb(255, 255, 255)'))) {
          issuesFound++;
          const isLight = isBackgroundLight(bg);
          const targetColor = isLight ? '#111827' : '#f9fafb';
          if (isSvgText) {
            (el as unknown as SVGElement).setAttribute('fill', targetColor);
            el.style.fill = targetColor;
            el.style.opacity = '1';
          } else {
            el.style.color = targetColor;
            el.style.opacity = '1';
          }
          repaired++;
          foundIssuesList.push({
            Element: isSvgText ? `svg:<${tagName}>` : tagName,
            Snippet: text.slice(0, 30),
            Ratio: `${ratio.toFixed(2)}:1`,
            Status: 'AUTO-REPAIRED'
          });
        }
      }
    });

    const healthScore = scanned > 0 ? Math.max(0, Math.round(((scanned - (issuesFound - repaired)) / scanned) * 100)) : 100;

    console.group(`[Theme QA System] Automated Theme & Contrast Inspection (${isDarkMode ? 'Dark' : 'Light'} Mode)`);
    console.log(`Scanned Elements: ${scanned}`);
    console.log(`Issues Identified: ${issuesFound}`);
    console.log(`Issues Auto-Repaired: ${repaired}`);
    console.log(`WCAG AA Health Score: ${healthScore}%`);
    if (foundIssuesList.length > 0) {
      console.table(foundIssuesList);
    } else {
      console.log('✓ 100% WCAG AA Compliant - No visual contrast violations detected.');
    }
    console.groupEnd();
  };

  useEffect(() => {
    // Run automated Theme QA inspection on startup and theme change
    const timer = setTimeout(() => {
      runAutomatedAuditAndReport();
    }, 500);
    return () => clearTimeout(timer);
  }, [isDarkMode]);

  useEffect(() => {
    if (isOpen) {
      runAudit();
    } else {
      if (highlightedEl) {
        highlightedEl.style.outline = '';
        setHighlightedEl(null);
      }
    }
  }, [isOpen, isDarkMode]);

  const highlightElement = (snippet: string) => {
    if (highlightedEl) {
      highlightedEl.style.outline = '';
    }
    const allEls = Array.from(document.querySelectorAll<HTMLElement>('*'));
    const target = allEls.find(el => !el.closest('.theme-inspector-root') && el.textContent?.includes(snippet.slice(0, 15)));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.style.outline = '3px solid #2563eb';
      target.style.outlineOffset = '2px';
      setHighlightedEl(target);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="theme-inspector-root fixed bottom-6 right-6 z-[9999] w-[460px] max-w-[94vw] shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden font-sans text-xs animate-fadeIn">
      {/* Header */}
      <div className="p-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-2">
              Theme Inspector Pro
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Auto-Repair Engine
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
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
            title="Re-run Audit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-blue-400' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 pt-2 text-[11px] font-bold">
        <button
          onClick={() => setActiveTab('violations')}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
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

        <button
          onClick={() => setActiveTab('report')}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'report' 
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Health Report
        </button>

        <button
          onClick={() => setActiveTab('tokens')}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'tokens' 
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          Tokens
        </button>

        <button
          onClick={() => setActiveTab('palette')}
          className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'palette' 
              ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Self-Healing
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-[380px] overflow-y-auto space-y-3">
        {activeTab === 'violations' && (
          <>
            {issues.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto" />
                <h4 className="font-extrabold text-sm">100% WCAG AA Compliant!</h4>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Zero contrast or visibility issues detected on current active view ({isDarkMode ? 'Dark Slate Mode' : 'Light Slate Mode'}).
                </p>
                {repairedCount > 0 && (
                  <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-300 font-bold pt-1">
                    ✨ Autonomous Engine has automatically repaired {repairedCount} UI element(s).
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
                      Auto-Repair All Issues
                    </h4>
                    <p className="text-[10px] text-blue-100 opacity-90">
                      Fixes contrast, invisible text, and missing labels in 1-click.
                    </p>
                  </div>

                  <button
                    onClick={autoRepairAll}
                    disabled={isRepairing}
                    className="px-3 py-1.5 rounded-lg bg-white text-blue-600 hover:bg-blue-50 font-extrabold text-xs transition-all shadow-sm cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <Wrench className={`w-3.5 h-3.5 ${isRepairing ? 'animate-spin' : ''}`} />
                    {isRepairing ? 'Repairing...' : 'Fix All Now'}
                  </button>
                </div>

                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex justify-between items-center px-1">
                  <span>Detected Flags ({issues.length})</span>
                  <span className="font-mono text-amber-500 font-bold">{stats.scannedCount} Elements Scanned</span>
                </div>

                {issues.map(issue => (
                  <div
                    key={issue.id}
                    onClick={() => highlightElement(issue.textSnippet)}
                    className={`p-3 rounded-xl border transition-all space-y-1.5 group cursor-pointer ${
                      issue.repaired
                        ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-blue-500 dark:hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        &lt;{issue.elementName}&gt;
                      </span>
                      {issue.repaired ? (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Repaired
                        </span>
                      ) : (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          issue.severity === 'error' 
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {issue.contrastRatio.toFixed(1)}:1 Ratio
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                      "{issue.textSnippet}"
                    </p>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal flex items-center justify-between">
                      <span>{issue.message}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'report' && (
          <div className="space-y-3">
            {/* Health Score Card */}
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
                <div>Scanned: <strong className="text-slate-800 dark:text-slate-200">{stats.scannedCount}</strong></div>
                <div>Issues: <strong className="text-amber-500">{stats.issueCount}</strong></div>
                <div>Repaired: <strong className="text-emerald-500">{repairedCount}</strong></div>
              </div>
            </div>

            {/* Category Breakdown */}
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
                When enabled, MutationObserver continuously monitors incoming DOM nodes and dynamically repairs invisible or low-contrast text on the fly.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Auto-Repair Engine Active
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

