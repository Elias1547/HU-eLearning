import { NextResponse } from "next/server"
import { dbConnect } from "@/lib/dbConnect"
import { Assignment } from "@/models/assignment"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import mongoose from "mongoose"

// ✅ GET - Fetch assignments by courseId
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get("courseId")

    if (!courseId) {
      return NextResponse.json({ error: "Course ID required" }, { status: 400 })
    }

    await dbConnect()

    const assignments = await Assignment.find({
      courseId: new mongoose.Types.ObjectId(courseId),
    }).sort({ createdAt: -1 })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Fetch assignments error:", error)
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    )
  }
}

// ✅ POST - Create assignment
export async function POST(req: Request) {
  try {
    await dbConnect()

    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "teacher") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const body = await req.json()

    const assignment = await Assignment.create({
      courseId: body.courseId,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
      fileUrl: body.fileUrl || null,
    })

    return NextResponse.json(assignment)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    )
  }
}