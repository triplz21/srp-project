import { useState, useEffect } from "react"
import "./Chat.css"

const API_URL = import.meta.env.VITE_API_URL

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const SESSION_ID = "user_1"

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`${API_URL}/history/${SESSION_ID}`)
        const data = await res.json()
        setMessages(data.messages || [])
      } catch (err) {
        console.error("Ошибка загрузки истории:", err)
      }
    }
    loadHistory()
  }, [])

  async function sendMessage() {
    if (!input.trim()) return
    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          session_id: SESSION_ID
        })
      })
      const data = await res.json()
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.reply }
      ])
    } catch (err) {
      console.error("Ошибка:", err)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <span className="label">
              {msg.role === 'user' ? 'Вы' : 'Oylan'}
            </span>
            <p>{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="message assistant loading">
            <p>Думает...</p>
          </div>
        )}
      </div>
      <div className="chat-input">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Напишите сообщение..."
          rows={3}
        />
        <button onClick={sendMessage} disabled={loading}>
          Отправить
        </button>
      </div>
    </div>
  )
}