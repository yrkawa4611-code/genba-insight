const tokenStorageKey = "genba_insight_token";

export const apiUrl = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const saveToken = (token: string) => {
  localStorage.setItem(tokenStorageKey, token);
};

export const getToken = () => localStorage.getItem(tokenStorageKey);

export const clearToken = () => {
  localStorage.removeItem(tokenStorageKey);
};

export const authFetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
) => {
  const headers = new Headers(init.headers);
  const token = getToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    window.location.assign("/");
  }

  return response;
};
