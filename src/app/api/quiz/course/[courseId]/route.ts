import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Course } from "@/models/course"
import { Quiz } from "@/models/quiz"
import { Student } from "@/models/student"

function toIdString(id: unknown) {
  if (typeof id === "string") return id
  if (id && typeof (id as { toString?: unknown }).toString === "function") return (id as { toString: () => string }).toString()
  return ""
}

export async function GET(_req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const course = await Course.findById(params.courseId).lean()
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const query: Record<string, unknown> = { course: params.courseId }

    if (session.user.role === "teacher") {
      if (course.teacher?.toString() !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (session.user.role === "student") {
      const student = await Student.findById(session.user.id).lean()
      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })
      if (!student.purchasedCourses?.map((id: unknown) => toIdString(id)).includes(params.courseId)) {
        return NextResponse.json({ error: "You are not enrolled in this course" }, { status: 403 })
      }
      query.published = true
    } else if (session.user.role === "admin") {
      // admin can view all
    } else {
      return NextResponse.json({ error: "Invalid role" }, { status: 403 })
    }

    const quizzes = await Quiz.find(query)
      .select("_id title description published requiredForCertificate timeLimitSeconds passingScorePercent attemptLimit createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      quizzes: quizzes.map((q: unknown) => {
        const doc = q as Record<string, unknown> & { _id: { toString: () => string } }
        return {
          _id: doc._id.toString(),
          title: doc.title,
          description: doc.description,
          published: !!doc.published,
          requiredForCertificate: !!doc.requiredForCertificate,
          timeLimitSeconds: doc.timeLimitSeconds,
          passingScorePercent: doc.passingScorePercent,
          attemptLimit: doc.attemptLimit,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        }
      }),
    })
  } catch (error) {
    console.error("Quiz list error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

