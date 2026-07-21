export async function apiFetch(url: string, options: RequestInit = {}) {
  const userId = localStorage.getItem("portal_user_id");
  const headers = {
    ...options.headers,
    "Content-Type": "application/json",
    ...(userId ? { "x-user-id": userId } : {}),
  };
  return fetch(url, { ...options, headers });
}
