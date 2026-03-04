"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function Navba() {
  const [newCount, setNewCount] = useState(0)

  const fetchAnnouncements = async () => {
    const res = await fetch("/api/announcements")
    const data = await res.json()
    if (!res.ok) return

    const lastSeen = localStorage.getItem("announcementsLastSeen") || ""
    const newAnnouncements = data.announcements.filter(
      (a: any) => a.createdAt > lastSeen
    )

    setNewCount(newAnnouncements.length)
  }

  useEffect(() => {
    fetchAnnouncements()
    const interval = setInterval(fetchAnnouncements, 30_000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <nav className="flex justify-between items-center p-4 border-b">
      
      <Link href="/announcements" className="relative flex items-center">
       🔔
        {newCount > 0 && (
          <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
            {newCount}
          </span>
        )}
      </Link>
    </nav>
  )
}