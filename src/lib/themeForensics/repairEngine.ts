// Intelligent Auto-Repair, Self-Healing, and Verification Engine for Theme Inspector Pro
// Implements the pipeline: SCAN → DETECT → CLASSIFY → IDENTIFY ROOT CAUSE → GENERATE REPAIR → APPLY REPAIR → RE-RENDER → VERIFY → RE-SCAN

import { TextForensicsIssue, RepairRecord } from './types';
import { sanitizeTextSafely, inspectStringForInvisibleChars } from './unicodeForensics';
import { computeContrastRatio, resolveEffectiveBackground, parseRGBA } from './renderedTextForensics';

export interface RepairExecutionResult {
  issueId: string;
  success: boolean;
  action: string;
  originalValue: string;
  repairedValue: string;
  verificationPassed: boolean;
  reason?: string;
  record: RepairRecord;
}

/**
 * Executes an intelligent, verified repair on a single TextForensicsIssue.
 * Re-reads DOM afterwards to mathematically verify the defect was resolved.
 */
export async function executeVerifiedRepair(
  issue: TextForensicsIssue,
  isDarkMode: boolean
): Promise<RepairExecutionResult> {
  const el = issue.targetElement;
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const recordId = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  if (!el || !document.body.contains(el)) {
    const record: RepairRecord = {
      id: recordId,
      timestamp,
      issueId: issue.id,
      issueType: issue.type,
      category: issue.category,
      elementName: issue.elementName,
      selector: issue.selector,
      sourceType: issue.sourceType,
      sourceAttribute: issue.sourceAttribute,
      originalValue: issue.originalText,
      repairedValue: issue.originalText,
      repairAction: 'Target element no longer in DOM',
      verificationResult: 'failed',
      success: false,
      failureReason: 'Element was removed or unmounted before repair could execute.',
      canUndo: false
    };

    return {
      issueId: issue.id,
      success: false,
      action: 'Target missing',
      originalValue: issue.originalText,
      repairedValue: issue.originalText,
      verificationPassed: false,
      reason: 'Element not found in current DOM',
      record
    };
  }

  const tagName = el.tagName.toLowerCase();
  const isSvg = tagName === 'text' || tagName === 'tspan' || el.classList.contains('recharts-text');

  let originalValue = issue.originalText;
  let repairedValue = '';
  let repairAction = '';
  let previousStyleState: { color?: string; opacity?: string; fill?: string; visibility?: string; textIndent?: string; ariaLabel?: string } = {};

  try {
    // 1. UNICODE INVISIBLE CHARACTER REPAIR
    if (issue.type === 'invisible_unicode' || issue.category === 'unicode') {
      const sanitized = sanitizeTextSafely(issue.originalText);
      repairedValue = sanitized.cleaned;
      repairAction = `Removed ${sanitized.removedCount} invisible/corrupting character(s) [${sanitized.removedDetails.slice(0, 2).join(', ')}]`;

      if (issue.sourceType === 'placeholder' && (tagName === 'input' || tagName === 'textarea')) {
        (el as HTMLInputElement | HTMLTextAreaElement).placeholder = sanitized.cleaned;
      } else if (issue.sourceType === 'input_value' && (tagName === 'input' || tagName === 'textarea')) {
        (el as HTMLInputElement | HTMLTextAreaElement).value = sanitized.cleaned;
      } else if (issue.sourceType === 'aria_label') {
        el.setAttribute('aria-label', sanitized.cleaned);
      } else if (issue.sourceType === 'title') {
        el.setAttribute('title', sanitized.cleaned);
      } else if (issue.sourceType === 'alt' && tagName === 'img') {
        el.setAttribute('alt', sanitized.cleaned);
      } else {
        // Standard DOM Text Node or Button/Heading/Label text
        // If element has single text child or simple structure:
        if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
          el.childNodes[0].textContent = sanitized.cleaned;
        } else {
          // Targeted replacement in textContent
          el.textContent = sanitized.cleaned;
        }
      }
    }

    // 2. MISSING LABEL REPAIR
    else if (issue.type === 'missing_label') {
      const inputEl = el as HTMLInputElement;
      const placeholder = inputEl.placeholder || 'Input field';
      previousStyleState.ariaLabel = inputEl.getAttribute('aria-label') || '';
      inputEl.setAttribute('aria-label', placeholder);
      repairedValue = `aria-label="${placeholder}"`;
      repairAction = `Added deterministic accessible label from placeholder: "${placeholder}"`;
    }

    // 3. RENDERED VISIBILITY & CONTRAST REPAIR
    else if (
      issue.type === 'contrast_collision' || 
      issue.type === 'transparent_text' || 
      issue.type === 'invisible_rendered' || 
      issue.type === 'clipped_text'
    ) {
      const currentComputedBg = resolveEffectiveBackground(el, isDarkMode);
      const bgRgba = parseRGBA(currentComputedBg);
      const isLightBg = bgRgba ? (bgRgba[0] * 0.299 + bgRgba[1] * 0.587 + bgRgba[2] * 0.114) > 128 : !isDarkMode;

      // Theme design tokens (strict color codes, no arbitrary colors)
      const targetTextColor = isLightBg ? '#111827' : '#F9FAFB';

      // Save previous inline styles for undo capability
      previousStyleState = {
        color: el.style.color,
        opacity: el.style.opacity,
        visibility: el.style.visibility,
        textIndent: el.style.textIndent,
        fill: (el as any).style?.fill
      };

      if (isSvg) {
        (el as unknown as SVGElement).setAttribute('fill', targetTextColor);
        el.style.fill = targetTextColor;
        el.style.opacity = '1';
        (el as any).style.fontWeight = '700';
      } else {
        el.style.color = targetTextColor;
        (el.style as any).webkitTextFillColor = targetTextColor;
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        if (parseFloat(el.style.textIndent || '0') < -100) {
          el.style.textIndent = '0';
        }
      }

      repairedValue = `color: ${targetTextColor}; opacity: 1; visibility: visible;`;
      repairAction = `Enforced high-contrast semantic theme token (${targetTextColor}) and full opacity.`;
    }

    // Tag element with forensic metadata
    el.setAttribute('data-theme-repaired', 'true');
    el.setAttribute('data-repair-timestamp', timestamp);

    // 4. VERIFICATION PASS (Inspect the modified element to confirm the defect was eliminated)
    let verificationPassed = false;
    let failureReason: string | undefined = undefined;

    if (issue.type === 'invisible_unicode' || issue.category === 'unicode') {
      // Re-read current text from element
      let currentText = '';
      if (issue.sourceType === 'placeholder') {
        currentText = (el as HTMLInputElement).placeholder || '';
      } else if (issue.sourceType === 'input_value') {
        currentText = (el as HTMLInputElement).value || '';
      } else {
        currentText = el.textContent || '';
      }

      const reCheckFindings = inspectStringForInvisibleChars(currentText, issue.sourceType);
      if (reCheckFindings.length === 0) {
        verificationPassed = true;
      } else {
        verificationPassed = false;
        failureReason = `Verification failed: ${reCheckFindings.length} suspicious characters still detected in DOM.`;
      }
    } else if (issue.type === 'missing_label') {
      if (el.getAttribute('aria-label') || el.getAttribute('id')) {
        verificationPassed = true;
      } else {
        verificationPassed = false;
        failureReason = 'Verification failed: aria-label attribute was not accepted by element.';
      }
    } else {
      // Re-calculate contrast and visibility
      const postStyle = window.getComputedStyle(el);
      const postColor = isSvg ? ((el as Element).getAttribute('fill') || postStyle.fill || postStyle.color) : postStyle.color;
      const postBg = resolveEffectiveBackground(el, isDarkMode);
      const postRatio = computeContrastRatio(postColor, postBg);
      const postOpacity = parseFloat(postStyle.opacity || '1');

      if (postRatio >= 3.0 && postOpacity > 0.5 && postStyle.visibility !== 'hidden') {
        verificationPassed = true;
      } else {
        verificationPassed = false;
        failureReason = `Verification failed: Resulting contrast ratio (${postRatio.toFixed(2)}:1) or opacity remains non-compliant.`;
      }
    }

    const record: RepairRecord = {
      id: recordId,
      timestamp,
      issueId: issue.id,
      issueType: issue.type,
      category: issue.category,
      elementName: issue.elementName,
      selector: issue.selector,
      sourceType: issue.sourceType,
      sourceAttribute: issue.sourceAttribute,
      originalValue,
      repairedValue,
      repairAction,
      verificationResult: verificationPassed ? 'passed' : 'failed',
      success: verificationPassed,
      failureReason,
      targetElement: el,
      canUndo: true
    };

    issue.repaired = verificationPassed;
    issue.verificationPassed = verificationPassed;
    issue.repairTimestamp = timestamp;

    return {
      issueId: issue.id,
      success: verificationPassed,
      action: repairAction,
      originalValue,
      repairedValue,
      verificationPassed,
      reason: failureReason,
      record
    };

  } catch (err: any) {
    const record: RepairRecord = {
      id: recordId,
      timestamp,
      issueId: issue.id,
      issueType: issue.type,
      category: issue.category,
      elementName: issue.elementName,
      selector: issue.selector,
      sourceType: issue.sourceType,
      sourceAttribute: issue.sourceAttribute,
      originalValue,
      repairedValue: '',
      repairAction: 'Error executing repair',
      verificationResult: 'failed',
      success: false,
      failureReason: err?.message || 'DOM manipulation error occurred.',
      targetElement: el,
      canUndo: false
    };

    return {
      issueId: issue.id,
      success: false,
      action: 'Repair threw exception',
      originalValue,
      repairedValue: '',
      verificationPassed: false,
      reason: err?.message || 'Exception during repair',
      record
    };
  }
}

/**
 * Undoes a previously applied repair safely.
 */
export function undoRepair(record: RepairRecord): boolean {
  if (!record.canUndo || !record.targetElement || !document.body.contains(record.targetElement)) {
    return false;
  }

  const el = record.targetElement;
  const tagName = el.tagName.toLowerCase();

  try {
    if (record.issueType === 'invisible_unicode' || record.category === 'unicode') {
      if (record.sourceType === 'placeholder' && (tagName === 'input' || tagName === 'textarea')) {
        (el as HTMLInputElement | HTMLTextAreaElement).placeholder = record.originalValue;
      } else if (record.sourceType === 'input_value' && (tagName === 'input' || tagName === 'textarea')) {
        (el as HTMLInputElement | HTMLTextAreaElement).value = record.originalValue;
      } else if (record.sourceType === 'aria_label') {
        el.setAttribute('aria-label', record.originalValue);
      } else {
        el.textContent = record.originalValue;
      }
    } else if (record.issueType === 'missing_label') {
      el.removeAttribute('aria-label');
    } else {
      // Revert styles
      el.style.color = '';
      (el.style as any).webkitTextFillColor = '';
      el.style.opacity = '';
      el.style.visibility = '';
      el.style.textIndent = '';
      if (tagName === 'text' || tagName === 'tspan' || el.classList.contains('recharts-text')) {
        (el as unknown as SVGElement).removeAttribute('fill');
      }
    }

    el.removeAttribute('data-theme-repaired');
    record.undone = true;
    return true;
  } catch (e) {
    console.warn('Failed to undo repair:', e);
    return false;
  }
}
