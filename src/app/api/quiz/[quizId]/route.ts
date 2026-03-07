import { NextResponse } from "next/server"
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

type QuizLean = Record<string, unknown> & {
  _id: { toString: () => string }
  course: unknown
  teacher?: unknown
  questions?: unknown[]
}

function serializeQuizForStudent(quiz: QuizLean) {
  return {
    _id: quiz._id.toString(),
    course: toIdString(quiz.course),
    teacher: toIdString(quiz.teacher),
    title: quiz.title,
    description: quiz.description,
    timeLimitSeconds: quiz.timeLimitSeconds,
    passingScorePercent: quiz.passingScorePercent,
    attemptLimit: quiz.attemptLimit,
    showAnswersAfterSubmission: quiz.showAnswersAfterSubmission,
    instantResults: quiz.instantResults,
    shuffleQuestions: quiz.shuffleQuestions,
    published: !!quiz.published,
    requiredForCertificate: !!quiz.requiredForCertificate,
    questions: (quiz.questions || []).map((q: unknown) => {
      const qq = q as Record<string, unknown> & { _id: { toString: () => string } }
      return {
        _id: qq._id.toString(),
        type: qq.type,
        prompt: qq.prompt,
        options: qq.options,
        points: qq.points,
        explanation: qq.explanation,
        requiresManualGrading: qq.requiresManualGrading,
      }
    }),
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
  }
}

function serializeQuizForTeacherOrAdmin(quiz: QuizLean) {
  return {
    ...quiz,
    _id: quiz._id.toString(),
    course: toIdString(quiz.course),
    teacher: toIdString(quiz.teacher),
    questions: (quiz.questions || []).map((q: unknown) => {
      const qq = q as Record<string, unknown> & { _id: { toString: () => string } }
      return { ...qq, _id: qq._id.toString() }
    }),
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await context.params

    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
      return NextResponse.json({ message: "Quiz not found" }, { status: 404 })
    }

    if (session.user.role === "teacher") {
      const course = await Course.findById(quiz.course).lean()

      if (!course || course.teacher?.toString() !== session.user.id) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }
    }

    await quiz.deleteOne()

    return NextResponse.json({ message: "Quiz deleted successfully" })

  } catch (error) {
    console.error("Quiz delete error:", error)

    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function GET(_req: Request, { params }: { params: { quizId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()
    const quiz = await Quiz.findById(params.quizId).lean()

    if (!quiz) {
      return NextResponse.json({ message: "Quiz not found" }, { status: 404 })
    }

    if (session.user.role === "student") {
      const student = await Student.findById(session.user.id).lean()
      if (!student) return NextResponse.json({ message: "Student not found" }, { status: 404 })

      const isEnrolled = student.purchasedCourses?.map((id: unknown) => toIdString(id)).includes(toIdString((quiz as QuizLean).course))
      if (!isEnrolled) {
        return NextResponse.json({ message: "You are not enrolled in this course" }, { status: 403 })
      }
      if (!quiz.published) {
        return NextResponse.json({ message: "Quiz is not published" }, { status: 403 })
      }

      return NextResponse.json(serializeQuizForStudent(quiz as unknown as QuizLean))
    }

    if (session.user.role === "teacher") {
      const course = await Course.findById(quiz.course).lean()
      if (!course || course.teacher?.toString() !== session.user.id) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }
    }

    return NextResponse.json(serializeQuizForTeacherOrAdmin(quiz as unknown as QuizLean))
  } catch (error) {
    console.error("Quiz get error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}