import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'

const JudgeTracker = () => {
  useAuth('staff')
  
  const { tournamentId } = useParams()
  const [tournament, setTournament] = useState(null)
  const [judges, setJudges] = useState([])

  useWebSocket((data) => {
    if (data.type === 'judge_check_in' || data.type === 'judge_check_out') {
      fetchJudges()
    } else if (data.type === 'ring_assignment_update') {
      fetchJudges()
    }
  })

  useEffect(() => {
    fetchTournament()
    fetchJudges()
  }, [tournamentId])

  const fetchTournament = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`)
      if (res.ok) {
        const data = await res.json()
        setTournament(data)
      }
    } catch (error) {
      console.error('Failed to fetch tournament:', error)
    }
  }

  const fetchJudges = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/judges`)
      if (res.ok) {
        const data = await res.json()
        // Only show checked-in judges
        const checkedInJudges = data.filter(j => j.checked_in === 1)
        setJudges(checkedInJudges)
      }
    } catch (error) {
      console.error('Failed to fetch judges:', error)
    }
  }

  const getRingAssignment = (judge) => {
    if (!judge.ring_number) return 'Unassigned'
    return `Ring ${judge.ring_number} - ${judge.position}`
  }

  if (!tournament) {
    return (
      <div className="container">
        <div className="no-tournaments-message">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
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
            Total Checked In: {judges.length}
          </p>
        </div>

        {judges.length === 0 ? (
          <div className="no-tournaments-message">
            <p>No judges checked in yet</p>
          </div>
        ) : (
          <div className="judge-list">
            <table className="judge-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Rank</th>
                  <th>Ring Assignment</th>
                </tr>
              </thead>
              <tbody>
                {judges.map(judge => (
                  <tr key={judge.id}>
                    <td>{judge.first_name} {judge.last_name}</td>
                    <td>{judge.gender || 'N/A'}</td>
                    <td>{judge.age}</td>
                    <td>{judge.rank}</td>
                    <td>{getRingAssignment(judge)}</td>
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
