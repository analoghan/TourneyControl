import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAuth } from '../hooks/useAuth'
import { EVENTS, GENDERS, AGE_BRACKETS, RANKS, DIVISIONS, BLACK_BELT_RANKS } from '../constants/categories'

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

const StaffRingConfig = () => {
  useAuth('staff') // Check authentication for staff
  
  const { ringId } = useParams()
  const [ring, setRing] = useState(null)
  const [tournamentEnded, setTournamentEnded] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedColorBelts, setSelectedColorBelts] = useState([])
  const [selectedBlackBelts, setSelectedBlackBelts] = useState([])

  useWebSocket((data) => {
    if (data.type === 'ring_update' && data.data.id === parseInt(ringId)) {
      setRing(data.data)
      loadBeltSelections(data.data)
    } else if (data.type === 'tournament_ended') {
      if (ring && data.data.tournament_id === ring.tournament_id) {
        setTournamentEnded(true)
        alert('This tournament has ended. Ring events can no longer be modified.')
      }
    }
  })

  useEffect(() => {
    fetchRing()
  }, [ringId])

  const loadBeltSelections = (ringData) => {
    // Load color belts
    if (ringData.color_belts) {
      try {
        const parsedBelts = JSON.parse(ringData.color_belts)
        setSelectedColorBelts(parsedBelts)
      } catch (e) {
        setSelectedColorBelts([])
      }
    } else {
      setSelectedColorBelts([])
    }
    
    // Load black belts
    if (ringData.black_belts) {
      try {
        const parsedBelts = JSON.parse(ringData.black_belts)
        setSelectedBlackBelts(parsedBelts)
      } catch (e) {
        setSelectedBlackBelts([])
      }
    } else {
      setSelectedBlackBelts([])
    }
  }

  const fetchRing = async () => {
    try {
      const res = await fetch(`/api/rings/${ringId}`)
      if (res.ok) {
        const data = await res.json()
        setRing(data)
        loadBeltSelections(data)
      } else {
        setErrorMessage('Ring not found')
      }
    } catch (error) {
      setErrorMessage('Failed to load ring')
    }
  }

  const updateRingField = async (field, value) => {
    if (!ring) return
    
    // Optimistically update local state
    setRing(prev => ({ ...prev, [field]: value }))
    
    try {
      const response = await fetch(`/api/rings/${ring.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })
      
      if (response.status === 403) {
        const errorData = await response.json()
        setErrorMessage(errorData.error || 'Tournament has ended. Ring events cannot be modified.')
        setTournamentEnded(true)
        fetchRing()
      } else if (!response.ok) {
        setErrorMessage('Failed to update ring')
        fetchRing()
      } else {
        setErrorMessage('')
      }
    } catch (error) {
      setErrorMessage('Failed to update ring')
      fetchRing()
    }
  }

  const updateEvent = (event) => updateRingField('current_event', event)
  const updateGender = (gender) => updateRingField('gender', gender)
  const updateAgeBracket = (ageBracket) => {
    updateRingField('age_bracket', ageBracket)
    if (ageBracket === 'Tigers' && ring.rank === 'Black Belts') {
      updateRingField('rank', 'Color Belts')
    }
  }
  const updateRank = (rank) => updateRingField('rank', rank)
  const updateDivision = (division) => updateRingField('division', division)
  
  const isTeamSparring = ring?.current_event?.startsWith('Team Sparring')
  const isOpen = ring?.is_open === 1

  if (!ring) {
    return (
      <div className="container">
        <div className="no-tournaments-message">
          <p>Loading ring configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="judge-controls">
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}
        
        <div className="event-selector">
          <div className="ring-number-header">
            <h2>Ring {ring.ring_number}</h2>
          </div>
          <div className="current-status">
            <p className="current-event">
              <strong>Current:</strong> 
              {isOpen ? (
                <> Open</>
              ) : (
                <>
                  {ring.current_event}
                  {isTeamSparring ? (
                    <> | {ring.division || 'Bantam'}</>
                  ) : (
                    <> | {ring.gender} | {ring.age_bracket} | {ring.rank}</>
                  )}
                </>
              )}
            </p>
          </div>
          
          <div className="category-selector">
            <div className="ring-status-box">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <button
                  className={`status-toggle-btn status-toggle-open ${ring.is_open === 1 ? 'status-toggle-active' : ''}`}
                  onClick={() => updateRingField('is_open', ring.is_open === 1 ? 0 : 1)}
                  disabled={tournamentEnded}
                >
                  Ring Open
                </button>
                <button
                  className={`status-toggle-btn status-toggle-judges ${ring.judges_needed === 1 ? 'status-toggle-active' : ''}`}
                  onClick={() => updateRingField('judges_needed', ring.judges_needed === 1 ? 0 : 1)}
                  disabled={tournamentEnded}
                >
                  Judges Needed
                </button>
              </div>
            </div>
          </div>

          {!isOpen && (
            <div className="category-selector">
              <label>Select Event:</label>
              <select 
                value={ring.current_event}
                onChange={(e) => updateEvent(e.target.value)}
                className="category-dropdown"
                disabled={tournamentEnded}
              >
                {EVENTS.map(event => (
                  <option key={event} value={event}>{event}</option>
                ))}
              </select>
            </div>
          )}

          {!isOpen && (
            isTeamSparring ? (
              <div className="category-selector">
                <label>Select Division:</label>
                <select 
                  value={ring.division || 'Bantam'}
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
                    value={ring.gender || 'Male'}
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
                    value={ring.age_bracket || 'Tigers'}
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
                    value={ring.rank || 'Color Belts'}
                    onChange={(e) => updateRank(e.target.value)}
                    className="category-dropdown"
                    disabled={tournamentEnded}
                  >
                    {RANKS.filter(rank => {
                      if (ring.age_bracket === 'Tigers' && rank === 'Black Belts') {
                        return false
                      }
                      return true
                    }).map(rank => (
                      <option key={rank} value={rank}>{rank}</option>
                    ))}
                  </select>
                </div>

                {ring.rank === 'Color Belts' && (
                  <div className="color-belt-selector">
                    <label>Select Color Belt Ranks:</label>
                    <div className="checkbox-grid">
                      {COLOR_BELT_RANKS.map(belt => (
                        <button
                          key={belt}
                          className={`belt-toggle-btn color-belt-btn belt-${belt.toLowerCase().replace('/', '-')} ${selectedColorBelts.includes(belt) ? 'belt-toggle-active' : ''}`}
                          onClick={() => {
                            let newColorBelts
                            if (selectedColorBelts.includes(belt)) {
                              newColorBelts = selectedColorBelts.filter(b => b !== belt)
                            } else {
                              newColorBelts = [...selectedColorBelts, belt]
                            }
                            setSelectedColorBelts(newColorBelts)
                            updateRingField('color_belts', JSON.stringify(newColorBelts))
                          }}
                          disabled={tournamentEnded}
                        >
                          {belt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {ring.rank === 'Black Belts' && (
                  <div className="black-belt-selector">
                    <label>Select Black Belt Ranks:</label>
                    <div className="checkbox-grid">
                      {BLACK_BELT_RANKS.filter(belt => {
                        const youngerAgeBrackets = ['8 and Under', '9-10', '11-12', '13-14', '15-17']
                        if (youngerAgeBrackets.includes(ring.age_bracket)) {
                          if (belt === '4th-5th Degree' || belt === 'Masters') {
                            return false
                          }
                        }
                        return true
                      }).map(belt => (
                        <button
                          key={belt}
                          className={`belt-toggle-btn ${selectedBlackBelts.includes(belt) ? 'belt-toggle-active' : ''}`}
                          onClick={() => {
                            let newBlackBelts
                            if (selectedBlackBelts.includes(belt)) {
                              newBlackBelts = selectedBlackBelts.filter(b => b !== belt)
                            } else {
                              newBlackBelts = [...selectedBlackBelts, belt]
                            }
                            setSelectedBlackBelts(newBlackBelts)
                            updateRingField('black_belts', JSON.stringify(newBlackBelts))
                          }}
                          disabled={tournamentEnded}
                        >
                          {belt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="category-selector">
                  <div className="stacked-ring-box">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#2c3e50' }}>Stacked Ring:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <button
                        className={`status-toggle-btn status-toggle-stacked ${ring.stacked_ring === 1 ? 'status-toggle-active' : ''}`}
                        onClick={() => updateRingField('stacked_ring', ring.stacked_ring === 1 ? 0 : 1)}
                        disabled={tournamentEnded}
                      >
                        Stacked Ring
                      </button>
                    </div>
                  </div>
                </div>

                <div className="category-selector">
                  <div className="special-abilities-box">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#2c3e50' }}>Special Abilities:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <button
                        className={`status-toggle-btn status-toggle-physical ${ring.special_abilities_physical === 1 ? 'status-toggle-active' : ''}`}
                        onClick={() => updateRingField('special_abilities_physical', ring.special_abilities_physical === 1 ? 0 : 1)}
                        disabled={tournamentEnded}
                      >
                        Physical
                      </button>
                      <button
                        className={`status-toggle-btn status-toggle-cognitive ${ring.special_abilities_cognitive === 1 ? 'status-toggle-active' : ''}`}
                        onClick={() => updateRingField('special_abilities_cognitive', ring.special_abilities_cognitive === 1 ? 0 : 1)}
                        disabled={tournamentEnded}
                      >
                        Cognitive
                      </button>
                      <button
                        className={`status-toggle-btn status-toggle-autistic ${ring.special_abilities_autistic === 1 ? 'status-toggle-active' : ''}`}
                        onClick={() => updateRingField('special_abilities_autistic', ring.special_abilities_autistic === 1 ? 0 : 1)}
                        disabled={tournamentEnded}
                      >
                        Autistic
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )
          )}

          {tournamentEnded && (
            <p className="tournament-ended-notice">Tournament has ended</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default StaffRingConfig
