// Shared helpers for talking to the API with the logged-in session's token

const SESSION_DURATION = 48 * 60 * 60 * 1000 // 48 hours

const readSession = (sessionKey) => {
  try {
    const session = JSON.parse(localStorage.getItem(sessionKey))
    if (session?.token && Date.now() - session.timestamp < SESSION_DURATION) {
      return session
    }
  } catch {
    // Missing or corrupt session; treat as logged out
  }
  return null
}

// Prefer the staff session, since staff can do everything judges can
export const getAuthToken = () =>
  (readSession('staffSession') || readSession('judgesSession'))?.token || null

const clearSessionsAndReturnToLogin = () => {
  localStorage.removeItem('judgesSession')
  localStorage.removeItem('staffSession')
  if (window.location.pathname !== '/') {
    window.location.assign('/')
  }
}

// Drop-in replacement for fetch() on /api routes: adds the Authorization header and
// sends the user back to the login page if the server says the session is no longer valid
export const apiFetch = async (url, options = {}) => {
  const token = getAuthToken()
  const headers = { ...options.headers }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, { ...options, headers })
  if (response.status === 401) {
    clearSessionsAndReturnToLogin()
  }
  return response
}

// GET JSON data, throwing with the server's message on failure so callers never store an error body as data
export const apiGetJson = async (url) => {
  const response = await apiFetch(url)
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`)
  }
  return data
}

// Download a file from an /api route; a plain link can't send the login token, so fetch it and save the result
export const apiDownload = async (url, fallbackName) => {
  const response = await apiFetch(url)
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || `Download failed (${response.status})`)
  }
  const disposition = response.headers.get('Content-Disposition') || ''
  const name = disposition.match(/filename="?([^";]+)"?/)?.[1] || fallbackName
  const objectUrl = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
