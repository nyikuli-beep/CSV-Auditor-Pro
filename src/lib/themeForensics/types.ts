// Types for Theme Inspector Pro - Deep UI Forensics & Self-Healing Engine

export type ForensicsSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'warning' | 'error';

export type TextSourceType = 
  | 'text_node'
  | 'input_value'
  | 'textarea_value'
  | 'placeholder'
  | 'label'
  | 'heading'
  | 'button'
  | 'link'
  | 'aria_label'
  | 'aria_labelledby'
  | 'title'
  | 'alt'
  | 'selected_option'
  | 'data_attribute'
  | 'svg_text';

export interface UnicodeCharacterFinding {
  char: string;
  codePoint: string; // e.g. "U+200B"
  codePointNumber: number; // e.g. 0x200B
  name: string; // e.g. "ZERO WIDTH SPACE"
  position: number; // 0-indexed position in source
  renderedWidth: string; // e.g. "0px" or "~0px"
  category: 'zero_width' | 'bidi_control' | 'bom' | 'soft_hyphen' | 'replacement' | 'suspicious_whitespace' | 'control_char' | 'malformed_sequence';
  description: string;
  isRepairable: boolean;
  recommendedAction: string;
}

export interface TextForensicsIssue {
  id: string;
  type: 'invisible_unicode' | 'invisible_rendered' | 'contrast_collision' | 'transparent_text' | 'clipped_text' | 'missing_label';
  severity: ForensicsSeverity;
  category: 'unicode' | 'rendering' | 'contrast' | 'accessibility';
  elementName: string;
  tagName: string;
  selector: string;
  sourceType: TextSourceType;
  sourceAttribute?: string;
  originalText: string;
  cleanedText?: string;
  surroundingContext: string;
  charactersCount: number;
  visibleCharactersCount: number;
  invisibleCharactersCount: number;
  unicodeFindings: UnicodeCharacterFinding[];
  // Rendering metrics (if applicable)
  computedStyles?: {
    color: string;
    backgroundColor: string;
    opacity: string;
    visibility: string;
    display: string;
    fontSize: string;
    textIndent: string;
    overflow: string;
    clip: string;
    clipPath: string;
    webkitTextFillColor?: string;
    contrastRatio?: number;
    requiredRatio?: number;
    modeSpecific?: 'dark_only' | 'light_only' | 'both';
  };
  rootCause: string;
  recommendedAction: string;
  isRepairable: boolean;
  requiresReview: boolean;
  reviewReason?: string;
  targetElement?: HTMLElement | SVGElement;
  repaired?: boolean;
  verificationPassed?: boolean;
  repairTimestamp?: string;
}

export interface RepairRecord {
  id: string;
  timestamp: string;
  issueId: string;
  issueType: string;
  category: string;
  elementName: string;
  selector: string;
  sourceType: TextSourceType;
  sourceAttribute?: string;
  originalValue: string;
  repairedValue: string;
  repairAction: string;
  verificationResult: 'passed' | 'failed' | 'unverified';
  success: boolean;
  failureReason?: string;
  targetElement?: HTMLElement | SVGElement;
  canUndo: boolean;
  undone?: boolean;
}

export interface ForensicsAuditStats {
  elementsScanned: number;
  textNodesScanned: number;
  charactersInspected: number;
  unicodeIssuesDetected: number;
  renderingIssuesDetected: number;
  contrastIssuesDetected: number;
  totalIssuesCount: number;
  repairsAttempted: number;
  repairsVerified: number;
  repairsFailed: number;
  healthScore: number;
  categories: {
    name: string;
    total: number;
    issues: number;
  }[];
}

export interface ForensicScanOptions {
  isDarkMode: boolean;
  scanUnicode?: boolean;
  scanRenderedVisibility?: boolean;
  scanContrast?: boolean;
  scanLabels?: boolean;
  targetRoot?: HTMLElement | Document;
}
