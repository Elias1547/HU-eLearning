"use client"

import AdaptiveVideoPlayer from "@/components/video/adaptive-video-player"
import { useEffect, useRef, useState } from "react"

interface Props {
  src: string
  title: string
  poster?: string
  courseId: string
  videoId: string
}

export default function LearnVideoClient({
  src,
  title,
  poster,
  courseId,
  videoId,
}: Props) {
  const [currentTime, setCurrentTime] = useState(0)
  const durationRef = useRef(0)
  const lastSentRef = useRef(0)

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
    // send progress roughly every 10 seconds to reduce API calls
    if (time - lastSentRef.current >= 10) {
      lastSentRef.current = time
      fetch(`/api/student/progress/${courseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          currentTime: time,
          duration: durationRef.current,
        }),
      }).catch(() => {})
    }
  }

  const handleDurationChange = (duration: number) => {
    durationRef.current = duration
  }

  useEffect(() => {
    // initial ping so progress row exists
    fetch(`/api/student/progress/${courseId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId,
        currentTime,
        duration: durationRef.current,
      }),
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, videoId])

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
    />
  )
}