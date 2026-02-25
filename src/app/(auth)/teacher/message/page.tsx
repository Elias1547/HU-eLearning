"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import Link from "next/link"

interface User {
  _id: string
  name: string
  email: string
}

export default function MessageListPage() {
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user) return

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users-for-chat")
        if (!res.ok) throw new Error("Failed to fetch users")
        const data: User[] = await res.json()
        setUsers(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [session])

  if (status === "loading" || loading) return <p>Loading...</p>
  if (!session?.user) return <p>Please login to see messages</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      {users.length === 0 && <p>No users available to chat.</p>}
      {users.map((user) => (
        <Link
          key={user._id.toString()}
          href={`/${
            session.user.role === "teacher"
              ? "teacher/message/student"
              : "student/message/teacher"
          }/${user._id.toString()}`}
          className="block p-3 border rounded mb-2 hover:bg-gray-100"
        >
          {user.name}
        </Link>
      ))}
    </div>
  )
}