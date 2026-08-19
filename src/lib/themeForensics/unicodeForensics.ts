// Advanced Unicode & Invisible Character Forensics Engine
// Inspects text sources for suspicious, hidden, zero-width, and corrupting characters while preserving legitimate multilingual text.

import { UnicodeCharacterFinding } from './types';

// Character metadata database for suspicious invisible/control characters
interface SuspiciousCharDef {
  codePoint: number;
  hex: string;
  name: string;
  category: UnicodeCharacterFinding['category'];
  renderedWidth: string;
  description: string;
  recommendedAction: string;
  isAlwaysSuspicious: boolean;
}

const SUSPICIOUS_CHAR_DEFS: Record<number, SuspiciousCharDef> = {
  0x200B: {
    codePoint: 0x200B,
    hex: 'U+200B',
    name: 'ZERO WIDTH SPACE',
    category: 'zero_width',
    renderedWidth: '0px',
    description: 'Invisible zero-width space that causes invisible string divergence and search indexing failures.',
    recommendedAction: 'Remove invisible character',
    isAlwaysSuspicious: true
  },
  0x200C: {
    codePoint: 0x200C,
    hex: 'U+200C',
    name: 'ZERO WIDTH NON-JOINER',
    category: 'zero_width',
    renderedWidth: '0px',
    description: 'Zero-width non-joiner character. Suspicious when found in UI labels, placeholders, or headers.',
    recommendedAction: 'Remove zero-width non-joiner',
    isAlwaysSuspicious: false // Allowed in specific Persian/Indic orthography
  },
  0x200D: {
    codePoint: 0x200D,
    hex: 'U+200D',
    name: 'ZERO WIDTH JOINER',
    category: 'zero_width',
    renderedWidth: '0px',
    description: 'Zero-width joiner character. Suspicious when orphaned or not part of a valid emoji sequence.',
    recommendedAction: 'Remove orphaned zero-width joiner',
    isAlwaysSuspicious: false // Allowed in valid emoji sequences
  },
  0x2060: {
    codePoint: 0x2060,
    hex: 'U+2060',
    name: 'WORD JOINER',
    category: 'zero_width',
    renderedWidth: '0px',
    description: 'Zero-width word joiner prohibiting line break without visual glyph.',
    recommendedAction: 'Remove word joiner',
    isAlwaysSuspicious: true
  },
  0xFEFF: {
    codePoint: 0xFEFF,
    hex: 'U+FEFF',
    name: 'ZERO WIDTH NO-BREAK SPACE / BOM',
    category: 'bom',
    renderedWidth: '0px',
    description: 'Byte Order Mark (BOM) or zero-width no-break space erroneously embedded in UI text.',
    recommendedAction: 'Strip embedded Byte Order Mark',
    isAlwaysSuspicious: true
  },
  0x00AD: {
    codePoint: 0x00AD,
    hex: 'U+00AD',
    name: 'SOFT HYPHEN',
    category: 'soft_hyphen',
    renderedWidth: '0px (invisible until broken)',
    description: 'Soft hyphen character that remains invisible until line wrapping occurs.',
    recommendedAction: 'Remove hidden soft hyphen',
    isAlwaysSuspicious: true
  },
  0xFFFD: {
    codePoint: 0xFFFD,
    hex: 'U+FFFD',
    name: 'REPLACEMENT CHARACTER',
    category: 'replacement',
    renderedWidth: '~8px (diamond question mark)',
    description: 'Unicode replacement glyph indicating binary decoding error or unrepresentable byte sequence.',
    recommendedAction: 'Sanitize corrupted encoding replacement character',
    isAlwaysSuspicious: true
  },
  0x180E: {
    codePoint: 0x180E,
    hex: 'U+180E',
    name: 'MONGOLIAN VOWEL SEPARATOR',
    category: 'zero_width',
    renderedWidth: '0px',
    description: 'Obsolete zero-width space character from Mongolian script block.',
    recommendedAction: 'Remove deprecated separator',
    isAlwaysSuspicious: true
  },
  0x00A0: {
    codePoint: 0x00A0,
    hex: 'U+00A0',
    name: 'NO-BREAK SPACE',
    category: 'suspicious_whitespace',
    renderedWidth: '~4px-8px (space width)',
    description: 'Non-breaking space (NBSP). Flags when used as trailing/leading padding or corrupting input values.',
    recommendedAction: 'Normalize to standard whitespace (U+0020)',
    isAlwaysSuspicious: false
  },
  // Bidirectional Control Characters
  0x200E: {
    codePoint: 0x200E,
    hex: 'U+200E',
    name: 'LEFT-TO-RIGHT MARK',
    category: 'bidi_control',
    renderedWidth: '0px',
    description: 'Invisible left-to-right directional mark that alters text rendering flow.',
    recommendedAction: 'Remove bidi control character',
    isAlwaysSuspicious: true
  },
  0x200F: {
    codePoint: 0x200F,
    hex: 'U+200F',
    name: 'RIGHT-TO-LEFT MARK',
    category: 'bidi_control',
    renderedWidth: '0px',
    description: 'Invisible right-to-left directional mark that alters text rendering flow.',
    recommendedAction: 'Remove bidi control character',
    isAlwaysSuspicious: true
  },
  0x202A: {
    codePoint: 0x202A,
    hex: 'U+202A',
    name: 'LEFT-TO-RIGHT EMBEDDING',
    category: 'bidi_control',
    renderedWidth: '0px',
    description: 'Bidi embedding control character.',
    recommendedAction: 'Remove bidi embedding override',
    isAlwaysSuspicious: true
  },
  0x202B: {
    codePoint: 0x202B,
    hex: 'U+202B',
    name: 'RIGHT-TO-LEFT EMBEDDING',
    category: 'bidi_control',
    renderedWidth: '0px',
    description: 'Bidi embedding control character.',
    recommendedAction: 'Remove bidi embedding override',
    isAlwaysSuspicious: true
  },
  0x202C: {
    codePoint: 0x202C,
    hex: 'U+202C',
    name: 'POP DIRECTIONAL FORMATTING',
    category: 'bidi_control',
    renderedWidth: '0px',
    description: 'Bidi directional pop formatting character.',
    recommendedAction: 'Remove bidi control character',
    isAlwaysSuspicious: true
  },
  0x202D: {
    codePoint: 0x202D,
    hex: 'U+202D',
    name: 'LEFT-TO-RIGHT OVERRIDE',
    category: 'bidi_control',
    renderedWidth: '0px',
    description: 'Dangerous bidi override character used in Trojan Source attacks and visual spoofing.',
    recommendedAction: 'Strip dangerous directional override',
    isAlwaysSuspicious: true
  },
  0x202E: {
    codePoint: 0x202E,
    hex: 'U+202E',
    name: 'RIGHT-TO-LEFT OVERRIDE',
    category: 'bidi_control',
    renderedWidth: '0px',
    description: 'Dangerous bidi override character used in Trojan Source attacks and file extension spoofing.',
    recommendedAction: 'Strip dangerous directional override',
    isAlwaysSuspicious: true
  },
  0x2066: {
    codePoint: 0x2066,
    hex: 'U+2066',
    name: 'LEFT-TO-RIGHT ISOLATE',
    category: 'bidi_control',
    renderedWidth: '0px',
    description: 'Bidi directional isolate character.',
    recommendedAction: 'Remove bidi isolate character',
    isAlwaysSuspicious: true
  },
  0x2067: {
    codePoint: 0x2067,
    hex: 'U+2067',
    name: 'RIGHT-TO-LEFT ISOLATE',
    category: 'bidi_control',
    renderedWidth: '0px',
    description: 'Bidi directional isolate character.',
    recommendedAction: 'Remove bidi isolate character',
    isAlwaysSuspicious: true
  },
  0x2068: {
    codePoint: 0x2068,
    hex: 'U+2068',
    name: 'FIRST STRONG ISOLATE',
    category: 'bidi_control',
    renderedWidth: '0px',
    description: 'Bidi directional isolate character.',
    recommendedAction: 'Remove bidi isolate character',
    isAlwaysSuspicious: true
  },
  0x2069: {
    codePoint: 0x2069,
    hex: 'U+2069',
    name: 'POP DIRECTIONAL ISOLATE',
    category: 'bidi_control',
    renderedWidth: '0px',
    description: 'Bidi directional pop character.',
    recommendedAction: 'Remove bidi isolate character',
    isAlwaysSuspicious: true
  },
  0x2028: {
    codePoint: 0x2028,
    hex: 'U+2028',
    name: 'LINE SEPARATOR',
    category: 'control_char',
    renderedWidth: '0px (triggers line break)',
    description: 'Unicode line separator which can break JSON parsing and single-line input rendering.',
    recommendedAction: 'Replace with standard space or newline',
    isAlwaysSuspicious: true
  },
  0x2029: {
    codePoint: 0x2029,
    hex: 'U+2029',
    name: 'PARAGRAPH SEPARATOR',
    category: 'control_char',
    renderedWidth: '0px (triggers paragraph break)',
    description: 'Unicode paragraph separator.',
    recommendedAction: 'Replace with standard newline',
    isAlwaysSuspicious: true
  }
};

// Check if a character at a specific position is part of a valid emoji sequence (e.g. ZWJ emoji composite)
function isValidEmojiSequence(text: string, charIndex: number): boolean {
  if (charIndex < 0 || charIndex >= text.length) return false;
  
  // Look at a 4-character window around the index
  const start = Math.max(0, charIndex - 2);
  const end = Math.min(text.length, charIndex + 3);
  const windowStr = text.substring(start, end);
  
  // Standard Emoji regex testing whether surrounding characters are emoji graphemes
  // Matches standard Emoji including skin-tone modifiers and multi-person emojis
  const emojiPattern = /\p{Extended_Pictographic}/u;
  
  const beforeChar = charIndex > 0 ? text[charIndex - 1] : '';
  const afterChar = charIndex < text.length - 1 ? text[charIndex + 1] : '';
  
  if (emojiPattern.test(beforeChar) && emojiPattern.test(afterChar)) {
    return true;
  }
  
  // Check if surrounded by emoji presentation selectors U+FE0F
  if (charIndex > 0 && text.charCodeAt(charIndex - 1) === 0xFE0F) return true;
  if (charIndex < text.length - 1 && text.charCodeAt(charIndex + 1) === 0xFE0F) return true;

  return false;
}

// Check if a non-breaking space (U+00A0) is used in a suspicious manner
function isSuspiciousNBSP(text: string, index: number): boolean {
  // If NBSP is leading or trailing, or consecutive (multiple in a row), or inside placeholder/input
  if (index === 0 || index === text.length - 1) return true;
  if (text[index - 1] === '\u00A0' || text[index + 1] === '\u00A0') return true;
  if (text[index - 1] === ' ' || text[index + 1] === ' ') return true; // Mixed space + NBSP
  return false;
}

/**
 * Performs character-by-character forensic inspection of a text string.
 * Returns all detected suspicious invisible or corrupting characters with full metadata.
 */
export function inspectStringForInvisibleChars(text: string, sourceType: string = 'text'): UnicodeCharacterFinding[] {
  if (!text || text.length === 0) return [];

  const findings: UnicodeCharacterFinding[] = [];

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const char = text[i];
    const def = SUSPICIOUS_CHAR_DEFS[code];

    if (def) {
      // Check contextual exceptions
      if (code === 0x200D && isValidEmojiSequence(text, i)) {
        // Valid emoji sequence - do not flag!
        continue;
      }
      if (code === 0x200C && !def.isAlwaysSuspicious) {
        // Only flag ZWNJ if not in valid script context
        // If surrounded by standard ASCII or Latin letters, it's corrupting
        const isLatinContext = /[a-zA-Z0-9_\-\s]/.test(text[Math.max(0, i - 1)]) && /[a-zA-Z0-9_\-\s]/.test(text[Math.min(text.length - 1, i + 1)]);
        if (!isLatinContext) {
          continue;
        }
      }
      if (code === 0x00A0) {
        // Only flag NBSP when leading, trailing, clustered, or in input/placeholder
        const isInputOrPlaceholder = sourceType === 'placeholder' || sourceType === 'input_value' || sourceType === 'button';
        if (!isSuspiciousNBSP(text, i) && !isInputOrPlaceholder) {
          continue;
        }
      }

      findings.push({
        char,
        codePoint: def.hex,
        codePointNumber: def.codePoint,
        name: def.name,
        position: i,
        renderedWidth: def.renderedWidth,
        category: def.category,
        description: def.description,
        isRepairable: true,
        recommendedAction: def.recommendedAction
      });
      continue;
    }

    // Check for low ASCII non-printable control characters (0x00-0x1F except tab, CR, LF)
    if (code < 0x20 && code !== 0x09 && code !== 0x0A && code !== 0x0D) {
      findings.push({
        char: `\\x${code.toString(16).padStart(2, '0').toUpperCase()}`,
        codePoint: `U+${code.toString(16).padStart(4, '0').toUpperCase()}`,
        codePointNumber: code,
        name: `ASCII CONTROL CODE (0x${code.toString(16).toUpperCase()})`,
        position: i,
        renderedWidth: '0px',
        category: 'control_char',
        description: `Unprintable ASCII control character (code ${code}) embedded in text source.`,
        isRepairable: true,
        recommendedAction: 'Strip unprintable control character'
      });
      continue;
    }

    // Check for specific Unicode spaces U+2000 through U+200A when isolated or in placeholders
    if (code >= 0x2000 && code <= 0x200A) {
      const spaceNames: Record<number, string> = {
        0x2000: 'EN QUAD',
        0x2001: 'EM QUAD',
        0x2002: 'EN SPACE',
        0x2003: 'EM SPACE',
        0x2004: 'THREE-PER-EM SPACE',
        0x2005: 'FOUR-PER-EM SPACE',
        0x2006: 'SIX-PER-EM SPACE',
        0x2007: 'FIGURE SPACE',
        0x2008: 'PUNCTUATION SPACE',
        0x2009: 'THIN SPACE',
        0x200A: 'HAIR SPACE'
      };

      findings.push({
        char,
        codePoint: `U+${code.toString(16).padStart(4, '0').toUpperCase()}`,
        codePointNumber: code,
        name: spaceNames[code] || 'SPECIAL UNICODE SPACE',
        position: i,
        renderedWidth: '~2px-8px',
        category: 'suspicious_whitespace',
        description: `Uncommon Unicode typography space (${spaceNames[code] || 'space'}) that can cause search mismatch and string divergence.`,
        isRepairable: true,
        recommendedAction: 'Normalize to standard ASCII space (U+0020)'
      });
      continue;
    }
  }

  return findings;
}

/**
 * Creates human-readable surrounding context string with character indicator.
 * Example: "Exact [U+200B ZERO WIDTH SPACE] Column Header"
 */
export function formatSurroundingContext(text: string, position: number, codePoint: string, name: string): string {
  if (!text) return '';
  const start = Math.max(0, position - 15);
  const end = Math.min(text.length, position + 16);
  
  const prefix = (start > 0 ? '...' : '') + text.substring(start, position);
  const suffix = text.substring(position + 1, end) + (end < text.length ? '...' : '');
  
  return `${prefix}[${codePoint} ${name}]${suffix}`;
}

/**
 * Safely sanitizes a text string by removing genuinely suspicious invisible and corrupting characters
 * while strictly preserving legitimate multilingual characters, CJK, Arabic, Cyrillic, African scripts,
 * accented characters, normal punctuation, and emoji sequences.
 */
export function sanitizeTextSafely(text: string): { cleaned: string; removedCount: number; removedDetails: string[] } {
  if (!text || typeof text !== 'string') {
    return { cleaned: '', removedCount: 0, removedDetails: [] };
  }

  let result = '';
  let removedCount = 0;
  const removedDetails: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const def = SUSPICIOUS_CHAR_DEFS[code];

    if (def) {
      // 1. Preserve valid emoji sequences with ZWJ
      if (code === 0x200D && isValidEmojiSequence(text, i)) {
        result += text[i];
        continue;
      }

      // 2. Preserve valid ZWNJ in non-Latin scripts
      if (code === 0x200C && !def.isAlwaysSuspicious) {
        const isLatinContext = /[a-zA-Z0-9_\-\s]/.test(text[Math.max(0, i - 1)]) && /[a-zA-Z0-9_\-\s]/.test(text[Math.min(text.length - 1, i + 1)]);
        if (!isLatinContext) {
          result += text[i];
          continue;
        }
      }

      // 3. For NBSP, safely replace with standard space if not leading/trailing, or trim if leading/trailing
      if (code === 0x00A0) {
        if (i === 0 || i === text.length - 1) {
          // Skip leading/trailing
          removedCount++;
          removedDetails.push('U+00A0 (Trimmed leading/trailing NBSP)');
          continue;
        } else {
          // Normalize internal NBSP to standard space
          result += ' ';
          removedCount++;
          removedDetails.push('U+00A0 -> U+0020 (Normalized internal NBSP)');
          continue;
        }
      }

      // 4. All other suspicious invisible characters are safely stripped
      removedCount++;
      removedDetails.push(`${def.hex} (${def.name})`);
      continue;
    }

    // 5. Unprintable ASCII controls (0x00-0x1F except \t, \n, \r) are stripped
    if (code < 0x20 && code !== 0x09 && code !== 0x0A && code !== 0x0D) {
      removedCount++;
      removedDetails.push(`U+${code.toString(16).padStart(4, '0').toUpperCase()} (ASCII Control Code)`);
      continue;
    }

    // 6. Normalize exotic Unicode space characters (U+2000 - U+200A) to standard space
    if (code >= 0x2000 && code <= 0x200A) {
      result += ' ';
      removedCount++;
      removedDetails.push(`U+${code.toString(16).padStart(4, '0').toUpperCase()} (Normalized Space)`);
      continue;
    }

    // 7. Legitimate character preserved untouched!
    result += text[i];
  }

  return {
    cleaned: result,
    removedCount,
    removedDetails
  };
}
