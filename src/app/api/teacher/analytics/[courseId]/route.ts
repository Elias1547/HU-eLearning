import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { getTeacherCourseAnalytics } from "@/lib/teacher-course-analytics"

export async function GET(_req: NextRequest, context: { params: Promise<{ courseId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { courseId } = await context.params
    await dbConnect()

    const data = await getTeacherCourseAnalytics(session.user.id, courseId)
    if (!data) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Teacher analytics error:", error)
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 })
  }
}
