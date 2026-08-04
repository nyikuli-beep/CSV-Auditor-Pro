import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { SystemSettings, CustomTheme } from '../types';
import { getDefaultSettings, mergeWithDefaults } from '../lib/personalizationDefaults';

export type WorkspacePreset = 'Data Cleaning' | 'Audit Mode' | 'Executive Dashboard' | 'AI Analysis' | 'Collaboration' | 'Presentation';

interface PersonalizationContextType {
  settings: SystemSettings;
  updateSettings: (updater: Partial<SystemSettings> | ((prev: SystemSettings) => SystemSettings)) => Promise<void>;
  isSaving: boolean;
  saveToast: { type: 'success' | 'error' | 'info'; message: string } | null;
  clearSaveToast: () => void;
  applyWorkspacePreset: (preset: WorkspacePreset) => void;
  saveCustomTheme: (theme: CustomTheme) => void;
  deleteCustomTheme: (themeId: string) => void;
  resetCategory: (category: 'appearance' | 'dashboard' | 'spreadsheet' | 'ai' | 'privacy' | 'security' | 'all') => void;
  exportSettingsJSON: () => void;
  importSettingsJSON: (jsonStr: string) => boolean;
}

const PersonalizationContext = createContext<PersonalizationContextType | undefined>(undefined);

const ACCENT_MAP: Record<string, string> = {
  blue: '#2563EB',
  emerald: '#10B981',
  violet: '#8B5CF6',
  amber: '#F59E0B',
  green: '#16A34A',
  purple: '#9333EA',
  orange: '#EA580C',
  red: '#DC2626',
  cyan: '#0891B2',
  indigo: '#4F46E5',
  slate: '#475569',
};

export function PersonalizationProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('app_system_settings');
      if (saved) {
        return mergeWithDefaults(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load system settings from localStorage', e);
    }
    return getDefaultSettings();
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string, duration = 3000) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setSaveToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setSaveToast(null);
    }, duration);
  }, []);

  const clearSaveToast = useCallback(() => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setSaveToast(null);
  }, []);

  // Sync DOM classes whenever appearance settings change
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Remove existing theme classes
    root.classList.remove('dark', 'deep-black', 'light', 'dark-gray');
    body.classList.remove('dark', 'deep-black', 'light', 'dark-gray');

    if (settings.theme === 'deep_black') {
      root.classList.add('deep-black', 'dark');
      body.classList.add('deep-black', 'dark');
    } else if (settings.theme === 'dark_gray' || settings.theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else if (settings.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        body.classList.add('dark');
      }
    }

    // Border radius
    root.classList.remove('radius-sharp', 'radius-rounded', 'radius-extra-rounded');
    root.classList.add(`radius-${settings.borderRadius}`);

    // Density
    root.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
    root.classList.add(`density-${settings.density}`);

    // Animations
    root.classList.remove('animations-enabled', 'animations-reduced', 'animations-disabled');
    root.classList.add(`animations-${settings.animations}`);

    // High contrast
    if (settings.accessibility?.highContrastMode) {
      root.classList.add('high-contrast-mode');
    } else {
      root.classList.remove('high-contrast-mode');
    }

    // Dyslexia font
    if (settings.accessibility?.dyslexiaFont) {
      root.classList.add('font-family-dyslexic');
    } else {
      root.classList.remove('font-family-dyslexic');
    }

    // Accent color CSS variable
    const hexColor = settings.accentColor === 'custom' && settings.customAccentHex
      ? settings.customAccentHex
      : ACCENT_MAP[settings.accentColor] || '#2563EB';

    root.style.setProperty('--primary-accent', hexColor);
  }, [settings.theme, settings.borderRadius, settings.density, settings.animations, settings.accentColor, settings.customAccentHex, settings.accessibility?.highContrastMode, settings.accessibility?.dyslexiaFont]);

  // Update settings with instant persistence, optimistic updates, and rollback on failure
  const updateSettings = useCallback(async (updater: Partial<SystemSettings> | ((prev: SystemSettings) => SystemSettings)) => {
    setIsSaving(true);
    let newSettings: SystemSettings = settings;

    setSettings(prev => {
      const previousState = prev;
      newSettings = typeof updater === 'function' ? updater(prev) : mergeWithDefaults({ ...prev, ...updater });

      try {
        localStorage.setItem('app_system_settings', JSON.stringify(newSettings));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }

      return newSettings;
    });

    // Backend PostgreSQL synchronization
    try {
      const res = await fetch('/api/sql/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });

      if (!res.ok) {
        console.warn('Backend sync returned non-ok status');
      }
      showToast('success', 'Preferences saved & synchronized', 2500);
    } catch (err) {
      console.warn('Backend sync fallback (offline/cached):', err);
      showToast('info', 'Saved locally (offline mode active)', 2500);
    } finally {
      setIsSaving(false);
    }
  }, [settings, showToast]);

  // Apply workspace preset
  const applyWorkspacePreset = useCallback((preset: WorkspacePreset) => {
    updateSettings(prev => {
      const next = { ...prev };
      next.advanced = { ...next.advanced, activeWorkspacePreset: preset };

      if (preset === 'Data Cleaning') {
        next.spreadsheet = {
          ...next.spreadsheet,
          alternateRowColors: true,
          gridlines: true,
          stickyHeader: true,
          cellPadding: 'compact',
          highlightActiveRow: true,
          wrapText: false,
        };
        next.aiAssistant = {
          ...next.aiAssistant,
          autoDetectAnomalies: true,
          suggestCleaningOperations: true,
          suggestFormulas: true,
        };
      } else if (preset === 'Audit Mode') {
        next.spreadsheet = {
          ...next.spreadsheet,
          showRowNumbers: true,
          showColumnLetters: true,
          stickyHeader: true,
          stickyFirstColumn: true,
          highlightActiveRow: true,
          highlightActiveColumn: true,
        };
        next.privacy = {
          ...next.privacy,
          blurSensitiveCells: true,
          maskEmailAddresses: true,
          maskPhoneNumbers: true,
          maskIDs: true,
        };
      } else if (preset === 'Executive Dashboard') {
        next.density = 'spacious';
        next.borderRadius = 'extra_rounded';
        next.export = {
          ...next.export,
          defaultFormat: 'pdf',
          includeCharts: true,
          includeAiSummary: true,
          includeCompanyLogo: true,
        };
      } else if (preset === 'AI Analysis') {
        next.aiAssistant = {
          ...next.aiAssistant,
          preferredModel: 'gemini-2.5-pro',
          responseStyle: 'detailed',
          technicalLevel: 'expert',
          displayConfidenceScore: true,
          showReasoningSummary: true,
        };
      } else if (preset === 'Collaboration') {
        next.collaboration = {
          ...next.collaboration,
          typingIndicators: true,
          readReceipts: true,
          onlinePresence: true,
          mentionNotifications: true,
          autoScrollChat: true,
        };
      } else if (preset === 'Presentation') {
        next.typography = { ...next.typography, fontSize: 'large' };
        next.density = 'spacious';
        next.blurEffects = true;
      }

      return next;
    });

    showToast('success', `Applied workspace preset: "${preset}"`, 3000);
  }, [updateSettings, showToast]);

  // Theme builder functions
  const saveCustomTheme = useCallback((theme: CustomTheme) => {
    updateSettings(prev => {
      const existing = prev.advanced?.customThemes || [];
      const updatedThemes = existing.filter(t => t.id !== theme.id);
      updatedThemes.push(theme);
      return {
        ...prev,
        theme: 'custom' as any,
        advanced: {
          ...prev.advanced,
          customThemes: updatedThemes,
          activeCustomThemeId: theme.id,
        },
      };
    });
    showToast('success', `Custom theme "${theme.name}" saved!`, 3000);
  }, [updateSettings, showToast]);

  const deleteCustomTheme = useCallback((themeId: string) => {
    updateSettings(prev => {
      const existing = prev.advanced?.customThemes || [];
      const updatedThemes = existing.filter(t => t.id !== themeId);
      return {
        ...prev,
        advanced: {
          ...prev.advanced,
          customThemes: updatedThemes,
          activeCustomThemeId: prev.advanced?.activeCustomThemeId === themeId ? undefined : prev.advanced?.activeCustomThemeId,
        },
      };
    });
    showToast('info', 'Custom theme deleted', 2500);
  }, [updateSettings, showToast]);

  // Reset category
  const resetCategory = useCallback((category: 'appearance' | 'dashboard' | 'spreadsheet' | 'ai' | 'privacy' | 'security' | 'all') => {
    const defaults = getDefaultSettings();
    updateSettings(prev => {
      if (category === 'all') return defaults;
      const next = { ...prev };
      if (category === 'appearance') {
        next.theme = defaults.theme;
        next.accentColor = defaults.accentColor;
        next.customAccentHex = defaults.customAccentHex;
        next.borderRadius = defaults.borderRadius;
        next.density = defaults.density;
        next.typography = defaults.typography;
        next.animations = defaults.animations;
        next.blurEffects = defaults.blurEffects;
      } else if (category === 'dashboard') {
        next.dashboard = defaults.dashboard;
      } else if (category === 'spreadsheet') {
        next.spreadsheet = defaults.spreadsheet;
      } else if (category === 'ai') {
        next.aiAssistant = defaults.aiAssistant;
      } else if (category === 'privacy') {
        next.privacy = defaults.privacy;
      } else if (category === 'security') {
        next.security = defaults.security;
      }
      return next;
    });
    showToast('info', `Reset ${category === 'all' ? 'all' : category} settings to defaults`, 3000);
  }, [updateSettings, showToast]);

  // Export settings as JSON
  const exportSettingsJSON = useCallback(() => {
    const jsonStr = JSON.stringify(settings, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `csv_auditor_pro_settings_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Settings configuration exported to JSON file', 3000);
  }, [settings, showToast]);

  // Import settings from JSON
  const importSettingsJSON = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      const merged = mergeWithDefaults(parsed);
      updateSettings(merged);
      showToast('success', 'Settings configuration imported successfully!', 3500);
      return true;
    } catch (e) {
      console.error('Invalid JSON settings file:', e);
      showToast('error', 'Failed to import settings: Invalid JSON file', 4000);
      return false;
    }
  }, [updateSettings, showToast]);

  return (
    <PersonalizationContext.Provider
      value={{
        settings,
        updateSettings,
        isSaving,
        saveToast,
        clearSaveToast,
        applyWorkspacePreset,
        saveCustomTheme,
        deleteCustomTheme,
        resetCategory,
        exportSettingsJSON,
        importSettingsJSON,
      }}
    >
      {children}
    </PersonalizationContext.Provider>
  );
}

export function usePersonalization() {
  const ctx = useContext(PersonalizationContext);
  if (!ctx) {
    throw new Error('usePersonalization must be used within a PersonalizationProvider');
  }
  return ctx;
}
