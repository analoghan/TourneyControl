import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const LoginPage = () => {
  const [selectedRole, setSelectedRole] = useState(null)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const navigate = useNavigate()

  const JUDGES_PASSWORD = 'ata'
  const STAFF_PASSWORD = 'compete2win'
  const SESSION_DURATION = 48 * 60 * 60 * 1000 // 48 hours

  const handleLogin = (e) => {
    e.preventDefault()
    
    if (!selectedRole) {
      setAuthError('Please select a role')
      return
    }

    const correctPassword = selectedRole === 'judge' ? JUDGES_PASSWORD : STAFF_PASSWORD
    
    if (password === correctPassword) {
      const sessionData = {
        timestamp: Date.now()
      }
      const sessionKey = selectedRole === 'judge' ? 'judgesSession' : 'staffSession'
      localStorage.setItem(sessionKey, JSON.stringify(sessionData))
      
      // Navigate to appropriate page
      if (selectedRole === 'judge') {
        navigate('/judges')
      } else {
        navigate('/staff')
      }
    } else {
      setAuthError('Incorrect password')
      setPassword('')
    }
  }

  return (
    <div className="container">
      <div className="landing-page">
        <h1>ATA Region 102 Tournament Control</h1>
        <p className="landing-subtitle">Select your role to continue</p>
        
        <div className="role-selection">
          <button
            className={`role-button ${selectedRole === 'judge' ? 'role-button-active' : ''}`}
            onClick={() => {
              setSelectedRole('judge')
              setAuthError('')
            }}
          >
            <div className="role-icon">⚖️</div>
            <div className="role-title">Judge Login</div>
            <div className="role-description">Access ring controls and event selection</div>
          </button>
          
          <button
            className={`role-button ${selectedRole === 'staff' ? 'role-button-active' : ''}`}
            onClick={() => {
              setSelectedRole('staff')
              setAuthError('')
            }}
          >
            <div className="role-icon">👥</div>
            <div className="role-title">Tournament Staff Login</div>
            <div className="role-description">Manage tournaments and monitor rings</div>
          </button>
        </div>

        {selectedRole && (
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              autoFocus
            />
            <button type="submit" className="auth-button">
              Login as {selectedRole === 'judge' ? 'Judge' : 'Tournament Staff'}
            </button>
          </form>
        )}
        
        {authError && <p className="auth-error">{authError}</p>}
      </div>
    </div>
  )
}

export default LoginPage
