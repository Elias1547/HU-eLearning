import { NextResponse } from "next/server"
import { dbConnect } from "@/lib/dbConnect"
import { Submission } from "@/models/submission"

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect()

  await Submission.updateMany(
    { assignmentId: params.id },
    { graded: true }
  )

  return NextResponse.json({ message: "All graded" })
}