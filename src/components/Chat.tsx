"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getSocket } from "@/lib/socket-client"
import { Trash2 } from "lucide-react"

interface Message {
  _id: string
  text: string
  senderId: string
  receiverId: string
  createdAt: string
}

interface DeletedMessage {
  messageId: string
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const appendMessage = useCallback((message: Message) => {
    const isCurrentConversation =
      (message.senderId === userId && message.receiverId === receiverId) ||
      (message.senderId === receiverId && message.receiverId === userId)

    if (!isCurrentConversation) return

    setMessages((prev) =>
      prev.some((item) => item._id === message._id) ? prev : [...prev, message]
    )
  }, [receiverId, userId])

  const removeMessage = useCallback((payload: DeletedMessage) => {
    setMessages((prev) => prev.filter((message) => message._id !== payload.messageId))
  }, [])

  // Scroll to bottom
  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages])

  // Subscribe to Socket.IO
  useEffect(() => {
    const socket = getSocket()
    socket.on("message:new", appendMessage)
    socket.on("message:delete", removeMessage)

    return () => {
      socket.off("message:new", appendMessage)
      socket.off("message:delete", removeMessage)
    }
  }, [appendMessage, removeMessage])

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
    appendMessage(newMessage)
    setText("")
  }

  const deleteMessage = async (messageId: string) => {
    setDeletingId(messageId)
    try {
      const res = await fetch(`/api/messages?messageId=${messageId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete message")
      removeMessage({ messageId })
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-2 flex flex-1 flex-col gap-2 overflow-y-auto">
        {messages.map(m => (
          <div
            key={m._id}
            className={`group flex max-w-xs items-start gap-2 ${
              m.senderId === userId ? "self-end" : "self-start"
            }`}
          >
            <div
              className={`rounded p-2 ${
                m.senderId === userId ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
              }`}
            >
              <div className={`mb-1 text-xs ${m.senderId === userId ? "text-blue-100" : "text-gray-600"}`}>
                {new Date(m.createdAt).toLocaleTimeString()}
              </div>
              {m.text}
            </div>
            {m.senderId === userId && (
              <button
                type="button"
                onClick={() => deleteMessage(m._id)}
                disabled={deletingId === m._id}
                aria-label="Delete message"
                className="mt-1 rounded p-1 text-gray-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
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
