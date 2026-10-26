/// <reference types="vite/client" />
// Without the reference above, `import.meta.env` is not typed and `tsc --noEmit` fails --
// which `vite build` does not catch, because it tree-shakes this module out when no screen
// imports it yet.
//
// Where the generated API lives.
//
// Set at build time: the platform bakes the deployed API URL into the frontend build. The
// fallback is the local backend so a bare `npm run dev` still points somewhere real.
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// The shared bearer the deployed API expects (its SECRET_KEY). Used only as a fallback for
// calls made before a member has signed in; once a member signs in, the stored session JWT
// takes over as the Authorization bearer.
export const API_SECRET_KEY: string = import.meta.env.VITE_API_SECRET_KEY ?? "";

// -- Session storage ---------------------------------------------------------
//
// One small module owns the signed-in session: the JWT from POST /auth/login and the member
// it belongs to. apiFetch reads it to authenticate every call, and clears it the moment the
// API says the token is no longer good.

export type AuthUser = Record<string, unknown> & {
  id?: string | number;
  email?: string;
  name?: string;
};

const TOKEN_KEY = "pms.auth.token";
const USER_KEY = "pms.auth.user";

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyAuth(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeAuth(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function setSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuth();
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuth();
}

// -- HTTP ---------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Paths that are expected to answer 401 as a normal outcome (bad credentials), not as "your
// session expired" -- those must not clear a session that was never set or bounce the member
// away from the page reporting the error.
const UNAUTHENTICATED_PATHS = new Set(["/auth/login"]);

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : API_SECRET_KEY
          ? { Authorization: `Bearer ${API_SECRET_KEY}` }
          : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    if (!UNAUTHENTICATED_PATHS.has(path)) {
      clearSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/sign-in") {
        window.location.assign("/sign-in");
      }
    }
    throw new ApiError(401, `${init?.method ?? "GET"} ${path} failed: 401`);
  }
  if (!response.ok) {
    throw new ApiError(response.status, `${init?.method ?? "GET"} ${path} failed: ${response.status}`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
