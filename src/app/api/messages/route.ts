import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Message } from "@/models/message"
import { pusherServer } from "@/lib/pusher"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  const receiverId = searchParams.get("receiverId")
  if (!userId || !receiverId) return NextResponse.json({ error: "Missing userId/receiverId" }, { status: 400 })

  await dbConnect()
  const messages = await Message.find({
    $or: [
      { senderId: userId, receiverId },
      { senderId: receiverId, receiverId: userId },
    ],
  }).sort({ createdAt: 1 })

  // Convert to JSON before returning
  return NextResponse.json(messages.map((m) => m.toJSON()))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { senderId, receiverId, text } = await req.json()
  if (!senderId || !receiverId || !text) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  await dbConnect()
  const newMessage = await Message.create({ senderId, receiverId, text })

  // Trigger Pusher events
  await pusherServer.trigger(`user-${receiverId}`, "new-message", newMessage.toJSON())
  await pusherServer.trigger(`user-${senderId}`, "new-message", newMessage.toJSON())

  return NextResponse.json(newMessage.toJSON())
}