import { useState, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { EVENTS, GENDERS, AGE_BRACKETS, RANKS, DIVISIONS } from '../constants/categories'

const JudgesInterface = () => {
  const [rings, setRings] = useState([])
  const [selectedRing, setSelectedRing] = useState(null)
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [tournamentEnded, setTournamentEnded] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const JUDGES_PASSWORD = 'ata'

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === JUDGES_PASSWORD) {
      setIsAuthenticated(true)
      setAuthError('')
    } else {
      setAuthError('Incorrect password')
      setPassword('')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="container">
        <div className="auth-container">
          <h2>Judges Interface</h2>
          <p>Please enter the password to access the judges interface.</p>
          <form onSubmit={handleLogin} className="auth-form">
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              autoFocus
            />
            <button type="submit" className="auth-button">Login</button>
          </form>
          {authError && <p className="auth-error">{authError}</p>}
        </div>
      </div>
    )
  }

  useWebSocket((data) => {
    if (data.type === 'ring_update') {
      setRings(prev => prev.map(r => r.id === data.data.id ? data.data : r))
    } else if (data.type === 'tournament_ended') {
      if (data.data.tournament_id === selectedTournament) {
        setTournamentEnded(true)
        alert('This tournament has ended. Ring events can no longer be modified.')
      }
    } else if (data.type === 'tournament_status_change') {
      // Refresh tournaments list when status changes
      fetchTournaments()
    }
  })

  useEffect(() => {
    fetchTournaments()
  }, [])

  useEffect(() => {
    if (selectedTournament) {
      fetchRings()
    }
  }, [selectedTournament])

  const fetchTournaments = async () => {
    const res = await fetch('/api/tournaments/active')
    const data = await res.json()
    setTournaments(data)
    if (data.length > 0) {
      setSelectedTournament(data[0].id)
      setTournamentEnded(false)
    } else {
      setSelectedTournament(null)
      setRings([])
    }
  }

  const fetchRings = async () => {
    const res = await fetch(`/api/tournaments/${selectedTournament}/rings`)
    const data = await res.json()
    setRings(data)
  }

  const updateRingField = async (field, value) => {
    if (!selectedRing) return
    
    // Optimistically update local state
    setSelectedRing(prev => ({ ...prev, [field]: value }))
    
    try {
      const response = await fetch(`/api/rings/${selectedRing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })
      
      if (response.status === 403) {
        const errorData = await response.json()
        setErrorMessage(errorData.error || 'Tournament has ended. Ring events cannot be modified.')
        setTournamentEnded(true)
        // Revert optimistic update
        fetchRings()
      } else if (!response.ok) {
        setErrorMessage('Failed to update ring')
        // Revert optimistic update
        fetchRings()
      } else {
        setErrorMessage('')
      }
    } catch (error) {
      setErrorMessage('Failed to update ring')
      // Revert optimistic update
      fetchRings()
    }
  }

  const updateEvent = (event) => updateRingField('current_event', event)
  const updateGender = (gender) => updateRingField('gender', gender)
  const updateAgeBracket = (ageBracket) => updateRingField('age_bracket', ageBracket)
  const updateRank = (rank) => updateRingField('rank', rank)
  const updateDivision = (division) => updateRingField('division', division)
  
  const isTeamSparring = selectedRing?.current_event?.startsWith('Team Sparring')
  const isOpen = selectedRing?.current_event === 'Open' || selectedRing?.current_event === 'Judges Needed!'

  return (
    <div className="container">
      <h2>Judges Interface</h2>
      
      {tournaments.length === 0 ? (
        <div className="no-tournaments-message">
          <p>No active tournaments available. Please contact staff to start a tournament.</p>
        </div>
      ) : (
        <div className="judge-controls">
          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}
          
          <div className="ring-selector">
            <label>Select Ring:</label>
            <div className="ring-buttons">
              {rings.map(ring => (
                <button
                  key={ring.id}
                  className={`ring-btn ${selectedRing?.id === ring.id ? 'active' : ''}`}
                  onClick={() => setSelectedRing(ring)}
                >
                  Ring {ring.ring_number}
                </button>
              ))}
            </div>
          </div>

          {selectedRing && (
            <div className="event-selector">
              <h3>Ring {selectedRing.ring_number}</h3>
              <div className="current-status">
                <p className="current-event">
                  <strong>Current:</strong> {selectedRing.current_event}
                  {!isOpen && (
                    isTeamSparring ? (
                      <> | {selectedRing.division || 'Bantam'}</>
                    ) : (
                      <> | {selectedRing.gender} | {selectedRing.age_bracket} | {selectedRing.rank}</>
                    )
                  )}
                </p>
              </div>
              
              <div className="category-selector">
                <label>Select Event:</label>
                <select 
                  value={selectedRing.current_event}
                  onChange={(e) => updateEvent(e.target.value)}
                  className="category-dropdown"
                  disabled={tournamentEnded}
                >
                  {EVENTS.map(event => (
                    <option key={event} value={event}>{event}</option>
                  ))}
                </select>
              </div>

              {!isOpen && (
                isTeamSparring ? (
                  <div className="category-selector">
                    <label>Select Division:</label>
                    <select 
                      value={selectedRing.division || 'Bantam'}
                      onChange={(e) => updateDivision(e.target.value)}
                      className="category-dropdown"
                      disabled={tournamentEnded}
                    >
                      {DIVISIONS.map(division => (
                        <option key={division} value={division}>{division}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="category-selector">
                      <label>Select Gender:</label>
                      <select 
                        value={selectedRing.gender || 'Male'}
                        onChange={(e) => updateGender(e.target.value)}
                        className="category-dropdown"
                        disabled={tournamentEnded}
                      >
                        {GENDERS.map(gender => (
                          <option key={gender} value={gender}>{gender}</option>
                        ))}
                      </select>
                    </div>

                    <div className="category-selector">
                      <label>Select Age Bracket:</label>
                      <select 
                        value={selectedRing.age_bracket || 'Tigers'}
                        onChange={(e) => updateAgeBracket(e.target.value)}
                        className="category-dropdown"
                        disabled={tournamentEnded}
                      >
                        {AGE_BRACKETS.map(bracket => (
                          <option key={bracket} value={bracket}>{bracket}</option>
                        ))}
                      </select>
                    </div>

                    <div className="category-selector">
                      <label>Select Rank:</label>
                      <select 
                        value={selectedRing.rank || 'Color Belts'}
                        onChange={(e) => updateRank(e.target.value)}
                        className="category-dropdown"
                        disabled={tournamentEnded}
                      >
                        {RANKS.map(rank => (
                          <option key={rank} value={rank}>{rank}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )
              )}

              {tournamentEnded && (
                <p className="tournament-ended-notice">Tournament has ended</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default JudgesInterface
