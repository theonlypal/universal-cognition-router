import { setTimeout as delay } from 'node:timers/promises';

export interface HttpRequestOptions extends RequestInit {
  retry?: number;
  retryDelayMs?: number;
}

export async function httpRequest(url: string, options: HttpRequestOptions = {}): Promise<Response> {
  const { retry = 3, retryDelayMs = 500, ...init } = options;
  let attempt = 0;
  let lastError: unknown;
  while (attempt < retry) {
    try {
      const response = await fetch(url, init);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return response;
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (attempt >= retry) break;
      await delay(retryDelayMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Unknown HTTP error');
}

export async function httpJson<T>(url: string, options: HttpRequestOptions = {}): Promise<T> {
  const response = await httpRequest(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  return response.json() as Promise<T>;
}
