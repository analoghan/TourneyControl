import { useState } from 'react'
import React from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import JudgesInterface from './components/JudgesInterface'
import StaffInterface from './components/StaffInterface'
import StaffRingConfig from './components/StaffRingConfig'
import LoginPage from './components/LoginPage'
import './App.css'

function NavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const isLoginPage = location.pathname === '/'
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [targetRole, setTargetRole] = useState(null)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  
  if (isLoginPage) {
    return null
  }
  
  const getTitle = () => {
    if (location.pathname === '/judges') {
      return 'ATA Region 102 Tournament Control - Judges Dashboard'
    } else if (location.pathname === '/staff') {
      return 'ATA Region 102 Tournament Control - Staff Dashboard'
    } else if (location.pathname.startsWith('/staff/ring/')) {
      return 'ATA Region 102 Tournament Control - Ring Configuration'
    }
    return 'ATA Region 102 Tournament Control'
  }
  
  const handleLogout = () => {
    // Clear both session keys
    localStorage.removeItem('judgesSession')
    localStorage.removeItem('staffSession')
  }
  
  // Check if user has valid session for a role
  const hasValidSession = (role) => {
    const sessionKey = role === 'judge' ? 'judgesSession' : 'staffSession'
    const session = localStorage.getItem(sessionKey)
    if (!session) return false
    try {
      const { timestamp } = JSON.parse(session)
      const SESSION_DURATION = 48 * 60 * 60 * 1000
      return (Date.now() - timestamp) < SESSION_DURATION
    } catch {
      return false
    }
  }
  
  const handleSwitchRole = (role, path) => {
    if (hasValidSession(role)) {
      // Has valid session, switch directly
      navigate(path)
    } else {
      // No valid session, show password modal
      setTargetRole(role)
      setShowPasswordModal(true)
      setPassword('')
      setAuthError('')
    }
  }
  
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role: targetRole, 
          password 
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Store session with token
        const sessionData = {
          token: data.token,
          role: data.role,
          timestamp: Date.now()
        }
        const sessionKey = targetRole === 'judge' ? 'judgesSession' : 'staffSession'
        localStorage.setItem(sessionKey, JSON.stringify(sessionData))
        
        // Close modal and navigate
        setShowPasswordModal(false)
        setPassword('')
        setAuthError('')
        navigate(targetRole === 'judge' ? '/judges' : '/staff')
      } else {
        setAuthError('Incorrect password')
        setPassword('')
      }
    } catch (error) {
      setAuthError('Login failed. Please try again.')
      setPassword('')
    }
  }
  
  const closeModal = () => {
    setShowPasswordModal(false)
    setPassword('')
    setAuthError('')
    setTargetRole(null)
  }
  
  return (
    <>
      <nav className="navbar">
        <h1>{getTitle()}</h1>
        <div className="nav-links">
          {location.pathname.startsWith('/staff/ring/') && (
            <Link to="/staff" className="nav-button">
              Return to Tournament Overview
            </Link>
          )}
          {location.pathname === '/judges' && (
            <button onClick={() => handleSwitchRole('staff', '/staff')} className="nav-button">
              Switch to Staff
            </button>
          )}
          {location.pathname === '/staff' && (
            <button onClick={() => handleSwitchRole('judge', '/judges')} className="nav-button">
              Switch to Judge
            </button>
          )}
          <Link to="/" onClick={handleLogout} className="nav-button">Logout</Link>
        </div>
      </nav>
      
      {showPasswordModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Enter {targetRole === 'judge' ? 'Judge' : 'Staff'} Password</h2>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                autoFocus
              />
              {authError && <p className="auth-error">{authError}</p>}
              <div className="modal-actions">
                <button type="submit" className="auth-button">
                  Login
                </button>
                <button type="button" onClick={closeModal} className="cancel-button">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function AppContent() {
  const location = useLocation()
  const isLoginPage = location.pathname === '/'
  
  // Update body class based on current page
  React.useEffect(() => {
    if (isLoginPage) {
      document.body.classList.add('login-body')
    } else {
      document.body.classList.remove('login-body')
    }
    
    return () => {
      document.body.classList.remove('login-body')
    }
  }, [isLoginPage])
  
  return (
    <div className={`app ${isLoginPage ? 'login-page-container' : ''}`}>
      <NavBar />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/judges" element={<JudgesInterface />} />
        <Route path="/staff" element={<StaffInterface />} />
        <Route path="/staff/ring/:ringId" element={<StaffRingConfig />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
