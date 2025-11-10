import { useState, useEffect } from 'react'
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

const JudgesInterface = () => {
  useAuth('judge') // Check authentication
  
  const [rings, setRings] = useState([])
  const [selectedRing, setSelectedRing] = useState(null)
  const [tournaments, setTournaments] = useState([])
  const [selectedTournament, setSelectedTournament] = useState(null)
  const [tournamentEnded, setTournamentEnded] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedColorBelts, setSelectedColorBelts] = useState([])
  const [selectedBlackBelts, setSelectedBlackBelts] = useState([])
  const [selectionExpanded, setSelectionExpanded] = useState(false)


  useWebSocket((data) => {
    if (data.type === 'ring_update') {
      setRings(prev => prev.map(r => r.id === data.data.id ? data.data : r))
      // Also update selectedRing if it's the one that changed
      if (selectedRing && selectedRing.id === data.data.id) {
        setSelectedRing(data.data)
      }
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

  useEffect(() => {
    if (selectedRing) {
      // Load color belts
      if (selectedRing.color_belts) {
        try {
          const parsedBelts = JSON.parse(selectedRing.color_belts)
          setSelectedColorBelts(parsedBelts)
        } catch (e) {
          setSelectedColorBelts([])
        }
      } else {
        setSelectedColorBelts([])
      }
      
      // Load black belts
      if (selectedRing.black_belts) {
        try {
          const parsedBelts = JSON.parse(selectedRing.black_belts)
          setSelectedBlackBelts(parsedBelts)
        } catch (e) {
          setSelectedBlackBelts([])
        }
      } else {
        setSelectedBlackBelts([])
      }
    } else {
      setSelectedColorBelts([])
      setSelectedBlackBelts([])
    }
  }, [selectedRing])

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
  const updateAgeBracket = (ageBracket) => {
    updateRingField('age_bracket', ageBracket)
    // If Tigers is selected, automatically set rank to Color Belts
    if (ageBracket === 'Tigers' && selectedRing.rank === 'Black Belts') {
      updateRingField('rank', 'Color Belts')
    }
  }
  const updateRank = (rank) => updateRingField('rank', rank)
  const updateDivision = (division) => updateRingField('division', division)
  
  const isTeamSparring = selectedRing?.current_event?.startsWith('Team Sparring')
  const isOpen = selectedRing?.is_open === 1

  return (
    <div className="container">
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
          
          {selectedRing && (
            <div className="selection-section">
              <div className="setup-header" onClick={() => setSelectionExpanded(!selectionExpanded)}>
                <div className="setup-header-content">
                  <h3>Tournament & Ring Selection</h3>
                  <span className="setup-hint">click to show/hide</span>
                </div>
                <span className="toggle-icon">{selectionExpanded ? '▼' : '▶'}</span>
              </div>
              
              {selectionExpanded && (
                <div className="setup-content">
                  <div className="tournament-select">
                    <label>Select Tournament:</label>
                    <select 
                      value={selectedTournament || ''}
                      onChange={(e) => {
                        const tournamentId = parseInt(e.target.value)
                        setSelectedTournament(tournamentId)
                        setSelectedRing(null)
                      }}
                    >
                      {tournaments.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="ring-selector">
                    <label>Select Your Ring</label>
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
                </div>
              )}
            </div>
          )}
          
          {!selectedRing && (
            <>
              <div className="tournament-select">
                <label>Select Tournament:</label>
                <select 
                  value={selectedTournament || ''}
                  onChange={(e) => {
                    const tournamentId = parseInt(e.target.value)
                    setSelectedTournament(tournamentId)
                    setSelectedRing(null)
                  }}
                >
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="ring-selector">
                <label>Select Your Ring</label>
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
            </>
          )}

          {selectedRing && (
            <div className="event-selector">
              <div className="ring-number-header">
                <h2>Ring {selectedRing.ring_number}</h2>
              </div>
              <div className="current-status">
                <p className="current-event">
                  <strong>Current:</strong> 
                  {isOpen ? (
                    <> Open</>
                  ) : (
                    <>
                      {selectedRing.current_event}
                      {isTeamSparring ? (
                        <> | {selectedRing.division || 'Bantam'}</>
                      ) : (
                        <> | {selectedRing.gender} | {selectedRing.age_bracket} | {selectedRing.rank}</>
                      )}
                    </>
                  )}
                </p>
              </div>
              
              <div className="category-selector">
                <div className="ring-status-box">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <button
                      className={`status-toggle-btn status-toggle-open ${selectedRing.is_open === 1 ? 'status-toggle-active' : ''}`}
                      onClick={() => updateRingField('is_open', selectedRing.is_open === 1 ? 0 : 1)}
                      disabled={tournamentEnded}
                    >
                      Ring Open
                    </button>
                    <button
                      className={`status-toggle-btn status-toggle-judges ${selectedRing.judges_needed === 1 ? 'status-toggle-active' : ''}`}
                      onClick={() => updateRingField('judges_needed', selectedRing.judges_needed === 1 ? 0 : 1)}
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
              )}

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
                        {RANKS.filter(rank => {
                          // Hide Black Belts option if Tigers age bracket is selected
                          if (selectedRing.age_bracket === 'Tigers' && rank === 'Black Belts') {
                            return false
                          }
                          return true
                        }).map(rank => (
                          <option key={rank} value={rank}>{rank}</option>
                        ))}
                      </select>
                    </div>

                    {selectedRing.rank === 'Color Belts' && (
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

                    {selectedRing.rank === 'Black Belts' && (
                      <div className="black-belt-selector">
                        <label>Select Black Belt Ranks:</label>
                        <div className="checkbox-grid">
                          {BLACK_BELT_RANKS.filter(belt => {
                            // Hide 4th-5th Degree and Masters for younger age brackets
                            const youngerAgeBrackets = ['8 and Under', '9-10', '11-12', '13-14', '15-17']
                            if (youngerAgeBrackets.includes(selectedRing.age_bracket)) {
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
                            className={`status-toggle-btn status-toggle-stacked ${selectedRing.stacked_ring === 1 ? 'status-toggle-active' : ''}`}
                            onClick={() => updateRingField('stacked_ring', selectedRing.stacked_ring === 1 ? 0 : 1)}
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
                            className={`status-toggle-btn status-toggle-physical ${selectedRing.special_abilities_physical === 1 ? 'status-toggle-active' : ''}`}
                            onClick={() => updateRingField('special_abilities_physical', selectedRing.special_abilities_physical === 1 ? 0 : 1)}
                            disabled={tournamentEnded}
                          >
                            Physical
                          </button>
                          <button
                            className={`status-toggle-btn status-toggle-cognitive ${selectedRing.special_abilities_cognitive === 1 ? 'status-toggle-active' : ''}`}
                            onClick={() => updateRingField('special_abilities_cognitive', selectedRing.special_abilities_cognitive === 1 ? 0 : 1)}
                            disabled={tournamentEnded}
                          >
                            Cognitive
                          </button>
                          <button
                            className={`status-toggle-btn status-toggle-autistic ${selectedRing.special_abilities_autistic === 1 ? 'status-toggle-active' : ''}`}
                            onClick={() => updateRingField('special_abilities_autistic', selectedRing.special_abilities_autistic === 1 ? 0 : 1)}
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
          )}
        </div>
      )}
    </div>
  )
}

export default JudgesInterface
