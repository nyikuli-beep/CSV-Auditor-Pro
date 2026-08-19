import { TypographySettings, TypographyFontFamily, TypographyFontSize, TypographyFontWeight } from '../types';

export interface FontDetails {
  id: TypographyFontFamily;
  name: string;
  category: 'standard' | 'modern' | 'serif' | 'monospace';
  fontStack: string;
  isWebFont: boolean;
  googleFontFamily?: string;
  description: string;
  samplePhrase: string;
}

export const FONTS_REGISTRY: Record<TypographyFontFamily, FontDetails> = {
  'system-default': {
    id: 'system-default',
    name: 'System Default',
    category: 'standard',
    fontStack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    isWebFont: false,
    description: 'Native operating system typography for maximum responsiveness and native fidelity.',
    samplePhrase: 'Enterprise CSV Auditor Pro'
  },
  'arial': {
    id: 'arial',
    name: 'Arial',
    category: 'standard',
    fontStack: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    isWebFont: false,
    description: 'Standard, universally compatible clean sans-serif for high legibility.',
    samplePhrase: 'Standard Corporate Sans'
  },
  'helvetica': {
    id: 'helvetica',
    name: 'Helvetica',
    category: 'standard',
    fontStack: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    isWebFont: false,
    description: 'Classic Swiss design renowned for neutral modernist precision.',
    samplePhrase: 'Clean Swiss Precision'
  },
  'times-new-roman': {
    id: 'times-new-roman',
    name: 'Times New Roman',
    category: 'serif',
    fontStack: '"Times New Roman", Times, Georgia, serif',
    isWebFont: false,
    description: 'Traditional, authoritative serif typeface tailored for formal legal and financial audits.',
    samplePhrase: 'Formal Audit Reports'
  },
  'georgia': {
    id: 'georgia',
    name: 'Georgia',
    category: 'serif',
    fontStack: 'Georgia, Cambria, "Times New Roman", Times, serif',
    isWebFont: false,
    description: 'Elegant serif designed for high legibility and reading comfort on digital displays.',
    samplePhrase: 'Editorial Intelligence'
  },
  'verdana': {
    id: 'verdana',
    name: 'Verdana',
    category: 'standard',
    fontStack: 'Verdana, Geneva, Tahoma, sans-serif',
    isWebFont: false,
    description: 'Wide proportions and generous letter-spacing for effortless scanning in dense data tables.',
    samplePhrase: 'Wide Legible Data'
  },
  'tahoma': {
    id: 'tahoma',
    name: 'Tahoma',
    category: 'standard',
    fontStack: 'Tahoma, Verdana, Segoe, sans-serif',
    isWebFont: false,
    description: 'Narrower sans-serif optimized for compact UI headers and dense dashboard cards.',
    samplePhrase: 'Compact Data Tables'
  },
  'trebuchet-ms': {
    id: 'trebuchet-ms',
    name: 'Trebuchet MS',
    category: 'standard',
    fontStack: '"Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", Tahoma, sans-serif',
    isWebFont: false,
    description: 'Distinctive humanist sans-serif with geometric structure and expressive letterforms.',
    samplePhrase: 'Distinctive Structure'
  },
  'courier-new': {
    id: 'courier-new',
    name: 'Courier New',
    category: 'monospace',
    fontStack: '"Courier New", Courier, "Lucida Sans Typewriter", "Lucida Typewriter", monospace',
    isWebFont: false,
    description: 'Classic typewriter monospaced typeface ideal for raw CSV data streams and logs.',
    samplePhrase: 'Raw CSV Records: 100%'
  },
  'inter': {
    id: 'inter',
    name: 'Inter',
    category: 'modern',
    fontStack: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    isWebFont: true,
    googleFontFamily: 'Inter:wght@400;500;600;700',
    description: 'Modern, highly crafted UI font featuring tall x-height and exceptional tabular numerals.',
    samplePhrase: 'Modern SaaS Workspace'
  },
  'roboto': {
    id: 'roboto',
    name: 'Roboto',
    category: 'modern',
    fontStack: '"Roboto", "Helvetica Neue", Arial, sans-serif',
    isWebFont: true,
    googleFontFamily: 'Roboto:wght@400;500;700',
    description: 'Dual geometric-humanist curves engineered for clean data presentation and navigation.',
    samplePhrase: 'Geometric Precision'
  },
  'open-sans': {
    id: 'open-sans',
    name: 'Open Sans',
    category: 'modern',
    fontStack: '"Open Sans", "Helvetica Neue", Arial, sans-serif',
    isWebFont: true,
    googleFontFamily: 'Open+Sans:wght@400;500;600;700',
    description: 'Friendly, open letterforms with upright stress for maximum digital legibility.',
    samplePhrase: 'Optimized Readability'
  },
  'poppins': {
    id: 'poppins',
    name: 'Poppins',
    category: 'modern',
    fontStack: '"Poppins", -apple-system, BlinkMacSystemFont, sans-serif',
    isWebFont: true,
    googleFontFamily: 'Poppins:wght@400;500;600;700',
    description: 'Contemporary geometric sans-serif delivering clean headings and confident card metrics.',
    samplePhrase: 'Clean Geometric Design'
  },
  'montserrat': {
    id: 'montserrat',
    name: 'Montserrat',
    category: 'modern',
    fontStack: '"Montserrat", "Helvetica Neue", Arial, sans-serif',
    isWebFont: true,
    googleFontFamily: 'Montserrat:wght@400;500;600;700',
    description: 'Urban modernist architecture inspired typography with striking geometric structure.',
    samplePhrase: 'Executive Polish & Hierarchy'
  }
};

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  fontFamily: 'system-default',
  fontSize: 'medium',
  fontWeight: 'regular'
};

export interface FontSizeOption {
  id: TypographyFontSize;
  label: string;
  px: string;
  rem: string;
  description: string;
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  {
    id: 'small',
    label: 'Small',
    px: '14px',
    rem: '0.875rem',
    description: 'Dense layout for high data volumes & widescreen displays'
  },
  {
    id: 'medium',
    label: 'Medium (Default)',
    px: '16px',
    rem: '1.000rem',
    description: 'Balanced enterprise standard for all viewports and workflows'
  },
  {
    id: 'large',
    label: 'Large',
    px: '18px',
    rem: '1.125rem',
    description: 'Enhanced readability with generous line spacing and prominent text'
  },
  {
    id: 'extra-large',
    label: 'Extra Large',
    px: '20px',
    rem: '1.250rem',
    description: 'Maximum accessibility and high-contrast presentation mode'
  }
];

export interface FontWeightOption {
  id: TypographyFontWeight;
  label: string;
  weight: number;
  description: string;
}

export const FONT_WEIGHT_OPTIONS: FontWeightOption[] = [
  {
    id: 'regular',
    label: 'Regular (400)',
    weight: 400,
    description: 'Standard typographic body balance'
  },
  {
    id: 'medium',
    label: 'Medium (500)',
    weight: 500,
    description: 'Slightly heightened clarity and structure'
  },
  {
    id: 'semibold',
    label: 'Semibold (600)',
    weight: 600,
    description: 'Firm contrast for rapid visual scanning'
  },
  {
    id: 'bold',
    label: 'Bold (700)',
    weight: 700,
    description: 'Authoritative, high-impact weight'
  }
];

const loadedFontsSet = new Set<string>();

/**
 * Dynamically loads a Google Font if it has not already been injected.
 */
export function loadGoogleFont(fontKey: TypographyFontFamily | string): void {
  if (typeof document === 'undefined') return;

  const font = FONTS_REGISTRY[fontKey as TypographyFontFamily];
  if (!font || !font.isWebFont || !font.googleFontFamily) return;

  if (loadedFontsSet.has(font.id)) return;

  const elementId = `google-font-${font.id}`;
  if (document.getElementById(elementId)) {
    loadedFontsSet.add(font.id);
    return;
  }

  // Preconnect to Google Fonts domains if not already present
  if (!document.getElementById('google-fonts-preconnect')) {
    const preconnect1 = document.createElement('link');
    preconnect1.id = 'google-fonts-preconnect';
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect2);
  }

  const link = document.createElement('link');
  link.id = elementId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.googleFontFamily}&display=swap`;
  document.head.appendChild(link);
  loadedFontsSet.add(font.id);
}

/**
 * Applies the Typography settings globally to CSS variables and document root.
 */
export function applyTypographyToDocument(typography?: TypographySettings): void {
  if (typeof document === 'undefined') return;

  const settings: TypographySettings = {
    fontFamily: typography?.fontFamily || DEFAULT_TYPOGRAPHY.fontFamily,
    fontSize: typography?.fontSize || DEFAULT_TYPOGRAPHY.fontSize,
    fontWeight: typography?.fontWeight || DEFAULT_TYPOGRAPHY.fontWeight
  };

  const root = document.documentElement;

  // Resolve font family details
  const fontDetails = FONTS_REGISTRY[settings.fontFamily as TypographyFontFamily] || FONTS_REGISTRY['system-default'];

  // Dynamically load web font if required
  if (fontDetails.isWebFont) {
    loadGoogleFont(fontDetails.id);
  }

  // Resolve font size
  const sizeOption = FONT_SIZE_OPTIONS.find(s => s.id === settings.fontSize) || FONT_SIZE_OPTIONS[1];

  // Resolve font weight
  const weightOption = FONT_WEIGHT_OPTIONS.find(w => w.id === settings.fontWeight) || FONT_WEIGHT_OPTIONS[0];

  // Set CSS Custom Properties
  root.style.setProperty('--app-font-family', fontDetails.fontStack);
  root.style.setProperty('--app-font-size', sizeOption.px);
  root.style.setProperty('--app-font-weight', String(weightOption.weight));
  root.style.setProperty('--app-font-base', sizeOption.px);

  // Set attributes for CSS selectors & diagnostic inspection
  root.setAttribute('data-font-family', fontDetails.id);
  root.setAttribute('data-font-size', settings.fontSize);
  root.setAttribute('data-font-weight', settings.fontWeight);
}
