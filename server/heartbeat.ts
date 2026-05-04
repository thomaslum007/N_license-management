/**
 * Heartbeat/Ping Engine
 * Handles HTTP ping checks for monitored systems with HEAD and GET fallback
 */

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_RETRY_COUNT = 1;

export interface PingResult {
  status: "online" | "down";
  responseTime: number; // milliseconds
  error?: string;
}

/**
 * Normalize URL to ensure it has a protocol
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = "https://" + normalized;
  }
  return normalized;
}

/**
 * Perform a single ping attempt to a URL
 * Tries HEAD first, falls back to GET if HEAD fails
 */
export async function ping(
  url: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<PingResult> {
  const normalizedUrl = normalizeUrl(url);
  const startTime = Date.now();

  // Try HEAD first
  let response: Response | null = null;
  let headError: Error | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    response = await fetch(normalizedUrl, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);
  } catch (error) {
    headError = error instanceof Error ? error : new Error(String(error));
    response = null;
  }

  // If HEAD failed, try GET
  if (!response && headError) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      response = await fetch(normalizedUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        status: "down",
        responseTime,
        error: errorMessage,
      };
    }
  }

  if (!response) {
    const responseTime = Date.now() - startTime;
    return {
      status: "down",
      responseTime,
      error: "No response",
    };
  }

  const responseTime = Date.now() - startTime;

  // Consider 2xx and 3xx status codes as online
  if (response.ok || (response.status >= 300 && response.status < 400)) {
    return {
      status: "online",
      responseTime,
    };
  }

  // 4xx and 5xx are still "online" (server is responding)
  if (response.status >= 400 && response.status < 600) {
    return {
      status: "online",
      responseTime,
    };
  }

  return {
    status: "down",
    responseTime,
    error: `HTTP ${response.status}`,
  };
}

/**
 * Perform a ping with retries
 */
export async function pingWithRetry(
  url: string,
  retries: number = DEFAULT_RETRY_COUNT,
  timeout: number = DEFAULT_TIMEOUT
): Promise<PingResult> {
  let lastResult: PingResult | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    lastResult = await ping(url, timeout);

    // If online, return immediately
    if (lastResult.status === "online") {
      return lastResult;
    }

    // If this is not the last attempt, wait before retrying
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return lastResult || { status: "down", responseTime: 0, error: "Unknown error" };
}

/**
 * Validate a URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const normalized = normalizeUrl(url);
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
}
