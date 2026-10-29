import { useEffect, useRef, useState } from 'react'
import { getAuthToken } from '../utils/api'

const MIN_RECONNECT_DELAY = 1000
const MAX_RECONNECT_DELAY = 10000

// Opens one WebSocket for the lifetime of the component and reconnects automatically if it drops.
// onMessage and onReconnect are read through refs, so callers can pass inline functions that
// close over current state without causing the socket to be torn down on every render.
// onReconnect runs after a dropped connection comes back, so callers can refetch anything missed.
// Returns whether the socket is currently connected.
export const useWebSocket = (onMessage, { onReconnect } = {}) => {
  const onMessageRef = useRef(onMessage)
  const onReconnectRef = useRef(onReconnect)
  onMessageRef.current = onMessage
  onReconnectRef.current = onReconnect

  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    // Use current hostname for WebSocket connection
    const isDevelopment = import.meta.env.DEV
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = isDevelopment ? '3001' : window.location.port
    const wsUrl = port ? `${protocol}//${host}:${port}` : `${protocol}//${host}`

    let ws = null
    let reconnectTimer = null
    let reconnectDelay = MIN_RECONNECT_DELAY
    let hasConnectedBefore = false
    let disposed = false

    const connect = () => {
      console.log('Connecting to WebSocket:', wsUrl)
      // The server rejects connections without a valid session token; read it fresh on each attempt
      ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(getAuthToken() || '')}`)

      ws.onopen = () => {
        console.log('✅ WebSocket connected to:', wsUrl)
        reconnectDelay = MIN_RECONNECT_DELAY
        setIsConnected(true)
        if (hasConnectedBefore) {
          onReconnectRef.current?.()
        }
        hasConnectedBefore = true
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessageRef.current(data)
        } catch (error) {
          console.error('Error handling WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        console.error('Failed to connect to:', wsUrl)
      }

      ws.onclose = (event) => {
        if (disposed) return
        console.log('🔌 WebSocket disconnected. Code:', event.code, 'Reason:', event.reason)
        setIsConnected(false)
        reconnectTimer = setTimeout(connect, reconnectDelay)
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
      }
    }

    connect()

    return () => {
      disposed = true
      clearTimeout(reconnectTimer)
      // Closing while still CONNECTING is allowed and prevents a leaked socket
      ws?.close()
    }
  }, [])

  return isConnected
}
