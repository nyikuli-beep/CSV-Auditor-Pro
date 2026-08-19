import { ThemeCustomization, ThemePreset, AccentColor } from '../types';
import { DEFAULT_TYPOGRAPHY, applyTypographyToDocument } from './typographyEngine';

export const DEFAULT_THEME_CUSTOMIZATION: ThemeCustomization = {
  preset: 'default-dark',
  accentColor: 'blue',
  contrast: 'medium',
  fontSize: 'default',
  density: 'comfortable',
  cornerRadius: 'medium',
  sidebarWidth: 'default',
  sidebarIconOnly: false,
  animations: 'normal',
  tablePrefs: {
    stripedRows: true,
    hoverHighlight: true,
    gridLines: true,
    rowDensity: 'comfortable',
    stickyHeader: true,
  },
  cardStyle: 'outlined',
  followSystemTheme: false,
  accessibility: {
    highContrast: false,
    keyboardFocusIndicators: true,
    reducedMotion: false,
    largerClickTargets: false,
  },
  typography: DEFAULT_TYPOGRAPHY,
};

export interface ThemePresetDetails {
  id: ThemePreset;
  name: string;
  description: string;
  bgMain: string;
  bgSidebar: string;
  bgCard: string;
  bgPanel: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borders: string;
  primaryBtn: string;
  btnHover: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  inputBg: string;
  inputBorder: string;
}

export const THEME_PRESETS: Record<ThemePreset, ThemePresetDetails> = {
  'default-dark': {
    id: 'default-dark',
    name: 'Default Dark Slate',
    description: 'Classic slate dark interface with balanced contrast and high legibility.',
    bgMain: '#0F172A',
    bgSidebar: '#0B1220',
    bgCard: '#111827',
    bgPanel: '#1E293B',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    borders: '#334155',
    primaryBtn: '#2563EB',
    btnHover: '#1D4ED8',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
    inputBg: '#1F2937',
    inputBorder: '#475569',
  },
  'black-oled': {
    id: 'black-oled',
    name: 'Deep Black OLED',
    description: 'Pure pitch black background engineered for OLED screens and maximum energy efficiency.',
    bgMain: '#000000',
    bgSidebar: '#050505',
    bgCard: '#0A0A0A',
    bgPanel: '#111111',
    textPrimary: '#FFFFFF',
    textSecondary: '#E5E7EB',
    textMuted: '#9CA3AF',
    borders: '#262626',
    primaryBtn: '#3B82F6',
    btnHover: '#2563EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#F43F5E',
    info: '#06B6D4',
    inputBg: '#0A0A0A',
    inputBorder: '#333333',
  },
  'midnight-blue': {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    description: 'Deep royal navy blue tone ideal for corporate finance and compliance workspaces.',
    bgMain: '#0A1128',
    bgSidebar: '#060C1E',
    bgCard: '#0F1934',
    bgPanel: '#172445',
    textPrimary: '#F1F5F9',
    textSecondary: '#CBD5E1',
    textMuted: '#829AB1',
    borders: '#1E2E55',
    primaryBtn: '#2563EB',
    btnHover: '#1D4ED8',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#38BDF8',
    inputBg: '#0D1730',
    inputBorder: '#2A3F6D',
  },
  'graphite-purple': {
    id: 'graphite-purple',
    name: 'Graphite Purple',
    description: 'Sophisticated dark graphite base highlighted by executive purple accents.',
    bgMain: '#121218',
    bgSidebar: '#0B0B10',
    bgCard: '#181822',
    bgPanel: '#212130',
    textPrimary: '#F3F3F8',
    textSecondary: '#D1D1E0',
    textMuted: '#9393A8',
    borders: '#2D2D42',
    primaryBtn: '#8B5CF6',
    btnHover: '#7C3AED',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#A855F7',
    inputBg: '#161622',
    inputBorder: '#3B3B54',
  },
  'emerald-dark': {
    id: 'emerald-dark',
    name: 'Emerald Dark',
    description: 'Dark forest gray workspace featuring vibrant emerald highlights.',
    bgMain: '#0F1715',
    bgSidebar: '#09100E',
    bgCard: '#14211D',
    bgPanel: '#1C2E29',
    textPrimary: '#ECFDF5',
    textSecondary: '#A7F3D0',
    textMuted: '#6EE7B7',
    borders: '#26473E',
    primaryBtn: '#10B981',
    btnHover: '#059669',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#14B8A6',
    inputBg: '#121E1A',
    inputBorder: '#2E564B',
  },
  'light-corporate': {
    id: 'light-corporate',
    name: 'Clean Corporate Light',
    description: 'Crisp, high-contrast light workspace designed for day operations and reporting.',
    bgMain: '#F8FAFC',
    bgSidebar: '#FFFFFF',
    bgCard: '#FFFFFF',
    bgPanel: '#F1F5F9',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    borders: '#E2E8F0',
    primaryBtn: '#2563EB',
    btnHover: '#1D4ED8',
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
    info: '#0284C7',
    inputBg: '#FFFFFF',
    inputBorder: '#CBD5E1',
  },
};

export interface AccentColorDetails {
  id: AccentColor;
  name: string;
  hex: string;
  hoverHex: string;
  bgLight: string;
  borderLight: string;
  ringClass: string;
  badgeClass: string;
}

export const ACCENT_COLORS: Record<AccentColor, AccentColorDetails> = {
  blue: {
    id: 'blue',
    name: 'Blue',
    hex: '#2563EB',
    hoverHex: '#1D4ED8',
    bgLight: 'rgba(37, 99, 235, 0.1)',
    borderLight: 'rgba(37, 99, 235, 0.3)',
    ringClass: 'focus:ring-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    hex: '#10B981',
    hoverHex: '#059669',
    bgLight: 'rgba(16, 185, 129, 0.1)',
    borderLight: 'rgba(16, 185, 129, 0.3)',
    ringClass: 'focus:ring-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  purple: {
    id: 'purple',
    name: 'Purple',
    hex: '#8B5CF6',
    hoverHex: '#7C3AED',
    bgLight: 'rgba(139, 92, 246, 0.1)',
    borderLight: 'rgba(139, 92, 246, 0.3)',
    ringClass: 'focus:ring-purple-500',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  orange: {
    id: 'orange',
    name: 'Orange',
    hex: '#F97316',
    hoverHex: '#EA580C',
    bgLight: 'rgba(249, 115, 22, 0.1)',
    borderLight: 'rgba(249, 115, 22, 0.3)',
    ringClass: 'focus:ring-orange-500',
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  red: {
    id: 'red',
    name: 'Red',
    hex: '#EF4444',
    hoverHex: '#DC2626',
    bgLight: 'rgba(239, 68, 68, 0.1)',
    borderLight: 'rgba(239, 68, 68, 0.3)',
    ringClass: 'focus:ring-red-500',
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  cyan: {
    id: 'cyan',
    name: 'Cyan',
    hex: '#06B6D4',
    hoverHex: '#0891B2',
    bgLight: 'rgba(6, 182, 212, 0.1)',
    borderLight: 'rgba(6, 182, 212, 0.3)',
    ringClass: 'focus:ring-cyan-500',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo',
    hex: '#6366F1',
    hoverHex: '#4F46E5',
    bgLight: 'rgba(99, 102, 241, 0.1)',
    borderLight: 'rgba(99, 102, 241, 0.3)',
    ringClass: 'focus:ring-indigo-500',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
  violet: {
    id: 'violet',
    name: 'Violet',
    hex: '#8B5CF6',
    hoverHex: '#7C3AED',
    bgLight: 'rgba(139, 92, 246, 0.1)',
    borderLight: 'rgba(139, 92, 246, 0.3)',
    ringClass: 'focus:ring-violet-500',
    badgeClass: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    hex: '#F59E0B',
    hoverHex: '#D97706',
    bgLight: 'rgba(245, 158, 11, 0.1)',
    borderLight: 'rgba(245, 158, 11, 0.3)',
    ringClass: 'focus:ring-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
};

/**
 * Helper to get active preset details based on mode and customization
 */
export function getActivePreset(customization: ThemeCustomization, isDarkMode: boolean): ThemePresetDetails {
  let activePresetKey: ThemePreset = customization.preset || (isDarkMode ? 'default-dark' : 'light-corporate');
  if (!isDarkMode && activePresetKey !== 'light-corporate') {
    activePresetKey = 'light-corporate';
  }
  return THEME_PRESETS[activePresetKey] || THEME_PRESETS['default-dark'];
}

/**
 * Apply design tokens and theme rules directly to document element.
 */
export function applyThemeToDocument(customization: ThemeCustomization, isDarkMode: boolean) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Determine active preset
  const preset = getActivePreset(customization, isDarkMode);
  const activePresetKey = preset.id;
  const accent = ACCENT_COLORS[customization.accentColor] || ACCENT_COLORS.blue;

  // Set CSS Variables
  root.style.setProperty('--app-bg-main', preset.bgMain);
  root.style.setProperty('--app-bg-sidebar', preset.bgSidebar);
  root.style.setProperty('--app-bg-card', preset.bgCard);
  root.style.setProperty('--app-bg-panel', preset.bgPanel);
  root.style.setProperty('--app-text-primary', preset.textPrimary);
  root.style.setProperty('--app-text-secondary', preset.textSecondary);
  root.style.setProperty('--app-text-muted', preset.textMuted);
  root.style.setProperty('--app-border', preset.borders);

  // Sync to legacy theme variables for backward compatibility
  root.style.setProperty('--bg-app', preset.bgMain);
  root.style.setProperty('--bg-card', preset.bgCard);
  root.style.setProperty('--bg-secondary', preset.bgPanel);
  root.style.setProperty('--border-color', preset.borders);
  root.style.setProperty('--text-primary', preset.textPrimary);
  root.style.setProperty('--text-secondary', preset.textSecondary);
  root.style.setProperty('--text-muted', preset.textMuted);

  // Accent color override
  root.style.setProperty('--app-accent', accent.hex);
  root.style.setProperty('--app-accent-hover', accent.hoverHex);
  root.style.setProperty('--app-accent-bg-light', accent.bgLight);
  root.style.setProperty('--primary-blue', accent.hex);
  root.style.setProperty('--link-color', accent.hex);

  // Font size scale
  const fontSizeMap: Record<string, string> = {
    small: '13px',
    default: '14px',
    large: '15px',
    'extra-large': '16px',
  };
  root.style.setProperty('--app-font-base', fontSizeMap[customization.fontSize] || '14px');

  // Density padding scale
  const densityPaddingMap: Record<string, string> = {
    compact: '0.5rem',
    comfortable: '0.75rem',
    spacious: '1.125rem',
  };
  root.style.setProperty('--app-density-padding', densityPaddingMap[customization.density] || '0.75rem');

  // Corner radius scale
  const radiusMap: Record<string, string> = {
    sharp: '0px',
    small: '6px',
    medium: '12px',
    large: '20px',
  };
  root.style.setProperty('--app-radius', radiusMap[customization.cornerRadius] || '12px');

  // Animation speed
  const animationSpeedMap: Record<string, string> = {
    minimal: '0.1s',
    normal: '0.25s',
    enhanced: '0.4s',
    disabled: '0s',
  };
  root.style.setProperty('--app-animation-speed', animationSpeedMap[customization.animations] || '0.25s');

  // Sidebar width
  const sidebarWidthMap: Record<string, string> = {
    default: '16rem',
    compact: '13rem',
    expanded: '18rem',
  };
  root.style.setProperty('--app-sidebar-width', sidebarWidthMap[customization.sidebarWidth] || '16rem');

  // Table row density
  const tableDensityMap: Record<string, string> = {
    compact: '0.35rem 0.5rem',
    comfortable: '0.6rem 0.85rem',
    spacious: '0.9rem 1.25rem',
  };
  root.style.setProperty('--app-table-cell-padding', tableDensityMap[customization.tablePrefs.rowDensity] || '0.6rem 0.85rem');

  // Root class attributes
  root.setAttribute('data-theme-preset', activePresetKey);
  root.setAttribute('data-accent-color', customization.accentColor);
  root.setAttribute('data-contrast', customization.contrast);
  root.setAttribute('data-density', customization.density);
  root.setAttribute('data-card-style', customization.cardStyle);
  root.setAttribute('data-animations', customization.animations || 'normal');
  root.setAttribute('data-sidebar-width', customization.sidebarWidth);
  root.setAttribute('data-corner-radius', customization.cornerRadius);
  root.setAttribute('data-font-size', customization.fontSize);

  // Table Preferences
  root.setAttribute('data-table-striped', String(customization.tablePrefs.stripedRows));
  root.setAttribute('data-table-hover', String(customization.tablePrefs.hoverHighlight));
  root.setAttribute('data-table-grid', String(customization.tablePrefs.gridLines));

  // Touch Target Preferences
  root.setAttribute('data-touch-targets', customization.accessibility?.largerClickTargets ? 'large' : 'normal');

  if (customization.accessibility?.highContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }

  if (customization.accessibility?.reducedMotion || customization.animations === 'disabled') {
    root.classList.add('reduced-motion');
  } else {
    root.classList.remove('reduced-motion');
  }

  // Apply centralized typography settings (font family, font size, font weight, web fonts)
  applyTypographyToDocument(customization.typography || DEFAULT_THEME_CUSTOMIZATION.typography);
}

/**
 * Export theme customization object to downloadable JSON string.
 */
export function exportThemeJSON(customization: ThemeCustomization): string {
  return JSON.stringify(customization, null, 2);
}

/**
 * Validate and parse imported JSON string into ThemeCustomization object.
 */
export function importThemeJSON(jsonString: string): ThemeCustomization | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== 'object' || !parsed) return null;

    return {
      preset: parsed.preset || DEFAULT_THEME_CUSTOMIZATION.preset,
      accentColor: parsed.accentColor || DEFAULT_THEME_CUSTOMIZATION.accentColor,
      contrast: parsed.contrast || DEFAULT_THEME_CUSTOMIZATION.contrast,
      fontSize: parsed.fontSize || DEFAULT_THEME_CUSTOMIZATION.fontSize,
      density: parsed.density || DEFAULT_THEME_CUSTOMIZATION.density,
      cornerRadius: parsed.cornerRadius || DEFAULT_THEME_CUSTOMIZATION.cornerRadius,
      sidebarWidth: parsed.sidebarWidth || DEFAULT_THEME_CUSTOMIZATION.sidebarWidth,
      sidebarIconOnly: Boolean(parsed.sidebarIconOnly),
      animations: parsed.animations || DEFAULT_THEME_CUSTOMIZATION.animations,
      tablePrefs: {
        stripedRows: parsed.tablePrefs?.stripedRows ?? DEFAULT_THEME_CUSTOMIZATION.tablePrefs.stripedRows,
        hoverHighlight: parsed.tablePrefs?.hoverHighlight ?? DEFAULT_THEME_CUSTOMIZATION.tablePrefs.hoverHighlight,
        gridLines: parsed.tablePrefs?.gridLines ?? DEFAULT_THEME_CUSTOMIZATION.tablePrefs.gridLines,
        rowDensity: parsed.tablePrefs?.rowDensity || DEFAULT_THEME_CUSTOMIZATION.tablePrefs.rowDensity,
        stickyHeader: parsed.tablePrefs?.stickyHeader ?? DEFAULT_THEME_CUSTOMIZATION.tablePrefs.stickyHeader,
      },
      cardStyle: parsed.cardStyle || DEFAULT_THEME_CUSTOMIZATION.cardStyle,
      followSystemTheme: Boolean(parsed.followSystemTheme),
      accessibility: {
        highContrast: Boolean(parsed.accessibility?.highContrast),
        keyboardFocusIndicators: parsed.accessibility?.keyboardFocusIndicators ?? true,
        reducedMotion: Boolean(parsed.accessibility?.reducedMotion),
        largerClickTargets: Boolean(parsed.accessibility?.largerClickTargets),
      },
      typography: {
        fontFamily: parsed.typography?.fontFamily || DEFAULT_THEME_CUSTOMIZATION.typography?.fontFamily || 'system-default',
        fontSize: parsed.typography?.fontSize || DEFAULT_THEME_CUSTOMIZATION.typography?.fontSize || 'medium',
        fontWeight: parsed.typography?.fontWeight || DEFAULT_THEME_CUSTOMIZATION.typography?.fontWeight || 'regular',
      },
    };
  } catch (err) {
    console.error('Failed to parse theme JSON:', err);
    return null;
  }
}
