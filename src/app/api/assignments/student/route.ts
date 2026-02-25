import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Assignment } from "@/models/assignment"
import { Submission } from "@/models/submission"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get("courseId")

  await dbConnect()

  const assignments = await Assignment.find({ courseId })

  const result = await Promise.all(
    assignments.map(async (a) => {
      const mySubmission = await Submission.findOne({
        assignmentId: a._id,
        studentId: session.user.id,
      })

      return {
        ...a.toObject(),
        mySubmission,
      }
    })
  )

  return NextResponse.json(result)
}