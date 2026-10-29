import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAuth } from '../hooks/useAuth'
import TournamentChat from './TournamentChat'
import TournamentClock from './TournamentClock'
import ConnectionBanner from './ConnectionBanner'
import { EVENTS, BLACK_BELT_RANKS } from '../constants/categories'
import { getEventColorClass, getStatusBadgeClass, getStatusText, getRankColorClass, getGenderColorClass } from '../utils/styleHelpers'
import { apiFetch, apiGetJson } from '../utils/api'
import { COLOR_BELT_RANKS, sortAgeBrackets, sortColorBelts, sortBlackBelts } from '../utils/sortingHelpers'

// How stacked rings appear on the dashboard; stored per tournament
const STACKED_RING_DISPLAY_OPTIONS = (
  <>
    <option value="multiple">Multiple Ring Cards for Stacked Rings</option>
    <option value="single">Single Ring Card for Stacked Rings</option>
  </>
)

// Sort rank for "Current Event" ordering: events in EVENTS order, then unknown events, then open rings
const getEventSortRank = (ring) => {
  if (ring.is_open === 1) return EVENTS.length + 1
  const index = EVENTS.indexOf(ring.current_event)
  return index === -1 ? EVENTS.length : index
}

const StaffInterface = () => {
  useAuth('staff') // Check authentication
  
  const navigate = useNavigate()
  const location = useLocation()
  const [rings, setRings] = useState([])
  const [stackedRingsMap, setStackedRingsMap] = useState({}) // Map of ringId -> stacked rings array
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [ringSortOrder, setRingSortOrder] = useState('ring') // 'ring' or 'event'
  const [name, setName] = useState('')
  const [numRings, setNumRings] = useState(24)
  const [timezone, setTimezone] = useState('America/New_York')
  const [newStackedRingDisplay, setNewStackedRingDisplay] = useState('multiple')
  const [setupExpanded, setSetupExpanded] = useState(false)
  const [editingRingCount, setEditingRingCount] = useState(null)
  const [newRingCount, setNewRingCount] = useState(0)
  const [editingTimezone, setEditingTimezone] = useState(null)
  const [newTimezone, setNewTimezone] = useState('')
  const [editingName, setEditingName] = useState(null)
  const [newName, setNewName] = useState('')
  const [loadError, setLoadError] = useState('')

  const isConnected = useWebSocket((data) => {
    if (data.type === 'ring_update') {
      setRings(prev => prev.map(r => r.id === data.data.id ? data.data : r))
    } else if (data.type === 'stacked_rings_changed') {
      // A stack was added or removed (possibly by a judge); replace that ring's stacks
      const { ring_id, stacked_rings } = data.data
      setStackedRingsMap(prev => {
        const { [ring_id]: _, ...rest } = prev
        return stacked_rings.length > 0 ? { ...rest, [ring_id]: stacked_rings } : rest
      })
    } else if (data.type === 'stacked_ring_update') {
      // Update the stacked ring in the stackedRingsMap
      setStackedRingsMap(prev => {
        const ringId = data.data.ring_id
        const currentStacked = prev[ringId] || []
        const updatedStacked = currentStacked.map(sr => 
          sr.id === data.data.id ? data.data : sr
        )
        return { ...prev, [ringId]: updatedStacked }
      })
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
    } else if (data.type === 'tournament_timezone_updated' || data.type === 'tournament_settings_updated') {
      setTournaments(prev => prev.map(t =>
        t.id === data.data.id ? data.data : t
      ))
    }
  }, {
    // Refetch everything we may have missed while disconnected
    onReconnect: () => {
      fetchTournaments()
      fetchRings()
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

  const fetchTournaments = async () => {
    let data
    try {
      data = await apiGetJson('/api/tournaments')
      setLoadError('')
    } catch (error) {
      console.error('Failed to load tournaments:', error)
      setLoadError(`Couldn't load tournaments: ${error.message}`)
      return
    }
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
      setStackedRingsMap({})
      return
    }
    let data
    try {
      data = await apiGetJson(`/api/tournaments/${selectedTournament}/rings`)
      setLoadError('')
    } catch (error) {
      console.error('Failed to load rings:', error)
      setLoadError(`Couldn't load rings: ${error.message}`)
      return
    }
    setRings(data)
    setStackedRingsMap(Object.fromEntries(
      data.filter(ring => ring.stacked_rings?.length > 0).map(ring => [ring.id, ring.stacked_rings])
    ))
  }

  const createTournament = async (e) => {
    e.preventDefault()
    const res = await apiFetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, num_rings: numRings, timezone, stacked_ring_display: newStackedRingDisplay })
    })
    if (res.ok) {
      setName('')
      setNumRings(4)
      setTimezone('America/New_York')
      setNewStackedRingDisplay('multiple')
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
    
    const res = await apiFetch(`/api/tournaments/${tournamentId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    if (res.ok) {
      // If we just ended the currently selected tournament, switch to another active one
      if (status === 'ended' && selectedTournament === tournamentId) {
        const updatedRes = await apiFetch('/api/tournaments')
        const updatedTournaments = updatedRes.ok ? await updatedRes.json() : []
        
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
    
    const res = await apiFetch(`/api/tournaments/${tournamentId}`, {
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
      const res = await apiFetch(`/api/tournaments/${tournamentId}/report`)
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
      
      // Quote a CSV cell if it contains a comma, quote or newline
      const csvCell = (value) => {
        if (value === null || value === undefined) return ''
        const text = String(value)
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
      }

      let csv = 'Tournament Summary Report\n\n'
      csv += `Tournament Name:,${csvCell(data.tournament.name)}\n`
      csv += `Status:,${data.tournament.status}\n`
      csv += `Total Ring Numbers:,${data.tournament.total_rings}\n`
      csv += `Total Completed Rings:,${data.tournament.completed_sessions}\n`
      // SQLite's CURRENT_TIMESTAMP is UTC with no zone ("YYYY-MM-DD HH:MM:SS"); mark it as UTC before formatting
      const createdAtUtc = data.tournament.created_at && `${data.tournament.created_at.replace(' ', 'T')}Z`
      csv += `Created:,${formatTimestamp(createdAtUtc)}\n\n`
      
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

      // Packet details: one row per packet with the division that ran
      const allSessions = data.rings.flatMap(ring =>
        ring.sessions.map(session => ({ ...session, ring_number: ring.ring_number }))
      )
      const minutesPerCompetitor = (session) =>
        session.run_time_minutes !== null && session.competitor_count > 0
          ? (session.run_time_minutes / session.competitor_count).toFixed(1)
          : ''

      csv += '\nPacket Details\n'
      csv += 'Ring Number,Packet,Event,Division,Gender,Ages,Rank,Belts,Special Abilities,Competitors,Start Time,End Time,Run Time (minutes),Minutes per Competitor\n'
      allSessions.forEach(session => {
        const isTeam = session.event?.startsWith('Team Sparring')
        csv += [
          session.ring_number,
          session.session_number,
          session.event,
          // Team sparring uses team divisions (Bantam, Rookie, ...); other events use Champion/Recreational
          isTeam ? session.division : session.division_type,
          isTeam ? '' : session.gender,
          isTeam ? '' : session.age_brackets.join(', '),
          isTeam ? '' : session.rank,
          isTeam ? '' : session.belts.join(', '),
          session.special_abilities,
          session.competitor_count,
          formatTimestamp(session.start_time),
          formatTimestamp(session.end_time),
          session.run_time_minutes ?? 'N/A',
          minutesPerCompetitor(session)
        ].map(csvCell).join(',') + '\n'
      })

      // Averages by event, from completed packets with division details
      const byEvent = {}
      allSessions
        .filter(s => s.event && s.run_time_minutes !== null)
        .forEach(s => {
          const stats = byEvent[s.event] ||= { packets: 0, minutes: 0, competitors: 0 }
          stats.packets += 1
          stats.minutes += s.run_time_minutes
          stats.competitors += s.competitor_count || 0
        })

      csv += '\nAverages by Event\n'
      csv += 'Event,Packets,Competitors,Average Run Time (minutes),Average Minutes per Competitor\n'
      const eventNames = Object.keys(byEvent).sort((a, b) =>
        getEventSortRank({ current_event: a }) - getEventSortRank({ current_event: b })
      )
      eventNames.forEach(event => {
        const { packets, minutes, competitors } = byEvent[event]
        csv += [
          event,
          packets,
          competitors,
          (minutes / packets).toFixed(1),
          competitors > 0 ? (minutes / competitors).toFixed(1) : ''
        ].map(csvCell).join(',') + '\n'
      })
      if (eventNames.length === 0) {
        csv += 'No completed packets with division details yet\n'
      }

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

    const res = await apiFetch(`/api/tournaments/${tournamentId}/rings`, {
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
    const res = await apiFetch(`/api/tournaments/${tournamentId}/timezone`, {
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

  const updateStackedRingDisplay = async (tournamentId, value) => {
    const res = await apiFetch(`/api/tournaments/${tournamentId}/stacked-ring-display`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stacked_ring_display: value })
    })

    if (res.ok) {
      fetchTournaments()
    } else {
      const error = await res.json()
      alert(error.error || 'Failed to update stacked ring display')
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

    const res = await apiFetch(`/api/tournaments/${tournamentId}/name`, {
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

  const currentTournament = tournaments.find(t => t.id === selectedTournament)
  const tz = currentTournament?.timezone || 'America/New_York'
  const stackedRingDisplay = currentTournament?.stacked_ring_display || 'multiple'

  return (
    <div className="container">
      <ConnectionBanner isConnected={isConnected} />
      {loadError && <div className="connection-banner" role="alert">{loadError}</div>}
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontWeight: '600', color: '#2c3e50', fontSize: '0.95rem' }}>Stacked Rings:</label>
                  <select
                    value={newStackedRingDisplay}
                    onChange={(e) => setNewStackedRingDisplay(e.target.value)}
                    style={{ padding: '0.6rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    {STACKED_RING_DISPLAY_OPTIONS}
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
                <div className="tournament-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Stacked Rings:</span>
                  {/* Kept together so the pair wraps below the label as one unit on narrow screens */}
                  <span style={{ display: 'inline-flex', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                    {[['multiple', 'Multiple Cards'], ['single', 'Single Card']].map(([value, label]) => {
                      const isSelected = (t.stacked_ring_display || 'multiple') === value
                      return (
                        <button
                          key={value}
                          className={`status-toggle-btn ${isSelected ? 'status-toggle-active' : ''}`}
                          onClick={() => !isSelected && updateStackedRingDisplay(t.id, value)}
                          aria-pressed={isSelected}
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', borderRadius: '4px' }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </span>
                </div>
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
                <TournamentClock timezone={tz} />
              </span>
            </div>
          </div>

          {selectedTournament && (
            <TournamentChat 
              tournamentId={selectedTournament}
              tournamentName={tournaments.find(t => t.id === selectedTournament)?.name || 'Tournament'}
              tournamentTimezone={tournaments.find(t => t.id === selectedTournament)?.timezone || 'America/New_York'}
            />
          )}

          {selectedTournament && (
            <div className="tournament-select" style={{ marginTop: '1.5rem' }}>
              <label>Judge Tracker:</label>
              <Link 
                to={`/staff/judge-tracker/${selectedTournament}`}
                className="nav-button"
              >
                View Judge Tracker
              </Link>
            </div>
          )}

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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <label style={{ fontWeight: '600', color: '#2c3e50' }}>Sort by:</label>
            <button
              className={`status-toggle-btn ${ringSortOrder === 'ring' ? 'status-toggle-active' : ''}`}
              onClick={() => setRingSortOrder('ring')}
              style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
            >
              Ring Order
            </button>
            <button
              className={`status-toggle-btn ${ringSortOrder === 'event' ? 'status-toggle-active' : ''}`}
              onClick={() => setRingSortOrder('event')}
              style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
            >
              Current Event
            </button>
          </div>

          <div className="rings-grid">
            {[...rings].sort((a, b) => {
              if (ringSortOrder === 'event') {
                const rankDiff = getEventSortRank(a) - getEventSortRank(b)
                if (rankDiff !== 0) return rankDiff
              }
              return a.ring_number - b.ring_number
            }).flatMap(ring => {
              const stackedRings = stackedRingsMap[ring.id] || []
              if (stackedRings.length === 0) {
                return [{ card: ring, stacks: [ring] }]
              }

              // The main ring is Stack 1. Stacked rings only hold division details, so timing, flags and
              // the id (used for navigation and clearing timing) always come from the main ring.
              const stacks = [ring, ...stackedRings.map(stackedRing => ({ ...ring, ...stackedRing, id: ring.id }))]
              if (stackedRingDisplay === 'single') {
                return [{ card: ring, stacks }]
              }
              return stacks.map((stack, index) => ({ card: stack, stacks: [stack], stackIndex: index + 1 }))
            }).map(({ card: ring, stacks, stackIndex }) => {
              const isOpen = ring.is_open === 1
              const isTeamSparring = ring.current_event?.startsWith('Team Sparring')
              const isJudgesNeeded = ring.judges_needed === 1
              const isRttlNeeded = ring.rttl_needed === 1
              const isStackedRing = ring.stacked_ring === 1
              const hasMultipleStacks = stacks.length > 1

              // Format time in tournament timezone
              const formatTime = (dateString) => {
                if (!dateString) return ''
                return new Date(dateString).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  timeZone: tz
                })
              }

              const renderDivisionTypeBadge = (stack) => {
                if (isOpen || stack.current_event?.startsWith('Team Sparring')) return null
                try {
                  const ageBrackets = stack.age_brackets ? JSON.parse(stack.age_brackets) : []
                  if (ageBrackets.includes('Tigers')) return null
                } catch (e) {
                  // Unreadable age brackets; show the badge
                }
                return (
                  <div className={`division-type-badge ${(stack.division_type || 'Champion') === 'Recreational' ? 'division-type-recreational' : ''}`}>{stack.division_type || 'Champion'}</div>
                )
              }

              const renderSpecialAbilitiesBadges = (stack) => !isOpen && (
                <>
                  {stack.special_abilities_physical === 1 && (
                    <div className="special-abilities-badge special-abilities-physical">SA - Physical</div>
                  )}
                  {stack.special_abilities_cognitive === 1 && (
                    <div className="special-abilities-badge special-abilities-cognitive">SA - Cognitive</div>
                  )}
                  {stack.special_abilities_autistic === 1 && (
                    <div className="special-abilities-badge special-abilities-autistic">SA - Autistic</div>
                  )}
                </>
              )

              const renderDivisionInfo = (stack) => {
                const isStackTeamSparring = stack.current_event?.startsWith('Team Sparring')
                const isColorBelts = stack.rank === 'Color Belts'
                const isBlackBelts = stack.rank === 'Black Belts'
                const colorBelts = isColorBelts && stack.color_belts ? JSON.parse(stack.color_belts) : []
                const blackBelts = isBlackBelts && stack.black_belts ? JSON.parse(stack.black_belts) : []

                return (
                  <div className="ring-info">
                    {!isOpen && (
                      <>
                        {isStackTeamSparring && (
                          <div className={`event-display ${getEventColorClass(stack.current_event)}`}>
                            {stack.current_event}
                          </div>
                        )}
                        {isStackTeamSparring ? (
                          <div className="division-info">{stack.division || 'Bantam'}</div>
                        ) : (
                          <>
                            {stack.competitor_count && (
                              <div className="competitor-count-display">
                                Competitors: {stack.competitor_count}
                              </div>
                            )}
                            <div className={`category-info ${getGenderColorClass(stack.gender || 'Male')}`}>
                              <span className="category-item">{stack.gender || 'Male'}</span>
                              <span className="category-divider">|</span>
                              <span className="category-item">{(() => {
                                try {
                                  const ageBrackets = stack.age_brackets ? JSON.parse(stack.age_brackets) : [stack.age_bracket || '8 and Under']
                                  return sortAgeBrackets([...ageBrackets]).join(', ')
                                } catch (e) {
                                  return stack.age_bracket || '8 and Under'
                                }
                              })()}</span>
                            </div>
                            <div className={`rank-info ${getRankColorClass(stack.rank || 'Color Belts')}`}>
                              {stack.rank || 'Color Belts'}
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
                        {!isStackTeamSparring && (
                          <div className={`event-display ${getEventColorClass(stack.current_event)}`}>
                            {stack.current_event}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              }

              return (
                <div 
                  key={stackIndex ? `ring-${ring.id}-stack-${stackIndex}` : `ring-${ring.id}`}
                  className={`ring-card ${isOpen ? 'ring-card-open' : ''} ${isTeamSparring && !isOpen ? 'ring-card-team' : ''} ${isRttlNeeded ? 'ring-card-rttl-needed' : isJudgesNeeded ? 'ring-card-judges-needed' : ''} ${(isStackedRing || stackIndex) && !isOpen ? 'ring-card-stacked' : ''}`}
                  onClick={() => navigate(`/staff/ring/${ring.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <h3>
                    {stackIndex
                      ? `Ring ${ring.ring_number} - Stack ${stackIndex}`
                      : `Ring ${ring.ring_number}`
                    }
                  </h3>
                  <div className="ring-badges">
                    {!hasMultipleStacks && renderDivisionTypeBadge(ring)}
                    {isOpen && (
                      <div className="open-badge">Open</div>
                    )}
                    {stackIndex && (
                      <div className="stacked-ring-badge">Stacked Ring</div>
                    )}
                    {hasMultipleStacks && (
                      <div className="stacked-ring-badge">{stacks.length} Stacked Rings</div>
                    )}
                    {isRttlNeeded && (
                      <div className="rttl-needed-badge">RTTL Needed</div>
                    )}
                    {isJudgesNeeded && (
                      <div className="judges-needed-badge">Judges Needed</div>
                    )}
                    {!hasMultipleStacks && renderSpecialAbilitiesBadges(ring)}
                  </div>
                  {hasMultipleStacks ? (
                    stacks.map((stack, index) => (
                      <div key={index} className="ring-stack-section">
                        <div className="ring-stack-label">Stack {index + 1}</div>
                        <div className="ring-badges">
                          {renderDivisionTypeBadge(stack)}
                          {renderSpecialAbilitiesBadges(stack)}
                        </div>
                        {renderDivisionInfo(stack)}
                      </div>
                    ))
                  ) : (
                    renderDivisionInfo(ring)
                  )}
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
                                await apiFetch(`/api/rings/${ring.id}`, {
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
