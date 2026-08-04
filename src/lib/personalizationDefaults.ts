import { SystemSettings } from '../types';

export function getDefaultSettings(): SystemSettings {
  return {
    theme: 'light',
    accentColor: 'blue',
    customAccentHex: '#2563EB',
    favoriteAccents: ['#2563EB', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'],
    borderRadius: 'rounded',
    density: 'comfortable',
    typography: {
      fontSize: 'medium',
      fontFamily: 'sans',
      lineSpacing: 'normal',
      letterSpacing: 'normal',
    },
    animations: 'enabled',
    blurEffects: true,

    dashboard: {
      widgets: [
        { id: 'recent_uploads', name: 'Recent Uploads', enabled: true, order: 1, size: 'medium' },
        { id: 'ai_insights', name: 'AI Insights Summary', enabled: true, order: 2, size: 'medium' },
        { id: 'validation_history', name: 'Validation History', enabled: true, order: 3, size: 'small' },
        { id: 'recent_reports', name: 'Recent Reports', enabled: true, order: 4, size: 'small' },
        { id: 'storage_usage', name: 'Storage & Memory Usage', enabled: true, order: 5, size: 'small' },
        { id: 'activity_log', name: 'Audit Timeline Log', enabled: true, order: 6, size: 'medium' },
        { id: 'team_messages', name: 'Team Tenancy Activity', enabled: true, order: 7, size: 'small' },
        { id: 'recent_annotations', name: 'Recent Annotations', enabled: false, order: 8, size: 'small' },
        { id: 'pinned_datasets', name: 'Pinned Datasets', enabled: true, order: 9, size: 'small' },
        { id: 'quick_actions', name: 'Quick Workflow Actions', enabled: true, order: 10, size: 'full' },
      ],
      activeLayoutPreset: 'default',
      savedLayouts: {},
    },

    spreadsheet: {
      gridlines: true,
      alternateRowColors: true,
      stickyHeader: true,
      stickyFirstColumn: true,
      cellPadding: 'comfortable',
      rowHeight: 40,
      columnWidth: 160,
      wrapText: false,
      highlightActiveRow: true,
      highlightActiveColumn: false,
      showRowNumbers: true,
      showColumnLetters: true,
      zoomLevel: 100,
      defaultSortDirection: 'none',
      defaultDelimiter: 'auto',
    },

    aiAssistant: {
      preferredModel: 'gemini-2.5-flash',
      responseStyle: 'balanced',
      technicalLevel: 'intermediate',
      autoAnalyzeUploads: true,
      autoSummarizeDatasets: true,
      autoDetectAnomalies: true,
      suggestCleaningOperations: true,
      suggestFormulas: true,
      generateCharts: true,
      generateReports: true,
      displayConfidenceScore: true,
      showReasoningSummary: true,
      allowConversationalGeneralQA: true,
    },

    collaboration: {
      typingIndicators: true,
      readReceipts: true,
      onlinePresence: true,
      mentionNotifications: true,
      defaultAnnotationColor: '#F59E0B',
      defaultAnnotationVisibility: 'team',
      autoScrollChat: true,
      playNotificationSound: true,
      muteConversations: false,
      teamColorTags: true,
    },

    notifications: {
      emailNotifications: {
        auditCompleted: true,
        teamInvites: true,
        weeklyDigest: true,
        monthlyDigest: false,
        securityAlerts: true,
        fileShared: true,
      },
      pushNotifications: true,
      desktopNotifications: false,
      eventAlerts: {
        processingCompleted: true,
        validationCompleted: true,
        reportGenerated: true,
        aiFinishedAnalysis: true,
        teamMentions: true,
      },
      notificationSound: true,
      notificationVolume: 80,
      dndSchedule: {
        enabled: false,
        startTime: '22:00',
        endTime: '07:00',
      },
    },

    privacy: {
      fileRetention: '30d',
      customRetentionDays: 30,
      autoDeleteTempFiles: true,
      autoDeleteCachedPreviews: true,
      allowAnalytics: true,
      shareAnonymousStats: false,
      hidePersonalInfo: false,
      blurSensitiveCells: false,
      maskEmailAddresses: false,
      maskPhoneNumbers: false,
      maskIDs: false,
    },

    security: {
      twoFactorAuth: false,
      sessionManagement: [
        { id: 'sess-1', device: 'Chrome on MacOS (This Device)', ip: '192.168.1.45', location: 'London, UK', lastActive: 'Active now', isCurrent: true },
        { id: 'sess-2', device: 'Safari on iPhone 15 Pro', ip: '82.132.210.12', location: 'London, UK', lastActive: '2 hours ago', isCurrent: false },
      ],
      trustedDevices: [
        { id: 'dev-1', name: 'MacBook Pro M3 Max', addedAt: '2026-05-12' },
        { id: 'dev-2', name: 'iPhone 15 Pro', addedAt: '2026-06-01' }
      ],
      loginAlerts: true,
      recoveryEmail: 'nyikulibramwel@gmail.com',
      biometricAuth: false,
      sessionTimeoutMinutes: 60,
      loginHistory: [
        { timestamp: '2026-08-04 04:00 UTC', ip: '192.168.1.45', device: 'Chrome / MacOS', status: 'success' },
        { timestamp: '2026-08-03 18:30 UTC', ip: '192.168.1.45', device: 'Chrome / MacOS', status: 'success' },
        { timestamp: '2026-08-01 12:15 UTC', ip: '82.132.210.12', device: 'Safari / iOS', status: 'success' }
      ]
    },

    upload: {
      encoding: 'auto',
      dateFormat: 'YYYY-MM-DD',
      numberFormat: '1,234.56',
      currency: '$ USD',
      missingValueSymbol: 'N/A',
      maxPreviewRows: 100,
      autoTypeDetection: true,
      autoDuplicateDetection: true,
      autoMissingValueDetection: true,
      autoEncodingDetection: true,
      autoDelimiterDetection: true,
    },

    export: {
      defaultFormat: 'pdf',
      includeCharts: true,
      includeAiSummary: true,
      includeValidationReport: true,
      includeMetadata: true,
      includeCompanyLogo: true,
      includeWatermark: false,
      theme: 'system',
      orientation: 'landscape',
      paperSize: 'a4',
    },

    accessibility: {
      highContrastMode: false,
      screenReaderOptimization: false,
      keyboardNavigation: true,
      largeCursor: false,
      largeClickTargets: false,
      reducedMotion: false,
      highFocusIndicators: true,
      dyslexiaFont: false,
      fontScale: 100,
    },

    performance: {
      lowMemoryMode: false,
      hardwareAcceleration: true,
      gpuRendering: true,
      backgroundProcessing: true,
      lazyLoading: true,
      cacheControl: true,
      preloadDatasets: true,
      maxMemoryUsageMB: 1024,
      autoSaveIntervalSeconds: 10,
    },

    localization: {
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      currency: '$ USD',
      numberSeparator: 'comma_dot',
      weekStartsOn: 'monday',
    },

    profile: {
      displayName: 'Nyikuli Bramwel',
      jobTitle: 'Lead Data Auditor & Operations Owner',
      organization: 'CSV Auditor Pro Enterprise',
      department: 'Data Quality & Hygiene',
      bio: 'Managing enterprise-grade CSV validation workflows, automated schema hygiene, and AI analytics pipelines.',
      preferredDashboard: 'default',
      defaultLandingPage: 'dashboard',
      avatarUrl: '/macbook_code.jpg',
    },

    advanced: {
      developerMode: true,
      experimentalFeatures: false,
      customThemes: [],
      activeCustomThemeId: undefined,
      activeWorkspacePreset: 'default',
    },

    apiKey: '',
  };
}

export function mergeWithDefaults(saved: any): SystemSettings {
  const defaults = getDefaultSettings();
  if (!saved || typeof saved !== 'object') return defaults;

  return {
    ...defaults,
    ...saved,
    dashboard: { ...defaults.dashboard, ...(saved.dashboard || {}) },
    spreadsheet: { ...defaults.spreadsheet, ...(saved.spreadsheet || {}) },
    aiAssistant: { ...defaults.aiAssistant, ...(saved.aiAssistant || {}) },
    collaboration: { ...defaults.collaboration, ...(saved.collaboration || {}) },
    notifications: {
      ...defaults.notifications,
      ...(saved.notifications || {}),
      emailNotifications: { ...defaults.notifications.emailNotifications, ...(saved.notifications?.emailNotifications || {}) },
      eventAlerts: { ...defaults.notifications.eventAlerts, ...(saved.notifications?.eventAlerts || {}) },
      dndSchedule: { ...defaults.notifications.dndSchedule, ...(saved.notifications?.dndSchedule || {}) },
    },
    privacy: { ...defaults.privacy, ...(saved.privacy || {}) },
    security: { ...defaults.security, ...(saved.security || {}) },
    upload: { ...defaults.upload, ...(saved.upload || {}) },
    export: { ...defaults.export, ...(saved.export || {}) },
    accessibility: { ...defaults.accessibility, ...(saved.accessibility || {}) },
    performance: { ...defaults.performance, ...(saved.performance || {}) },
    localization: { ...defaults.localization, ...(saved.localization || {}) },
    profile: { ...defaults.profile, ...(saved.profile || {}) },
    advanced: { ...defaults.advanced, ...(saved.advanced || {}) },
    typography: { ...defaults.typography, ...(saved.typography || {}) },
  };
}
