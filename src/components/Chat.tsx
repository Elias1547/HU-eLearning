"use client"

import { useState, useEffect, useRef } from "react"
import { pusherClient } from "@/lib/pusher-client"

interface Message {
  _id: string
  text: string
  senderId: string
  receiverId: string
  createdAt: string
}

interface ChatProps {
  userId: string
  userRole: "teacher" | "student"
  receiverId: string
  receiverRole: "teacher" | "student"
}

export default function Chat({ userId, receiverId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom
  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages])

  // Subscribe to Pusher
  useEffect(() => {
    const channel = pusherClient.subscribe(`user-${userId}`)
    channel.bind("new-message", (message: Message) => setMessages(prev => [...prev, message]))
    return () => pusherClient.unsubscribe(`user-${userId}`)
  }, [userId])

  // Fetch initial messages from API
  useEffect(() => {
    const fetchMessages = async () => {
      const res = await fetch(`/api/messages?userId=${userId}&receiverId=${receiverId}`)
      if (!res.ok) return console.error("Failed to fetch messages")
      const data: Message[] = await res.json()
      setMessages(data)
    }
    fetchMessages()
  }, [userId, receiverId])

  const sendMessage = async () => {
    if (!text.trim()) return
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId: userId, receiverId, text }),
    })
    if (!res.ok) return console.error("Failed to send message")
    const newMessage = await res.json()
    setMessages(prev => [...prev, newMessage])
    setText("")
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto mb-2">
        {messages.map(m => (
          <div
            key={m._id}
            className={`mb-1 p-2 rounded max-w-xs ${
              m.senderId === userId ? "bg-blue-500 text-white self-end" : "bg-gray-200 text-black self-start"
            }`}
          >
            <div className="text-xs text-gray-600 mb-1">{new Date(m.createdAt).toLocaleTimeString()}</div>
            {m.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded p-2"
        />
        <button onClick={sendMessage} className="bg-blue-500 text-white px-4 rounded">Send</button>
      </div>
    </div>
  )
}