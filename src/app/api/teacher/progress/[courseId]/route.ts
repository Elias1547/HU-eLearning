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
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const course = await Course.findById(params.courseId).lean()
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }
    if (String((course as { teacher?: unknown }).teacher) !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const totalVideos = await Video.countDocuments({ course: params.courseId })
    const studentIds = ((course as { studentsPurchased?: unknown[] }).studentsPurchased || []).map(
      (id) => String(id)
    )
    const [students, progressRows] = await Promise.all([
      Student.find({ _id: { $in: studentIds } }).select("name email").lean(),
      CourseProgress.find({ course: params.courseId, student: { $in: studentIds } }).lean(),
    ])

    const progressMap = new Map(
      progressRows.map((row) => [String((row as { student?: unknown }).student), row])
    )

    const result = students.map((student) => {
      const progress = progressMap.get(String((student as { _id?: unknown })._id))
      const completed = (progress as { completedVideos?: unknown[] } | undefined)
        ?.completedVideos?.length ?? 0
      return {
        studentId: String((student as { _id?: unknown })._id),
        name: (student as { name?: string }).name || "Student",
        email: (student as { email?: string }).email || "",
        completedVideos: completed,
        totalVideos,
        percentageCompleted:
          totalVideos > 0 ? Math.round((completed / totalVideos) * 10000) / 100 : 0,
      }
    })

    return NextResponse.json({ students: result })
  } catch (error) {
    console.error("Error fetching teacher progress:", error)
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 })
  }
}
