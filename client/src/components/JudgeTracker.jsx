import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import ConnectionBanner from './ConnectionBanner'
import { apiFetch, apiGetJson } from '../utils/api'
import { JUDGE_RANKS, JUDGING_LEVELS } from '../constants/categories'

const NO_FILTERS = { search: '', status: 'all', minRank: '', minLevel: '', minAge: '', maxAge: '' }

const filterInputStyle = { padding: '0.4rem', fontSize: '0.9rem', border: '1px solid #ddd', borderRadius: '4px' }
const filterLabelStyle = { display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600', fontSize: '0.9rem', color: '#2c3e50' }

const matchesSearch = (judge, text) =>
  !text || `${judge.first_name} ${judge.last_name} ${judge.ata_number}`.toLowerCase().includes(text)

// "And above" filters compare positions in the rank/level lists; a judge with an unlisted value doesn't match
const atLeast = (list, value, min) => !min || list.indexOf(value) >= list.indexOf(min)

const matchesFilters = (judge, filters) => {
  const isAvailable = !judge.ring_id
  return matchesSearch(judge, filters.search.trim().toLowerCase()) &&
    (filters.status === 'all' || (filters.status === 'available') === isAvailable) &&
    atLeast(JUDGE_RANKS, judge.rank, filters.minRank) &&
    atLeast(JUDGING_LEVELS, judge.judging_level, filters.minLevel) &&
    (filters.minAge === '' || judge.age >= Number(filters.minAge)) &&
    (filters.maxAge === '' || judge.age <= Number(filters.maxAge))
}

const JudgeTracker = () => {
  useAuth('staff')

  const { tournamentId } = useParams()
  const [tournament, setTournament] = useState(null)
  const [checkedInJudges, setCheckedInJudges] = useState([])
  const [allJudges, setAllJudges] = useState([])
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(NO_FILTERS)
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
  const matchingJudges = allJudges.filter(judge => matchesSearch(judge, search.trim().toLowerCase()))
  const filteredCheckedIn = checkedInJudges.filter(judge => matchesFilters(judge, filters))
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS)
  const setFilter = (field) => (e) => setFilters(prev => ({ ...prev, [field]: e.target.value }))
  const assignedCount = checkedInJudges.filter(j => j.ring_id).length

  return (
    <div className="container">
      <ConnectionBanner isConnected={isConnected} />
      {loadError && <div className="connection-banner" role="alert">{loadError}</div>}
      <div className="judge-controls">
        <div className="judge-management-header">
          <h2>Judge Tracker - {tournament.name}</h2>
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
        {checkedInJudges.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem 1.25rem', marginBottom: '1rem' }}>
            <input
              type="search"
              placeholder="Search by name or ATA number"
              value={filters.search}
              onChange={setFilter('search')}
              style={{ ...filterInputStyle, width: '100%', maxWidth: '280px' }}
            />
            <span style={{ display: 'inline-flex', gap: '0.4rem' }}>
              {[['all', 'All'], ['available', 'Available'], ['assigned', 'Assigned']].map(([value, label]) => (
                <button
                  key={value}
                  className={`status-toggle-btn ${filters.status === value ? 'status-toggle-active' : ''}`}
                  onClick={() => setFilters(prev => ({ ...prev, status: value }))}
                  aria-pressed={filters.status === value}
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem', borderRadius: '4px' }}
                >
                  {label}
                </button>
              ))}
            </span>
            <label style={filterLabelStyle}>
              Rank:
              <select value={filters.minRank} onChange={setFilter('minRank')} style={filterInputStyle}>
                <option value="">Any rank</option>
                {JUDGE_RANKS.map(rank => <option key={rank} value={rank}>{rank}+</option>)}
              </select>
            </label>
            <label style={filterLabelStyle}>
              Judging Level:
              <select value={filters.minLevel} onChange={setFilter('minLevel')} style={filterInputStyle}>
                <option value="">Any level</option>
                {JUDGING_LEVELS.filter(level => level !== 'N/A').map(level => <option key={level} value={level}>{level}+</option>)}
              </select>
            </label>
            <label style={filterLabelStyle}>
              Age:
              <input type="number" min="1" placeholder="Min" value={filters.minAge} onChange={setFilter('minAge')} style={{ ...filterInputStyle, width: '4.5rem' }} />
              to
              <input type="number" min="1" placeholder="Max" value={filters.maxAge} onChange={setFilter('maxAge')} style={{ ...filterInputStyle, width: '4.5rem' }} />
            </label>
            <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>
              Showing {filteredCheckedIn.length} of {checkedInJudges.length}
            </span>
            {hasFilters && (
              <button className="btn-cancel-small" onClick={() => setFilters(NO_FILTERS)}>Clear filters</button>
            )}
          </div>
        )}
        {checkedInJudges.length === 0 ? (
          <div className="no-tournaments-message">
            <p>No judges checked in yet. Check judges in from the Judge Database below.</p>
          </div>
        ) : filteredCheckedIn.length === 0 ? (
          <div className="no-tournaments-message">
            <p>No checked-in judges match these filters.</p>
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
                  <th>Checked In</th>
                  <th>Ring Assignment</th>
                  {!isEnded && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCheckedIn.map(judge => (
                  <tr key={judge.judge_id}>
                    <td>{judge.first_name} {judge.last_name}</td>
                    <td>{judge.ata_number}</td>
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
