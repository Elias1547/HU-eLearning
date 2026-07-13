"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Announcement = {
  _id: string
  title: string
  message?: string
  createdAt: string
}

type Notification = {
  _id: string
  title: string
  body?: string
  link?: string
  createdAt: string
}

export default function AnnauncementBell() {
  const [announcementCount, setAnnouncementCount] = useState(0)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])

  const newCount = announcementCount + notifications.length

  const fetchAnnouncements = useCallback(async () => {
    const res = await fetch("/api/announcements")
    const data = await res.json()
    if (!res.ok) return

    const lastSeen = localStorage.getItem("announcementsLastSeen") || ""
    const announcementItems = Array.isArray(data.announcements)
      ? (data.announcements as Announcement[])
      : []
    const newAnnouncements = announcementItems.filter(
      (announcement) => announcement.createdAt > lastSeen
    )

    setAnnouncements(announcementItems.slice(0, 3))
    setAnnouncementCount(newAnnouncements.length)
  }, [])

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications?unreadOnly=true&limit=5")
    const data = await res.json()
    if (!res.ok) return

    setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
  }, [])

  const refreshBell = useCallback(async () => {
    await Promise.all([fetchAnnouncements(), fetchNotifications()])
  }, [fetchAnnouncements, fetchNotifications])

  const markNotificationsRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    })
    setNotifications([])
  }

  const markNotificationRead = async (notificationId: string) => {
    setNotifications((current) => current.filter((notification) => notification._id !== notificationId))
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    })
  }

  useEffect(() => {
    refreshBell()
    const interval = setInterval(refreshBell, 30_000)
    return () => clearInterval(interval)
  }, [refreshBell])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Announcements and notifications${newCount ? `, ${newCount} unread` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {newCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none text-white">
              {newCount > 99 ? "99+" : newCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-3">
          <span>Notifications</span>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={markNotificationsRead}
              className="text-xs font-normal text-primary hover:underline"
            >
              Mark read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <DropdownMenuItem key={notification._id} asChild>
              <Link
                href={notification.link || "/student/dashboard"}
                className="flex flex-col items-start gap-1 py-2"
                onClick={() => markNotificationRead(notification._id)}
              >
                <span className="line-clamp-2 text-sm font-medium">{notification.title}</span>
                {notification.body && (
                  <span className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</span>
                )}
              </Link>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-2 py-3 text-sm text-muted-foreground">No unread course notifications.</div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Announcements</DropdownMenuLabel>
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <DropdownMenuItem key={announcement._id} asChild>
              <Link href="/announcements" className="flex flex-col items-start gap-1 py-2">
                <span className="line-clamp-1 text-sm font-medium">{announcement.title}</span>
                {announcement.message && (
                  <span className="line-clamp-2 text-xs text-muted-foreground">{announcement.message}</span>
                )}
              </Link>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-2 py-3 text-sm text-muted-foreground">No announcements yet.</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
