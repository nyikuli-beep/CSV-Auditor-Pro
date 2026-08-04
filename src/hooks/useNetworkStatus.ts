import { useState, useEffect, useCallback, useRef } from 'react';
import { pingHealthCheck } from '../lib/apiClient';

export interface NetworkStatus {
  isOnline: boolean;
  isReconnecting: boolean;
  lastOnlineTimestamp: number | null;
  reconnectAttempts: number;
  triggerManualRetry: () => Promise<boolean>;
}

export function useNetworkStatus(onReconnected?: () => void): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [lastOnlineTimestamp, setLastOnlineTimestamp] = useState<number | null>(() => {
    return typeof navigator !== 'undefined' && navigator.onLine ? Date.now() : null;
  });

  const onReconnectedRef = useRef(onReconnected);
  useEffect(() => {
    onReconnectedRef.current = onReconnected;
  }, [onReconnected]);

  // Handler to verify true connectivity with backend ping
  const checkRealConnectivity = useCallback(async (): Promise<boolean> => {
    setIsReconnecting(true);
    setReconnectAttempts((prev) => prev + 1);

    const healthy = await pingHealthCheck();

    if (healthy) {
      setIsOnline(true);
      setIsReconnecting(false);
      setLastOnlineTimestamp(Date.now());
      setReconnectAttempts(0);
      if (onReconnectedRef.current) {
        onReconnectedRef.current();
      }
      return true;
    } else {
      setIsOnline(false);
      setIsReconnecting(false);
      return false;
    }
  }, []);

  // Event Listeners for browser online/offline
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.log('[NetworkStatus] Browser detected "online" event. Testing backend health...');
      checkRealConnectivity();
    };

    const handleOffline = () => {
      console.warn('[NetworkStatus] Browser detected "offline" event.');
      setIsOnline(false);
      setIsReconnecting(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check if navigator says online but backend is unreachable
    if (navigator.onLine) {
      pingHealthCheck().then((healthy) => {
        if (!healthy) {
          setIsOnline(false);
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkRealConnectivity]);

  // Periodic ping interval when offline to automatically reconnect when network returns
  useEffect(() => {
    if (isOnline) return;

    const interval = setInterval(() => {
      console.log('[NetworkStatus] Periodic offline health ping check...');
      checkRealConnectivity();
    }, 5000);

    return () => clearInterval(interval);
  }, [isOnline, checkRealConnectivity]);

  return {
    isOnline,
    isReconnecting,
    lastOnlineTimestamp,
    reconnectAttempts,
    triggerManualRetry: checkRealConnectivity
  };
}
