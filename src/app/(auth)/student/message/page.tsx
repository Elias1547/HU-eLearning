"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import type { ConversationContact } from "@/lib/chat-types"

export default function StudentMessageListPage() {
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<ConversationContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user) return

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users-for-chat")
        if (!res.ok) throw new Error("Failed to fetch users")
        const data: ConversationContact[] = await res.json()
        setUsers(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [session])

  if (status === "loading" || loading) return <p className="p-6">Loading...</p>
  if (!session?.user) return <p className="p-6">Please login to see messages</p>

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Messages</h1>
      {users.length === 0 && <p>No instructors available to chat.</p>}
      {users.map((user) => (
        <Link
          key={user._id.toString()}
          href={`/student/message/teacher/${user._id.toString()}`}
          className="mb-2 block rounded border p-3 transition hover:bg-gray-100"
        >
          <div className="font-medium">{user.name}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            Your enrolled courses: {user.sharedCourses.map((course) => course.name).join(", ")}
          </div>
          {user.lastMessage && (
            <div className="mt-2 truncate text-sm text-muted-foreground">
              Last message: {user.lastMessage}
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}
