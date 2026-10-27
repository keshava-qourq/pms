import { useSyncExternalStore } from "react";

import {
  apiFetch,
  clearSession,
  getUser,
  isAuthenticated,
  setSession,
  subscribeAuth,
  type AuthUser,
} from "@/lib/api";

type LoginResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

/** POSTs the entered credentials to /auth/login and stores the resulting session. */
export async function login(email: string, password: string): Promise<AuthUser> {
  const result = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setSession(result.access_token, result.user);
  return result.user;
}

export function logout(): void {
  clearSession();
}

/** Re-renders a component whenever the signed-in session changes. */
export function useAuth(): { isAuthenticated: boolean; user: AuthUser | null } {
  const authed = useSyncExternalStore(subscribeAuth, isAuthenticated, isAuthenticated);
  return { isAuthenticated: authed, user: authed ? getUser() : null };
}
