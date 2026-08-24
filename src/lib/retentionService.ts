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

export function getRetentionOptionDetail(option: RetentionPeriodOption): RetentionOptionDetail {
  return RETENTION_OPTIONS.find(o => o.id === option) || RETENTION_OPTIONS[1]; // fallback 24h
}

export function parseSafeDate(input: string | number | Date | null | undefined): Date {
  if (!input) return new Date();
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? new Date() : input;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return new Date();

    // Direct parse test
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed) && parsed > 0) {
      return new Date(parsed);
    }

    // Try standard ISO or locale cleaning
    const d = new Date(trimmed);
    if (!isNaN(d.getTime()) && d.getTime() > 0) {
      return d;
    }

    // Handle "DD/MM/YYYY" or "MM/DD/YYYY" formats
    const parts = trimmed.split(/[/,\s-:]+/);
    if (parts.length >= 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
        // Try year-first YYYY-MM-DD
        if (p0 > 1000) {
          return new Date(p0, p1 - 1, p2);
        }
        // Try year-last DD/MM/YYYY or MM/DD/YYYY
        if (p2 > 1000) {
          const tryDate = new Date(p2, p1 - 1, p0);
          if (!isNaN(tryDate.getTime())) return tryDate;
        }
      }
    }
  }
  return new Date();
}

export function calculateExpiration(
  option: RetentionPeriodOption,
  baseTime: Date | string | number = new Date()
): string | null {
  const detail = getRetentionOptionDetail(option);
  if (detail.id === 'forever' || detail.durationMs === null) return null;
  
  const safeBase = parseSafeDate(baseTime);
  if (detail.id === 'immediate') return safeBase.toISOString();

  // Always compute using epoch milliseconds to eliminate timezone conversion drift
  const baseMs = safeBase.getTime();
  const expireMs = baseMs + detail.durationMs;
  return new Date(expireMs).toISOString();
}

export function createDefaultRetentionPolicy(option: RetentionPeriodOption = '24h'): RetentionPolicy {
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = calculateExpiration(option, now);

  if (option === 'immediate') {
    return {
      option: 'immediate',
      selectedAt: nowIso,
      expiresAt: nowIso,
      status: 'deleted_immediately',
      originalFileDeleted: true,
      originalDeletedAt: nowIso,
      deletedBy: 'System Post-Validation Purge',
    };
  }

  if (option === 'forever') {
    return {
      option: 'forever',
      selectedAt: nowIso,
      expiresAt: null,
      status: 'kept_forever',
      originalFileDeleted: false,
    };
  }

  return {
    option,
    selectedAt: nowIso,
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

export function formatTimeRemaining(
  expiresAt: string | null | undefined,
  originalFileDeleted: boolean
): {
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

  const expireTime = Date.parse(expiresAt);
  if (isNaN(expireTime) || expireTime <= 0) {
    return { label: 'Active (24h Default)', isUrgent: false, isExpired: false };
  }

  const now = Date.now();
  const diff = expireTime - now;

  if (diff <= 0) {
    return { label: 'Expired & Pending Cleanup', isUrgent: true, isExpired: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let formatted = '';
  if (hours >= 48) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    formatted = `${days}d ${remHours}h remaining`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m ${seconds}s`;
  } else {
    formatted = `${minutes}m ${seconds}s`;
  }

  const isUrgent = diff < 2 * 60 * 60 * 1000; // < 2 hours remaining

  return { label: formatted, isUrgent, isExpired: false };
}

/**
 * Process automatic scheduled deletion for expired files with strict safety guardrails
 */
export function executeScheduledRetentionCleanup(
  files: CSVFile[],
  logAuditActivity?: (action: string, fileName?: string) => void,
  notifyUser?: (message: string, type?: 'info' | 'warning' | 'success') => void
): { updatedFiles: CSVFile[]; deletedCount: number } {
  const now = Date.now();
  let deletedCount = 0;

  const updatedFiles = files.map(file => {
    // Safety check 0: Demo / Sample files are always preserved indefinitely
    if (
      file.id === 'file-active' ||
      file.name?.toLowerCase().includes('sample') ||
      file.name?.toLowerCase().includes('messy')
    ) {
      return file;
    }

    const policy = file.retentionPolicy;
    // Safety check 1: Must have active policy and not already deleted or set to forever/immediate
    if (
      !policy ||
      policy.originalFileDeleted ||
      !policy.expiresAt ||
      policy.option === 'forever' ||
      policy.option === 'immediate' || // Immediate purging is performed synchronously during ingestion
      policy.status === 'kept_forever' ||
      policy.status === 'deleted_immediately' ||
      policy.status === 'deleted_manually'
    ) {
      return file;
    }

    const optionDetail = getRetentionOptionDetail(policy.option);
    if (!optionDetail.durationMs || optionDetail.durationMs <= 0) {
      return file;
    }

    // Safety check 2: Validate expiration timestamp
    const expireTime = parseSafeDate(policy.expiresAt).getTime();
    if (isNaN(expireTime) || expireTime <= 0) {
      return file; // Invalid timestamp - never purge prematurely
    }

    // Safety check 3: Verification of elapsed duration
    // Guard against corrupted expiresAt in the past: verify that the elapsed time since policy creation / upload
    // actually matches the policy's configured duration (with 1 min grace window).
    const rawCreation = policy.selectedAt || file.uploadedAt;
    if (!rawCreation) {
      // If neither selectedAt nor uploadedAt exists, repair with current time to prevent instant deletion
      return {
        ...file,
        retentionPolicy: {
          ...policy,
          selectedAt: new Date().toISOString(),
          expiresAt: calculateExpiration(policy.option, new Date()),
        }
      };
    }

    const creationTime = parseSafeDate(rawCreation).getTime();
    if (isNaN(creationTime) || creationTime <= 0) {
      return file;
    }

    const elapsed = now - creationTime;
    // If elapsed time is less than the required duration (minus 60s tolerance), DO NOT PURGE!
    if (elapsed < (optionDetail.durationMs - 60000)) {
      return file;
    }

    // Check if genuinely expired (both expiresAt reached AND full configured duration elapsed)
    if (expireTime <= now && elapsed >= (optionDetail.durationMs - 60000)) {
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
