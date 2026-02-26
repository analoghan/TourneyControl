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

const RingSetupBox = ({
  data,
  onUpdate,
  disabled,
  isTeamSparring,
  showDelete = false,
  onDelete,
  title = 'Ring Setup'
}) => {
  const selectedAgeBrackets = data.age_brackets ? JSON.parse(data.age_brackets) : [data.age_bracket || '8 and Under']
  const selectedColorBelts = data.color_belts ? JSON.parse(data.color_belts) : []
  const selectedBlackBelts = data.black_belts ? JSON.parse(data.black_belts) : []

  const updateField = (field, value) => {
    onUpdate({ [field]: value })
  }

  const updateAgeBrackets = (newBrackets) => {
    onUpdate({ age_brackets: JSON.stringify(newBrackets) })
  }

  const updateColorBelts = (newBelts) => {
    onUpdate({ color_belts: JSON.stringify(newBelts) })
  }

  const updateBlackBelts = (newBelts) => {
    onUpdate({ black_belts: JSON.stringify(newBelts) })
  }

  return (
    <div style={{ 
      background: '#dbeafe', 
      border: '2px solid #3b82f6', 
      borderRadius: '8px', 
      padding: '1.5rem',
      marginTop: '1rem',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ 
          margin: 0, 
          color: '#000000', 
          fontSize: '1.1rem',
          fontWeight: '700'
        }}>{title}</h3>
        {showDelete && (
          <button
            onClick={onDelete}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
          >
            Delete
          </button>
        )}
      </div>
      
      {!isTeamSparring && !selectedAgeBrackets.includes('Tigers') && (
        <div className="category-selector">
          <div className="division-type-box">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#2c3e50' }}>Division:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <button
                className={`status-toggle-btn status-toggle-division ${(data.division_type || 'Champion') === 'Champion' ? 'status-toggle-active' : ''}`}
                onClick={() => updateField('division_type', 'Champion')}
                disabled={disabled}
              >
                Champion
              </button>
              <button
                className={`status-toggle-btn status-toggle-division status-toggle-recreational ${(data.division_type || 'Champion') === 'Recreational' ? 'status-toggle-active' : ''}`}
                onClick={() => updateField('division_type', 'Recreational')}
                disabled={disabled}
              >
                Recreational
              </button>
            </div>
          </div>
        </div>
      )}

      {!isTeamSparring && (
        <div className="category-selector">
          <label>Competitor Count:</label>
          <select 
            value={data.competitor_count || 1}
            onChange={(e) => updateField('competitor_count', parseInt(e.target.value))}
            className="category-dropdown"
            disabled={disabled}
          >
            {[...Array(16)].map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>
        </div>
      )}

      {isTeamSparring ? (
        <div className="category-selector">
          <label>Select Division:</label>
          <select 
            value={data.division || 'Bantam'}
            onChange={(e) => updateField('division', e.target.value)}
            className="category-dropdown"
            disabled={disabled}
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
              value={data.gender || 'Male'}
              onChange={(e) => updateField('gender', e.target.value)}
              className="category-dropdown"
              disabled={disabled}
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
                      newAgeBrackets = selectedAgeBrackets.filter(b => b !== bracket)
                    } else {
                      if (bracket === 'Tigers') {
                        newAgeBrackets = ['Tigers']
                      } else {
                        newAgeBrackets = [...selectedAgeBrackets.filter(b => b !== 'Tigers'), bracket]
                      }
                    }
                    updateAgeBrackets(newAgeBrackets)
                    
                    if (newAgeBrackets.includes('Tigers') && data.rank === 'Black Belts') {
                      updateField('rank', 'Color Belts')
                    }
                  }}
                  disabled={disabled}
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
                value={data.rank || 'Color Belts'}
                onChange={(e) => updateField('rank', e.target.value)}
                className="category-dropdown"
                disabled={disabled}
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

            {data.rank === 'Color Belts' && (
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
                        updateColorBelts(newColorBelts)
                      }}
                      disabled={disabled}
                    >
                      {belt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {data.rank === 'Black Belts' && (
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
                        updateBlackBelts(newBlackBelts)
                      }}
                      disabled={disabled}
                    >
                      {belt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="category-selector">
            <div className="special-abilities-box">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#2c3e50' }}>Special Abilities:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <button
                  className={`status-toggle-btn status-toggle-physical ${data.special_abilities_physical === 1 ? 'status-toggle-active' : ''}`}
                  onClick={() => updateField('special_abilities_physical', data.special_abilities_physical === 1 ? 0 : 1)}
                  disabled={disabled}
                >
                  Physical
                </button>
                <button
                  className={`status-toggle-btn status-toggle-cognitive ${data.special_abilities_cognitive === 1 ? 'status-toggle-active' : ''}`}
                  onClick={() => updateField('special_abilities_cognitive', data.special_abilities_cognitive === 1 ? 0 : 1)}
                  disabled={disabled}
                >
                  Cognitive
                </button>
                <button
                  className={`status-toggle-btn status-toggle-autistic ${data.special_abilities_autistic === 1 ? 'status-toggle-active' : ''}`}
                  onClick={() => updateField('special_abilities_autistic', data.special_abilities_autistic === 1 ? 0 : 1)}
                  disabled={disabled}
                >
                  Autistic
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default RingSetupBox
