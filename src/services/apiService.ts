import { APP_CONFIG } from "@config/app.config";

export async function apiFetch(url: string, options: RequestInit = {}) {
  const userId = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_ID);
  const headers = {
    ...options.headers,
    "Content-Type": "application/json",
    ...(userId ? { "x-user-id": userId } : {}),
  };
  return fetch(url, { ...options, headers });
}
