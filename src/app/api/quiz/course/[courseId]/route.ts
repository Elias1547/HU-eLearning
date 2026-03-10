import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Course } from "@/models/course"
import { Quiz } from "@/models/quiz"
import { Student } from "@/models/student"

// Helper to safely convert any id to string
function toIdString(id: unknown) {
  if (typeof id === "string") return id
  if (id && typeof (id as { toString?: unknown }).toString === "function") {
    return (id as { toString: () => string }).toString()
  }
  return ""
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    // Await params before using
    const { courseId } = await context.params

    // Check session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    // Find course
    const course = await Course.findById(courseId).lean()
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Build query for quizzes
    const query: Record<string, unknown> = { course: courseId }

    // Role-based access control
    if (session.user.role === "teacher") {
      if (course.teacher?.toString() !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (session.user.role === "student") {
      const student = await Student.findById(session.user.id).lean()
      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

      const purchasedCourses = student.purchasedCourses?.map((id: unknown) => toIdString(id)) || []
      if (!purchasedCourses.includes(courseId)) {
        return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 })
      }

      query.published = true // students see only published quizzes
    } else if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Invalid role" }, { status: 403 })
    }

    // Fetch quizzes
    const quizzes = await Quiz.find(query)
      .select(
        "_id title description published requiredForCertificate timeLimitSeconds passingScorePercent attemptLimit createdAt updatedAt"
      )
      .sort({ createdAt: -1 })
      .lean()

    // Format response
    const formattedQuizzes = quizzes.map((q: any) => ({
      _id: q._id.toString(),
      title: q.title,
      description: q.description,
      published: !!q.published,
      requiredForCertificate: !!q.requiredForCertificate,
      timeLimitSeconds: q.timeLimitSeconds,
      passingScorePercent: q.passingScorePercent,
      attemptLimit: q.attemptLimit,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    }))

    return NextResponse.json({ quizzes: formattedQuizzes })
  } catch (error) {
    console.error("Quiz list error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}