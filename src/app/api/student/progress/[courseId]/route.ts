import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { CourseProgress } from "@/models/course-progress"
import { Video } from "@/models/video"

export async function GET(
  _req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const [totalVideos, progressDoc] = await Promise.all([
      Video.countDocuments({ course: params.courseId }),
      CourseProgress.findOne({
        student: session.user.id,
        course: params.courseId,
      }).lean(),
    ])

    const completedVideos = progressDoc?.completedVideos?.length ?? 0
    const percentageCompleted =
      totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 10000) / 100 : 0

    const videoProgressObj = (progressDoc?.videoProgress || {}) as Record<string, number>
    const timeSpent = Object.values(videoProgressObj).reduce((sum, v) => sum + (Number(v) || 0), 0)

    return NextResponse.json({
      completedVideos,
      totalVideos,
      percentageCompleted,
      lastAccessedVideo: progressDoc?.lastAccessedVideo ? String(progressDoc.lastAccessedVideo) : null,
      timeSpent,
      completedVideoIds: (progressDoc?.completedVideos || []).map((id: unknown) => String(id)),
      videoProgress: videoProgressObj,
    })
  } catch (error) {
    console.error("Error fetching student progress:", error)
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { videoId, currentTime, duration } = (await req.json()) as {
      videoId?: string
      currentTime?: number
      duration?: number
    }

    if (!videoId || typeof currentTime !== "number") {
      return NextResponse.json(
        { error: "videoId and currentTime are required" },
        { status: 400 }
      )
    }

    await dbConnect()

    const progress =
      (await CourseProgress.findOne({
        student: session.user.id,
        course: params.courseId,
      })) ||
      new CourseProgress({
        student: session.user.id,
        course: params.courseId,
        completedVideos: [],
        videoProgress: {},
      })

    const key = String(videoId)
    const existingSeconds = Number(progress.videoProgress?.get?.(key) || 0)
    const nextSeconds = Math.max(existingSeconds, Math.floor(currentTime))

    if (progress.videoProgress?.set) {
      progress.videoProgress.set(key, nextSeconds)
    } else {
      progress.videoProgress = { ...(progress.videoProgress || {}), [key]: nextSeconds }
    }

    const isCompletedByTime =
      typeof duration === "number" && duration > 0 && nextSeconds / duration >= 0.8
    if (
      isCompletedByTime &&
      !progress.completedVideos.some((id: unknown) => String(id) === key)
    ) {
      progress.completedVideos.push(key)
    }
    progress.lastAccessedVideo = key

    const totalVideos = await Video.countDocuments({ course: params.courseId })
    progress.percentageCompleted =
      totalVideos > 0
        ? Math.round((progress.completedVideos.length / totalVideos) * 10000) / 100
        : 0
    progress.updatedAt = new Date()
    await progress.save()

    return NextResponse.json({
      message: "Progress updated",
      completedVideos: progress.completedVideos.length,
      percentageCompleted: progress.percentageCompleted,
    })
  } catch (error) {
    console.error("Error updating student progress:", error)
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 })
  }
}
