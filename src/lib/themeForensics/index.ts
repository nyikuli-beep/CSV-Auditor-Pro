// Central Theme Inspector Pro Forensics Engine
// Coordinates Deep Unicode Forensics, Rendered Text Visibility Forensics, WCAG AA Auditing, and Intelligent Self-Healing.

import { 
  TextForensicsIssue, 
  ForensicsAuditStats, 
  ForensicScanOptions, 
  RepairRecord 
} from './types';
import { 
  inspectStringForInvisibleChars, 
  formatSurroundingContext, 
  sanitizeTextSafely 
} from './unicodeForensics';
import { 
  inspectElementRenderedVisibility, 
  getElementSelector, 
  computeContrastRatio, 
  resolveEffectiveBackground 
} from './renderedTextForensics';
import { executeVerifiedRepair, undoRepair, RepairExecutionResult } from './repairEngine';

export * from './types';
export * from './unicodeForensics';
export * from './renderedTextForensics';
export * from './repairEngine';

/**
 * Runs a comprehensive UI forensic scan across the target DOM tree.
 */
export function runDeepForensicsScan(options: ForensicScanOptions): {
  issues: TextForensicsIssue[];
  unicodeIssues: TextForensicsIssue[];
  renderingIssues: TextForensicsIssue[];
  stats: ForensicsAuditStats;
} {
  const isDarkMode = options.isDarkMode;
  const root = options.targetRoot || document.body;

  const foundIssues: TextForensicsIssue[] = [];
  const issueCounter = { count: 1 };

  // Category counts
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

  let totalTextNodesScanned = 0;
  let totalCharactersInspected = 0;
  let totalUnicodeIssues = 0;
  let totalRenderingIssues = 0;
  let totalContrastIssues = 0;

  // Query all inspectable DOM elements (HTML + SVG)
  const allElements = Array.from(root.querySelectorAll<HTMLElement | SVGElement>(
    'h1, h2, h3, h4, h5, h6, p, span, button, a, label, th, td, input, textarea, select, text, tspan, foreignObject, img, [aria-label], [title], .recharts-text, .recharts-cartesian-axis-tick-value, .recharts-legend-item-text, .chart-donut-center span, .chart-dial-center span, .chart-meter-center span'
  ));

  allElements.forEach(el => {
    // Skip Theme Inspector root
    if (el.closest('.theme-inspector-root')) return;

    const tagName = el.tagName.toLowerCase();
    const isSvgText = tagName === 'text' || tagName === 'tspan' || el.classList.contains('recharts-text');

    // Categorization
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) headingsCount++;
    else if (tagName === 'button' || tagName === 'a') buttonsCount++;
    else if (['th', 'td'].includes(tagName)) tablesCount++;
    else if (['input', 'textarea', 'select', 'label'].includes(tagName)) formsCount++;
    else if (isSvgText || el.closest('.chart-donut-center, .chart-dial-center, .chart-meter-center')) chartTextCount++;
    else otherCount++;

    const selector = getElementSelector(el);

    // ==========================================
    // 1. UNICODE & INVISIBLE CHARACTER INSPECTION
    // ==========================================
    const checkTextSources: { text: string; sourceType: TextForensicsIssue['sourceType']; attrName?: string }[] = [];

    // A. Direct textContent
    if (tagName !== 'input' && tagName !== 'textarea') {
      const text = el.textContent || '';
      if (text.length > 0) {
        totalTextNodesScanned++;
        totalCharactersInspected += text.length;
        checkTextSources.push({
          text,
          sourceType: isSvgText ? 'svg_text' : (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName) ? 'heading' : (tagName === 'button' ? 'button' : (tagName === 'a' ? 'link' : 'text_node')))
        });
      }
    }

    // B. Input / Textarea values and placeholders
    if (tagName === 'input' || tagName === 'textarea') {
      const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
      if (inputEl.value) {
        totalTextNodesScanned++;
        totalCharactersInspected += inputEl.value.length;
        checkTextSources.push({
          text: inputEl.value,
          sourceType: tagName === 'input' ? 'input_value' : 'textarea_value'
        });
      }
      if (inputEl.placeholder) {
        totalTextNodesScanned++;
        totalCharactersInspected += inputEl.placeholder.length;
        checkTextSources.push({
          text: inputEl.placeholder,
          sourceType: 'placeholder',
          attrName: 'placeholder'
        });
      }
    }

    // C. Aria-label & Title attributes
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
      totalCharactersInspected += ariaLabel.length;
      checkTextSources.push({ text: ariaLabel, sourceType: 'aria_label', attrName: 'aria-label' });
    }

    const titleAttr = el.getAttribute('title');
    if (titleAttr) {
      totalCharactersInspected += titleAttr.length;
      checkTextSources.push({ text: titleAttr, sourceType: 'title', attrName: 'title' });
    }

    const altAttr = el.getAttribute('alt');
    if (altAttr && tagName === 'img') {
      totalCharactersInspected += altAttr.length;
      checkTextSources.push({ text: altAttr, sourceType: 'alt', attrName: 'alt' });
    }

    // Run Unicode Inspector against each collected text source
    checkTextSources.forEach(source => {
      const findings = inspectStringForInvisibleChars(source.text, source.sourceType);
      if (findings.length > 0) {
        totalUnicodeIssues++;
        const firstFinding = findings[0];
        const surrounding = formatSurroundingContext(source.text, firstFinding.position, firstFinding.codePoint, firstFinding.name);
        const sanitized = sanitizeTextSafely(source.text);

        foundIssues.push({
          id: `forensic-unicode-${issueCounter.count++}`,
          type: 'invisible_unicode',
          severity: 'critical',
          category: 'unicode',
          elementName: isSvgText ? `svg:<${tagName}>` : tagName,
          tagName,
          selector,
          sourceType: source.sourceType,
          sourceAttribute: source.attrName,
          originalText: source.text,
          cleanedText: sanitized.cleaned,
          surroundingContext: surrounding,
          charactersCount: source.text.length,
          visibleCharactersCount: source.text.length - findings.length,
          invisibleCharactersCount: findings.length,
          unicodeFindings: findings,
          rootCause: `Detected ${findings.length} invisible or corrupting character(s) (${findings.map(f => f.codePoint).join(', ')}) in ${source.sourceType}.`,
          recommendedAction: firstFinding.recommendedAction,
          isRepairable: true,
          requiresReview: false,
          targetElement: el
        });
      }
    });

    // ==========================================
    // 2. MISSING FORM LABELS INSPECTION
    // ==========================================
    if (tagName === 'input' && !el.getAttribute('aria-label') && !el.getAttribute('id') && !el.getAttribute('aria-labelledby')) {
      const inputEl = el as HTMLInputElement;
      if (inputEl.type !== 'hidden' && inputEl.type !== 'submit' && inputEl.type !== 'button') {
        formsIssues++;
        foundIssues.push({
          id: `forensic-label-${issueCounter.count++}`,
          type: 'missing_label',
          severity: 'warning',
          category: 'accessibility',
          elementName: `input[type="${inputEl.type || 'text'}"]`,
          tagName,
          selector,
          sourceType: 'placeholder',
          originalText: inputEl.placeholder || 'Unlabeled Input',
          surroundingContext: inputEl.placeholder || 'Unlabeled Input Field',
          charactersCount: (inputEl.placeholder || '').length,
          visibleCharactersCount: (inputEl.placeholder || '').length,
          invisibleCharactersCount: 0,
          unicodeFindings: [],
          rootCause: 'Input field lacks explicit aria-label, aria-labelledby reference, or associated <label> element.',
          recommendedAction: 'Attach deterministic aria-label matching input placeholder.',
          isRepairable: true,
          requiresReview: false,
          targetElement: el
        });
      }
    }

    // ==========================================
    // 3. RENDERED TEXT VISIBILITY & CONTRAST
    // ==========================================
    const renderIssue = inspectElementRenderedVisibility(el, isDarkMode, issueCounter);
    if (renderIssue) {
      if (renderIssue.category === 'rendering') totalRenderingIssues++;
      if (renderIssue.category === 'contrast') totalContrastIssues++;

      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) headingsIssues++;
      else if (tagName === 'button' || tagName === 'a') buttonsIssues++;
      else if (['th', 'td'].includes(tagName)) tablesIssues++;
      else if (['input', 'textarea', 'select', 'label'].includes(tagName)) formsIssues++;
      else if (isSvgText || el.closest('.chart-donut-center, .chart-dial-center, .chart-meter-center')) chartTextIssues++;
      else otherIssues++;

      foundIssues.push(renderIssue);
    }
  });

  const totalScanned = allElements.length;
  const totalIssuesCount = foundIssues.length;
  const healthScore = totalScanned > 0 ? Math.max(0, Math.round(((totalScanned - totalIssuesCount) / totalScanned) * 100)) : 100;

  const unicodeIssues = foundIssues.filter(i => i.category === 'unicode');
  const renderingIssues = foundIssues.filter(i => i.category === 'rendering' || i.category === 'contrast');

  const stats: ForensicsAuditStats = {
    elementsScanned: totalScanned,
    textNodesScanned: totalTextNodesScanned,
    charactersInspected: totalCharactersInspected,
    unicodeIssuesDetected: totalUnicodeIssues,
    renderingIssuesDetected: totalRenderingIssues,
    contrastIssuesDetected: totalContrastIssues,
    totalIssuesCount,
    repairsAttempted: 0,
    repairsVerified: 0,
    repairsFailed: 0,
    healthScore,
    categories: [
      { name: 'Headings & Titles', total: headingsCount, issues: headingsIssues },
      { name: 'Chart & SVG Labels', total: chartTextCount, issues: chartTextIssues },
      { name: 'Buttons & Controls', total: buttonsCount, issues: buttonsIssues },
      { name: 'Tables & Grid Data', total: tablesCount, issues: tablesIssues },
      { name: 'Forms & Inputs', total: formsCount, issues: formsIssues },
      { name: 'Paragraphs & Labels', total: otherCount, issues: otherIssues }
    ]
  };

  return {
    issues: foundIssues,
    unicodeIssues,
    renderingIssues,
    stats
  };
}
