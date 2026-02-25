import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Submission } from "@/models/submission"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { assignmentId, fileUrl } = await req.json()

  await dbConnect()

  const submission = await Submission.create({
    assignmentId,
    studentId: session.user.id,
    fileUrl,
    graded: false,
  })

  return NextResponse.json(submission)
}