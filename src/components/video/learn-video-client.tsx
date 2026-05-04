"use client"

import AdaptiveVideoPlayer from "@/components/video/adaptive-video-player"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"

interface Props {
  src: string
  title: string
  poster?: string
  courseId: string
  videoId: string
  initialDurationSeconds?: number
}

export default function LearnVideoClient({
  src,
  title,
  poster,
  courseId,
  videoId,
  initialDurationSeconds,
}: Props) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState(0)
  const [durationSeconds, setDurationSeconds] = useState(initialDurationSeconds || 0)
  const lastSentTimeRef = useRef(0)
  const pendingTimeRef = useRef(0)
  const saveInFlightRef = useRef(false)

  const persistProgress = useCallback(async (markCompleted = false, force = false) => {
    if (!session?.user?.id || session.user.role !== "student") return

    const timeToPersist = pendingTimeRef.current
    const timeDelta = Math.abs(timeToPersist - lastSentTimeRef.current)

    if (!force && !markCompleted && timeDelta < 10) {
      return
    }

    if (saveInFlightRef.current && !force) {
      return
    }

    saveInFlightRef.current = true

    try {
      await fetch(`/api/student/progress/${courseId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoId,
          currentTimeSeconds: timeToPersist,
          durationSeconds,
          markCompleted,
        }),
        keepalive: force,
      })

      lastSentTimeRef.current = timeToPersist
    } catch (error) {
      console.error("Failed to persist course progress:", error)
    } finally {
      saveInFlightRef.current = false
    }
  }, [courseId, durationSeconds, session?.user?.id, session?.user?.role, videoId])

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
    pendingTimeRef.current = time
  }

  const handleDurationChange = (duration: number) => {
    setDurationSeconds(duration)
  }

  useEffect(() => {
    if (!session?.user?.id || session.user.role !== "student") return

    const interval = window.setInterval(() => {
      void persistProgress(false, false)
    }, 15000)

    return () => {
      window.clearInterval(interval)
    }
  }, [persistProgress, session?.user?.id, session?.user?.role])

  useEffect(() => {
    return () => {
      if (pendingTimeRef.current > 0) {
        void persistProgress(false, true)
      }
    }
  }, [pathname, persistProgress])

  return (
    <AdaptiveVideoPlayer
      src={src}
      title={title}
      className="w-full h-full"
      autoPlay={false}
      controls
      poster={poster}
      onTimeUpdate={handleTimeUpdate}
      onDurationChange={handleDurationChange}
      onEnded={() => {
        pendingTimeRef.current = durationSeconds || currentTime
        void persistProgress(true, true)
      }}
    />
  )
}
