const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3009";

// Deliberately a different storage key from Club Admin's: the two consoles
// hold different authorities and must never read each other's tokens.
const TOKEN_KEY = "driftPlatformToken";
const CHALLENGE_KEY = "driftPlatformTwoFactorChallenge";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function hasToken(): boolean {
  return getToken() !== null;
}

export type TwoFactorChallenge = {
  challengeToken: string;
  expiresAt: string;
  maskedDestination: string;
  delivery: "DEV_CONSOLE" | "PENDING_PROVIDER";
  devVerificationCode?: string;
};

export function setTwoFactorChallenge(challenge: TwoFactorChallenge | null): void {
  if (typeof window === "undefined") return;
  if (challenge) window.sessionStorage.setItem(CHALLENGE_KEY, JSON.stringify(challenge));
  else window.sessionStorage.removeItem(CHALLENGE_KEY);
}

export function getTwoFactorChallenge(): TwoFactorChallenge | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(CHALLENGE_KEY);
  if (!value) return null;
  try { return JSON.parse(value) as TwoFactorChallenge; }
  catch { window.sessionStorage.removeItem(CHALLENGE_KEY); return null; }
}

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const body = data as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : (body?.message ?? res.statusText);
    // An expired/invalidated staff token means the session is over.
    if (res.status === 401 && typeof window !== "undefined") {
      setToken(null);
    }
    throw new ApiError(res.status, message);
  }

  return data as T;
}

async function rawFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") setToken(null);
    const body = (await res.json().catch(() => undefined)) as
      | { message?: string | string[] }
      | undefined;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : (body?.message ?? res.statusText);
    throw new ApiError(res.status, message);
  }
  return res;
}

/**
 * Every path here is already under /platform-admin — callers stay relative.
 *
 * `delete`/`upload`/`blob` mirror `club-admin/lib/api-client.ts`. They have no
 * call sites in this console yet; they exist so the first page that needs a
 * delete or a file download reaches for the shared client instead of
 * hand-rolling `fetch` with its own auth header and error handling — which is
 * how the two clients drifted apart in the first place.
 */
export const api = {
  get: <T>(path: string) => apiFetch<T>(`/platform-admin${path}`),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(`/platform-admin${path}`, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(`/platform-admin${path}`, { method: "PATCH", body }),
  delete: <T>(path: string) =>
    apiFetch<T>(`/platform-admin${path}`, { method: "DELETE" }),
  upload: async <T>(path: string, form: FormData) => {
    const res = await rawFetch(`/platform-admin${path}`, {
      method: "POST",
      body: form,
    });
    return res.json() as Promise<T>;
  },
  blob: async (path: string) =>
    (await rawFetch(`/platform-admin${path}`)).blob(),
};

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
