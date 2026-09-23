export function getToken() {
  return sessionStorage.getItem("tms_token");
}

export function setToken(token) {
  sessionStorage.setItem("tms_token", token);
}

export function clearToken() {
  sessionStorage.removeItem("tms_token");
}

export function isAuthenticated() {
  return !!getToken();
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    return null;
  }
  return res.json();
}
