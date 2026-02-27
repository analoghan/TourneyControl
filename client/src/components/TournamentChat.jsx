import { useState, useEffect, useRef } from 'react'

const TournamentChat = ({ tournamentId, tournamentName }) => {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [senderName, setSenderName] = useState(() => {
    return localStorage.getItem('chatSenderName') || 'Staff'
  })
  const [isEditingName, setIsEditingName] = useState(false)
  const messagesEndRef = useRef(null)

  // Poll for new messages every 500ms for faster updates
  useEffect(() => {
    if (tournamentId) {
      fetchMessages()
      const interval = setInterval(fetchMessages, 500)
      return () => clearInterval(interval)
    }
  }, [tournamentId])

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/chat`)
      if (res.ok) {
        const data = await res.json()
        const isFirstLoad = messages.length === 0
        setMessages(data)
        
        // Scroll to bottom only on first load, within the chat container only
        if (isFirstLoad && data.length > 0) {
          setTimeout(() => {
            const messagesContainer = messagesEndRef.current?.parentElement
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight
            }
          }, 100)
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
        fetchMessages()
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
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
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
      
      <div className="chat-messages" style={{ height: '180px', maxHeight: '180px', overflowY: 'scroll' }}>
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
