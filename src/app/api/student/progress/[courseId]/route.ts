import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { CourseProgress } from "@/models/course-progress"
import { Video } from "@/models/video"
import { recalculateAndSaveCourseProgress } from "@/lib/course-progress"

function toIdString(id: unknown) {
  if (typeof id === "string") return id
  if (id && typeof (id as { toString?: unknown }).toString === "function") return (id as { toString: () => string }).toString()
  return ""
}

type VideoWatchDetail = {
  percentWatched: number
  watchDurationSeconds: number
  lastWatchedAt: string | null
  completed: boolean
}

type QuizProgressOut = {
  quizId: string
  bestScorePercent: number
  latestScorePercent: number
  attemptCount: number
  passed: boolean
  completed: boolean
  lastSubmittedAt: string | null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await params
    await dbConnect()

    const [totalVideos, progressDoc] = await Promise.all([
      (Video as any).countDocuments({ course: courseId }),
      (CourseProgress as any).findOne({
        student: session.user.id,
        course: courseId,
      }).lean(),
    ])

    const completedVideos = progressDoc?.completedVideos?.length ?? 0
    const videoOnlyPercent =
      totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 10000) / 100 : 0

<<<<<<< HEAD
    const videoProgressObj = (progressDoc?.videoProgress || {}) as Record<string, number>
    const timeSpent = Object.values(videoProgressObj).reduce((sum, v) => sum + (Number(v) || 0), 0)

    return NextResponse.json({
      completedVideos,
      totalVideos,
      percentageCompleted,
=======
    const hasBreakdown = !!(progressDoc as { breakdown?: { lessons?: unknown } } | null)?.breakdown?.lessons
    const weightedPercent =
      hasBreakdown && typeof progressDoc?.percentageCompleted === "number"
        ? progressDoc.percentageCompleted
        : videoOnlyPercent

    const videoProgressObj = (progressDoc?.videoProgress || {}) as Record<string, number>
    const timeSpent = Object.values(videoProgressObj).reduce((sum, v) => sum + (Number(v) || 0), 0)

    const rawDetails = (progressDoc?.videoWatchDetails || {}) as Record<string, Partial<VideoWatchDetail>>
    const videoWatchDetails: Record<string, VideoWatchDetail> = {}
    const allVideoIds = new Set([...Object.keys(videoProgressObj), ...Object.keys(rawDetails)])
    for (const vid of allVideoIds) {
      const secs = videoProgressObj[vid] ?? 0
      const meta = rawDetails[vid] || {}
      const inCompleted = (progressDoc?.completedVideos || []).some((id: unknown) => toIdString(id) === vid)
      videoWatchDetails[vid] = {
        percentWatched: typeof meta.percentWatched === "number" ? meta.percentWatched : 0,
        watchDurationSeconds: typeof meta.watchDurationSeconds === "number" ? meta.watchDurationSeconds : secs,
        lastWatchedAt: meta.lastWatchedAt ? new Date(meta.lastWatchedAt as string | Date).toISOString() : null,
        completed: !!meta.completed || inCompleted,
      }
    }

    const quizProgress: QuizProgressOut[] = ((progressDoc?.quizProgress || []) as unknown[]).map((row) => {
      const r = row as {
        quiz?: unknown
        bestScorePercent?: number
        latestScorePercent?: number
        attemptCount?: number
        passed?: boolean
        completed?: boolean
        lastSubmittedAt?: Date
      }
      return {
        quizId: toIdString(r.quiz),
        bestScorePercent: r.bestScorePercent ?? 0,
        latestScorePercent: r.latestScorePercent ?? 0,
        attemptCount: r.attemptCount ?? 0,
        passed: !!r.passed,
        completed: !!r.completed,
        lastSubmittedAt: r.lastSubmittedAt ? new Date(r.lastSubmittedAt).toISOString() : null,
      }
    })

    return NextResponse.json({
      completedVideos,
      totalVideos,
      percentageCompleted: weightedPercent,
      videoOnlyPercent,
>>>>>>> branch-13
      lastAccessedVideo: progressDoc?.lastAccessedVideo ? String(progressDoc.lastAccessedVideo) : null,
      timeSpent,
      completedVideoIds: (progressDoc?.completedVideos || []).map((id: unknown) => String(id)),
      videoProgress: videoProgressObj,
<<<<<<< HEAD
=======
      videoWatchDetails,
      breakdown: progressDoc?.breakdown ?? null,
      isCourseComplete: !!progressDoc?.isComplete,
      quizProgress,
      updatedAt: progressDoc?.updatedAt ? new Date(progressDoc.updatedAt).toISOString() : null,
>>>>>>> branch-13
    })
  } catch (error) {
    console.error("Error fetching student progress:", error)
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await params
    const { videoId, currentTime, duration } = (await req.json()) as {
      videoId?: string
      currentTime?: number
      duration?: number
    }

    if (!videoId || typeof currentTime !== "number") {
      return NextResponse.json({ error: "videoId and currentTime are required" }, { status: 400 })
    }

    await dbConnect()

    const progress =
      (await (CourseProgress as any).findOne({
        student: session.user.id,
        course: courseId,
      })) ||
      new CourseProgress({
        student: session.user.id,
        course: courseId,
        completedVideos: [],
        submittedAssignments: [],
        passedQuizzes: [],
        quizProgress: [],
        videoProgress: {},
        videoWatchDetails: {},
      })

    const key = String(videoId)
    const existingSeconds = Number(progress.videoProgress?.get?.(key) || 0)
    const nextSeconds = Math.max(existingSeconds, Math.floor(currentTime))

    if (progress.videoProgress?.set) {
      progress.videoProgress.set(key, nextSeconds)
    } else {
      progress.videoProgress = { ...(progress.videoProgress || {}), [key]: nextSeconds }
    }

    const durationOk = typeof duration === "number" && duration > 0
    const percentWatched = durationOk ? Math.min(100, Math.round((nextSeconds / duration) * 10000) / 100) : 0
    const isCompletedByTime = durationOk && nextSeconds / duration >= 0.8

    const prevDetails = ((progress.videoWatchDetails || {}) as Record<string, Record<string, unknown>>)[key] || {}
    const nextDetails = {
      percentWatched: Math.max(Number(prevDetails.percentWatched) || 0, percentWatched),
      watchDurationSeconds: nextSeconds,
      lastWatchedAt: new Date(),
      completed: !!(prevDetails.completed || isCompletedByTime),
    }
    progress.videoWatchDetails = {
      ...(typeof progress.videoWatchDetails === "object" && progress.videoWatchDetails !== null
        ? progress.videoWatchDetails
        : {}),
      [key]: nextDetails,
    }
    progress.markModified("videoWatchDetails")

    if (isCompletedByTime && !progress.completedVideos.some((id: unknown) => String(id) === key)) {
      progress.completedVideos.push(key)
    }
    progress.lastAccessedVideo = key
<<<<<<< HEAD

    const totalVideos = await Video.countDocuments({ course: params.courseId })
    progress.percentageCompleted =
      totalVideos > 0
        ? Math.round((progress.completedVideos.length / totalVideos) * 10000) / 100
        : 0
=======
>>>>>>> branch-13
    progress.updatedAt = new Date()
    await progress.save()

    const refreshed = await recalculateAndSaveCourseProgress(session.user.id, courseId)

    return NextResponse.json({
      message: "Progress updated",
      completedVideos: refreshed?.completedVideos?.length ?? progress.completedVideos.length,
      percentageCompleted: refreshed?.percentageCompleted ?? 0,
      videoMeta: {
        percentWatched: nextDetails.percentWatched,
        watchDurationSeconds: nextDetails.watchDurationSeconds,
        lastWatchedAt: nextDetails.lastWatchedAt.toISOString(),
        completed: nextDetails.completed || isCompletedByTime,
      },
    })
  } catch (error) {
    console.error("Error updating student progress:", error)
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 })
  }
}
