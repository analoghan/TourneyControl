// Sorting utilities for tournament data

export const COLOR_BELT_RANKS = [
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

export const BLACK_BELT_RANKS = [
  '1st Degree',
  '2nd-3rd Degree',
  '4th-5th Degree',
  'Masters'
]

export const sortAgeBrackets = (brackets) => {
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

export const sortColorBelts = (belts) => {
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

export const sortBlackBelts = (belts) => {
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
