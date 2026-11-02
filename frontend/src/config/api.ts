export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

export const ALT_API_URL = "http://127.0.0.1:8000";

/**
 * Robust fetch helper that:
 * 1. Uses the configured NEXT_PUBLIC_API_URL (or http://localhost:8000)
 * 2. If running locally and 'localhost' fails (e.g. Windows IPv6 vs IPv4), automatically retries with 127.0.0.1
 */
export async function apiFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  try {
    return await fetch(url, init);
  } catch (err) {
    if (API_BASE_URL.includes("localhost") && !endpoint.startsWith("http")) {
      const altUrl = `${ALT_API_URL}${endpoint}`;
      return await fetch(altUrl, init);
    }
    throw err;
  }
}

