import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Message } from "@/models/message"
import { getConversationContact } from "@/lib/chat-access"
import { emitToUser } from "@/lib/socket-server"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const receiverId = searchParams.get("receiverId")
  if (!receiverId) return NextResponse.json({ error: "Missing receiverId" }, { status: 400 })

  await dbConnect()
  const allowedConversation = await getConversationContact(
    session.user.id,
    session.user.role as "teacher" | "student",
    receiverId
  )

  if (!allowedConversation) {
    return NextResponse.json({ error: "Conversation not allowed" }, { status: 403 })
  }

  const messages = await Message.find({
    $or: [
      { senderId: session.user.id, receiverId },
      { senderId: receiverId, receiverId: session.user.id },
    ],
  }).sort({ createdAt: 1 })

  return NextResponse.json(messages.map((m) => m.toJSON()))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await dbConnect()
  const { receiverId, text } = await req.json()
  const trimmedText = typeof text === "string" ? text.trim() : ""

  if (!receiverId || !trimmedText) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const allowedConversation = await getConversationContact(
    session.user.id,
    session.user.role as "teacher" | "student",
    receiverId
  )

  if (!allowedConversation) {
    return NextResponse.json({ error: "Conversation not allowed" }, { status: 403 })
  }

  const newMessage = await Message.create({
    senderId: session.user.id,
    senderRole: session.user.role,
    receiverId,
    receiverRole: allowedConversation.role,
    text: trimmedText,
  })

  const serializedMessage = newMessage.toJSON()
  emitToUser(receiverId, "message:new", serializedMessage)
  emitToUser(session.user.id, "message:new", serializedMessage)

  return NextResponse.json(serializedMessage)
}
