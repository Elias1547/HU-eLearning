import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Course } from "@/models/course"
import { Quiz } from "@/models/quiz"
import { QuizAttempt } from "@/models/QuizAttempt"

export async function GET(_req: NextRequest, { params }: { params: { quizId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const quiz = await Quiz.findById(params.quizId).lean()
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 })

    if (session.user.role === "teacher") {
      const course = await Course.findById(quiz.course).lean()
      if (!course || course.teacher?.toString() !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const attempts = await QuizAttempt.find({ quiz: params.quizId })
      .populate("student", "name email profileImage")
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      submissions: attempts.map((a: unknown) => {
        const doc = a as Record<string, unknown> & { _id: { toString: () => string } }
        const student = doc.student as unknown as
          | { _id: { toString: () => string }; name?: string; email?: string; profileImage?: string }
          | null
          | undefined

        return {
          _id: doc._id.toString(),
          student: student
            ? {
                _id: student._id.toString(),
                name: student.name,
                email: student.email,
                profileImage: student.profileImage,
              }
            : null,
          attemptNumber: doc.attemptNumber,
          status: doc.status,
          earnedPoints: doc.earnedPoints,
          maxPoints: doc.maxPoints,
          scorePercent: doc.scorePercent,
          passed: doc.passed,
          submittedAt: doc.submittedAt,
          createdAt: doc.createdAt,
        }
      }),
    })
  } catch (error) {
    console.error("Quiz submissions error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

