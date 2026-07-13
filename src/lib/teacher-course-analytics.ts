import { Course } from "@/models/course"
import { Student } from "@/models/student"
import { CourseProgress } from "@/models/course-progress"
import { Video } from "@/models/video"
import { Quiz } from "@/models/quiz"
import { QuizAttempt } from "@/models/QuizAttempt"

function toIdString(id: unknown) {
  if (typeof id === "string") return id
  if (id && typeof (id as { toString?: unknown }).toString === "function") return (id as { toString: () => string }).toString()
  return ""
}

export type TeacherCourseAnalytics = {
  courseId: string
  courseName: string
  totalEnrolled: number
  completedStudents: number
  incompleteStudents: number
  students: {
    studentId: string
    name: string
    email: string
    progressPercent: number
    isCourseComplete: boolean
    updatedAt: string | null
  }[]
  quizzes: {
    quizId: string
    title: string
    totalAttempts: number
    uniqueStudents: number
    averageScorePercent: number
    passRatePercent: number
  }[]
}

type AttemptAggRow = {
  _id: unknown
  totalAttempts: number
  uniqueStudents: number
  avgScore: number
  passedAttempts: number
}

type ProgressLean = {
  student?: unknown
  percentageCompleted?: number
  isComplete?: boolean
  updatedAt?: Date
  completedVideos?: unknown[]
  breakdown?: { lessons?: unknown }
}

type StudentLean = { _id?: unknown; name?: string; email?: string }

type QuizLean = { _id?: unknown; title?: string }

export async function getTeacherCourseAnalytics(teacherId: string, courseId: string): Promise<TeacherCourseAnalytics | null> {
  const course = await (Course as any).findOne({ _id: courseId, teacher: teacherId }).lean()
  if (!course) return null

  const studentIds = ((course as { studentsPurchased?: unknown[] }).studentsPurchased || [])
    .map((id: unknown) => toIdString(id))
    .filter(Boolean)

  const attemptStages = [
    { $match: { course: course._id } },
    {
      $group: {
        _id: "$quiz",
        totalAttempts: { $sum: 1 },
        students: { $addToSet: "$student" },
        avgScore: { $avg: "$scorePercent" },
        passedAttempts: { $sum: { $cond: ["$passed", 1, 0] } },
      },
    },
    {
      $project: {
        _id: 1,
        totalAttempts: 1,
        uniqueStudents: { $size: "$students" },
        avgScore: 1,
        passedAttempts: 1,
      },
    },
  ]

  const [students, progressRows, totalVideos, quizzes, attemptAggRaw] = await Promise.all([
    (Student as any).find({ _id: { $in: studentIds } }).select("name email").lean(),
    (CourseProgress as any).find({ course: courseId, student: { $in: studentIds } }).lean(),
    (Video as any).countDocuments({ course: courseId }),
    (Quiz as any).find({ course: courseId, published: true }).select("_id title").lean(),
    (QuizAttempt as any).aggregate(attemptStages),
  ])

  const attemptAgg = attemptAggRaw as AttemptAggRow[]

  const progressMap = new Map(
    (progressRows as ProgressLean[]).map((row) => [toIdString(row.student), row])
  )

  const attemptMap = new Map<string, AttemptAggRow>(
    attemptAgg.map((a) => [toIdString(a._id), a])
  )

  const studentRows = (students as StudentLean[]).map((st) => {
    const sid = toIdString(st._id)
    const p = progressMap.get(sid)
    const completedVideos = p?.completedVideos?.length ?? 0
    const fallbackVideoPercent = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 10000) / 100 : 0
    const hasBreakdown = !!p?.breakdown?.lessons
    const progressPercent =
      hasBreakdown && typeof p?.percentageCompleted === "number" ? p.percentageCompleted : fallbackVideoPercent
    return {
      studentId: sid,
      name: st.name || "Student",
      email: st.email || "",
      progressPercent,
      isCourseComplete: !!p?.isComplete,
      updatedAt: p?.updatedAt ? new Date(p.updatedAt).toISOString() : null,
    }
  })

  const completedStudents = studentRows.filter((s) => s.isCourseComplete).length

  const quizRows = (quizzes as QuizLean[]).map((q) => {
    const qid = toIdString(q._id)
    const agg = attemptMap.get(qid)
    const totalAttempts = agg?.totalAttempts ?? 0
    const uniqueStudents = agg?.uniqueStudents ?? 0
    const averageScorePercent = agg?.avgScore != null ? Math.round(agg.avgScore * 100) / 100 : 0
    const passRatePercent =
      totalAttempts > 0 ? Math.round(((agg?.passedAttempts ?? 0) / totalAttempts) * 10000) / 100 : 0
    return {
      quizId: qid,
      title: q.title || "Quiz",
      totalAttempts,
      uniqueStudents,
      averageScorePercent,
      passRatePercent,
    }
  })

  return {
    courseId: toIdString(course._id),
    courseName: (course as { name?: string }).name || "Course",
    totalEnrolled: studentIds.length,
    completedStudents,
    incompleteStudents: Math.max(0, studentIds.length - completedStudents),
    students: studentRows,
    quizzes: quizRows,
  }
}
