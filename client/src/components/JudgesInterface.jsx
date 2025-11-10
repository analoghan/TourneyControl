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


  useWebSocket((data) => {
    if (data.type === 'ring_update') {
      setRings(prev => prev.map(r => r.id === data.data.id ? data.data : r))
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
  const isOpen = selectedRing?.current_event === 'Open' || selectedRing?.current_event === 'Judges Needed!'

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

          {selectedRing && (
            <div className="event-selector">
              <h3>Ring {selectedRing.ring_number}</h3>
              <div className="current-status">
                <p className="current-event">
                  <strong>Current:</strong> {selectedRing.current_event}
                  {!isOpen && (
                    isTeamSparring ? (
                      <> | {selectedRing.division || 'Bantam'}</>
                    ) : (
                      <> | {selectedRing.gender} | {selectedRing.age_bracket} | {selectedRing.rank}</>
                    )
                  )}
                </p>
              </div>
              
              <div className="category-selector">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <label className="checkbox-label" style={{ cursor: 'pointer', padding: '0.75rem', background: '#f8f9fa', borderRadius: '4px' }}>
                    <input
                      type="checkbox"
                      checked={selectedRing.stacked_ring === 1}
                      onChange={(e) => updateRingField('stacked_ring', e.target.checked ? 1 : 0)}
                      disabled={tournamentEnded}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span style={{ fontWeight: '500' }}>Stacked Ring</span>
                  </label>
                  <label className="checkbox-label" style={{ cursor: 'pointer', padding: '0.75rem', background: '#f8f9fa', borderRadius: '4px' }}>
                    <input
                      type="checkbox"
                      checked={selectedRing.special_abilities_physical === 1}
                      onChange={(e) => updateRingField('special_abilities_physical', e.target.checked ? 1 : 0)}
                      disabled={tournamentEnded}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span style={{ fontWeight: '500' }}>Special Abilities - Physical</span>
                  </label>
                  <label className="checkbox-label" style={{ cursor: 'pointer', padding: '0.75rem', background: '#f8f9fa', borderRadius: '4px' }}>
                    <input
                      type="checkbox"
                      checked={selectedRing.special_abilities_cognitive === 1}
                      onChange={(e) => updateRingField('special_abilities_cognitive', e.target.checked ? 1 : 0)}
                      disabled={tournamentEnded}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span style={{ fontWeight: '500' }}>Special Abilities - Cognitive</span>
                  </label>
                  <label className="checkbox-label" style={{ cursor: 'pointer', padding: '0.75rem', background: '#f8f9fa', borderRadius: '4px' }}>
                    <input
                      type="checkbox"
                      checked={selectedRing.special_abilities_autistic === 1}
                      onChange={(e) => updateRingField('special_abilities_autistic', e.target.checked ? 1 : 0)}
                      disabled={tournamentEnded}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <span style={{ fontWeight: '500' }}>Special Abilities - Autistic</span>
                  </label>
                </div>
              </div>

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
                          <label key="all-ranks" className="checkbox-label checkbox-label-all">
                            <input
                              type="checkbox"
                              checked={selectedColorBelts.includes('All Color Belt Ranks')}
                              onChange={(e) => {
                                let newColorBelts
                                if (e.target.checked) {
                                  newColorBelts = ['All Color Belt Ranks']
                                } else {
                                  newColorBelts = []
                                }
                                setSelectedColorBelts(newColorBelts)
                                updateRingField('color_belts', JSON.stringify(newColorBelts))
                              }}
                              disabled={tournamentEnded}
                            />
                            <span>All Color Belt Ranks</span>
                          </label>
                          {COLOR_BELT_RANKS.map(belt => (
                            <label key={belt} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={selectedColorBelts.includes(belt)}
                                onChange={(e) => {
                                  let newColorBelts
                                  if (e.target.checked) {
                                    // Remove "All Color Belt Ranks" if selecting individual belts
                                    newColorBelts = [...selectedColorBelts.filter(b => b !== 'All Color Belt Ranks'), belt]
                                  } else {
                                    newColorBelts = selectedColorBelts.filter(b => b !== belt)
                                  }
                                  setSelectedColorBelts(newColorBelts)
                                  updateRingField('color_belts', JSON.stringify(newColorBelts))
                                }}
                                disabled={tournamentEnded || selectedColorBelts.includes('All Color Belt Ranks')}
                              />
                              <span>{belt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedRing.rank === 'Black Belts' && (
                      <div className="color-belt-selector">
                        <label>Select Black Belt Ranks:</label>
                        <div className="checkbox-grid">
                          <label key="all-black-ranks" className="checkbox-label checkbox-label-all">
                            <input
                              type="checkbox"
                              checked={selectedBlackBelts.includes('All Black Belt Ranks')}
                              onChange={(e) => {
                                let newBlackBelts
                                if (e.target.checked) {
                                  newBlackBelts = ['All Black Belt Ranks']
                                } else {
                                  newBlackBelts = []
                                }
                                setSelectedBlackBelts(newBlackBelts)
                                updateRingField('black_belts', JSON.stringify(newBlackBelts))
                              }}
                              disabled={tournamentEnded}
                            />
                            <span>All Black Belt Ranks</span>
                          </label>
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
                            <label key={belt} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={selectedBlackBelts.includes(belt)}
                                onChange={(e) => {
                                  let newBlackBelts
                                  if (e.target.checked) {
                                    // Remove "All Black Belt Ranks" if selecting individual belts
                                    newBlackBelts = [...selectedBlackBelts.filter(b => b !== 'All Black Belt Ranks'), belt]
                                  } else {
                                    newBlackBelts = selectedBlackBelts.filter(b => b !== belt)
                                  }
                                  setSelectedBlackBelts(newBlackBelts)
                                  updateRingField('black_belts', JSON.stringify(newBlackBelts))
                                }}
                                disabled={tournamentEnded || selectedBlackBelts.includes('All Black Belt Ranks')}
                              />
                              <span>{belt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
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
