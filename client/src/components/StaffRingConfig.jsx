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

const StaffRingConfig = () => {
  useAuth('staff') // Check authentication for staff
  
  const { ringId } = useParams()
  const [ring, setRing] = useState(null)
  const [tournamentEnded, setTournamentEnded] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedColorBelts, setSelectedColorBelts] = useState([])
  const [selectedBlackBelts, setSelectedBlackBelts] = useState([])
  const [selectedAgeBrackets, setSelectedAgeBrackets] = useState([])
  const [showStartModal, setShowStartModal] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)

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
    
    // Load age brackets
    if (ringData.age_brackets) {
      try {
        const parsedBrackets = JSON.parse(ringData.age_brackets)
        setSelectedAgeBrackets(parsedBrackets)
      } catch (e) {
        setSelectedAgeBrackets([ringData.age_bracket || '8 and Under'])
      }
    } else {
      setSelectedAgeBrackets([ringData.age_bracket || '8 and Under'])
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
  
  const handleStartRing = async () => {
    if (!ring) return
    await updateRingField('start_time', new Date().toISOString())
    setShowStartModal(false)
  }
  
  const handleEndRing = async () => {
    if (!ring) return
    // Reset ring to default state
    const updates = {
      end_time: new Date().toISOString(),
      start_time: null,
      is_open: 1,
      judges_needed: 0,
      rttl_needed: 0,
      current_event: 'Forms',
      gender: 'Male',
      age_bracket: '8 and Under',
      rank: 'Color Belts',
      division: 'Bantam',
      division_type: 'Champion',
      color_belts: '[]',
      black_belts: '[]',
      stacked_ring: 0,
      special_abilities_physical: 0,
      special_abilities_cognitive: 0,
      special_abilities_autistic: 0
    }
    
    for (const [key, value] of Object.entries(updates)) {
      await updateRingField(key, value)
    }
    
    setShowEndModal(false)
    fetchRing()
  }
  
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
              <strong>Current: </strong>
              {isOpen ? (
                <>Open</>
              ) : (
                <>
                  {ring.current_event}
                  {isTeamSparring ? (
                    <> | {ring.division || 'Bantam'}</>
                  ) : (
                    <>
                      {' | '}{ring.division_type || 'Champion'}
                      {' | '}{ring.gender}
                      {' | '}{selectedAgeBrackets.length > 0 ? sortAgeBrackets([...selectedAgeBrackets]).join(', ') : (ring.age_bracket || '8 and Under')}
                      {' | '}{ring.rank}
                      {ring.rank === 'Color Belts' && selectedColorBelts.length > 0 && (
                        selectedColorBelts.length === COLOR_BELT_RANKS.length ? 
                          <> (All Ranks)</> : 
                          <> ({sortColorBelts(selectedColorBelts).join(', ')})</>
                      )}
                      {ring.rank === 'Black Belts' && selectedBlackBelts.length > 0 && (
                        selectedBlackBelts.length === BLACK_BELT_RANKS.length ? 
                          <> (All Ranks)</> : 
                          <> ({sortBlackBelts(selectedBlackBelts).join(', ')})</>
                      )}
                    </>
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
                  disabled={tournamentEnded || (ring.start_time && !ring.end_time)}
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
                <button
                  className={`status-toggle-btn status-toggle-rttl ${ring.rttl_needed === 1 ? 'status-toggle-active' : ''}`}
                  onClick={() => updateRingField('rttl_needed', ring.rttl_needed === 1 ? 0 : 1)}
                  disabled={tournamentEnded}
                >
                  RTTL Needed
                </button>
              </div>
            </div>
          </div>

          <div className="category-selector">
            <div className="ring-control-box">
              <div className="ring-control-warning">
                ⚠️ Do not click "End Ring" until your ring is finished and your packet is ready to turn in!
              </div>
              <div className="ring-control-buttons">
                <button
                  className="btn-start-ring"
                  onClick={() => setShowStartModal(true)}
                  disabled={tournamentEnded || ring.start_time || ring.is_open === 1}
                >
                  {ring.start_time ? `Ring In Progress - Started: ${new Date(ring.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Start Ring'}
                </button>
                <button
                  className="btn-end-ring"
                  onClick={() => setShowEndModal(true)}
                  disabled={tournamentEnded || !ring.start_time}
                >
                  End Ring
                </button>
              </div>
            </div>
          </div>

          {!isOpen && !isTeamSparring && !selectedAgeBrackets.includes('Tigers') && (
            <div className="category-selector">
              <div className="division-type-box">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#2c3e50' }}>Division:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <button
                    className={`status-toggle-btn status-toggle-division ${(ring.division_type || 'Champion') === 'Champion' ? 'status-toggle-active' : ''}`}
                    onClick={() => updateRingField('division_type', 'Champion')}
                    disabled={tournamentEnded}
                  >
                    Champion
                  </button>
                  <button
                    className={`status-toggle-btn status-toggle-division status-toggle-recreational ${(ring.division_type || 'Champion') === 'Recreational' ? 'status-toggle-active' : ''}`}
                    onClick={() => updateRingField('division_type', 'Recreational')}
                    disabled={tournamentEnded}
                  >
                    Recreational
                  </button>
                </div>
              </div>
            </div>
          )}

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

                <div className="age-bracket-selector">
                  <label>Select Age Brackets:</label>
                  <div className="checkbox-grid">
                    {AGE_BRACKETS.map(bracket => (
                      <button
                        key={bracket}
                        className={`belt-toggle-btn black-belt-btn ${selectedAgeBrackets.includes(bracket) ? 'belt-toggle-active' : ''}`}
                        onClick={() => {
                          let newAgeBrackets
                          if (selectedAgeBrackets.includes(bracket)) {
                            // Deselecting
                            newAgeBrackets = selectedAgeBrackets.filter(b => b !== bracket)
                          } else {
                            // Selecting
                            if (bracket === 'Tigers') {
                              // If Tigers is selected, clear all other selections
                              newAgeBrackets = ['Tigers']
                            } else {
                              // If any other bracket is selected, remove Tigers if it exists
                              newAgeBrackets = [...selectedAgeBrackets.filter(b => b !== 'Tigers'), bracket]
                            }
                          }
                          setSelectedAgeBrackets(newAgeBrackets)
                          updateRingField('age_brackets', JSON.stringify(newAgeBrackets))
                          
                          // If Tigers is selected and Black Belts is the current rank, switch to Color Belts
                          if (newAgeBrackets.includes('Tigers') && ring.rank === 'Black Belts') {
                            updateRingField('rank', 'Color Belts')
                          }
                        }}
                        disabled={tournamentEnded}
                      >
                        {bracket}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rank-selector-box">
                  <div className="category-selector">
                    <label>Select Rank:</label>
                    <select 
                      value={ring.rank || 'Color Belts'}
                      onChange={(e) => updateRank(e.target.value)}
                      className="category-dropdown"
                      disabled={tournamentEnded}
                    >
                      {RANKS.filter(rank => {
                        if (selectedAgeBrackets.includes('Tigers') && rank === 'Black Belts') {
                          return false
                        }
                        return true
                      }).map(rank => (
                        <option key={rank} value={rank}>{rank}</option>
                      ))}
                    </select>
                  </div>

                  {ring.rank === 'Color Belts' && (
                    <div className="belt-ranks-section">
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
                    <div className="belt-ranks-section">
                      <label>Select Black Belt Ranks:</label>
                      <div className="checkbox-grid">
                        {BLACK_BELT_RANKS.filter(belt => {
                          const youngerAgeBrackets = ['8 and Under', '9-10', '11-12', '13-14', '15-17']
                          const hasYoungerBracket = selectedAgeBrackets.some(bracket => youngerAgeBrackets.includes(bracket))
                          if (hasYoungerBracket) {
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
                </div>

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

      {showStartModal && (
        <div className="confirm-modal-overlay" onClick={() => setShowStartModal(false)}>
          <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Start Ring?</h3>
            <p>Are you sure you want to start this ring? This will record the start time.</p>
            <div className="confirm-modal-actions">
              <button className="btn-confirm btn-confirm-start" onClick={handleStartRing}>
                Yes, Start Ring
              </button>
              <button className="cancel-button" onClick={() => setShowStartModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndModal && (
        <div className="confirm-modal-overlay" onClick={() => setShowEndModal(false)}>
          <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>End Ring?</h3>
            <p><strong>Warning:</strong> This will record the end time and reset the ring to default state (Open). Make sure your packet is ready to turn in before proceeding.</p>
            <p>This action cannot be undone.</p>
            <div className="confirm-modal-actions">
              <button className="btn-confirm" onClick={handleEndRing}>
                Yes, End Ring
              </button>
              <button className="cancel-button" onClick={() => setShowEndModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffRingConfig
