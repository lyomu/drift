const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// Deliberately a different storage key from Club Admin's: the two consoles
// hold different authorities and must never read each other's tokens.
const TOKEN_KEY = "driftPlatformToken";

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

/** Every path here is already under /platform-admin — callers stay relative. */
export const api = {
  get: <T>(path: string) => apiFetch<T>(`/platform-admin${path}`),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(`/platform-admin${path}`, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(`/platform-admin${path}`, { method: "PATCH", body }),
};
