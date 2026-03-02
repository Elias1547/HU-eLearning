import { NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/dbConnect"
import { Submission } from "@/models/submission"

export async function PATCH(req: NextRequest) {
  await dbConnect()

  const { assignmentId } = await req.json()

  if (!assignmentId) {
    return NextResponse.json(
      { error: "AssignmentId required" },
      { status: 400 }
    )
  }

  await Submission.updateMany(
    { assignmentId },
    { $set: { graded: true } }
  )

  return NextResponse.json({ message: "Updated successfully" })
}