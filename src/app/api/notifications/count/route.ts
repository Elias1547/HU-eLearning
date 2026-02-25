import { NextResponse } from "next/server"
import { dbConnect } from "@/lib/dbConnect"
import { Notification } from "@/models/notification"

export async function GET(req: Request) {
  await dbConnect()
  const url = new URL(req.url)
  const userId = url.searchParams.get("userId")
  const userRole = url.searchParams.get("userRole")

  if (!userId || !userRole) return NextResponse.json({ count: 0 })

  const count = await Notification.countDocuments({ userId, userRole, isRead: false })
  return NextResponse.json({ count })
}