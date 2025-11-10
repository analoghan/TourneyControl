import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const SESSION_DURATION = 48 * 60 * 60 * 1000 // 48 hours

export const useAuth = (role) => {
  const navigate = useNavigate()
  
  useEffect(() => {
    const sessionKey = role === 'judge' ? 'judgesSession' : 'staffSession'
    const sessionData = localStorage.getItem(sessionKey)
    
    if (!sessionData) {
      // No session found, redirect to login
      navigate('/')
      return
    }
    
    try {
      const { token, role: sessionRole, timestamp } = JSON.parse(sessionData)
      const now = Date.now()
      
      // Validate session has required fields
      if (!token || !sessionRole || !timestamp) {
        localStorage.removeItem(sessionKey)
        navigate('/')
        return
      }
      
      // Validate role matches
      if (sessionRole !== role) {
        localStorage.removeItem(sessionKey)
        navigate('/')
        return
      }
      
      // Check if session expired
      if (now - timestamp > SESSION_DURATION) {
        localStorage.removeItem(sessionKey)
        navigate('/')
      }
    } catch (e) {
      // Invalid session data, clear and redirect
      localStorage.removeItem(sessionKey)
      navigate('/')
    }
  }, [role, navigate])
}
