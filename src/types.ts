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

// --- Enterprise Team Tenancy Foundation & Permissions (Phase 1, 2, 3) ---
export type OrganizationRole = 'Owner' | 'Admin' | 'Member';

export type OrganizationPermission = 
  | 'upload_csv'
  | 'clean_csv'
  | 'audit_csv'
  | 'export_reports'
  | 'ai_analysis'
  | 'team_chat'
  | 'cell_annotations'
  | 'view_reports'
  | 'manage_members'
  | 'manage_settings';

export interface PermissionDefinition {
  id: OrganizationPermission;
  label: string;
  category: 'data_processing' | 'collaboration' | 'administration';
  description: string;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string; // Firebase UID
  ownerEmail?: string;
  subscriptionPlan: 'enterprise' | 'pro' | 'free' | string;
  status: 'active' | 'suspended' | 'trial' | 'past_due' | 'canceled';
  createdAt: string;
  updatedAt: string;
  maxSeats?: number;
  description?: string;
}

export interface OrganizationMember {
  uid: string; // Firebase Auth UID (Primary Identity)
  organizationId: string;
  email: string;
  displayName: string;
  role: OrganizationRole;
  permissions?: OrganizationPermission[];
  status: 'active' | 'invited' | 'suspended';
  joinedAt: string;
  lastActive: string;
  avatar?: string;
}

export type AuditLogAction =
  | 'member.invited'
  | 'member.accepted'
  | 'member.cancelled'
  | 'member.resent'
  | 'member.removed'
  | 'member.role_changed'
  | 'member.permissions_updated'
  | 'organization.updated'
  | 'csv.uploaded'
  | 'csv.audited'
  | 'csv.cleaned'
  | 'report.exported'
  | 'owner.action';

export interface OrganizationAuditLog {
  id: string;
  organizationId: string;
  action: AuditLogAction | string;
  actor: {
    uid: string;
    email: string;
    displayName?: string;
    role: OrganizationRole;
  };
  target?: {
    id?: string;
    uid?: string;
    email?: string;
    name?: string;
    type?: string;
  };
  timestamp: string; // ISO string
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'cancelled' | 'expired';

export interface OrganizationInvitation {
  id: string; // Document ID / token ID
  organizationId: string;
  organizationName?: string;
  email: string;
  role: 'Admin' | 'Member';
  status: InvitationStatus;
  invitedBy: string; // Firebase UID
  invitedByEmail: string;
  invitedByName?: string;
  token: string;
  createdAt: string; // ISO string
  expiresAt: string; // ISO string (e.g. 7 days from creation)
  acceptedAt?: string;
  acceptedByUid?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Editor' | 'Viewer' | 'Member' | string;
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
  citations?: Array<{ type: 'doc' | 'dataset' | 'memory' | 'product' | 'agent' | 'tool' | 'web' | string; label: string; url?: string }>;
  retrievedDocs?: string[];
  intent?: string;
  intentCategory?: 'CSV_ANALYSIS' | 'GENERAL_AI' | 'MIXED_REQUEST' | 'UNKNOWN' | string;
  confidenceScore?: number;
  confidenceDetails?: any;
  riskAssessment?: any;
  recommendations?: any[];
  proactiveInsights?: any[];
  explainability?: any;
  followUpSuggestions?: any[];
  executiveReport?: any;
  executedTools?: string[];
  reasoning?: string;
  statusStep?: string;
  activeAgent?: string;
  activeAgentName?: string;
  activeAgentTitle?: string;
  collaboratingAgents?: Array<{ id: string; name: string; role: string }>;
  isCompoundQuery?: boolean;
  routingRationale?: string;
  evidenceCollected?: Array<{
    sourceType: string;
    sourceName: string;
    metricLabel: string;
    metricValue: string | number;
    columnsInvolved?: string[];
    affectedRowCount?: number;
    confidence: number;
  }>;
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
  recurringSchedule?: RecurringReportSchedule;
}

export interface ScheduledReportExecutionLog {
  id: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  recipientsCount: number;
  recipients: string[];
  reportTitle: string;
  triggerType: 'scheduled_cron' | 'manual_test_run';
  details: string;
}

export interface RecurringReportSchedule {
  enabled: boolean;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  timeUtc: string; // e.g. "09:00"
  format: 'pdf_and_summary' | 'pdf_only' | 'excel_and_summary';
  recipients: string[]; // List of team member emails
  additionalEmails?: string[];
  templateType: 'executive' | 'technical' | 'compact';
  lastRunAt?: string;
  nextRunAt?: string;
  runCount?: number;
  firebaseFunctionRegion?: string;
  firebaseFunctionName?: string;
  executionLogs?: ScheduledReportExecutionLog[];
}

export type ThemePreset = 'default-dark' | 'black-oled' | 'midnight-blue' | 'graphite-purple' | 'emerald-dark' | 'light-corporate';
export type AccentColor = 'blue' | 'emerald' | 'purple' | 'orange' | 'red' | 'cyan' | 'indigo' | 'violet' | 'amber';
export type ContrastLevel = 'low' | 'medium' | 'high';
export type FontSize = 'small' | 'default' | 'large' | 'extra-large';
export type UIThicknessDensity = 'compact' | 'comfortable' | 'spacious';
export type CornerRadius = 'sharp' | 'small' | 'medium' | 'large';
export type SidebarWidthOption = 'default' | 'compact' | 'expanded';
export type AnimationSpeed = 'minimal' | 'normal' | 'enhanced' | 'disabled';
export type DashboardCardStyle = 'flat' | 'elevated' | 'outlined' | 'glass';

export type TypographyFontFamily =
  | 'system-default'
  | 'arial'
  | 'helvetica'
  | 'times-new-roman'
  | 'georgia'
  | 'verdana'
  | 'tahoma'
  | 'trebuchet-ms'
  | 'courier-new'
  | 'inter'
  | 'roboto'
  | 'open-sans'
  | 'poppins'
  | 'montserrat';

export type TypographyFontSize = 'small' | 'medium' | 'large' | 'extra-large';
export type TypographyFontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface TypographySettings {
  fontFamily: TypographyFontFamily | string;
  fontSize: TypographyFontSize;
  fontWeight: TypographyFontWeight;
}

export interface DataTablePreferences {
  stripedRows: boolean;
  hoverHighlight: boolean;
  gridLines: boolean;
  rowDensity: 'compact' | 'comfortable' | 'spacious';
  stickyHeader: boolean;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  keyboardFocusIndicators: boolean;
  reducedMotion: boolean;
  largerClickTargets: boolean;
}

export interface ThemeCustomization {
  preset: ThemePreset;
  accentColor: AccentColor;
  contrast: ContrastLevel;
  fontSize: FontSize;
  density: UIThicknessDensity;
  cornerRadius: CornerRadius;
  sidebarWidth: SidebarWidthOption;
  sidebarIconOnly: boolean;
  animations: AnimationSpeed;
  tablePrefs: DataTablePreferences;
  cardStyle: DashboardCardStyle;
  followSystemTheme: boolean;
  accessibility: AccessibilitySettings;
  typography?: TypographySettings;
  customColors?: {
    bgMain?: string;
    bgSidebar?: string;
    bgCard?: string;
    bgPanel?: string;
    textPrimary?: string;
    textSecondary?: string;
    textMuted?: string;
    borders?: string;
    primaryBtn?: string;
    hoverBtn?: string;
    success?: string;
    warning?: string;
    error?: string;
    info?: string;
    inputBg?: string;
    inputBorder?: string;
  };
}

export interface SystemSettings {
  theme: 'light' | 'dark';
  accentColor: AccentColor;
  language: string;
  timezone: string;
  emailNotifications: {
    auditCompleted: boolean;
    teamInvites: boolean;
    weeklyDigest: boolean;
  };
  apiKey: string;
  themeCustomization?: ThemeCustomization;
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

export type UserPlan = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired' | 'paused';

export interface UserBillingInfo {
  plan: UserPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionId?: string | null;
  customerId?: string | null;
  billingCycle: 'monthly' | 'yearly';
  renewalDate?: string | null;
  trialEndsAt?: string | null;
}

export interface BillingInvoice {
  id: string;
  paddleInvoiceId: string;
  amount: number; // cents
  currency: string;
  status: 'paid' | 'failed' | 'refunded' | 'pending';
  invoicePdfUrl?: string;
  paymentMethod?: string;
  createdAt: string;
}

export interface BillingTransaction {
  id: string;
  paddleTransactionId: string;
  amount: number; // cents
  currency: string;
  status: 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  description?: string;
  createdAt: string;
}

export interface UsageMetrics {
  auditCount: number;
  maxAudits: number | 'unlimited';
  rowsProcessed: number;
  storageUsedBytes: number;
  apiCallsCount: number;
  periodMonth: string;
}

export interface PlanEntitlements {
  allowAiInsights: boolean;
  allowAiAssistant: boolean;
  allowUnlimitedRows: boolean;
  allowAdvancedCleaning: boolean;
  allowCustomBranding: boolean;
  allowPdfReports: boolean;
  allowTeamCollab: boolean;
  allowDeveloperApi: boolean;
}


