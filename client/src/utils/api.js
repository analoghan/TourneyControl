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
