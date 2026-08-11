import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FormattedTimeData, 
  formatTimeData, 
  getDetectedTimeZone, 
  getEffectiveTimeZone, 
  formatLocalTimestamp, 
  formatRelativeLocalTime,
  isLocale24Hour
} from '../lib/timeService';

interface TimeContextType {
  now: Date;
  timeData: FormattedTimeData;
  timeZone: string;
  configuredTimeZone: string;
  setConfiguredTimeZone: (tz: string) => void;
  use24Hour: boolean;
  setUse24Hour: (val: boolean) => void;
  formatTime: (
    raw: string | number | Date | null | undefined, 
    options?: Parameters<typeof formatLocalTimestamp>[1]
  ) => string;
  formatRelative: (raw: string | number | Date | null | undefined) => string;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

interface TimeProviderProps {
  children: React.ReactNode;
  initialTimeZone?: string;
  onTimeZoneChange?: (tz: string) => void;
}

export const TimeProvider: React.FC<TimeProviderProps> = ({ 
  children, 
  initialTimeZone = 'auto',
  onTimeZoneChange
}) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [configuredTimeZone, setConfiguredTimeZoneState] = useState<string>(initialTimeZone || 'auto');
  const [use24Hour, setUse24Hour] = useState<boolean>(() => isLocale24Hour());

  // Keep configuredTimeZone synced if prop changes
  useEffect(() => {
    if (initialTimeZone && initialTimeZone !== configuredTimeZone) {
      setConfiguredTimeZoneState(initialTimeZone);
    }
  }, [initialTimeZone]);

  const setConfiguredTimeZone = useCallback((tz: string) => {
    setConfiguredTimeZoneState(tz);
    if (onTimeZoneChange) {
      onTimeZoneChange(tz);
    }
  }, [onTimeZoneChange]);

  // Master 1-second interval ticker for live clock
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const interval = setInterval(update, 1000);

    // Event listeners to detect device travel / time zone changes when window regains focus
    const handleFocusOrVisibility = () => {
      setNow(new Date());
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
    };
  }, []);

  const timeZone = useMemo(() => {
    return getEffectiveTimeZone(configuredTimeZone);
  }, [configuredTimeZone]);

  const timeData = useMemo(() => {
    return formatTimeData(now, timeZone, use24Hour);
  }, [now, timeZone, use24Hour]);

  const formatTime = useCallback((
    raw: string | number | Date | null | undefined,
    options?: Parameters<typeof formatLocalTimestamp>[1]
  ) => {
    return formatLocalTimestamp(raw, {
      timeZone,
      use24Hour,
      ...options
    });
  }, [timeZone, use24Hour]);

  const formatRelative = useCallback((raw: string | number | Date | null | undefined) => {
    return formatRelativeLocalTime(raw, timeZone);
  }, [timeZone]);

  const value = useMemo(() => ({
    now,
    timeData,
    timeZone,
    configuredTimeZone,
    setConfiguredTimeZone,
    use24Hour,
    setUse24Hour,
    formatTime,
    formatRelative
  }), [now, timeData, timeZone, configuredTimeZone, setConfiguredTimeZone, use24Hour, formatTime, formatRelative]);

  return (
    <TimeContext.Provider value={value}>
      {children}
    </TimeContext.Provider>
  );
};

export const useTime = (): TimeContextType => {
  const context = useContext(TimeContext);
  if (!context) {
    // Graceful fallback if component used outside provider
    const fallbackNow = new Date();
    const fallbackTz = getDetectedTimeZone();
    const fallbackData = formatTimeData(fallbackNow, fallbackTz);
    return {
      now: fallbackNow,
      timeData: fallbackData,
      timeZone: fallbackTz,
      configuredTimeZone: 'auto',
      setConfiguredTimeZone: () => {},
      use24Hour: false,
      setUse24Hour: () => {},
      formatTime: (raw, opts) => formatLocalTimestamp(raw, { timeZone: fallbackTz, ...opts }),
      formatRelative: (raw) => formatRelativeLocalTime(raw, fallbackTz)
    };
  }
  return context;
};
