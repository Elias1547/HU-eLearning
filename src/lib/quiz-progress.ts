import { CourseProgress } from "@/models/course-progress"

function toIdString(id: unknown) {
  if (typeof id === "string") return id
  if (id && typeof (id as { toString?: unknown }).toString === "function") return (id as { toString: () => string }).toString()
  return ""
}

type QuizProgressEntry = {
  quiz: unknown
  bestScorePercent: number
  latestScorePercent: number
  attemptCount: number
  passed: boolean
  completed: boolean
  lastSubmittedAt: Date
}

/**
 * Records quiz activity on course progress: completed on any submission;
 * keeps best score, attempt count, and passed once true.
 */
export async function upsertCourseQuizProgress(
  studentId: string,
  courseId: string,
  quizId: string,
  scorePercent: number,
  passed: boolean,
  submittedAt: Date
) {
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

  const arr = (progress.quizProgress || []) as QuizProgressEntry[]
  const idx = arr.findIndex((e) => toIdString(e.quiz) === quizId)
  const prev = idx >= 0 ? arr[idx] : null
  const attemptCount = (prev?.attemptCount ?? 0) + 1
  const bestScorePercent = Math.max(prev?.bestScorePercent ?? 0, scorePercent)
  const entry: QuizProgressEntry = {
    quiz: quizId,
    latestScorePercent: scorePercent,
    bestScorePercent,
    attemptCount,
    passed: !!(prev?.passed || passed),
    completed: true,
    lastSubmittedAt: submittedAt,
  }
  if (idx >= 0) arr[idx] = entry
  else arr.push(entry)
  progress.quizProgress = arr as typeof progress.quizProgress
  progress.updatedAt = new Date()
  await progress.save()
}
