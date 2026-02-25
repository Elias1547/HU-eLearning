"use client"

import { useSession } from "next-auth/react"
import Chat from "@/components/Chat"

interface ChatPageProps {
  params: {
    role: "teacher" | "student"
    userId: string
  }
}

export default function ChatPage({ params }: ChatPageProps) {
  const { data: session, status } = useSession()

  if (status === "loading") return <p>Loading session...</p>
  if (!session?.user) return <p>Please login to chat</p>

  return (
    <div className="h-[600px] p-4 border rounded">
      <Chat
        userId={session.user.id}
        userRole={session.user.role as "teacher" | "student"}
        receiverId={params.userId}
        receiverRole={params.role}
      />
    </div>
  )
}