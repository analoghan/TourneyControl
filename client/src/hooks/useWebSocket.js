import { useEffect } from 'react'

export const useWebSocket = (onMessage) => {
  useEffect(() => {
    // In development, Vite runs on 3000 but backend is on 8080
    // In production, everything runs on the same port
    const isDevelopment = import.meta.env.DEV
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = isDevelopment ? '8080' : (window.location.port || '8080')
    const wsUrl = `${protocol}//${host}:${port}`
    
    console.log('Connecting to WebSocket:', wsUrl)
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('✅ WebSocket connected to:', wsUrl)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('📨 WebSocket message received:', data)
        onMessage(data)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error)
      console.error('Failed to connect to:', wsUrl)
    }

    ws.onclose = (event) => {
      console.log('🔌 WebSocket disconnected. Code:', event.code, 'Reason:', event.reason)
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [onMessage])
}
