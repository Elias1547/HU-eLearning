import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Announcement } from "@/models/announcement"

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "teacher" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await dbConnect()

    const { id } = context.params

    const announcement = await Announcement.findById(id)

    if (!announcement) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 })
    }

    await Announcement.findByIdAndDelete(id)

    return NextResponse.json({ message: "Announcement deleted" })

  } catch (error) {
    console.error("DELETE announcement error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}