import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { getConversationContacts } from "@/lib/chat-access"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await dbConnect()

  if (session.user.role !== "teacher" && session.user.role !== "student") {
    return NextResponse.json([])
  }

  const contacts = await getConversationContacts(
    session.user.id,
    session.user.role
  )

  return NextResponse.json(contacts)
}
