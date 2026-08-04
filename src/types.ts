export type Severity = 'critical' | 'warning' | 'info';

export type IssueType = 'duplicate' | 'missing_value' | 'invalid_format' | 'outlier' | 'column_inconsistency' | 'formula_injection' | 'malicious_content' | 'security_violation';

export interface AuditIssue {
  id: string;
  type: IssueType;
  column: string;
  row?: number; // 1-indexed for human readability
  value?: string;
  severity: Severity;
  description: string;
  suggestion: string;
  status: 'open' | 'ignored' | 'resolved';
  explanation?: string;
}

export interface DetectedFormatMetadata {
  dateFormats: Record<string, string>; // Maps column header to detected format
  currencySettings: {
    column: string;
    symbol: string;
    decimalSeparator: string;
    thousandSeparator: string;
  }[];
}

export type RetentionPeriodOption = 'immediate' | '24h' | '3d' | '7d' | '14d' | '30d' | 'forever';

export interface RetentionPolicy {
  option: RetentionPeriodOption;
  selectedAt: string;
  expiresAt: string | null;
  status: 'active' | 'deleted_immediately' | 'scheduled_deletion' | 'deleted_expired' | 'deleted_manually' | 'kept_forever';
  originalDeletedAt?: string;
  deletedBy?: string;
  originalFileDeleted: boolean;
}

export interface CSVFile {
  id: string;
  name: string;
  size: number; // bytes
  uploadedAt: string;
  status: 'pending' | 'auditing' | 'completed' | 'failed';
  score: number; // 0-100 quality score
  headers: string[];
  rows: Record<string, string>[];
  issues: AuditIssue[];
  cleanedRows?: Record<string, string>[];
  ownerId?: string;
  totalRowsCount?: number;
  isLargeFile?: boolean;
  detectedMetadata?: DetectedFormatMetadata;
  headerMappings?: Record<string, string>;
  mappingExplanations?: Record<string, string>;
  isQuickCleaned?: boolean;
  retentionPolicy?: RetentionPolicy;
  isRetentionWarningSent?: boolean;
  securityScanSummary?: {
    formulasSanitized: number;
    maliciousThreatsDetected: number;
    securityWarnings: number;
    scanPassed: boolean;
    sanitizedAt?: string;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  avatar?: string;
  status: 'active' | 'invited' | 'denied';
  accessDenied?: boolean;
  deniedAt?: string;
  deniedBy?: string;
}

export interface SlotRequest {
  id: string;
  userEmail: string;
  userName: string;
  userAvatar?: string;
  requestedAt: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'declined';
  message?: string;
}

export interface AuditActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  action: string;
  timestamp: string;
  fileName?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Array<{ type: 'doc' | 'dataset' | 'memory' | 'product' | string; label: string }>;
  retrievedDocs?: string[];
  intent?: string;
  intentCategory?: 'CSV_ANALYSIS' | 'GENERAL_AI' | 'MIXED_REQUEST' | 'UNKNOWN';
  confidenceScore?: number;
  executedTools?: string[];
  reasoning?: string;
  statusStep?: string;
}

export interface ReportConfig {
  title: string;
  includeSummary: boolean;
  includeIssues: boolean;
  includeCleaningLog: boolean;
  themeColor: string;
  templateType: 'executive' | 'technical' | 'compact';
  companyName: string;
  companyLogoUrl?: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    card: string;
    sidebar: string;
    header: string;
    footer: string;
    text: string;
    mutedText: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    borders: string;
    hover: string;
    selection: string;
    buttons: string;
    charts: string;
    tables: string;
  };
}

export interface SystemSettings {
  theme: 'light' | 'dark' | 'deep_black' | 'dark_gray' | 'system';
  accentColor: 'blue' | 'emerald' | 'violet' | 'amber' | 'green' | 'purple' | 'orange' | 'red' | 'cyan' | 'indigo' | 'slate' | 'custom';
  customAccentHex?: string;
  favoriteAccents?: string[];
  borderRadius: 'sharp' | 'rounded' | 'extra_rounded';
  density: 'compact' | 'comfortable' | 'spacious';
  typography: {
    fontSize: 'small' | 'medium' | 'large' | 'xlarge';
    fontFamily: 'sans' | 'mono' | 'serif' | 'dyslexic';
    lineSpacing: 'tight' | 'normal' | 'relaxed';
    letterSpacing: 'normal' | 'wide' | 'extra_wide';
  };
  animations: 'enabled' | 'reduced' | 'disabled';
  blurEffects: boolean;

  dashboard: {
    widgets: Array<{
      id: string;
      name: string;
      enabled: boolean;
      order: number;
      size: 'small' | 'medium' | 'full';
    }>;
    activeLayoutPreset?: string;
    savedLayouts?: Record<string, any>;
  };

  spreadsheet: {
    gridlines: boolean;
    alternateRowColors: boolean;
    stickyHeader: boolean;
    stickyFirstColumn: boolean;
    cellPadding: 'compact' | 'comfortable' | 'spacious';
    rowHeight: number;
    columnWidth: number;
    wrapText: boolean;
    highlightActiveRow: boolean;
    highlightActiveColumn: boolean;
    showRowNumbers: boolean;
    showColumnLetters: boolean;
    zoomLevel: number;
    defaultSortDirection: 'asc' | 'desc' | 'none';
    defaultDelimiter: 'comma' | 'semicolon' | 'tab' | 'pipe' | 'auto';
  };

  aiAssistant: {
    preferredModel: string;
    responseStyle: 'short' | 'balanced' | 'detailed';
    technicalLevel: 'beginner' | 'intermediate' | 'expert';
    autoAnalyzeUploads: boolean;
    autoSummarizeDatasets: boolean;
    autoDetectAnomalies: boolean;
    suggestCleaningOperations: boolean;
    suggestFormulas: boolean;
    generateCharts: boolean;
    generateReports: boolean;
    displayConfidenceScore: boolean;
    showReasoningSummary: boolean;
    allowConversationalGeneralQA: boolean;
  };

  collaboration: {
    typingIndicators: boolean;
    readReceipts: boolean;
    onlinePresence: boolean;
    mentionNotifications: boolean;
    defaultAnnotationColor: string;
    defaultAnnotationVisibility: 'public' | 'team' | 'private';
    autoScrollChat: boolean;
    playNotificationSound: boolean;
    muteConversations: boolean;
    teamColorTags: boolean;
  };

  notifications: {
    emailNotifications: {
      auditCompleted: boolean;
      teamInvites: boolean;
      weeklyDigest: boolean;
      monthlyDigest: boolean;
      securityAlerts: boolean;
      fileShared: boolean;
    };
    pushNotifications: boolean;
    desktopNotifications: boolean;
    eventAlerts: {
      processingCompleted: boolean;
      validationCompleted: boolean;
      reportGenerated: boolean;
      aiFinishedAnalysis: boolean;
      teamMentions: boolean;
    };
    notificationSound: boolean;
    notificationVolume: number;
    dndSchedule: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
  };

  privacy: {
    fileRetention: 'immediate' | '24h' | '7d' | '30d' | '90d' | 'custom';
    customRetentionDays?: number;
    autoDeleteTempFiles: boolean;
    autoDeleteCachedPreviews: boolean;
    allowAnalytics: boolean;
    shareAnonymousStats: boolean;
    hidePersonalInfo: boolean;
    blurSensitiveCells: boolean;
    maskEmailAddresses: boolean;
    maskPhoneNumbers: boolean;
    maskIDs: boolean;
  };

  security: {
    twoFactorAuth: boolean;
    sessionManagement: Array<{
      id: string;
      device: string;
      ip: string;
      location: string;
      lastActive: string;
      isCurrent: boolean;
    }>;
    trustedDevices: Array<{ id: string; name: string; addedAt: string }>;
    loginAlerts: boolean;
    recoveryEmail: string;
    biometricAuth: boolean;
    sessionTimeoutMinutes: number;
    loginHistory?: Array<{ timestamp: string; ip: string; device: string; status: 'success' | 'failed' }>;
  };

  upload: {
    encoding: 'utf-8' | 'utf-16' | 'ascii' | 'auto';
    dateFormat: string;
    numberFormat: string;
    currency: string;
    missingValueSymbol: string;
    maxPreviewRows: number;
    autoTypeDetection: boolean;
    autoDuplicateDetection: boolean;
    autoMissingValueDetection: boolean;
    autoEncodingDetection: boolean;
    autoDelimiterDetection: boolean;
  };

  export: {
    defaultFormat: 'csv' | 'excel' | 'pdf' | 'json';
    includeCharts: boolean;
    includeAiSummary: boolean;
    includeValidationReport: boolean;
    includeMetadata: boolean;
    includeCompanyLogo: boolean;
    includeWatermark: boolean;
    theme: 'light' | 'dark' | 'system';
    orientation: 'landscape' | 'portrait';
    paperSize: 'a4' | 'letter' | 'legal';
  };

  accessibility: {
    highContrastMode: boolean;
    screenReaderOptimization: boolean;
    keyboardNavigation: boolean;
    largeCursor: boolean;
    largeClickTargets: boolean;
    reducedMotion: boolean;
    highFocusIndicators: boolean;
    dyslexiaFont: boolean;
    fontScale: number;
  };

  performance: {
    lowMemoryMode: boolean;
    hardwareAcceleration: boolean;
    gpuRendering: boolean;
    backgroundProcessing: boolean;
    lazyLoading: boolean;
    cacheControl: boolean;
    preloadDatasets: boolean;
    maxMemoryUsageMB: number;
    autoSaveIntervalSeconds: number;
  };

  localization: {
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    currency: string;
    numberSeparator: 'comma_dot' | 'dot_comma' | 'space_dot';
    weekStartsOn: 'sunday' | 'monday';
  };

  profile: {
    displayName: string;
    jobTitle: string;
    organization: string;
    department: string;
    bio: string;
    preferredDashboard: string;
    defaultLandingPage: string;
    avatarUrl?: string;
  };

  advanced: {
    developerMode: boolean;
    experimentalFeatures: boolean;
    customThemes: CustomTheme[];
    activeCustomThemeId?: string;
    activeWorkspacePreset?: string;
  };

  apiKey: string;
}

export interface CustomValidationRule {
  id: string;
  columnName: string;
  type: 'regex' | 'range';
  regexPattern?: string;
  rangeMin?: number;
  rangeMax?: number;
  description: string;
  severity: Severity;
  isActive: boolean;
}

