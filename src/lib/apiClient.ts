/**
 * API Client with Exponential Backoff and Network Failure Recovery
 * CSV Auditor Pro Network Resilience Layer
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  maxDelayMs?: number;
  retryOnStatus?: number[];
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

export class NetworkError extends Error {
  public status?: number;
  public isOffline: boolean;

  constructor(message: string, status?: number, isOffline = false) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
    this.isOffline = isOffline;
  }
}

/**
 * Execute fetch request with automatic exponential backoff retries for transient failures
 */
export async function fetchWithRetry(
  url: string | URL | Request,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    backoffFactor = 2,
    maxDelayMs = 10000,
    retryOnStatus = [408, 429, 500, 502, 503, 504],
    onRetry
  } = retryOptions;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    // Fast fail if device is explicitly offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new NetworkError(
        'Device is offline. Connection was interrupted.',
        undefined,
        true
      );
    }

    try {
      const response = await fetch(url, options);

      // Success
      if (response.ok) {
        return response;
      }

      // Check if status code qualifies for retry
      if (retryOnStatus.includes(response.status) && attempt < maxRetries) {
        attempt++;
        const currentDelay = Math.min(delay, maxDelayMs);
        const jitter = Math.random() * 200; // jitter to prevent thundering herd
        const totalWait = currentDelay + jitter;

        const err = new NetworkError(
          `Server returned status ${response.status}`,
          response.status
        );

        if (onRetry) {
          onRetry(attempt, err, totalWait);
        }

        console.warn(
          `[API Client] Request to ${url.toString()} failed (${response.status}). Retrying in ${Math.round(totalWait)}ms (Attempt ${attempt}/${maxRetries})...`
        );

        await new Promise((resolve) => setTimeout(resolve, totalWait));
        delay *= backoffFactor;
        continue;
      }

      // Return response if not retrying or retries exhausted
      return response;
    } catch (err: any) {
      // Network failure (e.g. DNS failure, connection refused, dropped packet)
      attempt++;

      if (attempt <= maxRetries) {
        const currentDelay = Math.min(delay, maxDelayMs);
        const jitter = Math.random() * 200;
        const totalWait = currentDelay + jitter;

        const errorObj = err instanceof Error ? err : new Error(String(err));

        if (onRetry) {
          onRetry(attempt, errorObj, totalWait);
        }

        console.warn(
          `[API Client] Network call error: ${errorObj.message}. Retrying in ${Math.round(totalWait)}ms (Attempt ${attempt}/${maxRetries})...`
        );

        await new Promise((resolve) => setTimeout(resolve, totalWait));
        delay *= backoffFactor;
      } else {
        throw new NetworkError(
          err?.message || 'Network request failed after maximum retry attempts.',
          undefined,
          typeof navigator !== 'undefined' && !navigator.onLine
        );
      }
    }
  }
}

/**
 * Perform a quick health check ping to verify server connectivity
 */
export async function pingHealthCheck(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('/api/sql/status', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res.ok || res.status < 500;
  } catch (e) {
    return false;
  }
}
