"use client"

import AdaptiveVideoPlayer from "@/components/video/adaptive-video-player"
import { useCallback, useEffect, useRef } from "react"

interface Props {
  src: string
  title: string
  poster?: string
  courseId: string
  videoId: string
}

function postProgress(courseId: string, videoId: string, currentTime: number, duration: number, keepalive?: boolean) {
  const body = JSON.stringify({
    videoId,
    currentTime,
    duration,
  })
  return fetch(`/api/student/progress/${courseId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: !!keepalive,
  })
}

export default function LearnVideoClient({
  src,
  title,
  poster,
  courseId,
  videoId,
}: Props) {
  const durationRef = useRef(0)
  const lastSentRef = useRef(0)
  const currentTimeRef = useRef(0)

  const flush = useCallback(
    (opts?: { keepalive?: boolean }) => {
      const t = currentTimeRef.current
      const d = durationRef.current
      if (d <= 0 && t <= 0) return Promise.resolve()
      return postProgress(courseId, videoId, t, d, opts?.keepalive).catch(() => {})
    },
    [courseId, videoId]
  )

  const handleTimeUpdate = (time: number) => {
    currentTimeRef.current = time
    if (time - lastSentRef.current >= 10) {
      lastSentRef.current = time
      flush()
    }
  }

  const handleDurationChange = (duration: number) => {
    durationRef.current = duration
  }

  const handleEnded = () => {
    flush()
  }

  useEffect(() => {
    lastSentRef.current = 0
    currentTimeRef.current = 0
    durationRef.current = 0
    flush().catch(() => {})
  }, [courseId, videoId, flush])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flush({ keepalive: true })
      }
    }
    const onPageHide = () => flush({ keepalive: true })
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("pagehide", onPageHide)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", onPageHide)
    }
  }, [flush])

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
      onEnded={handleEnded}
    />
  )
}
