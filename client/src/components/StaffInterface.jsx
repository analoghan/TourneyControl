import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAuth } from '../hooks/useAuth'

const StaffInterface = () => {
  useAuth('staff') // Check authentication
  
  const navigate = useNavigate()
  const [rings, setRings] = useState([])
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [name, setName] = useState('')
  const [numRings, setNumRings] = useState(24)
  const [setupExpanded, setSetupExpanded] = useState(false)
  const [editingRingCount, setEditingRingCount] = useState(null)
  const [newRingCount, setNewRingCount] = useState(0)


  useWebSocket((data) => {
    if (data.type === 'ring_update') {
      setRings(prev => prev.map(r => r.id === data.data.id ? data.data : r))
    } else if (data.type === 'tournament_status_change') {
      setTournaments(prev => prev.map(t => 
        t.id === data.data.id ? data.data : t
      ))
    } else if (data.type === 'tournament_rings_updated') {
      setTournaments(prev => prev.map(t => 
        t.id === data.data.id ? data.data : t
      ))
      // Refresh rings if this is the selected tournament
      if (selectedTournament === data.data.id) {
        fetchRings()
      }
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
    const res = await fetch('/api/tournaments')
    const data = await res.json()
    setTournaments(data)
    
    // If no tournament is selected, or selected tournament no longer exists, select first active one
    if (data.length > 0) {
      const stillExists = selectedTournament && data.some(t => t.id === selectedTournament)
      if (!stillExists) {
        // Try to select first active tournament, otherwise first tournament
        const activeTournament = data.find(t => t.status === 'active')
        setSelectedTournament(activeTournament ? activeTournament.id : data[0].id)
      }
    } else {
      setSelectedTournament(null)
      setRings([])
    }
  }

  const fetchRings = async () => {
    if (!selectedTournament) {
      setRings([])
      return
    }
    const res = await fetch(`/api/tournaments/${selectedTournament}/rings`)
    const data = await res.json()
    setRings(data)
  }

  const createTournament = async (e) => {
    e.preventDefault()
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, num_rings: numRings })
    })
    if (res.ok) {
      setName('')
      setNumRings(4)
      fetchTournaments()
    }
  }

  const updateTournamentStatus = async (tournamentId, status) => {
    const res = await fetch(`/api/tournaments/${tournamentId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    if (res.ok) {
      fetchTournaments()
    }
  }

  const deleteTournament = async (tournamentId) => {
    if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      return
    }
    
    const res = await fetch(`/api/tournaments/${tournamentId}`, {
      method: 'DELETE'
    })
    
    if (res.ok) {
      // fetchTournaments will handle selecting a new tournament if needed
      fetchTournaments()
    } else {
      const error = await res.json()
      alert(error.error || 'Failed to delete tournament')
    }
  }

  const startEditingRingCount = (tournamentId, currentRings) => {
    setEditingRingCount(tournamentId)
    setNewRingCount(currentRings)
  }

  const cancelEditingRingCount = () => {
    setEditingRingCount(null)
    setNewRingCount(0)
  }

  const updateRingCount = async (tournamentId) => {
    if (newRingCount < 1 || newRingCount > 70) {
      alert('Ring count must be between 1 and 70')
      return
    }

    const res = await fetch(`/api/tournaments/${tournamentId}/rings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ num_rings: newRingCount })
    })

    if (res.ok) {
      setEditingRingCount(null)
      setNewRingCount(0)
      fetchTournaments()
      if (selectedTournament === tournamentId) {
        fetchRings()
      }
    } else {
      const error = await res.json()
      alert(error.error || 'Failed to update ring count')
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'not_started': return 'status-badge status-not-started'
      case 'active': return 'status-badge status-active'
      case 'ended': return 'status-badge status-ended'
      default: return 'status-badge'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'not_started': return 'Not Started'
      case 'active': return 'Active'
      case 'ended': return 'Ended'
      default: return status
    }
  }

  const getEventColorClass = (event) => {
    switch (event) {
      case 'Open': return 'event-open'
      case 'Judges Needed!': return 'event-judges-needed'
      case 'Forms': return 'event-forms'
      case 'Weapons': return 'event-weapons'
      case 'Combat Sparring': return 'event-combat-sparring'
      case 'Traditional Sparring': return 'event-traditional-sparring'
      case 'Creative Forms': return 'event-creative-forms'
      case 'Creative Weapons': return 'event-creative-weapons'
      case 'XMA Forms': return 'event-xma-forms'
      case 'XMA Weapons': return 'event-xma-weapons'
      case 'Team Sparring - Combat': return 'event-team-combat'
      case 'Team Sparring - Traditional': return 'event-team-traditional'
      default: return ''
    }
  }

  const getRankColorClass = (rank) => {
    if (rank === 'Color Belts') {
      return 'rank-color-belts'
    }
    return 'rank-black-belts'
  }

  const getGenderColorClass = (gender) => {
    if (gender === 'Male') {
      return 'category-male'
    }
    return 'category-female'
  }

  return (
    <div className="container">
      <div className="tournament-setup-section">
        <div className="setup-header" onClick={() => setSetupExpanded(!setupExpanded)}>
          <div className="setup-header-content">
            <h3>Tournament Setup</h3>
            <span className="setup-hint">click to show/hide</span>
          </div>
          <span className="toggle-icon">{setupExpanded ? '▼' : '▶'}</span>
        </div>
        
        {setupExpanded && (
          <div className="setup-content">
            <div className="tournament-management">
              <h4>Create Tournament</h4>
              <form onSubmit={createTournament} className="setup-form">
                <input
                  type="text"
                  placeholder="Tournament Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <select
                  value={numRings}
                  onChange={(e) => setNumRings(parseInt(e.target.value))}
                  required
                >
                  {Array.from({ length: 70 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'Ring' : 'Rings'}</option>
                  ))}
                </select>
                <button type="submit">Create Tournament</button>
              </form>
            </div>

            <div className="tournaments-section">
              <h4>Tournaments</h4>
              <div className="tournaments-list">
          {tournaments.map(t => (
            <div key={t.id} className="tournament-card">
              <div className="tournament-info">
                <div>
                  <strong>{t.name}</strong>
                  <span className={getStatusBadgeClass(t.status)}>
                    {getStatusText(t.status)}
                  </span>
                </div>
                {editingRingCount === t.id ? (
                  <div className="tournament-meta" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      value={newRingCount}
                      onChange={(e) => setNewRingCount(parseInt(e.target.value))}
                      style={{ padding: '0.25rem', fontSize: '0.9rem' }}
                    >
                      {Array.from({ length: 70 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} {num === 1 ? 'Ring' : 'Rings'}</option>
                      ))}
                    </select>
                    <button 
                      className="btn-save-small"
                      onClick={() => updateRingCount(t.id)}
                    >
                      Save
                    </button>
                    <button 
                      className="btn-cancel-small"
                      onClick={cancelEditingRingCount}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="tournament-meta">
                    {t.num_rings} rings
                    {t.status === 'active' && (
                      <button 
                        className="btn-edit-small"
                        onClick={() => startEditingRingCount(t.id, t.num_rings)}
                        style={{ marginLeft: '0.5rem' }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="tournament-actions">
                {t.status === 'not_started' && (
                  <button 
                    className="btn-start"
                    onClick={() => updateTournamentStatus(t.id, 'active')}
                  >
                    Start
                  </button>
                )}
                {t.status === 'active' && (
                  <button 
                    className="btn-end"
                    onClick={() => updateTournamentStatus(t.id, 'ended')}
                  >
                    End
                  </button>
                )}
                {t.status === 'ended' && (
                  <>
                    <button 
                      className="btn-start"
                      onClick={() => updateTournamentStatus(t.id, 'active')}
                    >
                      Restart
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => deleteTournament(t.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
            </div>
          </div>
        )}
      </div>

      {tournaments.length > 0 && (
        <>
          <div className="tournament-select">
            <label>Active Tournament:</label>
            <select 
              value={selectedTournament || ''}
              onChange={(e) => setSelectedTournament(parseInt(e.target.value))}
            >
              {tournaments.filter(t => t.status === 'active').map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {rings.filter(r => r.rttl_needed === 1).length > 0 && (
            <div className="rttl-needed-alert">
              <h4>🚨 RTTL Needed:</h4>
              <div className="alert-list">
                {rings
                  .filter(r => r.rttl_needed === 1)
                  .map(ring => (
                    <span 
                      key={ring.id} 
                      className="alert-item alert-item-urgent alert-item-clickable"
                      onClick={() => navigate(`/staff/ring/${ring.id}`)}
                    >
                      Ring {ring.ring_number}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {rings.filter(r => r.judges_needed === 1).length > 0 && (
            <div className="judges-needed-alert">
              <h4>⚠️ Rings Needing Judges:</h4>
              <div className="alert-list">
                {rings
                  .filter(r => r.judges_needed === 1)
                  .map(ring => (
                    <span 
                      key={ring.id} 
                      className="alert-item alert-item-urgent alert-item-clickable"
                      onClick={() => navigate(`/staff/ring/${ring.id}`)}
                    >
                      Ring {ring.ring_number}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {rings.filter(r => r.is_open === 1).length > 0 && (
            <div className="open-rings-alert">
              <h4>✓ Open Rings:</h4>
              <div className="alert-list">
                {rings
                  .filter(r => r.is_open === 1)
                  .map(ring => (
                    <span 
                      key={ring.id} 
                      className="alert-item alert-item-open alert-item-clickable"
                      onClick={() => navigate(`/staff/ring/${ring.id}`)}
                    >
                      Ring {ring.ring_number}
                    </span>
                  ))}
              </div>
            </div>
          )}

          <div className="rings-grid">
            {rings.map(ring => {
              const isTeamSparring = ring.current_event?.startsWith('Team Sparring')
              const isOpen = ring.is_open === 1
              const isJudgesNeeded = ring.judges_needed === 1
              const isRttlNeeded = ring.rttl_needed === 1
              const isColorBelts = ring.rank === 'Color Belts'
              const isBlackBelts = ring.rank === 'Black Belts'
              const isStackedRing = ring.stacked_ring === 1
              const hasSpecialAbilitiesPhysical = ring.special_abilities_physical === 1
              const hasSpecialAbilitiesCognitive = ring.special_abilities_cognitive === 1
              const hasSpecialAbilitiesAutistic = ring.special_abilities_autistic === 1
              const colorBelts = isColorBelts && ring.color_belts ? JSON.parse(ring.color_belts) : []
              const blackBelts = isBlackBelts && ring.black_belts ? JSON.parse(ring.black_belts) : []
              
              return (
                <div 
                  key={ring.id} 
                  className={`ring-card ${isOpen ? 'ring-card-open' : ''} ${isTeamSparring && !isOpen ? 'ring-card-team' : ''} ${isRttlNeeded ? 'ring-card-rttl-needed' : isJudgesNeeded ? 'ring-card-judges-needed' : ''} ${isStackedRing && !isOpen ? 'ring-card-stacked' : ''}`}
                  onClick={() => navigate(`/staff/ring/${ring.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <h3>Ring {ring.ring_number}</h3>
                  <div className="ring-badges">
                    {!isOpen && !isTeamSparring && (
                      <div className={`division-type-badge ${(ring.division_type || 'Champion') === 'Recreational' ? 'division-type-recreational' : ''}`}>{ring.division_type || 'Champion'}</div>
                    )}
                    {isOpen && (
                      <div className="open-badge">Open</div>
                    )}
                    {isStackedRing && !isOpen && (
                      <div className="stacked-ring-badge">Stacked Ring</div>
                    )}
                    {isRttlNeeded && (
                      <div className="rttl-needed-badge">RTTL Needed</div>
                    )}
                    {isJudgesNeeded && (
                      <div className="judges-needed-badge">Judges Needed</div>
                    )}
                    {hasSpecialAbilitiesPhysical && !isOpen && (
                      <div className="special-abilities-badge special-abilities-physical">SA - Physical</div>
                    )}
                    {hasSpecialAbilitiesCognitive && !isOpen && (
                      <div className="special-abilities-badge special-abilities-cognitive">SA - Cognitive</div>
                    )}
                    {hasSpecialAbilitiesAutistic && !isOpen && (
                      <div className="special-abilities-badge special-abilities-autistic">SA - Autistic</div>
                    )}
                  </div>
                  <div className="ring-info">
                    {!isOpen && (
                      <>
                        {isTeamSparring && (
                          <div className={`event-display ${getEventColorClass(ring.current_event)}`}>
                            {ring.current_event}
                          </div>
                        )}
                        {isTeamSparring ? (
                          <div className="division-info">{ring.division || 'Bantam'}</div>
                        ) : (
                          <>
                            <div className={`category-info ${getGenderColorClass(ring.gender || 'Male')}`}>
                              <span className="category-item">{ring.gender || 'Male'}</span>
                              <span className="category-divider">|</span>
                              <span className="category-item">{ring.age_bracket || 'Tigers'}</span>
                            </div>
                            <div className={`rank-info ${getRankColorClass(ring.rank || 'Color Belts')}`}>
                              {ring.rank || 'Color Belts'}
                            </div>
                            {isColorBelts && colorBelts.length > 0 && (
                              <div className="color-belts-display">
                                {colorBelts.join(', ')}
                              </div>
                            )}
                            {isBlackBelts && blackBelts.length > 0 && (
                              <div className="black-belts-display">
                                {blackBelts.join(', ')}
                              </div>
                            )}
                          </>
                        )}
                        {!isTeamSparring && (
                          <div className={`event-display ${getEventColorClass(ring.current_event)}`}>
                            {ring.current_event}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="ring-status-footer">
                    {ring.start_time && !ring.end_time ? (
                      <div className="ring-status-badge ring-status-in-progress">
                        RING IN PROGRESS - STARTED AT: {new Date(ring.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    ) : ring.end_time ? (
                      <div className="ring-status-badge ring-status-ended">
                        PREVIOUS RING ENDED: {new Date(ring.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    ) : (
                      <div className="ring-status-badge ring-status-ready">READY TO START</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default StaffInterface
