import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAuth } from '../hooks/useAuth'

const COLOR_BELT_RANKS = [
  'White',
  'Orange',
  'Yellow',
  'Camo',
  'Green',
  'Purple',
  'Blue',
  'Brown',
  'Red',
  'Red/Black'
]

const BLACK_BELT_RANKS = [
  '1st Degree',
  '2nd-3rd Degree',
  '4th-5th Degree',
  'Masters'
]

// Helper function to sort age brackets numerically
const sortAgeBrackets = (brackets) => {
  const order = {
    'Tigers': 0,
    '8 and Under': 1,
    '9-10': 2,
    '11-12': 3,
    '13-14': 4,
    '15-17': 5,
    '18-29': 6,
    '30-39': 7,
    '40-49': 8,
    '50-59': 9,
    '60-69': 10,
    '70-99': 11
  }
  return brackets.sort((a, b) => (order[a] || 999) - (order[b] || 999))
}

// Helper function to sort color belt ranks
const sortColorBelts = (belts) => {
  const order = {
    'White': 0,
    'Orange': 1,
    'Yellow': 2,
    'Camo': 3,
    'Green': 4,
    'Purple': 5,
    'Blue': 6,
    'Brown': 7,
    'Red': 8,
    'Red/Black': 9
  }
  return [...belts].sort((a, b) => {
    const aOrder = order[a] !== undefined ? order[a] : 999
    const bOrder = order[b] !== undefined ? order[b] : 999
    return aOrder - bOrder
  })
}

// Helper function to sort black belt ranks
const sortBlackBelts = (belts) => {
  const order = {
    '1st Degree': 0,
    '2nd-3rd Degree': 1,
    '4th-5th Degree': 2,
    'Masters': 3
  }
  return [...belts].sort((a, b) => {
    const aOrder = order[a] !== undefined ? order[a] : 999
    const bOrder = order[b] !== undefined ? order[b] : 999
    return aOrder - bOrder
  })
}

const StaffInterface = () => {
  useAuth('staff') // Check authentication
  
  const navigate = useNavigate()
  const location = useLocation()
  const [rings, setRings] = useState([])
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [name, setName] = useState('')
  const [numRings, setNumRings] = useState(24)
  const [timezone, setTimezone] = useState('America/New_York')
  const [setupExpanded, setSetupExpanded] = useState(false)
  const [editingRingCount, setEditingRingCount] = useState(null)
  const [newRingCount, setNewRingCount] = useState(0)
  const [editingTimezone, setEditingTimezone] = useState(null)
  const [newTimezone, setNewTimezone] = useState('')
  const [editingName, setEditingName] = useState(null)
  const [newName, setNewName] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())


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
    } else if (data.type === 'tournament_timezone_updated') {
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
      // Save selected tournament to sessionStorage when it changes (shared key for both roles)
      sessionStorage.setItem('selectedTournamentId', selectedTournament.toString())
    }
  }, [selectedTournament])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchTournaments = async () => {
    const res = await fetch('/api/tournaments')
    const data = await res.json()
    setTournaments(data)
    
    // If no tournament is selected, or selected tournament no longer exists, select one
    if (data.length > 0) {
      const stillExists = selectedTournament && data.some(t => t.id === selectedTournament)
      if (!stillExists) {
        // Check if there's a saved tournament from sessionStorage (shared key for both roles)
        const savedTournament = sessionStorage.getItem('selectedTournamentId')
        if (savedTournament) {
          const savedId = parseInt(savedTournament)
          const savedExists = data.some(t => t.id === savedId)
          if (savedExists) {
            setSelectedTournament(savedId)
            return
          }
        }
        // Otherwise, try to select first active tournament, or first tournament
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
      body: JSON.stringify({ name, num_rings: numRings, timezone })
    })
    if (res.ok) {
      setName('')
      setNumRings(4)
      setTimezone('America/New_York')
      fetchTournaments()
    }
  }

  const updateTournamentStatus = async (tournamentId, status) => {
    // Show confirmation dialog when ending a tournament
    if (status === 'ended') {
      const confirmed = confirm(
        'Are you sure you want to end this tournament?\n\n' +
        'This action will:\n' +
        '• Mark the tournament as ended\n' +
        '• Automatically end all rings that are currently in progress\n' +
        '• This cannot be undone (though you can restart the tournament later)'
      )
      
      if (!confirmed) {
        return
      }
    }
    
    const res = await fetch(`/api/tournaments/${tournamentId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    if (res.ok) {
      // If we just ended the currently selected tournament, switch to another active one
      if (status === 'ended' && selectedTournament === tournamentId) {
        const updatedRes = await fetch('/api/tournaments')
        const updatedTournaments = await updatedRes.json()
        
        // Try to find another active tournament
        const activeTournament = updatedTournaments.find(t => t.status === 'active' && t.id !== tournamentId)
        
        if (activeTournament) {
          setSelectedTournament(activeTournament.id)
        } else {
          // No other active tournaments, select first tournament or null
          setSelectedTournament(updatedTournaments.length > 0 ? updatedTournaments[0].id : null)
        }
      }
      
      fetchTournaments()
      
      // Refresh rings if we're still viewing this tournament
      if (selectedTournament === tournamentId) {
        fetchRings()
      }
    } else {
      const error = await res.json()
      alert(error.error || 'Failed to update tournament status')
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

  const generateTournamentReport = async (tournamentId) => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/report`)
      const data = await res.json()
      
      if (!res.ok) {
        alert(data.error || 'Failed to generate report')
        return
      }
      
      // Generate CSV content
      const tournament = tournaments.find(t => t.id === tournamentId)
      const tz = tournament?.timezone || 'America/New_York'
      
      // Helper function to format timestamps without commas
      const formatTimestamp = (dateString) => {
        if (!dateString) return 'N/A'
        const date = new Date(dateString)
        // Format: YYYY-MM-DD HH:MM:SS (no commas)
        return date.toLocaleString('en-US', { 
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(',', '')
      }
      
      let csv = 'Tournament Summary Report\n\n'
      csv += `Tournament Name:,${data.tournament.name}\n`
      csv += `Status:,${data.tournament.status}\n`
      csv += `Total Ring Numbers:,${data.tournament.total_rings}\n`
      csv += `Total Completed Rings:,${data.tournament.completed_sessions}\n`
      csv += `Created:,${formatTimestamp(data.tournament.created_at)}\n\n`
      
      // Find the maximum number of sessions any ring has
      const maxSessions = Math.max(...data.rings.map(r => r.sessions.length), 1)
      
      // Build header row
      let headerRow = 'Ring Number,Total Packets Completed'
      for (let i = 1; i <= maxSessions; i++) {
        headerRow += `,Packet ${i} Start Time,Packet ${i} End Time,Packet ${i} Run Time (minutes)`
      }
      csv += headerRow + '\n'
      
      // Build data rows - one row per ring
      data.rings.forEach(ring => {
        // Count completed sessions (those with both start and end times)
        const completedSessions = ring.sessions.filter(s => s.start_time && s.end_time).length
        
        let row = `${ring.ring_number},${completedSessions}`
        
        if (ring.sessions.length === 0) {
          // No sessions - fill with N/A for first session
          row += ',N/A,N/A,N/A'
          // Fill remaining session columns with empty values
          for (let i = 1; i < maxSessions; i++) {
            row += ',,,'
          }
        } else {
          // Add each session's data
          ring.sessions.forEach(session => {
            const startTime = formatTimestamp(session.start_time)
            const endTime = formatTimestamp(session.end_time)
            const runTime = session.run_time_minutes !== null ? session.run_time_minutes : 'N/A'
            row += `,${startTime},${endTime},${runTime}`
          })
          
          // Fill remaining columns if this ring has fewer sessions than max
          const remainingSessions = maxSessions - ring.sessions.length
          for (let i = 0; i < remainingSessions; i++) {
            row += ',,,'
          }
        }
        
        csv += row + '\n'
      })
      
      // Create download
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tournament-report-${data.tournament.name.replace(/\s+/g, '-')}-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert('Failed to generate report. Please try again.')
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

  const startEditingTimezone = (tournamentId, currentTimezone) => {
    setEditingTimezone(tournamentId)
    setNewTimezone(currentTimezone)
  }

  const cancelEditingTimezone = () => {
    setEditingTimezone(null)
    setNewTimezone('')
  }

  const updateTimezone = async (tournamentId) => {
    const res = await fetch(`/api/tournaments/${tournamentId}/timezone`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: newTimezone })
    })

    if (res.ok) {
      setEditingTimezone(null)
      setNewTimezone('')
      fetchTournaments()
    } else {
      const error = await res.json()
      alert(error.error || 'Failed to update timezone')
    }
  }

  const startEditingName = (tournamentId, currentName) => {
    setEditingName(tournamentId)
    setNewName(currentName)
  }

  const cancelEditingName = () => {
    setEditingName(null)
    setNewName('')
  }

  const updateTournamentName = async (tournamentId) => {
    if (!newName.trim()) {
      alert('Tournament name cannot be empty')
      return
    }

    const res = await fetch(`/api/tournaments/${tournamentId}/name`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() })
    })

    if (res.ok) {
      setEditingName(null)
      setNewName('')
      fetchTournaments()
    } else {
      const error = await res.json()
      alert(error.error || 'Failed to update tournament name')
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontWeight: '600', color: '#2c3e50', fontSize: '0.95rem' }}>Tournament Name:</label>
                  <input
                    type="text"
                    placeholder="Tournament Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ padding: '0.6rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontWeight: '600', color: '#2c3e50', fontSize: '0.95rem' }}>Ring Count:</label>
                  <select
                    value={numRings}
                    onChange={(e) => setNumRings(parseInt(e.target.value))}
                    required
                    style={{ padding: '0.6rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    {Array.from({ length: 70 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num} {num === 1 ? 'Ring' : 'Rings'}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontWeight: '600', color: '#2c3e50', fontSize: '0.95rem' }}>Timezone:</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    required
                    style={{ padding: '0.6rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="America/New_York">US Eastern</option>
                    <option value="America/Chicago">US Central</option>
                    <option value="America/Denver">US Mountain</option>
                    <option value="America/Los_Angeles">US Pacific</option>
                  </select>
                </div>
                <button type="submit" style={{ padding: '0.6rem', fontSize: '1rem', marginTop: '0.5rem' }}>Create Tournament</button>
              </form>
            </div>

            <div className="tournaments-section">
              <h4>Tournaments</h4>
              <div className="tournaments-list">
          {tournaments.map(t => (
            <div key={t.id} className="tournament-card">
              <div className="tournament-info">
                {editingName === t.id ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      style={{ 
                        padding: '0.4rem', 
                        fontSize: '1rem', 
                        fontWeight: '600',
                        flex: 1,
                        border: '2px solid #3b82f6',
                        borderRadius: '4px'
                      }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateTournamentName(t.id)
                        } else if (e.key === 'Escape') {
                          cancelEditingName()
                        }
                      }}
                    />
                    <button 
                      className="btn-save-small"
                      onClick={() => updateTournamentName(t.id)}
                    >
                      Save
                    </button>
                    <button 
                      className="btn-cancel-small"
                      onClick={cancelEditingName}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <strong>{t.name}</strong>
                    <button 
                      className="btn-edit-small"
                      onClick={() => startEditingName(t.id, t.name)}
                      title="Rename tournament"
                    >
                      Rename
                    </button>
                    <span className={getStatusBadgeClass(t.status)}>
                      {getStatusText(t.status)}
                    </span>
                  </div>
                )}
                {editingRingCount === t.id ? (
                  <div className="tournament-meta" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Ring Count:</span>
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
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Ring Count:</span> {t.num_rings} rings
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
                {editingTimezone === t.id ? (
                  <div className="tournament-meta" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Timezone:</span>
                    <select
                      value={newTimezone}
                      onChange={(e) => setNewTimezone(e.target.value)}
                      style={{ padding: '0.25rem', fontSize: '0.9rem' }}
                    >
                      <option value="America/New_York">US Eastern</option>
                      <option value="America/Chicago">US Central</option>
                      <option value="America/Denver">US Mountain</option>
                      <option value="America/Los_Angeles">US Pacific</option>
                    </select>
                    <button 
                      className="btn-save-small"
                      onClick={() => updateTimezone(t.id)}
                    >
                      Save
                    </button>
                    <button 
                      className="btn-cancel-small"
                      onClick={cancelEditingTimezone}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="tournament-meta" style={{ marginTop: '0.25rem' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Timezone:</span> {t.timezone === 'America/New_York' ? 'US Eastern' : 
                     t.timezone === 'America/Chicago' ? 'US Central' : 
                     t.timezone === 'America/Denver' ? 'US Mountain' : 
                     t.timezone === 'America/Los_Angeles' ? 'US Pacific' : t.timezone}
                    {t.status === 'active' && (
                      <button 
                        className="btn-edit-small"
                        onClick={() => startEditingTimezone(t.id, t.timezone || 'America/New_York')}
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
                      className="btn-report"
                      onClick={() => generateTournamentReport(t.id)}
                    >
                      Tournament Summary Report
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
            <div style={{ 
              marginLeft: 'auto', 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap'
            }}>
              <span style={{ fontWeight: '600', color: '#2c3e50', fontSize: '1rem' }}>Current Time:</span>
              <span style={{ fontWeight: '600', color: '#2c3e50', fontSize: '1rem' }}>
                {(() => {
                  const tournament = tournaments.find(t => t.id === selectedTournament)
                  const tz = tournament?.timezone || 'America/New_York'
                  const timeStr = currentTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: tz
                  })
                  const dateStr = currentTime.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: tz
                  })
                  return `${timeStr}, ${dateStr}`
                })()}
              </span>
            </div>
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
              
              // Get tournament timezone
              const tournament = tournaments.find(t => t.id === selectedTournament)
              const tz = tournament?.timezone || 'America/New_York'
              
              // Format time in tournament timezone
              const formatTime = (dateString) => {
                if (!dateString) return ''
                return new Date(dateString).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  timeZone: tz
                })
              }
              
              return (
                <div 
                  key={ring.id} 
                  className={`ring-card ${isOpen ? 'ring-card-open' : ''} ${isTeamSparring && !isOpen ? 'ring-card-team' : ''} ${isRttlNeeded ? 'ring-card-rttl-needed' : isJudgesNeeded ? 'ring-card-judges-needed' : ''} ${isStackedRing && !isOpen ? 'ring-card-stacked' : ''}`}
                  onClick={() => navigate(`/staff/ring/${ring.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <h3>Ring {ring.ring_number}</h3>
                  <div className="ring-badges">
                    {!isOpen && !isTeamSparring && (() => {
                      try {
                        const ageBrackets = ring.age_brackets ? JSON.parse(ring.age_brackets) : []
                        return !ageBrackets.includes('Tigers')
                      } catch (e) {
                        return true
                      }
                    })() && (
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
                            {ring.competitor_count && (
                              <div className="competitor-count-display" style={{ 
                                background: '#e0e7ff', 
                                color: '#1e40af', 
                                padding: '0.5rem', 
                                borderRadius: '4px', 
                                border: '2px solid #1e40af',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                marginBottom: '0.5rem'
                              }}>
                                Competitors: {ring.competitor_count}
                              </div>
                            )}
                            <div className={`category-info ${getGenderColorClass(ring.gender || 'Male')}`}>
                              <span className="category-item">{ring.gender || 'Male'}</span>
                              <span className="category-divider">|</span>
                              <span className="category-item">{(() => {
                                try {
                                  const ageBrackets = ring.age_brackets ? JSON.parse(ring.age_brackets) : [ring.age_bracket || '8 and Under']
                                  return sortAgeBrackets([...ageBrackets]).join(', ')
                                } catch (e) {
                                  return ring.age_bracket || '8 and Under'
                                }
                              })()}</span>
                            </div>
                            <div className={`rank-info ${getRankColorClass(ring.rank || 'Color Belts')}`}>
                              {ring.rank || 'Color Belts'}
                            </div>
                            {isColorBelts && colorBelts.length > 0 && (
                              <div className="color-belts-display">
                                {colorBelts.length === COLOR_BELT_RANKS.length ? 'All Ranks' : sortColorBelts(colorBelts).join(', ')}
                              </div>
                            )}
                            {isBlackBelts && blackBelts.length > 0 && (
                              <div className="black-belts-display">
                                {blackBelts.length === BLACK_BELT_RANKS.length ? 'All Ranks' : sortBlackBelts(blackBelts).join(', ')}
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
                        RING IN PROGRESS<br />STARTED AT: {formatTime(ring.start_time)}
                      </div>
                    ) : ring.end_time && ring.start_time ? (
                      <>
                        <div className="ring-status-badge ring-status-ended">
                          STUCK - BOTH TIMES SET:<br />{formatTime(ring.end_time)}
                        </div>
                        <div 
                          className="ring-status-badge ring-status-reset"
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (confirm(`Clear timing data for Ring ${ring.ring_number}? This will reset it to "Ready to Start" status.`)) {
                              try {
                                await fetch(`/api/rings/${ring.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ start_time: null, end_time: null })
                                })
                                fetchRings()
                              } catch (error) {
                                alert('Failed to reset ring timing')
                              }
                            }
                          }}
                          style={{ cursor: 'pointer', marginTop: '0.5rem' }}
                        >
                          CLICK TO CLEAR TIMING
                        </div>
                      </>
                    ) : ring.end_time ? (
                      <div className="ring-status-badge ring-status-ended">
                        PREVIOUS RING ENDED:<br />{formatTime(ring.end_time)}
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
