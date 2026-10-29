import { useState, useEffect } from 'react'

// Ticks once a second in its own component, so the clock doesn't redraw the whole dashboard
const TournamentClock = ({ timezone }) => {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone
  })
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone
  })
  return `${timeStr}, ${dateStr}`
}

export default TournamentClock
