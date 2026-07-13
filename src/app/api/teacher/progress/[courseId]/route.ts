import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Course } from "@/models/course"
import { Student } from "@/models/student"
import { CourseProgress } from "@/models/course-progress"
import { Video } from "@/models/video"

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await context.params
    await dbConnect()

    const course = await (Course as any).findById(courseId).lean()
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }
    if (String((course as { teacher?: unknown }).teacher) !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const totalVideos = await (Video as any).countDocuments({ course: courseId })
    const studentIds = ((course as { studentsPurchased?: unknown[] }).studentsPurchased || []).map(
      (id) => String(id)
    )
    const [students, progressRows] = await Promise.all([
      (Student as any).find({ _id: { $in: studentIds } }).select("name email").lean(),
      (CourseProgress as any).find({ course: courseId, student: { $in: studentIds } }).lean(),
    ])

    const progressMap = new Map(
      (progressRows as { student?: unknown }[]).map((row: { student?: unknown }) => [String(row.student), row])
    )

    const result = (students as { _id?: unknown; name?: string; email?: string }[]).map((student) => {
      const progress = progressMap.get(String((student as { _id?: unknown })._id)) as
        | {
            completedVideos?: unknown[]
            percentageCompleted?: number
            breakdown?: { lessons?: unknown }
            isComplete?: boolean
          }
        | undefined
      const completed = progress?.completedVideos?.length ?? 0
      const videoOnlyPercent = totalVideos > 0 ? Math.round((completed / totalVideos) * 10000) / 100 : 0
      const hasBreakdown = !!progress?.breakdown?.lessons
      const percentageCompleted =
        hasBreakdown && typeof progress?.percentageCompleted === "number"
          ? progress.percentageCompleted
          : videoOnlyPercent
      return {
        studentId: String((student as { _id?: unknown })._id),
        name: (student as { name?: string }).name || "Student",
        email: (student as { email?: string }).email || "",
        completedVideos: completed,
        totalVideos,
        percentageCompleted,
        videoOnlyPercent,
        isCourseComplete: !!progress?.isComplete,
      }
    })

    return NextResponse.json({ students: result })
  } catch (error) {
    console.error("Error fetching teacher progress:", error)
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 })
  }
}
