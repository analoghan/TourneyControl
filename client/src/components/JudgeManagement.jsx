import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

const RANK_OPTIONS = [
  '1st Degree',
  '2nd Degree',
  '3rd Degree',
  '4th Degree',
  '5th Degree',
  '6th Degree',
  '7th Degree',
  '8th Degree',
  '9th Degree'
]

const JUDGING_LEVEL_OPTIONS = ['N/A', 'Level 1', 'Level 2', 'Level 3']

const JudgeManagement = () => {
  useAuth('staff') // Check authentication for staff only
  
  const [judges, setJudges] = useState([])
  const [sortField, setSortField] = useState('last_name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingJudge, setEditingJudge] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  
  // Form fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [ataNumber, setAtaNumber] = useState('')
  const [rank, setRank] = useState('1st Degree')
  const [age, setAge] = useState('')
  const [judgingLevel, setJudgingLevel] = useState('N/A')
  const [competing, setCompeting] = useState(false)
  const [competingCreativeXMA, setCompetingCreativeXMA] = useState(false)
  const [competingTeams, setCompetingTeams] = useState(false)
  const [teamsCoach, setTeamsCoach] = useState(false)

  useEffect(() => {
    fetchJudges()
  }, [])

  const fetchJudges = async () => {
    const res = await fetch('/api/judges')
    const data = await res.json()
    setJudges(data)
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedJudges = [...judges].sort((a, b) => {
    let aVal = a[sortField]
    let bVal = b[sortField]
    
    if (sortField === 'age') {
      aVal = parseInt(aVal)
      bVal = parseInt(bVal)
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const handleAtaNumberChange = (e) => {
    // Only allow numbers and dashes
    const value = e.target.value.replace(/[^0-9-]/g, '')
    setAtaNumber(value)
  }

  const resetForm = () => {
    setFirstName('')
    setLastName('')
    setAtaNumber('')
    setRank('1st Degree')
    setAge('')
    setJudgingLevel('N/A')
    setCompeting(false)
    setCompetingCreativeXMA(false)
    setCompetingTeams(false)
    setTeamsCoach(false)
    setEditingJudge(null)
    setShowAddForm(false)
    setErrorMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    
    const judgeData = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      ata_number: ataNumber.trim(),
      rank: rank.trim(),
      age: parseInt(age),
      judging_level: judgingLevel.trim(),
      competing: competing ? 1 : 0,
      competing_creative_xma: competingCreativeXMA ? 1 : 0,
      competing_teams: competingTeams ? 1 : 0,
      teams_coach: teamsCoach ? 1 : 0
    }

    try {
      if (editingJudge) {
        const res = await fetch(`/api/judges/${editingJudge.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(judgeData)
        })
        if (res.ok) {
          fetchJudges()
          resetForm()
        } else {
          const error = await res.json()
          setErrorMessage(error.error || 'Failed to update judge')
        }
      } else {
        const res = await fetch('/api/judges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(judgeData)
        })
        if (res.ok) {
          fetchJudges()
          resetForm()
        } else {
          const error = await res.json()
          setErrorMessage(error.error || 'Failed to add judge')
        }
      }
    } catch (error) {
      setErrorMessage('An error occurred. Please try again.')
    }
  }

  const handleEdit = (judge) => {
    setEditingJudge(judge)
    setFirstName(judge.first_name)
    setLastName(judge.last_name)
    setAtaNumber(judge.ata_number || '')
    setRank(judge.rank)
    setAge(judge.age.toString())
    setJudgingLevel(judge.judging_level)
    setCompeting(judge.competing === 1)
    setCompetingCreativeXMA(judge.competing_creative_xma === 1)
    setCompetingTeams(judge.competing_teams === 1)
    setTeamsCoach(judge.teams_coach === 1)
    setShowAddForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this judge?')) {
      return
    }
    
    const res = await fetch(`/api/judges/${id}`, {
      method: 'DELETE'
    })
    
    if (res.ok) {
      fetchJudges()
    }
  }

  return (
    <div className="container">
      <div className="judge-management-header">
        <h2>Judge Management</h2>
      </div>

      <div className="judge-management-actions">
        <button 
          className="btn-add-judge"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add New Judge'}
        </button>
      </div>

      {showAddForm && (
        <div className="judge-form-container">
          <h3>{editingJudge ? 'Edit Judge' : 'Add New Judge'}</h3>
          {errorMessage && (
            <div className="error-message" style={{ marginBottom: '1rem', padding: '1rem', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px', color: '#991b1b' }}>
              {errorMessage}
            </div>
          )}
          <form onSubmit={handleSubmit} className="judge-form">
            <div className="form-row">
              <div className="form-field">
                <label>First Name:</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label>Last Name:</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label>ATA Number:</label>
                <input
                  type="text"
                  value={ataNumber}
                  onChange={handleAtaNumberChange}
                  placeholder="e.g. 1812-123456"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Rank:</label>
                <select value={rank} onChange={(e) => setRank(e.target.value)}>
                  {RANK_OPTIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Age:</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="1"
                  max="120"
                  required
                />
              </div>
              <div className="form-field">
                <label>Judging Level:</label>
                <select value={judgingLevel} onChange={(e) => setJudgingLevel(e.target.value)}>
                  {JUDGING_LEVEL_OPTIONS.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={competing}
                  onChange={(e) => setCompeting(e.target.checked)}
                />
                Competing
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={competingCreativeXMA}
                  onChange={(e) => setCompetingCreativeXMA(e.target.checked)}
                />
                Competing in Creative/XMA
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={competingTeams}
                  onChange={(e) => setCompetingTeams(e.target.checked)}
                />
                Competing in Teams
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={teamsCoach}
                  onChange={(e) => setTeamsCoach(e.target.checked)}
                />
                Teams Coach
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit">
                {editingJudge ? 'Update Judge' : 'Add Judge'}
              </button>
              <button type="button" className="btn-cancel" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="judges-table-container">
        <table className="judges-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('last_name')} style={{ cursor: 'pointer' }}>
                Last Name {sortField === 'last_name' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('first_name')} style={{ cursor: 'pointer' }}>
                First Name {sortField === 'first_name' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('ata_number')} style={{ cursor: 'pointer' }}>
                ATA Number {sortField === 'ata_number' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('rank')} style={{ cursor: 'pointer' }}>
                Rank {sortField === 'rank' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('age')} style={{ cursor: 'pointer' }}>
                Age {sortField === 'age' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th onClick={() => handleSort('judging_level')} style={{ cursor: 'pointer' }}>
                Judging Level {sortField === 'judging_level' && (sortDirection === 'asc' ? '▲' : '▼')}
              </th>
              <th>Competing</th>
              <th>Creative/XMA</th>
              <th>Teams</th>
              <th>Teams Coach</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedJudges.map(judge => (
              <tr key={judge.id}>
                <td>{judge.last_name}</td>
                <td>{judge.first_name}</td>
                <td>{judge.ata_number}</td>
                <td>{judge.rank}</td>
                <td>{judge.age}</td>
                <td>{judge.judging_level}</td>
                <td>{judge.competing ? 'Yes' : 'No'}</td>
                <td>{judge.competing_creative_xma ? 'Yes' : 'No'}</td>
                <td>{judge.competing_teams ? 'Yes' : 'No'}</td>
                <td>{judge.teams_coach ? 'Yes' : 'No'}</td>
                <td>
                  <button className="btn-edit-judge" onClick={() => handleEdit(judge)}>Edit</button>
                  <button className="btn-delete-judge" onClick={() => handleDelete(judge.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {judges.length === 0 && (
          <p className="no-judges-message">No judges in database. Click "Add New Judge" to get started.</p>
        )}
      </div>
    </div>
  )
}

export default JudgeManagement
