import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Notification } from "@/models/notification"

type NotificationItem = {
  _id: { toString(): string }
  userId: unknown
  userRole: string
  type?: string
  title: string
  body?: string
  link?: string
  courseId?: unknown
  data?: unknown
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

type NotificationModel = {
  find(filter: unknown): {
    sort(sort: unknown): {
      limit(limit: number): {
        lean(): Promise<NotificationItem[]>
      }
    }
  }
  updateMany(filter: unknown, update: unknown): Promise<unknown>
  findOneAndUpdate(filter: unknown, update: unknown): {
    lean(): Promise<NotificationItem | null>
  }
}

const NotificationQuery = Notification as unknown as NotificationModel

function serializeNotification(notification: NotificationItem) {
  return {
    ...notification,
    _id: notification._id.toString(),
    userId: String(notification.userId),
    courseId: notification.courseId ? String(notification.courseId) : undefined,
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get("unreadOnly") !== "false"
    const requestedLimit = Number(searchParams.get("limit") || 10)
    const limit = Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 10, 50)

    const query: Record<string, unknown> = {
      userId: session.user.id,
      userRole: session.user.role,
    }

    if (unreadOnly) {
      query.isRead = false
    }

    const notifications = await NotificationQuery.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({
      notifications: notifications.map(serializeNotification),
    })
  } catch (error) {
    console.error("Notifications GET error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const body = await req.json().catch(() => ({}))
    const baseFilter = {
      userId: session.user.id,
      userRole: session.user.role,
    }

    if (body?.markAllRead) {
      await NotificationQuery.updateMany(
        { ...baseFilter, isRead: false },
        { $set: { isRead: true } }
      )
      return NextResponse.json({ success: true })
    }

    if (body?.notificationId) {
      const notification = await NotificationQuery.findOneAndUpdate(
        { ...baseFilter, _id: body.notificationId },
        { $set: { isRead: true } }
      ).lean()

      return NextResponse.json({
        success: Boolean(notification),
        notification: notification ? serializeNotification(notification) : null,
      })
    }

    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  } catch (error) {
    console.error("Notifications PATCH error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
