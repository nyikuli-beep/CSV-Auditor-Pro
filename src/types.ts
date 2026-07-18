export type Severity = 'critical' | 'warning' | 'info';

export type IssueType = 'duplicate' | 'missing_value' | 'invalid_format' | 'outlier' | 'column_inconsistency';

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
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  avatar?: string;
  status: 'active' | 'invited';
}

export interface AuditActivity {
  id: string;
  userId: string;
  userName: string;
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

export interface SystemSettings {
  theme: 'light' | 'dark';
  accentColor: 'blue' | 'emerald' | 'violet' | 'amber';
  language: string;
  timezone: string;
  emailNotifications: {
    auditCompleted: boolean;
    teamInvites: boolean;
    weeklyDigest: boolean;
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

