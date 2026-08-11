/**
 * Enterprise Time & Timezone Service for CSV Auditor Pro
 * Ensures precise local date, time, and timezone rendering based on the user's actual location.
 */

export interface FormattedTimeData {
  timeString: string;       // e.g. "08:50:21 AM" or "08:50:21"
  dateString: string;       // e.g. "11 August 2026"
  dayName: string;          // e.g. "Monday"
  timeZone: string;         // e.g. "Africa/Nairobi"
  timeZoneShort: string;    // e.g. "EAT" or "GMT+3"
  fullDisplay: string;      // e.g. "Monday, 11 August 2026, 08:50:21 AM (Africa/Nairobi)"
  greeting: string;         // e.g. "Good Morning"
  is24Hour: boolean;
}

/**
 * Safely resolves the user's local IANA timezone name.
 * e.g., 'Africa/Nairobi', 'America/New_York', 'Europe/London'
 */
export function getDetectedTimeZone(): string {
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (resolved && resolved.length > 0) {
        return resolved;
      }
    }
  } catch (e) {
    console.warn('Failed to resolve browser timezone:', e);
  }
  return 'UTC';
}

/**
 * Resolves effective timezone (auto-detected or user configured override)
 */
export function getEffectiveTimeZone(configuredTimeZone?: string): string {
  if (!configuredTimeZone || configuredTimeZone === 'auto' || configuredTimeZone === 'Auto' || configuredTimeZone === 'auto-detect') {
    return getDetectedTimeZone();
  }
  if (configuredTimeZone.startsWith('UTC')) {
    const tzMap: Record<string, string> = {
      'UTC': 'UTC',
      'UTC-8': 'America/Los_Angeles',
      'UTC-5': 'America/New_York',
      'UTC+0': 'Europe/London',
      'UTC+1': 'Europe/Paris',
      'UTC+3': 'Africa/Nairobi',
      'UTC+8': 'Asia/Singapore',
      'UTC+9': 'Asia/Tokyo'
    };
    return tzMap[configuredTimeZone] || getDetectedTimeZone();
  }
  return configuredTimeZone;
}

/**
 * Automatically detects whether user locale defaults to 24-hour clock
 */
export function isLocale24Hour(locale?: string): boolean {
  try {
    const testDate = new Date(2026, 0, 1, 13, 0, 0);
    const targetLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
    const formatted = new Intl.DateTimeFormat(targetLocale, {
      hour: 'numeric'
    }).format(testDate);
    return !formatted.includes('PM') && !formatted.includes('pm') && !formatted.includes('AM') && !formatted.includes('am');
  } catch {
    return false;
  }
}

/**
 * Calculates time-based greeting for local hour
 */
export function getGreetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Formats a given Date instance into comprehensive local time structure
 */
export function formatTimeData(
  date: Date = new Date(),
  timeZone?: string,
  use24Hour?: boolean,
  locale?: string
): FormattedTimeData {
  const effectiveTz = getEffectiveTimeZone(timeZone);
  const targetLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const is24 = use24Hour !== undefined ? use24Hour : isLocale24Hour(targetLocale);

  try {
    // 1. Time string (HH:mm:ss AM/PM or HH:mm:ss)
    const timeFormatter = new Intl.DateTimeFormat(targetLocale, {
      timeZone: effectiveTz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: !is24
    });
    const timeString = timeFormatter.format(date);

    // 2. Day Name (e.g. "Monday")
    const dayFormatter = new Intl.DateTimeFormat(targetLocale, {
      timeZone: effectiveTz,
      weekday: 'long'
    });
    const dayName = dayFormatter.format(date);

    // 3. Date string (e.g. "11 August 2026")
    const dateFormatter = new Intl.DateTimeFormat(targetLocale, {
      timeZone: effectiveTz,
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const dateString = dateFormatter.format(date);

    // 4. Short timezone abbreviation or name
    let timeZoneShort = effectiveTz;
    try {
      const shortFormatter = new Intl.DateTimeFormat(targetLocale, {
        timeZone: effectiveTz,
        timeZoneName: 'short'
      });
      const parts = shortFormatter.formatToParts(date);
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      if (tzPart) timeZoneShort = tzPart.value;
    } catch {
      timeZoneShort = effectiveTz;
    }

    // 5. Hour in target timezone for greeting
    let localHour = date.getHours();
    try {
      const hourPart = new Intl.DateTimeFormat('en-US', {
        timeZone: effectiveTz,
        hour: 'numeric',
        hour12: false
      }).format(date);
      localHour = parseInt(hourPart, 10);
    } catch {
      localHour = date.getHours();
    }

    const greeting = getGreetingForHour(localHour);
    const fullDisplay = `${dayName}, ${dateString} ${timeString} (${effectiveTz})`;

    return {
      timeString,
      dateString,
      dayName,
      timeZone: effectiveTz,
      timeZoneShort,
      fullDisplay,
      greeting,
      is24Hour: is24
    };
  } catch (e) {
    console.warn('Error formatting time data:', e);
    return {
      timeString: date.toLocaleTimeString(),
      dateString: date.toLocaleDateString(),
      dayName: 'Today',
      timeZone: effectiveTz || 'Local',
      timeZoneShort: 'Local',
      fullDisplay: date.toLocaleString(),
      greeting: getGreetingForHour(date.getHours()),
      is24Hour: false
    };
  }
}

/**
 * Universal timestamp formatter for formatting backend ISO UTC timestamps into local timezone strings.
 */
export function formatLocalTimestamp(
  rawTimestamp: string | number | Date | null | undefined,
  options: {
    includeSeconds?: boolean;
    includeDate?: boolean;
    includeYear?: boolean;
    includeTimeZone?: boolean;
    timeZone?: string;
    use24Hour?: boolean;
    locale?: string;
  } = {}
): string {
  if (!rawTimestamp) return 'N/A';

  try {
    const date = new Date(rawTimestamp);
    if (isNaN(date.getTime())) return String(rawTimestamp);

    const effectiveTz = getEffectiveTimeZone(options.timeZone);
    const targetLocale = options.locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

    const fmtOptions: Intl.DateTimeFormatOptions = {
      timeZone: effectiveTz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: options.use24Hour !== undefined ? !options.use24Hour : !isLocale24Hour(targetLocale)
    };

    if (options.includeSeconds) {
      fmtOptions.second = '2-digit';
    }

    if (options.includeDate) {
      fmtOptions.month = 'short';
      fmtOptions.day = 'numeric';
      if (options.includeYear !== false) {
        fmtOptions.year = 'numeric';
      }
    }

    if (options.includeTimeZone) {
      fmtOptions.timeZoneName = 'short';
    }

    return new Intl.DateTimeFormat(targetLocale, fmtOptions).format(date);
  } catch (e) {
    return String(rawTimestamp);
  }
}

/**
 * Returns relative time string ("Just now", "5m ago", etc.) calculated accurately
 */
export function formatRelativeLocalTime(
  rawTimestamp: string | number | Date | null | undefined,
  timeZone?: string
): string {
  if (!rawTimestamp) return 'N/A';
  const date = new Date(rawTimestamp);
  if (isNaN(date.getTime())) return String(rawTimestamp);

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;

  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatLocalTimestamp(date, { includeDate: true, timeZone });
}
