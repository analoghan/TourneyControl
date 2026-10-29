// Shown while the live-update connection is down, so nobody trusts a stale screen
const ConnectionBanner = ({ isConnected }) => {
  if (isConnected) return null

  return (
    <div className="connection-banner" role="alert">
      Connection lost — live updates paused. Reconnecting…
    </div>
  )
}

export default ConnectionBanner
