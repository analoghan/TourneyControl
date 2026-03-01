import { useState, useEffect, useRef } from 'react'

const TournamentChat = ({ tournamentId, tournamentName, tournamentTimezone }) => {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [senderName, setSenderName] = useState(() => {
    return localStorage.getItem('chatSenderName') || 'Staff'
  })
  const [isEditingName, setIsEditingName] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const wasAtBottomRef = useRef(true) // Track if user was at bottom before update
  const isFirstLoadRef = useRef(true) // Track if this is the first load

  // Poll for new messages every 500ms for faster updates
  useEffect(() => {
    if (tournamentId) {
      fetchMessages()
      const interval = setInterval(fetchMessages, 500)
      return () => clearInterval(interval)
    }
  }, [tournamentId])

  // Check if user is at the bottom of the chat
  const isAtBottom = () => {
    const container = messagesContainerRef.current
    if (!container) return true
    
    const threshold = 30 // pixels from bottom
    const position = container.scrollTop + container.clientHeight
    const bottom = container.scrollHeight
    
    return bottom - position < threshold
  }

  // Handle scroll events to track if user is at bottom
  const handleScroll = () => {
    const atBottom = isAtBottom()
    wasAtBottomRef.current = atBottom
  }

  const scrollToBottom = () => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }

  const fetchMessages = async () => {
    try {
      // Check position BEFORE fetching
      const shouldAutoScroll = isFirstLoadRef.current || wasAtBottomRef.current
      
      const res = await fetch(`/api/tournaments/${tournamentId}/chat`)
      if (res.ok) {
        const data = await res.json()
        
        // Only update if messages actually changed
        if (JSON.stringify(data) !== JSON.stringify(messages)) {
          setMessages(data)
          
          // Mark that we've loaded at least once
          if (isFirstLoadRef.current) {
            isFirstLoadRef.current = false
          }
          
          // Only scroll if we should
          if (shouldAutoScroll) {
            setTimeout(scrollToBottom, 50)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch chat messages:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    
    if (!newMessage.trim()) return
    
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          sender_name: senderName
        })
      })
      
      if (res.ok) {
        setNewMessage('')
        // Immediately fetch messages after sending to show it faster
        // Force scroll to bottom after sending
        setTimeout(() => {
          fetchMessages()
          setTimeout(scrollToBottom, 100)
        }, 50)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleSaveName = () => {
    localStorage.setItem('chatSenderName', senderName)
    setIsEditingName(false)
  }

  const formatTime = (dateString) => {
    // SQLite stores timestamps as UTC strings without timezone info
    // Append 'Z' to indicate UTC, then convert to tournament timezone
    const utcDate = new Date(dateString + 'Z')
    
    // Get timezone abbreviation
    const timezoneMap = {
      'America/New_York': 'ET',
      'America/Chicago': 'CT',
      'America/Denver': 'MT',
      'America/Los_Angeles': 'PT'
    }
    const tzAbbr = timezoneMap[tournamentTimezone] || 'ET'
    
    // Format: Sat, Feb 28, 3:35 PM ET
    const formatted = utcDate.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: tournamentTimezone || 'America/New_York'
    })
    
    return `${formatted} ${tzAbbr}`
  }

  return (
    <div className="tournament-chat">
      <div className="chat-header">
        <h3>Tournament Chat</h3>
        {isEditingName ? (
          <div className="chat-name-edit">
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Your name"
              maxLength={30}
            />
            <button onClick={handleSaveName} className="btn-save-name">Save</button>
            <button onClick={() => setIsEditingName(false)} className="btn-cancel-name">Cancel</button>
          </div>
        ) : (
          <div className="chat-name-display">
            <span>Posting as: <strong>{senderName}</strong></span>
            <button onClick={() => setIsEditingName(true)} className="btn-edit-name">Change</button>
          </div>
        )}
      </div>
      
      <div 
        ref={messagesContainerRef}
        className="chat-messages" 
        style={{ height: '180px', maxHeight: '180px', overflowY: 'scroll' }}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="chat-empty">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="chat-message">
              <div className="chat-message-content">
                <span className="chat-sender">{msg.sender_name}:</span>
                <span className="chat-message-text">{msg.message}</span>
              </div>
              <span className="chat-time">{formatTime(msg.created_at)}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          maxLength={500}
          className="chat-input"
        />
        <button type="submit" className="chat-send-btn" disabled={!newMessage.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}

export default TournamentChat
