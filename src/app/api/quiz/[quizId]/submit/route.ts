import { NextResponse } from "next/server"
import { Quiz } from "@/models/quiz"
import { QuizAttempt } from "@/models/QuizAttempt"
import { dbConnect } from "@/lib/dbConnect"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Student } from "@/models/student"
import { CourseProgress } from "@/models/course-progress"
import { recalculateAndSaveCourseProgress } from "@/lib/course-progress"
import { ensureCertificateIssued } from "@/lib/certificate-service"

function toIdString(id: unknown) {
  if (typeof id === "string") return id
  if (id && typeof (id as { toString?: unknown }).toString === "function") return (id as { toString: () => string }).toString()
  return ""
}

type IncomingAnswer =
  | { questionId: string; answer: unknown }
  | { questionId: string; value: unknown }

function normalizeTextAnswer(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim().toLowerCase()
}

export async function POST(req: Request, { params }: { params: { quizId: string } }) {
  try {
    await dbConnect()

    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "student") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const incomingAnswers: unknown = body?.answers
    const startedAt: string | undefined = body?.startedAt
    const durationSeconds: number | undefined = body?.durationSeconds

    const quiz = await Quiz.findById(params.quizId).lean()
    if (!quiz) return NextResponse.json({ message: "Quiz not found" }, { status: 404 })
    if (!quiz.published) return NextResponse.json({ message: "Quiz is not published" }, { status: 403 })

    const student = await Student.findById(session.user.id).lean()
    if (!student) return NextResponse.json({ message: "Student not found" }, { status: 404 })

    const isEnrolled = student.purchasedCourses?.map((id: unknown) => toIdString(id)).includes(toIdString(quiz.course))
    if (!isEnrolled) {
      return NextResponse.json({ message: "You are not enrolled in this course" }, { status: 403 })
    }

    // attempt limit
    const previousAttemptsCount = await QuizAttempt.countDocuments({ quiz: params.quizId, student: session.user.id })
    if (typeof quiz.attemptLimit === "number" && previousAttemptsCount >= quiz.attemptLimit) {
      return NextResponse.json({ message: "Attempt limit reached for this quiz" }, { status: 400 })
    }

    const attemptNumber = previousAttemptsCount + 1

    // map answers by questionId; accept legacy array answers by index
    const answerMap = new Map<string, unknown>()
    if (Array.isArray(incomingAnswers) && incomingAnswers.length > 0) {
      if (typeof incomingAnswers[0] === "number" || incomingAnswers[0] === null) {
        // legacy index-based MCQ answers
        ;(quiz.questions || []).forEach((q: unknown, idx: number) => {
          const qq = q as { _id: { toString: () => string } }
          answerMap.set(qq._id.toString(), (incomingAnswers as unknown[])[idx])
        })
      } else {
        ;(incomingAnswers as IncomingAnswer[]).forEach((a) => {
          const qid = (a as { questionId?: unknown }).questionId
          const val = (a as { answer?: unknown; value?: unknown }).answer ?? (a as { value?: unknown }).value
          if (typeof qid === "string") answerMap.set(qid, val)
        })
      }
    }

    const answersToStore: { questionId: unknown; answer: unknown }[] = []

    let maxPoints = 0
    let earnedPoints = 0
    let needsManual = false

    for (const q of (quiz.questions || []) as unknown[]) {
      const qq = q as Record<string, unknown> & { _id: { toString: () => string } }
      const qid = qq._id.toString()
      const points = typeof qq.points === "number" ? qq.points : 1
      maxPoints += points
      const rawAnswer = answerMap.has(qid) ? answerMap.get(qid) : null
      answersToStore.push({ questionId: qq._id, answer: rawAnswer })

      if (qq.type === "multiple_choice") {
        if (typeof qq.correctOptionIndex === "number" && typeof rawAnswer === "number") {
          if (rawAnswer === qq.correctOptionIndex) earnedPoints += points
        }
      } else if (qq.type === "true_false") {
        if (typeof qq.correctBoolean === "boolean" && typeof rawAnswer === "boolean") {
          if (rawAnswer === qq.correctBoolean) earnedPoints += points
        }
      } else if (qq.type === "short_answer") {
        if (qq.requiresManualGrading || !qq.correctText) {
          needsManual = true
        } else {
          const expected = normalizeTextAnswer(qq.correctText)
          const actual = normalizeTextAnswer(rawAnswer)
          if (expected.length > 0 && actual === expected) earnedPoints += points
        }
      }
    }

    const scorePercent = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 10000) / 100 : 0
    const passingScorePercent = typeof quiz.passingScorePercent === "number" ? quiz.passingScorePercent : 60
    const passed = !needsManual && scorePercent >= passingScorePercent

    const status = needsManual ? "pending_manual_grading" : "graded"

    const attempt = await QuizAttempt.create({
      quiz: params.quizId,
      course: quiz.course,
      student: session.user.id,
      attemptNumber,
      status,
      answers: answersToStore,
      earnedPoints,
      maxPoints,
      scorePercent,
      passed,
      startedAt: startedAt ? new Date(startedAt) : undefined,
      submittedAt: new Date(),
      durationSeconds: typeof durationSeconds === "number" ? durationSeconds : undefined,
      gradedAt: status === "graded" ? new Date() : undefined,
    })

    // Progress update (only when objectively graded and passed)
    if (passed) {
      await CourseProgress.updateOne(
        { student: session.user.id, course: toIdString(quiz.course) },
        { $addToSet: { passedQuizzes: params.quizId }, $set: { updatedAt: new Date() } },
        { upsert: true }
      )
      const progress = await recalculateAndSaveCourseProgress(session.user.id, toIdString(quiz.course))
      if (progress?.isComplete) {
        await ensureCertificateIssued(session.user.id, toIdString(quiz.course))
      }
    }

    return NextResponse.json({
      attempt: attempt.toJSON(),
      instantResults: !!quiz.instantResults && status === "graded",
      showAnswersAfterSubmission: !!quiz.showAnswersAfterSubmission,
    })
  } catch (error) {
    console.error("Quiz submit error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}