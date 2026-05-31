const BASE = import.meta.env.VITE_API_URL || '/api'

export function clearAuth() {
  localStorage.removeItem('echo_user_id')
  localStorage.removeItem('echo_username')
}

async function req(method, path, body, { skipAuthRedirect = false } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  if (res.status === 202) {
    const err = await res.json().catch(() => ({ detail: 'Waiting' }))
    throw Object.assign(new Error(err.detail || 'Waiting'), { status: 202 })
  }

  if (res.status === 401 && !skipAuthRedirect) {
    clearAuth()
    window.location.href = '/welcome'
    throw new Error('Session expired. Please sign in again.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw Object.assign(new Error(err.detail || 'Request failed'), { status: res.status })
  }
  return res.json()
}

export const api = {
  // Auth
  register: (data) => req('POST', '/auth/register', data, { skipAuthRedirect: true }),
  login: (data) => req('POST', '/auth/login', data, { skipAuthRedirect: true }),
  logout: async () => {
    try { await req('POST', '/auth/logout', null) } catch {}
    clearAuth()
  },
  me: () => req('GET', '/auth/me'),
  deleteAccount: () => req('DELETE', '/auth/account'),

  // Users
  getUser: (id) => req('GET', `/users/${id}`),
  getUserByUsername: (username) =>
    req('GET', `/users/by-username/${encodeURIComponent(username.toLowerCase().replace(/^@/, ''))}`),
  getUserHistory: (id) => req('GET', `/users/${id}/history`),

  // Dates
  createDate: (data) => req('POST', '/dates', data),
  getDate: (id) => req('GET', `/dates/${id}`),

  // Reflections
  getReflectionPrompt: (dateId) => req('GET', `/dates/${dateId}/reflection-prompt`),
  submitFeedback: (data) => req('POST', '/feedback', data),
  submitReflection: (dateId, data) => req('POST', `/dates/${dateId}/reflect`, data),

  // Reveal
  getReveal: (dateId) => req('GET', `/dates/${dateId}/reveal`),
}
