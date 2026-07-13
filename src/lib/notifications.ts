import { Notification } from "@/models/notification"
import { emitToUser } from "@/lib/socket-server"
import { Student } from "@/models/student"

type StudentRecipient = {
  _id: { toString: () => string }
}

type StudentRecipientQuery = {
  select(fields: string): {
    lean(): Promise<StudentRecipient[]>
  }
}

const StudentNotificationModel = Student as unknown as {
  find(filter: unknown): StudentRecipientQuery
}

export type NotificationType =
  | "live_session_created"
  | "quiz_published"
  | "assignment_created"
  | "live_class_scheduled"
  | "video_uploaded"
  | "material_uploaded"
  | "quiz_graded"
  | "assignment_graded"
  | "payment_confirmation"
  | "announcement"
  | "certificate_eligible"
  | "message"

export async function notifyUser(params: {
  userId: string
  userRole: "teacher" | "student" | "admin"
  type: NotificationType
  title: string
  body?: string
  link?: string
  courseId?: string
  data?: unknown
}) {
  const doc = await Notification.create({
    userId: params.userId,
    userRole: params.userRole,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link,
    courseId: params.courseId,
    data: params.data,
    isRead: false,
  })

  const notification = doc.toJSON()
  emitToUser(params.userId, "notification", notification)
  return notification
}

export async function notifyMany(
  users: { userId: string; userRole: "teacher" | "student" | "admin" }[],
  base: Omit<Parameters<typeof notifyUser>[0], "userId" | "userRole">
) {
  return Promise.all(users.map((u) => notifyUser({ ...base, userId: u.userId, userRole: u.userRole })))
}

export async function notifyCourseStudents(
  courseId: string,
  base: Omit<Parameters<typeof notifyUser>[0], "userId" | "userRole" | "courseId">
) {
  const students = await StudentNotificationModel.find({ purchasedCourses: courseId }).select("_id").lean()

  return notifyMany(
    students.map((student) => ({
      userId: student._id.toString(),
      userRole: "student" as const,
    })),
    {
      ...base,
      courseId,
    }
  )
}

