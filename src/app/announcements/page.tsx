"use client"

import AnnouncementDropdown from "@/components/AnnouncementDropdown"
import { useEffect, useState } from "react"

type Announcement = {
  _id: string
  title: string
  message: string
  scope: "global" | "course"
  createdAt: string
}

export default function StudentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

 
  const fetchAnnouncements = async () => {
    const res = await fetch("/api/announcements")
    const data = await res.json()
    if (res.ok) setAnnouncements(data.announcements)
    setLoading(false)

    // Mark all announcements as seen
    if (data.announcements.length > 0) {
      localStorage.setItem(
        "announcementsLastSeen",
        data.announcements[0].createdAt
      )
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">

      <h1 className="text-2xl font-bold">Announcements</h1>
    

      {loading ? (
        <div>Loading...</div>
      ) : announcements.length === 0 ? (
        <div>No announcements yet.</div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a._id} className="border p-4 rounded shadow-sm">
              <div className="flex justify-between">
                <h3 className="font-semibold">{a.title}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    a.scope === "global"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {a.scope}
                </span>
              </div>

              <p className="mt-2 text-gray-700">{a.message}</p>

              <div className="text-xs text-gray-400 mt-2">
                {new Date(a.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}