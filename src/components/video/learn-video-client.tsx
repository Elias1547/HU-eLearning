"use client"

import AdaptiveVideoPlayer from "@/components/video/adaptive-video-player"
import { useState } from "react"

interface Props {
  src: string
  title: string
  poster?: string
}

export default function LearnVideoClient({
  src,
  title,
  poster,
}: Props) {
  const [currentTime, setCurrentTime] = useState(0)

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
    console.log("Video progress:", time)
  }

  const handleDurationChange = (duration: number) => {
    console.log("Video duration:", duration)
  }

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