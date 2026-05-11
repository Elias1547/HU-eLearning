import { NextRequest, NextResponse } from "next/server"
import { dbConnect } from "@/lib/dbConnect"
import { Submission } from "@/models/submission"

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()
    const updated = await Submission.findByIdAndUpdate(
      params.id,
      { $set: { graded: true } },
      { new: true }
    )
    if (!updated) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }
    return NextResponse.json({ message: "Submission graded", submission: updated })
  } catch (error) {
    console.error("Error grading submission:", error)
    return NextResponse.json({ error: "Failed to grade submission" }, { status: 500 })
  }
}
