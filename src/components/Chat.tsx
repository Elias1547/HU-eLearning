"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getSocket } from "@/lib/socket-client"
import type { ChatMessage, ConversationContact } from "@/lib/chat-types"
import { MessageSquare, Search, Send, Video, Wifi, WifiOff } from "lucide-react"

interface ChatProps {
  userId: string
  userRole: "teacher" | "student"
  receiverId?: string
}

function sortConversations(a: ConversationContact, b: ConversationContact) {
  if (!a.lastMessageAt && !b.lastMessageAt) return a.name.localeCompare(b.name)
  if (!a.lastMessageAt) return 1
  if (!b.lastMessageAt) return -1
  return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
}

function formatConversationTime(value: string | null) {
  if (!value) return ""

  const date = new Date(value)
  const now = new Date()
  const isSameDay = date.toDateString() === now.toDateString()

  return isSameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" })
}

export default function Chat({ userId, userRole, receiverId }: ChatProps) {
  const router = useRouter()
  const [conversations, setConversations] = useState<ConversationContact[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [search, setSearch] = useState("")
  const [text, setText] = useState("")
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [isSocketConnected, setIsSocketConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeConversation = useMemo(() => {
    if (!conversations.length) return null
    if (!receiverId) return conversations[0]
    return conversations.find((conversation) => conversation._id === receiverId) || null
  }, [conversations, receiverId])

  const filteredConversations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return conversations

    return conversations.filter((conversation) => {
      const courseNames = conversation.sharedCourses.map((course) => course.name.toLowerCase())
      return (
        conversation.name.toLowerCase().includes(normalizedSearch) ||
        conversation.email.toLowerCase().includes(normalizedSearch) ||
        courseNames.some((courseName) => courseName.includes(normalizedSearch))
      )
    })
  }, [conversations, search])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch("/api/users-for-chat")
        if (!response.ok) throw new Error("Failed to fetch conversations")
        const data: ConversationContact[] = await response.json()
        setConversations(data)
      } catch (error) {
        console.error(error)
        toast.error("Unable to load conversations right now.")
      } finally {
        setLoadingConversations(false)
      }
    }

    void fetchConversations()
  }, [])

  useEffect(() => {
    if (loadingConversations || conversations.length === 0 || activeConversation) return

    const firstConversation = conversations[0]
    router.replace(`/${userRole}/message/${firstConversation.role}/${firstConversation._id}`)
  }, [activeConversation, conversations, loadingConversations, router, userRole])

  useEffect(() => {
    if (!activeConversation?._id) {
      setMessages([])
      return
    }

    const fetchMessages = async () => {
      setLoadingMessages(true)
      try {
        const response = await fetch(`/api/messages?receiverId=${activeConversation._id}`)
        if (!response.ok) throw new Error("Failed to fetch messages")
        const data: ChatMessage[] = await response.json()
        setMessages(data)
      } catch (error) {
        console.error(error)
        toast.error("Unable to load this conversation.")
      } finally {
        setLoadingMessages(false)
      }
    }

    void fetchMessages()
  }, [activeConversation?._id])

  useEffect(() => {
    const socket = getSocket()

    const handleConnect = () => setIsSocketConnected(true)
    const handleDisconnect = () => setIsSocketConnected(false)
    const handleNewMessage = (message: ChatMessage) => {
      const isForActiveThread =
        activeConversation &&
        ((message.senderId === userId && message.receiverId === activeConversation._id) ||
          (message.senderId === activeConversation._id && message.receiverId === userId))

      if (isForActiveThread) {
        setMessages((currentMessages) =>
          currentMessages.some((currentMessage) => currentMessage._id === message._id)
            ? currentMessages
            : [...currentMessages, message]
        )
      }

      setConversations((currentConversations) =>
        currentConversations
          .map((conversation) =>
            conversation._id === message.senderId || conversation._id === message.receiverId
              ? {
                  ...conversation,
                  lastMessage: message.text,
                  lastMessageAt: message.createdAt,
                }
              : conversation
          )
          .sort(sortConversations)
      )
    }

    socket.on("connect", handleConnect)
    socket.on("disconnect", handleDisconnect)
    socket.on("message:new", handleNewMessage)
    socket.connect()
    setIsSocketConnected(socket.connected)

    return () => {
      socket.off("connect", handleConnect)
      socket.off("disconnect", handleDisconnect)
      socket.off("message:new", handleNewMessage)
    }
  }, [activeConversation, userId])

  const openConversation = (conversation: ConversationContact) => {
    router.push(`/${userRole}/message/${conversation.role}/${conversation._id}`)
  }

  const sendMessage = async () => {
    if (!activeConversation || !text.trim() || sending) return

    setSending(true)
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: activeConversation._id,
          text: text.trim(),
        }),
      })

      if (!response.ok) throw new Error("Failed to send message")

      const newMessage: ChatMessage = await response.json()
      setMessages((currentMessages) =>
        currentMessages.some((currentMessage) => currentMessage._id === newMessage._id)
          ? currentMessages
          : [...currentMessages, newMessage]
      )
      setConversations((currentConversations) =>
        currentConversations
          .map((conversation) =>
            conversation._id === activeConversation._id
              ? {
                  ...conversation,
                  lastMessage: newMessage.text,
                  lastMessageAt: newMessage.createdAt,
                }
              : conversation
          )
          .sort(sortConversations)
      )
      setText("")
    } catch (error) {
      console.error(error)
      toast.error("Message could not be sent.")
    } finally {
      setSending(false)
    }
  }

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  return (
    <div className="grid h-[calc(100vh-11rem)] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="flex min-h-0 flex-col overflow-hidden border-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.05))] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="border-b bg-background/80 px-4 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Messages</h1>
              <p className="text-sm text-muted-foreground">
                Chat with {userRole === "teacher" ? "your enrolled students" : "your course instructors"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isSocketConnected ? "default" : "secondary"} className="gap-1">
                {isSocketConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isSocketConnected ? "Live" : "Offline"}
              </Badge>
              <Badge variant="secondary">{conversations.length}</Badge>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people or course"
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {loadingConversations ? (
            <div className="p-4 text-sm text-muted-foreground">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No conversations available</p>
              <p className="text-sm text-muted-foreground">
                {userRole === "teacher"
                  ? "Students appear here after enrolling in one of your courses."
                  : "Teachers appear here from the courses you have enrolled in."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conversation) => {
                const isActive = activeConversation?._id === conversation._id

                return (
                  <button
                    key={conversation._id}
                    type="button"
                    onClick={() => openConversation(conversation)}
                    className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors ${
                      isActive
                        ? "bg-[linear-gradient(90deg,rgba(59,130,246,0.12),rgba(14,165,233,0.08))]"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <Avatar className="h-11 w-11">
                      <AvatarFallback>
                        {conversation.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate font-medium">{conversation.name}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatConversationTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {conversation.lastMessage || conversation.email}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {conversation.sharedCourses.slice(0, 2).map((course) => (
                          <Badge key={course._id} variant="outline" className="max-w-full truncate">
                            {course.name}
                          </Badge>
                        ))}
                        {conversation.sharedCourses.length > 2 && (
                          <Badge variant="outline">+{conversation.sharedCourses.length - 2} more</Badge>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      <Card className="flex min-h-0 flex-col overflow-hidden border-0 bg-background shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        {activeConversation ? (
          <>
            <div className="border-b bg-[linear-gradient(180deg,rgba(14,165,233,0.08),rgba(255,255,255,0.9))] px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {activeConversation.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">{activeConversation.name}</h2>
                    <Badge variant="secondary" className="capitalize">
                      {activeConversation.role}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{activeConversation.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeConversation.sharedCourses.map((course) => (
                      <Badge key={course._id} variant="outline" className="gap-1">
                        <Video className="h-3 w-3" />
                        {course.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_35%),linear-gradient(to_bottom,_rgba(248,250,252,1),_rgba(255,255,255,1))] px-5 py-5">
              {loadingMessages ? (
                <div className="text-sm text-muted-foreground">Loading conversation...</div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">No messages yet</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Start the conversation about your shared course and keep everything in one place.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const isMine = message.senderId === userId
                    const previousMessage = messages[index - 1]
                    const showTimestamp =
                      !previousMessage ||
                      new Date(message.createdAt).getTime() -
                        new Date(previousMessage.createdAt).getTime() >
                        5 * 60 * 1000

                    return (
                      <div key={message._id}>
                        {showTimestamp && (
                          <div className="mb-3 text-center text-xs text-muted-foreground">
                            {new Date(message.createdAt).toLocaleString()}
                          </div>
                        )}
                        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                              isMine
                                ? "bg-primary text-primary-foreground"
                                : "border bg-background text-foreground"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {message.text}
                            </p>
                            <div
                              className={`mt-2 text-[11px] ${
                                isMine ? "text-primary-foreground/75" : "text-muted-foreground"
                              }`}
                            >
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="border-t bg-background px-5 py-4">
              <div className="flex items-end gap-3">
                <Input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={`Message ${activeConversation.name}...`}
                  className="h-12 rounded-xl"
                />
                <Button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!text.trim() || sending}
                  className="h-12 rounded-xl px-5"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Select a conversation</p>
            <p className="text-sm text-muted-foreground">
              Choose an enrolled-course conversation from the inbox to start messaging.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
