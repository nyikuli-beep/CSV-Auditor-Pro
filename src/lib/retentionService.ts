import { CSVFile, RetentionPeriodOption, RetentionPolicy, TeamMember } from '../types';

export type { RetentionPeriodOption, RetentionPolicy } from '../types';

export interface RetentionOptionDetail {
  id: RetentionPeriodOption;
  label: string;
  badge: string;
  description: string;
  durationMs: number | null; // null for forever
  iconName: string;
}

export const RETENTION_OPTIONS: RetentionOptionDetail[] = [
  {
    id: 'immediate',
    label: 'Delete immediately after validation',
    badge: 'Immediate',
    description: 'Raw CSV is purged right after validation & AI report generation. Zero lingering storage.',
    durationMs: 0,
    iconName: 'Trash2',
  },
  {
    id: '24h',
    label: '24 Hours (Default & Recommended)',
    badge: '24 Hours',
    description: 'Raw file is safely held for 24 hours for audit verification, then automatically purged.',
    durationMs: 24 * 60 * 60 * 1000,
    iconName: 'Clock',
  },
  {
    id: '3d',
    label: '3 Days',
    badge: '3 Days',
    description: 'Retain raw CSV for 72 hours before automated system cleanup.',
    durationMs: 3 * 24 * 60 * 60 * 1000,
    iconName: 'Calendar',
  },
  {
    id: '7d',
    label: '7 Days',
    badge: '7 Days',
    description: 'Retain raw CSV for 1 week for extended team review.',
    durationMs: 7 * 24 * 60 * 60 * 1000,
    iconName: 'Calendar',
  },
  {
    id: '14d',
    label: '14 Days',
    badge: '14 Days',
    description: 'Two-week compliance holding window.',
    durationMs: 14 * 24 * 60 * 60 * 1000,
    iconName: 'Calendar',
  },
  {
    id: '30d',
    label: '30 Days',
    badge: '30 Days',
    description: 'Monthly audit cycle retention window.',
    durationMs: 30 * 24 * 60 * 60 * 1000,
    iconName: 'Calendar',
  },
  {
    id: 'forever',
    label: 'Keep until I manually delete it',
    badge: 'Indefinite',
    description: 'File stays in secure storage until explicitly purged by an Owner or Admin.',
    durationMs: null,
    iconName: 'Shield',
  },
];

export function parseSafeDate(input?: Date | string | number | null): Date {
  if (!input) return new Date();
  if (input instanceof Date && !isNaN(input.getTime())) return input;
  if (typeof input === 'number' && !isNaN(input) && input > 0) return new Date(input);

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return new Date();

    // Try native ISO / RFC2822 parsing
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed) && parsed > 0) {
      return new Date(parsed);
    }

    // Try custom formats like "26 August 2026, 03:01 AM" or "2026-06-23 10:15 AM"
    const cleaned = trimmed.replace(/,/g, '');
    const altParsed = Date.parse(cleaned);
    if (!isNaN(altParsed) && altParsed > 0) {
      return new Date(altParsed);
    }
  }

  return new Date();
}

export function getRetentionOptionDetail(option: RetentionPeriodOption): RetentionOptionDetail {
  return RETENTION_OPTIONS.find(o => o.id === option) || RETENTION_OPTIONS[1]; // fallback 24h
}

export function calculateExpiration(
  option: RetentionPeriodOption,
  baseTime?: Date | string | number | null
): string | null {
  const detail = getRetentionOptionDetail(option);
  if (detail.id === 'forever' || detail.durationMs === null) return null;

  const base = parseSafeDate(baseTime);
  const now = Date.now();

  // If baseTime is somehow in the distant past (> 1 hour older than current clock),
  // anchor the retention window against current timestamp so the file is not purged early.
  const effectiveBaseMs = (base.getTime() < now - 60 * 60 * 1000) ? now : base.getTime();

  if (detail.id === 'immediate') {
    return new Date(effectiveBaseMs).toISOString();
  }

  return new Date(effectiveBaseMs + detail.durationMs).toISOString();
}

export function createDefaultRetentionPolicy(
  option: RetentionPeriodOption = '24h',
  baseDate?: Date | string | number | null
): RetentionPolicy {
  const now = new Date();
  const selectedAt = now.toISOString();

  if (option === 'forever') {
    return {
      option: 'forever',
      selectedAt,
      expiresAt: null,
      status: 'kept_forever',
      originalFileDeleted: false,
    };
  }

  const expiresAt = calculateExpiration(option, baseDate || now);

  if (option === 'immediate') {
    return {
      option: 'immediate',
      selectedAt,
      expiresAt,
      status: 'scheduled_deletion',
      originalFileDeleted: false,
    };
  }

  return {
    option,
    selectedAt,
    expiresAt,
    status: 'scheduled_deletion',
    originalFileDeleted: false,
  };
}

export function canManageRetention(role?: TeamMember['role'] | string): boolean {
  if (!role) return true; // Default fallback if single-user mode
  const normalized = role.toLowerCase();
  return normalized === 'owner' || normalized === 'admin';
}

export function formatTimeRemaining(expiresAt: string | null | undefined, originalFileDeleted: boolean): {
  label: string;
  isUrgent: boolean;
  isExpired: boolean;
} {
  if (originalFileDeleted) {
    return { label: 'Original Purged', isUrgent: false, isExpired: true };
  }
  if (!expiresAt) {
    return { label: 'No Auto-Deletion (Indefinite)', isUrgent: false, isExpired: false };
  }

  const expireDate = parseSafeDate(expiresAt);
  const expireTime = expireDate.getTime();
  const now = Date.now();
  const diff = expireTime - now;

  if (diff <= 0) {
    return { label: 'Expired & Pending Cleanup', isUrgent: true, isExpired: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m ${seconds}s`;
  } else {
    formatted = `${minutes}m ${seconds}s`;
  }

  const isUrgent = diff < 2 * 60 * 60 * 1000; // < 2 hours remaining

  return { label: formatted, isUrgent, isExpired: false };
}

/**
 * Process automatic scheduled deletion for expired files
 */
export function executeScheduledRetentionCleanup(
  files: CSVFile[],
  logAuditActivity?: (action: string, fileName?: string) => void,
  notifyUser?: (message: string, type?: 'info' | 'warning' | 'success') => void
): { updatedFiles: CSVFile[]; deletedCount: number } {
  const now = Date.now();
  let deletedCount = 0;

  const updatedFiles = files.map(file => {
    const policy = file.retentionPolicy;
    // Strictly protect files without retention policy, indefinitely retained files, or already purged files
    if (
      !policy || 
      policy.originalFileDeleted === true || 
      !policy.expiresAt || 
      policy.option === 'forever' || 
      policy.status === 'kept_forever'
    ) {
      return file;
    }

    const expireDate = parseSafeDate(policy.expiresAt);
    const expireTime = expireDate.getTime();

    // Guard: invalid or zero timestamps must NEVER trigger deletion
    if (isNaN(expireTime) || expireTime <= 0) {
      return file;
    }

    // Only purge if current time has truly passed the expiration timestamp
    if (expireTime <= now) {
      deletedCount++;
      const deletedAtIso = new Date().toISOString();
      
      if (logAuditActivity) {
        logAuditActivity(
          `Original CSV file automatically deleted by System Cleanup Service under policy (${getRetentionOptionDetail(policy.option).badge})`,
          file.name
        );
      }

      if (notifyUser) {
        notifyUser(
          `Your original CSV file "${file.name}" has been permanently deleted according to your retention policy (${getRetentionOptionDetail(policy.option).badge}).`,
          'info'
        );
      }

      return {
        ...file,
        rows: [], // Clear original raw CSV rows
        retentionPolicy: {
          ...policy,
          status: 'deleted_expired' as const,
          originalFileDeleted: true,
          originalDeletedAt: deletedAtIso,
          deletedBy: 'System Cleanup Service',
        },
      };
    }

    // Check for approaching expiration warning notification (< 2 hours remaining)
    const diff = expireTime - now;
    if (diff > 0 && diff <= 2 * 60 * 60 * 1000 && notifyUser && !file.isRetentionWarningSent) {
      const hours = Math.ceil(diff / (1000 * 60 * 60));
      notifyUser(
        `Notice: Original CSV file "${file.name}" will be automatically deleted in ~${hours} hour(s) per retention policy.`,
        'warning'
      );
      return {
        ...file,
        isRetentionWarningSent: true,
      };
    }

    return file;
  });

  return { updatedFiles, deletedCount };
}
