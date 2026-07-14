const API = import.meta.env.VITE_API_URL

export function loadAuth() {
  const token = localStorage.getItem("token")
  if (!token) return null
  return {
    token,
    role: localStorage.getItem("role"),
    name: localStorage.getItem("name"),
  }
}

export function saveAuth({ access_token, role, name }) {
  localStorage.setItem("token", access_token)
  localStorage.setItem("role", role)
  localStorage.setItem("name", name)
}

export function clearAuth() {
  localStorage.removeItem("token")
  localStorage.removeItem("role")
  localStorage.removeItem("name")
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token")
  const headers = { ...(options.headers || {}) }
  if (token) headers["Authorization"] = `Bearer ${token}`
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }
  const res = await fetch(`${API}${path}`, { ...options, headers })
  if (res.status === 401) {
    clearAuth()
    window.dispatchEvent(new Event("auth:logout"))
  }
  return res
}
