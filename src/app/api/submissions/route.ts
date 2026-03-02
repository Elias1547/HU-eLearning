import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Submission } from "@/models/submission"
import { Assignment } from "@/models/assignment"

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
export async function GET(req: Request) {
  try {
    await dbConnect()

    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get("courseId")

    if (!courseId) {
      return NextResponse.json({ error: "CourseId required" }, { status: 400 })
    }

    // 1️⃣ Get assignments in this course
    const assignments = await Assignment.find({ courseId }).select("_id")

    const assignmentIds = assignments.map(a => a._id)

    // 2️⃣ Get submissions for those assignments
    const submissions = await Submission.find({
      assignmentId: { $in: assignmentIds }
    })
      .populate("studentId", "name email")
      .populate("assignmentId", "title")
      .lean()

    return NextResponse.json(submissions)

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 })
  }
}