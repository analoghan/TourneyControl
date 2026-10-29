import React from 'react'

// Last line of defense: if a screen crashes while rendering, show a message instead of a blank page
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Screen crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="container">
        <div className="connection-banner" role="alert">
          Something went wrong on this screen: {this.state.error.message}
        </div>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    )
  }
}

export default ErrorBoundary
