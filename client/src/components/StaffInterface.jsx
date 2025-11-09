import { useState, useEffect } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

const StaffInterface = () => {
  const [rings, setRings] = useState([])
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [name, setName] = useState('')
  const [numRings, setNumRings] = useState(4)

  useWebSocket((data) => {
    if (data.type === 'ring_update') {
      setRings(prev => prev.map(r => r.id === data.data.id ? data.data : r))
    } else if (data.type === 'tournament_status_change') {
      setTournaments(prev => prev.map(t => 
        t.id === data.data.id ? data.data : t
      ))
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
    if (data.length > 0 && !selectedTournament) {
      setSelectedTournament(data[0].id)
    }
  }

  const fetchRings = async () => {
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
      // If the deleted tournament was selected, clear selection
      if (selectedTournament === tournamentId) {
        setSelectedTournament(null)
        setRings([])
      }
      fetchTournaments()
    } else {
      const error = await res.json()
      alert(error.error || 'Failed to delete tournament')
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

  return (
    <div className="container">
      <h2>Staff Dashboard</h2>
      
      <div className="tournament-management">
        <h3>Create Tournament</h3>
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
            {Array.from({ length: 40 }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>{num} {num === 1 ? 'Ring' : 'Rings'}</option>
            ))}
          </select>
          <button type="submit">Create Tournament</button>
        </form>
      </div>

      <div className="tournaments-section">
        <h3>Tournaments</h3>
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
                <div className="tournament-meta">{t.num_rings} rings</div>
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
                  <button 
                    className="btn-delete"
                    onClick={() => deleteTournament(t.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {tournaments.length > 0 && (
        <>
          <div className="tournament-select">
            <label>Active Tournament:</label>
            <select 
              value={selectedTournament || ''}
              onChange={(e) => setSelectedTournament(parseInt(e.target.value))}
            >
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="rings-grid">
            {rings.map(ring => {
              const isTeamSparring = ring.current_event?.startsWith('Team Sparring')
              const isOpen = ring.current_event === 'Open'
              return (
                <div key={ring.id} className={`ring-card ${isOpen ? 'ring-card-open' : ''}`}>
                  <h3>Ring {ring.ring_number}</h3>
                  <div className="ring-info">
                    <div className={`event-display ${isOpen ? 'event-display-open' : ''}`}>
                      {ring.current_event}
                    </div>
                    {!isOpen && (
                      isTeamSparring ? (
                        <div className="division-info">{ring.division || 'Bantam'}</div>
                      ) : (
                        <>
                          <div className="category-info">
                            <span className="category-item">{ring.gender || 'Male'}</span>
                            <span className="category-divider">|</span>
                            <span className="category-item">{ring.age_bracket || 'Tigers'}</span>
                          </div>
                          <div className="rank-info">{ring.rank || 'Color Belts'}</div>
                        </>
                      )
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
