import { Notification } from "@/models/notification"
import { pusherServer } from "@/lib/pusher"

export type NotificationType =
  | "live_session_created"
  | "quiz_published"
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

  await pusherServer.trigger(`user-${params.userId}`, "notification", doc.toJSON())
  return doc.toJSON()
}

export async function notifyMany(
  users: { userId: string; userRole: "teacher" | "student" | "admin" }[],
  base: Omit<Parameters<typeof notifyUser>[0], "userId" | "userRole">
) {
  return Promise.all(users.map((u) => notifyUser({ ...base, userId: u.userId, userRole: u.userRole })))
}

