import { NextResponse } from "next/server"
import { dbConnect } from "@/lib/dbConnect"
import { Assignment } from "@/models/assignment"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import mongoose from "mongoose"
import { Course } from "@/models/course"
import { notifyCourseStudents } from "@/lib/notifications"

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
    const course = await Course.findById(body.courseId).select("name teacher").lean()

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    if (course.teacher?.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You can only create assignments for your own courses" },
        { status: 403 }
      )
    }

    const assignment = await Assignment.create({
      courseId: body.courseId,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
      fileUrl: body.fileUrl || null,
    })

    await notifyCourseStudents(body.courseId, {
      type: "assignment_created",
      title: `New assignment added in ${course.name}`,
      link: `/courses/${body.courseId}`,
      data: { assignmentId: assignment._id.toString() },
    }).catch((error) => console.error("Assignment notification error:", error))

    return NextResponse.json(assignment)
  } catch (error) {
    console.error("Create assignment error:", error)
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    )
  }
}
