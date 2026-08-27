import { useAuthStore } from "@/lib/stores/auth-store";
import type { UserProfile } from "@/lib/types";

/**
 * Thin fetch wrapper shared by every real API call. Owns the two things a
 * plain fetch doesn't give us:
 *
 * - The access token lives HERE, in module memory -- never in
 *   localStorage, where any injected script could exfiltrate it. Losing it
 *   on a page reload is fine: the httpOnly refresh cookie (which JS cannot
 *   read at all) silently mints a new one via tryRefreshSession().
 * - 401 handling: one transparent refresh + retry per request, with
 *   concurrent 401s deduplicated onto a single in-flight refresh call so
 *   ten queries expiring together don't fire ten rotations.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface SessionResponse {
  user: UserProfile;
  accessToken: string;
}

let refreshPromise: Promise<UserProfile | null> | null = null;

/**
 * Exchanges the httpOnly refresh cookie for a fresh access token (and the
 * rotated cookie). Returns the session user, or null when there is no
 * valid session -- which is a normal state (first visit, logged out), not
 * an error to throw.
 */
export function tryRefreshSession(): Promise<UserProfile | null> {
  refreshPromise ??= (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        setAccessToken(null);
        // Keeps the UI honest when a session dies MID-use (refresh cookie
        // expired/revoked): flipping the store to guest makes RequireAuth
        // bounce to /login instead of leaving dead queries on screen.
        useAuthStore.getState().clearSession();
        return null;
      }
      const session = (await response.json()) as SessionResponse;
      setAccessToken(session.accessToken);
      useAuthStore.getState().setSession(session.user);
      return session.user;
    } catch {
      setAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Internal: prevents a second refresh+retry loop after the first one. */
  isRetry?: boolean;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  if (response.status === 401 && !options.isRetry && !path.startsWith("/auth/")) {
    const user = await tryRefreshSession();
    if (user) {
      return apiFetch<T>(path, { ...options, isRetry: true });
    }
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new ApiError(
      response.status,
      body?.error?.code ?? "UNKNOWN",
      body?.error?.message ?? `request failed with status ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
