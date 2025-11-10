import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const LoginPage = () => {
  const [selectedRole, setSelectedRole] = useState(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const navigate = useNavigate()

  // Check if user has valid session for a role
  const hasValidSession = (role) => {
    const sessionKey = role === 'judge' ? 'judgesSession' : 'staffSession'
    const session = localStorage.getItem(sessionKey)
    if (!session) return false
    try {
      const { timestamp } = JSON.parse(session)
      const SESSION_DURATION = 48 * 60 * 60 * 1000 // 48 hours
      return (Date.now() - timestamp) < SESSION_DURATION
    } catch {
      return false
    }
  }

  const handleRoleSelect = (role) => {
    setSelectedRole(role)
    setAuthError('')
    setPassword('')
    
    // Check if user has valid cached credentials
    if (hasValidSession(role)) {
      // Navigate directly without password
      if (role === 'judge') {
        navigate('/judges')
      } else {
        navigate('/staff')
      }
    } else {
      // Show password modal
      setShowPasswordModal(true)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!selectedRole) {
      setAuthError('Please select a role')
      return
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role: selectedRole, 
          password 
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store session with token
        const sessionData = {
          token: data.token,
          role: data.role,
          timestamp: Date.now()
        };
        const sessionKey = selectedRole === 'judge' ? 'judgesSession' : 'staffSession';
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
        
        // Navigate to appropriate page
        if (selectedRole === 'judge') {
          navigate('/judges');
        } else {
          navigate('/staff');
        }
      } else {
        setAuthError('Incorrect password');
        setPassword('');
      }
    } catch (error) {
      setAuthError('Login failed. Please try again.');
      setPassword('');
    }
  }

  const handleCancel = () => {
    setShowPasswordModal(false)
    setPassword('')
    setAuthError('')
    setSelectedRole(null)
  }

  return (
    <div className="container">
      <div className="landing-page">
        <h1>ATA Region 102 Tournament Control</h1>
        <p className="landing-subtitle">Select your role to continue</p>
        
        <div className="role-selection">
          <button
            className="role-button"
            onClick={() => handleRoleSelect('judge')}
          >
            <div className="role-icon">⚖️</div>
            <div className="role-title">Judge Login</div>
            <div className="role-description">Access ring controls and event selection</div>
          </button>
          
          <button
            className="role-button"
            onClick={() => handleRoleSelect('staff')}
          >
            <div className="role-icon">👥</div>
            <div className="role-title">Tournament Staff Login</div>
            <div className="role-description">Manage tournaments and monitor rings</div>
          </button>
        </div>

        {showPasswordModal && (
          <div className="modal-overlay" onClick={handleCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>{selectedRole === 'judge' ? 'Judge' : 'Tournament Staff'} Login</h2>
              <form onSubmit={handleLogin}>
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
                  <button type="button" className="cancel-button" onClick={handleCancel}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LoginPage
