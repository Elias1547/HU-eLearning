import { Course } from "@/models/course"
import { CourseProgress } from "@/models/course-progress"
import { Video } from "@/models/video"
import { Assignment } from "@/models/assignment"
import { Quiz } from "@/models/quiz"

function toIdString(id: unknown) {
  if (typeof id === "string") return id
  if (id && typeof (id as { toString?: unknown }).toString === "function") return (id as { toString: () => string }).toString()
  return ""
}

type ProgressWeights = {
  lessons: number
  assignments: number
  quizzes: number
}

const DEFAULT_WEIGHTS: ProgressWeights = {
  lessons: 40,
  quizzes: 30,
  assignments: 30,
}

function normalizeWeights(weights: ProgressWeights, totals: { lessons: number; assignments: number; quizzes: number }): ProgressWeights {
  const active: ProgressWeights = { ...weights }
  if (totals.lessons <= 0) active.lessons = 0
  if (totals.assignments <= 0) active.assignments = 0
  if (totals.quizzes <= 0) active.quizzes = 0

  const sum = active.lessons + active.assignments + active.quizzes
  if (sum <= 0) return { lessons: 0, assignments: 0, quizzes: 0 }

  // keep two decimals stable
  const lessons = Math.round((active.lessons / sum) * 10000) / 100
  const assignments = Math.round((active.assignments / sum) * 10000) / 100
  const quizzes = Math.round((active.quizzes / sum) * 10000) / 100

  // ensure exact 100 by fixing rounding drift
  const drift = Math.round((100 - (lessons + assignments + quizzes)) * 100) / 100
  return { lessons, assignments, quizzes: quizzes + drift }
}

export async function recalculateAndSaveCourseProgress(studentId: string, courseId: string) {
  const course = await (Course as any).findById(courseId).lean()
  if (!course) throw new Error("Course not found")

  const [totalVideos, assignmentIds, requiredQuizIds] = await Promise.all([
    (Video as any).countDocuments({ course: courseId }),
    (Assignment as any).find({ courseId }).select("_id").lean(),
    (Quiz as any).find({ course: courseId, published: true, requiredForCertificate: true }).select("_id").lean(),
  ])

  const totals = {
    lessons: totalVideos,
    assignments: assignmentIds.length,
    quizzes: requiredQuizIds.length,
  }

  const configuredWeights: ProgressWeights = {
    lessons: course.progressWeights?.lessons ?? DEFAULT_WEIGHTS.lessons,
    assignments: course.progressWeights?.assignments ?? DEFAULT_WEIGHTS.assignments,
    quizzes: course.progressWeights?.quizzes ?? DEFAULT_WEIGHTS.quizzes,
  }

  const weights = normalizeWeights(configuredWeights, totals)

  let progress = await (CourseProgress as any).findOne({ student: studentId, course: courseId })
  if (!progress) {
    progress = new CourseProgress({
      student: studentId,
      course: courseId,
      completedVideos: [],
      submittedAssignments: [],
      passedQuizzes: [],
      quizProgress: [],
      videoProgress: {},
      videoWatchDetails: {},
      percentageCompleted: 0,
    })
  }

  const completedVideos = new Set((progress.completedVideos || []).map(toIdString).filter(Boolean))
  const submittedAssignments = new Set((progress.submittedAssignments || []).map(toIdString).filter(Boolean))
  const passedQuizzes = new Set((progress.passedQuizzes || []).map(toIdString).filter(Boolean))

  const assignmentSet = new Set(assignmentIds.map((a: unknown) => toIdString((a as { _id?: unknown })?._id)).filter(Boolean))
  const requiredQuizSet = new Set(requiredQuizIds.map((q: unknown) => toIdString((q as { _id?: unknown })?._id)).filter(Boolean))

  const lessonsCompleted = completedVideos.size
  const assignmentsCompleted = Array.from(submittedAssignments).filter((id) => assignmentSet.has(id)).length
  const quizzesCompleted = Array.from(passedQuizzes).filter((id) => requiredQuizSet.has(id)).length

  const lessonsPercent = totals.lessons > 0 ? (lessonsCompleted / totals.lessons) * weights.lessons : 0
  const assignmentsPercent = totals.assignments > 0 ? (assignmentsCompleted / totals.assignments) * weights.assignments : 0
  const quizzesPercent = totals.quizzes > 0 ? (quizzesCompleted / totals.quizzes) * weights.quizzes : 0

  const percentageCompleted = Math.min(
    100,
    Math.round((lessonsPercent + assignmentsPercent + quizzesPercent) * 100) / 100
  )

  const isComplete =
    (totals.lessons <= 0 || lessonsCompleted >= totals.lessons) &&
    (totals.assignments <= 0 || assignmentsCompleted >= totals.assignments) &&
    (totals.quizzes <= 0 || quizzesCompleted >= totals.quizzes) &&
    percentageCompleted >= 100

  progress.percentageCompleted = percentageCompleted
  progress.breakdown = {
    lessons: {
      completed: lessonsCompleted,
      total: totals.lessons,
      weight: weights.lessons,
      percent: totals.lessons > 0 ? Math.round(((lessonsCompleted / totals.lessons) * weights.lessons) * 100) / 100 : 0,
    },
    assignments: {
      completed: assignmentsCompleted,
      total: totals.assignments,
      weight: weights.assignments,
      percent:
        totals.assignments > 0
          ? Math.round(((assignmentsCompleted / totals.assignments) * weights.assignments) * 100) / 100
          : 0,
    },
    quizzes: {
      completed: quizzesCompleted,
      total: totals.quizzes,
      weight: weights.quizzes,
      percent: totals.quizzes > 0 ? Math.round(((quizzesCompleted / totals.quizzes) * weights.quizzes) * 100) / 100 : 0,
    },
  }
  progress.isComplete = isComplete
  progress.updatedAt = new Date()

  await progress.save()
  return progress
}

