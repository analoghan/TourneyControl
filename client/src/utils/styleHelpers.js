// Style helper functions for tournament UI

export const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'not_started': return 'status-badge status-not-started'
    case 'active': return 'status-badge status-active'
    case 'ended': return 'status-badge status-ended'
    default: return 'status-badge'
  }
}

export const getStatusText = (status) => {
  switch (status) {
    case 'not_started': return 'Not Started'
    case 'active': return 'Active'
    case 'ended': return 'Ended'
    default: return status
  }
}

export const getEventColorClass = (event) => {
  switch (event) {
    case 'Open': return 'event-open'
    case 'Judges Needed!': return 'event-judges-needed'
    case 'Forms': return 'event-forms'
    case 'Weapons': return 'event-weapons'
    case 'Combat Sparring': return 'event-combat-sparring'
    case 'Traditional Sparring': return 'event-traditional-sparring'
    case 'Creative Forms': return 'event-creative-forms'
    case 'Creative Weapons': return 'event-creative-weapons'
    case 'XMA Forms': return 'event-xma-forms'
    case 'XMA Weapons': return 'event-xma-weapons'
    case 'Team Sparring - Combat': return 'event-team-combat'
    case 'Team Sparring - Traditional': return 'event-team-traditional'
    default: return ''
  }
}

export const getRankColorClass = (rank) => {
  if (rank === 'Color Belts') {
    return 'rank-color-belts'
  }
  return 'rank-black-belts'
}

export const getGenderColorClass = (gender) => {
  if (gender === 'Male') {
    return 'category-male'
  }
  return 'category-female'
}
