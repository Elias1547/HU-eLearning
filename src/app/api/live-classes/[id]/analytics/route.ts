import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { LiveClass } from "@/models/live-class"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"

type AnalyticsSession = {
  user: {
    id: string
    role: string
  }
}

type AnalyticsLiveClass = {
  teacher: { toString(): string }
  course: { toString(): string }
}

async function validateAnalyticsAccess(session: AnalyticsSession, liveClass: AnalyticsLiveClass) {
  if (session.user.role === "teacher") {
    const teacher = await Teacher.findById(session.user.id).lean()
    return Boolean(teacher && liveClass.teacher.toString() === teacher._id.toString())
  }

  if (session.user.role === "student") {
    const student = await Student.findById(session.user.id).lean()
    return Boolean(
      student &&
        !student.isBlocked &&
        student.purchasedCourses?.some((courseId) => courseId.toString() === liveClass.course.toString())
    )
  }

  return session.user.role === "admin"
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const liveClass = await LiveClass.findById(params.id).lean()
    if (!liveClass) {
      return NextResponse.json({ error: "Live class not found" }, { status: 404 })
    }

    const hasAccess = await validateAnalyticsAccess(session, liveClass)
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized access to analytics" }, { status: 403 })
    }

    const attendeeCount = liveClass.attendees?.length || 0
    const startedAt = liveClass.startedAt || liveClass.scheduledDate
    const endedAt = liveClass.endedAt
    const durationMinutes =
      startedAt && endedAt ? Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)) : 0

    return NextResponse.json({
      platform: "zoom",
      status: liveClass.status,
      isLive: liveClass.isLive,
      viewerCount: attendeeCount,
      peakViewers: attendeeCount,
      totalAttendees: attendeeCount,
      averageWatchTime: durationMinutes,
      startedAt: liveClass.startedAt,
      endedAt: liveClass.endedAt,
      liveClassId: liveClass._id.toString(),
    })
  } catch (error) {
    console.error("Error fetching live class analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Live classes now use Zoom. Analytics are derived from saved class data only." },
    { status: 410 }
  )
}
