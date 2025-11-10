import { useEffect } from 'react'

export const useWebSocket = (onMessage) => {
  useEffect(() => {
    // Force localhost connection for WebSocket
    const isDevelopment = import.meta.env.DEV
    const protocol = 'ws:'
    const host = 'localhost'
    const port = '3001'
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
