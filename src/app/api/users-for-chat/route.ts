import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import { Course } from "@/models/course"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await dbConnect()

  let users
  if (session.user.role === "teacher") {
    const teacherId = session.user.id

    // Step 1: get all courses by this teacher
    const teacherCourses = await Course.find({ teacher: teacherId }).select("_id")
    const courseIds = teacherCourses.map((c: { _id: any }) => c._id)

    // Step 2: get all students who purchased at least one of these courses
    users = await Student.find({
      purchasedCourses: { $in: courseIds }
    }).select("name email")
  } else {
    // Students see all teachers
    users = await Teacher.find().select("name email")
  }

  // Convert to plain JSON
  return NextResponse.json(users.map((u: { toJSON: () => any }) => u.toJSON()))
}