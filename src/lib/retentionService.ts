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
    badge: '🗑 Immediate',
    description: 'Raw CSV is purged right after validation & AI report generation. Zero lingering storage.',
    durationMs: 0,
    iconName: 'Trash2',
  },
  {
    id: '24h',
    label: '24 Hours (Default & Recommended)',
    badge: '⏱ 24 Hours',
    description: 'Raw file is safely held for 24 hours for audit verification, then automatically purged.',
    durationMs: 24 * 60 * 60 * 1000,
    iconName: 'Clock',
  },
  {
    id: '3d',
    label: '3 Days',
    badge: '📅 3 Days',
    description: 'Retain raw CSV for 72 hours before automated system cleanup.',
    durationMs: 3 * 24 * 60 * 60 * 1000,
    iconName: 'Calendar',
  },
  {
    id: '7d',
    label: '7 Days',
    badge: '📅 7 Days',
    description: 'Retain raw CSV for 1 week for extended team review.',
    durationMs: 7 * 24 * 60 * 60 * 1000,
    iconName: 'Calendar',
  },
  {
    id: '14d',
    label: '14 Days',
    badge: '📅 14 Days',
    description: 'Two-week compliance holding window.',
    durationMs: 14 * 24 * 60 * 60 * 1000,
    iconName: 'Calendar',
  },
  {
    id: '30d',
    label: '30 Days',
    badge: '📅 30 Days',
    description: 'Monthly audit cycle retention window.',
    durationMs: 30 * 24 * 60 * 60 * 1000,
    iconName: 'Calendar',
  },
  {
    id: 'forever',
    label: 'Keep until I manually delete it',
    badge: '♾ Indefinite',
    description: 'File stays in secure storage until explicitly purged by an Owner or Admin.',
    durationMs: null,
    iconName: 'Shield',
  },
];

export function getRetentionOptionDetail(option: RetentionPeriodOption): RetentionOptionDetail {
  return RETENTION_OPTIONS.find(o => o.id === option) || RETENTION_OPTIONS[1]; // fallback 24h
}

export function calculateExpiration(option: RetentionPeriodOption, baseTime: Date = new Date()): string | null {
  const detail = getRetentionOptionDetail(option);
  if (detail.id === 'forever') return null;
  if (detail.id === 'immediate') return baseTime.toISOString();
  if (detail.durationMs === null) return null;

  return new Date(baseTime.getTime() + detail.durationMs).toISOString();
}

export function createDefaultRetentionPolicy(option: RetentionPeriodOption = '24h'): RetentionPolicy {
  const now = new Date();
  const expiresAt = calculateExpiration(option, now);

  if (option === 'immediate') {
    return {
      option: 'immediate',
      selectedAt: now.toISOString(),
      expiresAt: now.toISOString(),
      status: 'deleted_immediately',
      originalFileDeleted: true,
      originalDeletedAt: now.toISOString(),
      deletedBy: 'System Post-Validation Purge',
    };
  }

  if (option === 'forever') {
    return {
      option: 'forever',
      selectedAt: now.toISOString(),
      expiresAt: null,
      status: 'kept_forever',
      originalFileDeleted: false,
    };
  }

  return {
    option,
    selectedAt: now.toISOString(),
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

export function formatTimeRemaining(expiresAt: string | null, originalFileDeleted: boolean): {
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

  const expireTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const diff = expireTime - now;

  if (diff <= 0) {
    return { label: 'Expired & Pending Cleanup', isUrgent: true, isExpired: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let formatted = '';
  if (hours > 24) {
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
    if (!policy || policy.originalFileDeleted || !policy.expiresAt || policy.option === 'forever') {
      return file;
    }

    const expireTime = new Date(policy.expiresAt).getTime();
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
