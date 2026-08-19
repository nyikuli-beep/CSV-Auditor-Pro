// Rendered Text Forensics & Computed Style Visibility Engine
// Inspects rendered DOM elements for transparent text, color collisions, zero-opacity, clipped elements, and mode-specific visibility failures.

import { TextForensicsIssue, ForensicsSeverity } from './types';

// Helper to calculate relative luminance according to WCAG 2.1 specs
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

// Parse rgb/rgba string into [r, g, b, alpha]
export function parseRGBA(colorStr: string): [number, number, number, number] | null {
  if (!colorStr) return null;
  const str = colorStr.trim().toLowerCase();
  
  if (str === 'transparent') {
    return [0, 0, 0, 0];
  }
  
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length === 6) {
      const num = parseInt(hex, 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 1];
    }
    if (hex.length === 8) {
      const num = parseInt(hex, 16);
      return [(num >> 24) & 255, (num >> 16) & 255, (num >> 8) & 255, ((num & 255) / 255)];
    }
  }
  
  const match = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (match) {
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    const a = match[4] !== undefined ? parseFloat(match[4]) : 1.0;
    return [r, g, b, a];
  }
  
  return null;
}

// Helper to compute contrast ratio between two colors
export function computeContrastRatio(fgStr: string, bgStr: string): number {
  const fg = parseRGBA(fgStr);
  const bg = parseRGBA(bgStr);
  
  if (!fg || !bg) return 7.0; // Default safe assumption
  if (fg[3] === 0) return 1.0; // Fully transparent foreground has 1:1 contrast

  const l1 = getRelativeLuminance(fg[0], fg[1], fg[2]);
  const l2 = getRelativeLuminance(bg[0], bg[1], bg[2]);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

// Find computed background by ascending parent tree when transparent
export function resolveEffectiveBackground(el: Element, isDarkMode: boolean): string {
  let current: Element | null = el;
  while (current) {
    const style = window.getComputedStyle(current);
    const bg = style.backgroundColor;
    const rgba = parseRGBA(bg);
    if (rgba && rgba[3] > 0.05 && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      return bg;
    }
    current = current.parentElement;
  }
  return isDarkMode ? 'rgb(15, 23, 42)' : 'rgb(248, 250, 252)';
}

// Check if an element is legitimately intended to be screen-reader-only
export function isScreenReaderOnly(el: Element, style: CSSStyleDeclaration): boolean {
  if (el.classList.contains('sr-only') || el.classList.contains('visually-hidden')) return true;
  if (style.position === 'absolute' && (style.clip === 'rect(0px, 0px, 0px, 0px)' || style.clipPath.includes('inset(50%)') || style.width === '1px' || style.height === '1px')) {
    return true;
  }
  return false;
}

/**
 * Inspects a single DOM or SVG element for rendered text visibility defects.
 */
export function inspectElementRenderedVisibility(
  el: HTMLElement | SVGElement,
  isDarkMode: boolean,
  issueCounter: { count: number }
): TextForensicsIssue | null {
  const tagName = el.tagName.toLowerCase();
  
  // Skip Theme Inspector Pro root to prevent recursive self-inspection
  if (el.closest('.theme-inspector-root')) return null;

  // Skip script, style, noscript, template, head, etc.
  if (['script', 'style', 'noscript', 'template', 'head', 'meta', 'link', 'br', 'hr', 'canvas'].includes(tagName)) {
    return null;
  }

  const isSvgText = tagName === 'text' || tagName === 'tspan' || el.classList.contains('recharts-text');
  const style = window.getComputedStyle(el as Element);

  // If container is display: none or completely hidden in a non-text container, verify if it's an intentional closed modal/menu
  if (style.display === 'none') {
    return null; // Intentional hidden UI
  }

  // Get text content or input placeholder / value
  let text = '';
  let sourceType: TextForensicsIssue['sourceType'] = 'text_node';
  let sourceAttribute: string | undefined = undefined;

  if (tagName === 'input' || tagName === 'textarea') {
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    if (input.value && input.value.trim()) {
      text = input.value;
      sourceType = tagName === 'input' ? 'input_value' : 'textarea_value';
    } else if (input.placeholder && input.placeholder.trim()) {
      text = input.placeholder;
      sourceType = 'placeholder';
      sourceAttribute = 'placeholder';
    }
  } else {
    text = el.textContent?.trim() || '';
    if (isSvgText) sourceType = 'svg_text';
    else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) sourceType = 'heading';
    else if (tagName === 'button') sourceType = 'button';
    else if (tagName === 'a') sourceType = 'link';
    else if (tagName === 'label') sourceType = 'label';
  }

  if (!text || text.length === 0) return null;

  // Screen reader only detection
  if (isScreenReaderOnly(el, style)) {
    return null; // Legitimate accessibility pattern
  }

  // Get foreground color
  let color = style.color;
  if (isSvgText) {
    const fillAttr = (el as Element).getAttribute('fill') || style.fill;
    if (fillAttr && fillAttr !== 'none' && fillAttr !== 'currentColor') {
      color = fillAttr;
    }
  }

  const webkitFill = (style as any).webkitTextFillColor;
  if (webkitFill && webkitFill !== 'none' && webkitFill !== 'currentColor') {
    if (webkitFill === 'transparent' || webkitFill === 'rgba(0, 0, 0, 0)') {
      color = 'transparent';
    }
  }

  const bg = resolveEffectiveBackground(el, isDarkMode);
  const colorRGBA = parseRGBA(color);
  const bgRGBA = parseRGBA(bg);
  const opacity = parseFloat(style.opacity || '1');
  const visibility = style.visibility;
  const fontSize = parseFloat(style.fontSize || '16');
  const textIndent = parseFloat(style.textIndent || '0');

  const uniqueSelector = getElementSelector(el);

  // 1. Transparent text detection (color: transparent or alpha = 0)
  if (color === 'transparent' || (colorRGBA && colorRGBA[3] === 0) || webkitFill === 'transparent') {
    return {
      id: `forensic-render-${issueCounter.count++}`,
      type: 'transparent_text',
      severity: 'critical',
      category: 'rendering',
      elementName: isSvgText ? `svg:<${tagName}>` : tagName,
      tagName,
      selector: uniqueSelector,
      sourceType,
      sourceAttribute,
      originalText: text,
      surroundingContext: text.slice(0, 40),
      charactersCount: text.length,
      visibleCharactersCount: 0,
      invisibleCharactersCount: text.length,
      unicodeFindings: [],
      computedStyles: {
        color,
        backgroundColor: bg,
        opacity: style.opacity,
        visibility: style.visibility,
        display: style.display,
        fontSize: style.fontSize,
        textIndent: style.textIndent,
        overflow: style.overflow,
        clip: style.clip,
        clipPath: style.clipPath,
        webkitTextFillColor: webkitFill,
        contrastRatio: 1.0,
        requiredRatio: 4.5,
        modeSpecific: 'both'
      },
      rootCause: 'Text rendered with transparent color (alpha 0 / color: transparent), making it completely invisible to users.',
      recommendedAction: 'Apply theme semantic foreground token (--text-primary)',
      isRepairable: true,
      requiresReview: false,
      targetElement: el
    };
  }

  // 2. Opacity 0 or visibility: hidden on prominent UI elements with text
  if (opacity === 0 || visibility === 'hidden') {
    // Check if element is an inactive tooltip, hidden modal backdrop, etc.
    const isFloatingDismissed = el.closest('[data-state="closed"], [aria-hidden="true"], .hidden, [hidden]');
    if (!isFloatingDismissed) {
      return {
        id: `forensic-render-${issueCounter.count++}`,
        type: 'invisible_rendered',
        severity: 'high',
        category: 'rendering',
        elementName: isSvgText ? `svg:<${tagName}>` : tagName,
        tagName,
        selector: uniqueSelector,
        sourceType,
        sourceAttribute,
        originalText: text,
        surroundingContext: text.slice(0, 40),
        charactersCount: text.length,
        visibleCharactersCount: 0,
        invisibleCharactersCount: text.length,
        unicodeFindings: [],
        computedStyles: {
          color,
          backgroundColor: bg,
          opacity: style.opacity,
          visibility: style.visibility,
          display: style.display,
          fontSize: style.fontSize,
          textIndent: style.textIndent,
          overflow: style.overflow,
          clip: style.clip,
          clipPath: style.clipPath,
          contrastRatio: 1.0,
          requiredRatio: 4.5
        },
        rootCause: opacity === 0 ? 'Element rendered with opacity: 0.' : 'Element rendered with visibility: hidden.',
        recommendedAction: 'Restore opacity to 1.0 and visibility to visible.',
        isRepairable: true,
        requiresReview: false,
        targetElement: el
      };
    }
  }

  // 3. Zero or microscopic font size (font-size <= 1px)
  if (fontSize <= 1.0) {
    return {
      id: `forensic-render-${issueCounter.count++}`,
      type: 'invisible_rendered',
      severity: 'high',
      category: 'rendering',
      elementName: isSvgText ? `svg:<${tagName}>` : tagName,
      tagName,
      selector: uniqueSelector,
      sourceType,
      sourceAttribute,
      originalText: text,
      surroundingContext: text.slice(0, 40),
      charactersCount: text.length,
      visibleCharactersCount: 0,
      invisibleCharactersCount: text.length,
      unicodeFindings: [],
      computedStyles: {
        color,
        backgroundColor: bg,
        opacity: style.opacity,
        visibility: style.visibility,
        display: style.display,
        fontSize: style.fontSize,
        textIndent: style.textIndent,
        overflow: style.overflow,
        clip: style.clip,
        clipPath: style.clipPath
      },
      rootCause: `Microscopic font-size (${fontSize}px) renders glyphs undetectable.`,
      recommendedAction: 'Set font-size to standard readable scale (min 12px/14px).',
      isRepairable: true,
      requiresReview: false,
      targetElement: el
    };
  }

  // 4. Extreme text-indent pushing text out of viewport (text-indent < -1000px)
  if (textIndent < -1000) {
    return {
      id: `forensic-render-${issueCounter.count++}`,
      type: 'clipped_text',
      severity: 'medium',
      category: 'rendering',
      elementName: isSvgText ? `svg:<${tagName}>` : tagName,
      tagName,
      selector: uniqueSelector,
      sourceType,
      sourceAttribute,
      originalText: text,
      surroundingContext: text.slice(0, 40),
      charactersCount: text.length,
      visibleCharactersCount: 0,
      invisibleCharactersCount: text.length,
      unicodeFindings: [],
      computedStyles: {
        color,
        backgroundColor: bg,
        opacity: style.opacity,
        visibility: style.visibility,
        display: style.display,
        fontSize: style.fontSize,
        textIndent: style.textIndent,
        overflow: style.overflow,
        clip: style.clip,
        clipPath: style.clipPath
      },
      rootCause: `Extreme negative text-indent (${textIndent}px) positions text outside the visual bounding box.`,
      recommendedAction: 'Reset text-indent to 0.',
      isRepairable: true,
      requiresReview: true,
      reviewReason: 'Negative text-indent may be an older image replacement technique. Verify if intentional.',
      targetElement: el
    };
  }

  // 5. Exact Color-Background Collision (e.g. White text on White background or Dark text on Dark background)
  const contrastRatio = computeContrastRatio(color, bg);
  const isBold = parseInt(style.fontWeight, 10) >= 600 || style.fontWeight === 'bold' || style.fontWeight === '900';
  const requiredRatio = (fontSize >= 18 || (isBold && fontSize >= 14)) ? 3.0 : 4.5;

  // Collision detection: ratio < 1.2 or exact match
  const isExactCollision = colorRGBA && bgRGBA && 
    Math.abs(colorRGBA[0] - bgRGBA[0]) < 10 && 
    Math.abs(colorRGBA[1] - bgRGBA[1]) < 10 && 
    Math.abs(colorRGBA[2] - bgRGBA[2]) < 10;

  if (isExactCollision || contrastRatio < 2.0) {
    const isLightBg = bgRGBA ? getRelativeLuminance(bgRGBA[0], bgRGBA[1], bgRGBA[2]) > 0.45 : !isDarkMode;
    const modeSpecific = isDarkMode 
      ? (isLightBg ? 'light_only' : 'dark_only') 
      : (isLightBg ? 'light_only' : 'dark_only');

    return {
      id: `forensic-render-${issueCounter.count++}`,
      type: 'contrast_collision',
      severity: 'critical',
      category: 'contrast',
      elementName: isSvgText ? `svg:<${tagName}>` : tagName,
      tagName,
      selector: uniqueSelector,
      sourceType,
      sourceAttribute,
      originalText: text,
      surroundingContext: text.slice(0, 40),
      charactersCount: text.length,
      visibleCharactersCount: 0,
      invisibleCharactersCount: text.length,
      unicodeFindings: [],
      computedStyles: {
        color,
        backgroundColor: bg,
        opacity: style.opacity,
        visibility: style.visibility,
        display: style.display,
        fontSize: style.fontSize,
        textIndent: style.textIndent,
        overflow: style.overflow,
        clip: style.clip,
        clipPath: style.clipPath,
        contrastRatio: parseFloat(contrastRatio.toFixed(2)),
        requiredRatio,
        modeSpecific
      },
      rootCause: isExactCollision 
        ? `Foreground color (${color}) directly collides with background (${bg}), making text totally invisible.`
        : `Contrast ratio (${contrastRatio.toFixed(2)}:1) is severely below minimum legibility threshold (2.0:1).`,
      recommendedAction: isLightBg ? 'Apply dark high-contrast token (#111827)' : 'Apply light high-contrast token (#F9FAFB)',
      isRepairable: true,
      requiresReview: false,
      targetElement: el
    };
  }

  // 6. General WCAG Contrast Violation (between 2.0 and requiredRatio 4.5/3.0)
  if (contrastRatio < requiredRatio) {
    const isLightBg = bgRGBA ? getRelativeLuminance(bgRGBA[0], bgRGBA[1], bgRGBA[2]) > 0.45 : !isDarkMode;
    return {
      id: `forensic-render-${issueCounter.count++}`,
      type: 'contrast_collision',
      severity: 'medium',
      category: 'contrast',
      elementName: isSvgText ? `svg:<${tagName}>` : tagName,
      tagName,
      selector: uniqueSelector,
      sourceType,
      sourceAttribute,
      originalText: text,
      surroundingContext: text.slice(0, 40),
      charactersCount: text.length,
      visibleCharactersCount: text.length,
      invisibleCharactersCount: 0,
      unicodeFindings: [],
      computedStyles: {
        color,
        backgroundColor: bg,
        opacity: style.opacity,
        visibility: style.visibility,
        display: style.display,
        fontSize: style.fontSize,
        textIndent: style.textIndent,
        overflow: style.overflow,
        clip: style.clip,
        clipPath: style.clipPath,
        contrastRatio: parseFloat(contrastRatio.toFixed(2)),
        requiredRatio
      },
      rootCause: `Contrast ratio ${contrastRatio.toFixed(2)}:1 is below WCAG AA required ratio of ${requiredRatio}:1.`,
      recommendedAction: isLightBg ? 'Enforce dark text token (#111827)' : 'Enforce light text token (#F9FAFB)',
      isRepairable: true,
      requiresReview: false,
      targetElement: el
    };
  }

  return null;
}

// Generate CSS selector for element inspection
export function getElementSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  
  const tagName = el.tagName.toLowerCase();
  if (tagName === 'input') {
    const type = (el as HTMLInputElement).type || 'text';
    const placeholder = (el as HTMLInputElement).placeholder;
    if (placeholder) return `input[placeholder="${placeholder.slice(0, 20)}"]`;
    return `input[type="${type}"]`;
  }

  if (el.className && typeof el.className === 'string') {
    const classes = el.className.split(/\s+/).filter(c => c && !c.includes(':') && !c.startsWith('theme-')).slice(0, 2);
    if (classes.length > 0) return `${tagName}.${classes.join('.')}`;
  }

  if (el.parentElement) {
    const parentTag = el.parentElement.tagName.toLowerCase();
    return `${parentTag} > ${tagName}`;
  }

  return tagName;
}
