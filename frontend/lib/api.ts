/** Auth token storage and an authenticated fetch helper. */

const KEY = "token";

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (token: string) => localStorage.setItem(KEY, token);
export const signOut = () => localStorage.removeItem(KEY);

/** fetch with the bearer token. A 401 clears the token and sends the user to sign in. */
export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) {
    signOut();
    window.location.assign("/signin/");
  }
  return res;
}

/** Summary row of a saved document (GET /api/saved). */
export interface SavedSummary {
  id: number;
  doc_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
