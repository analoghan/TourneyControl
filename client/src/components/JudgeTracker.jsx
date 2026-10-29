import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import ConnectionBanner from './ConnectionBanner'
import { apiFetch, apiGetJson } from '../utils/api'

const JudgeTracker = () => {
  useAuth('staff')

  const { tournamentId } = useParams()
  const [tournament, setTournament] = useState(null)
  const [checkedInJudges, setCheckedInJudges] = useState([])
  const [allJudges, setAllJudges] = useState([])
  const [search, setSearch] = useState('')
  const [loadError, setLoadError] = useState('')

  const isConnected = useWebSocket((data) => {
    if (data.type === 'judge_check_in' || data.type === 'judge_check_out' || data.type === 'ring_assignment_update') {
      fetchCheckedInJudges()
    } else if (data.type === 'tournament_status_change' && data.data.id === parseInt(tournamentId)) {
      setTournament(data.data)
    }
  }, {
    // Refetch anything we may have missed while disconnected
    onReconnect: () => {
      fetchTournament()
      fetchCheckedInJudges()
      fetchAllJudges()
    }
  })

  useEffect(() => {
    fetchTournament()
    fetchCheckedInJudges()
    fetchAllJudges()
  }, [tournamentId])

  const load = async (url, label, setter) => {
    try {
      setter(await apiGetJson(url))
      setLoadError('')
    } catch (error) {
      console.error(`Failed to load ${label}:`, error)
      setLoadError(`Couldn't load ${label}: ${error.message}`)
    }
  }

  const fetchTournament = () => load(`/api/tournaments/${tournamentId}`, 'tournament', setTournament)
  const fetchCheckedInJudges = () => load(`/api/tournaments/${tournamentId}/judges`, 'checked-in judges', setCheckedInJudges)
  const fetchAllJudges = () => load('/api/judges', 'judge database', setAllJudges)

  const checkIn = async (judgeId) => {
    const res = await apiFetch(`/api/tournaments/${tournamentId}/judges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ judge_id: judgeId })
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      alert(error.error || 'Failed to check in judge')
    }
    fetchCheckedInJudges()
  }

  const checkOut = async (judge) => {
    const name = `${judge.first_name} ${judge.last_name}`
    const inThisTournament = judge.ring_id && judge.assigned_tournament_id === parseInt(tournamentId)
    const message = inThisTournament
      ? `Check out ${name}? They will also be removed from Ring ${judge.ring_number} (${judge.position}).`
      : `Check out ${name}?`
    if (!confirm(message)) return

    const res = await apiFetch(`/api/tournaments/${tournamentId}/judges/${judge.judge_id}`, { method: 'DELETE' })
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      alert(error.error || 'Failed to check out judge')
    }
    fetchCheckedInJudges()
  }

  const formatCheckInTime = (isoString) => {
    if (!isoString) return ''
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tournament?.timezone || 'America/New_York'
    })
  }

  const renderStatus = (judge) => {
    if (!judge.ring_id) {
      return <span className="judge-status judge-status-available">Available</span>
    }
    // A judge can be in only one ring anywhere, so note when it's in another tournament
    const otherTournament = judge.assigned_tournament_id !== parseInt(tournamentId)
    return (
      <span className="judge-status judge-status-assigned" title={judge.assigned_tournament_name}>
        Ring {judge.ring_number} – {judge.position}{otherTournament ? ` (${judge.assigned_tournament_name})` : ''}
      </span>
    )
  }

  if (!tournament) {
    return (
      <div className="container">
        {loadError && <div className="connection-banner" role="alert">{loadError}</div>}
        <div className="no-tournaments-message">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  const isEnded = tournament.status === 'ended'
  const checkedInIds = new Set(checkedInJudges.map(j => j.judge_id))
  const searchText = search.trim().toLowerCase()
  const matchingJudges = allJudges.filter(judge =>
    !searchText ||
    `${judge.first_name} ${judge.last_name} ${judge.ata_number}`.toLowerCase().includes(searchText)
  )
  const assignedCount = checkedInJudges.filter(j => j.ring_id).length

  return (
    <div className="container">
      <ConnectionBanner isConnected={isConnected} />
      {loadError && <div className="connection-banner" role="alert">{loadError}</div>}
      <div className="judge-controls">
        <div className="judge-management-header">
          <h2>Judge Tracker - {tournament.name}</h2>
          <Link to="/staff" className="back-button">
            ← Back to Dashboard
          </Link>
        </div>

        <div style={{
          background: '#dbeafe',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
            Total Checked In: {checkedInJudges.length} · Assigned to Rings: {assignedCount} · Available: {checkedInJudges.length - assignedCount}
          </p>
        </div>

        <h3>Judges Checked In to Tournament</h3>
        {checkedInJudges.length === 0 ? (
          <div className="no-tournaments-message">
            <p>No judges checked in yet. Check judges in from the Judge Database below.</p>
          </div>
        ) : (
          <div className="judges-table-container">
            <table className="judges-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Rank</th>
                  <th>Judging Level</th>
                  <th>Checked In</th>
                  <th>Ring Assignment</th>
                  {!isEnded && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {checkedInJudges.map(judge => (
                  <tr key={judge.judge_id}>
                    <td>{judge.first_name} {judge.last_name}</td>
                    <td>{judge.gender || 'N/A'}</td>
                    <td>{judge.age}</td>
                    <td>{judge.rank}</td>
                    <td>{judge.judging_level}</td>
                    <td>{formatCheckInTime(judge.check_in_time)}</td>
                    <td>{renderStatus(judge)}</td>
                    {!isEnded && (
                      <td>
                        <button className="btn-delete-judge" onClick={() => checkOut(judge)}>Check Out</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 style={{ marginTop: '2rem' }}>Judge Database</h3>
        <input
          type="search"
          placeholder="Search by name or ATA number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '0.5rem', fontSize: '1rem', width: '100%', maxWidth: '360px', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        {allJudges.length === 0 ? (
          <div className="no-tournaments-message">
            <p>No judges in the database yet. Add them on the Judge Database page.</p>
          </div>
        ) : (
          <div className="judges-table-container">
            <table className="judges-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ATA Number</th>
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Rank</th>
                  <th>Judging Level</th>
                  <th>Check In</th>
                </tr>
              </thead>
              <tbody>
                {matchingJudges.map(judge => (
                  <tr key={judge.id}>
                    <td>{judge.first_name} {judge.last_name}</td>
                    <td>{judge.ata_number}</td>
                    <td>{judge.gender || 'N/A'}</td>
                    <td>{judge.age}</td>
                    <td>{judge.rank}</td>
                    <td>{judge.judging_level}</td>
                    <td>
                      {checkedInIds.has(judge.id) ? (
                        <span className="judge-status judge-status-available">Checked In</span>
                      ) : !isEnded && (
                        <button className="btn-edit-judge" onClick={() => checkIn(judge.id)}>Check In</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default JudgeTracker
