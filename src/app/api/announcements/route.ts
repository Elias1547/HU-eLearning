import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Announcement, announcementValidationSchema } from "@/models/announcement"
import { Course } from "@/models/course"
import mongoose from "mongoose"
import { Student } from "@/models/student"

// GET announcements
export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Check session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2️⃣ Connect DB
    await dbConnect()

    // 3️⃣ Parse query params
    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get("courseId")

    let query: Record<string, any> = {}

    // 4️⃣ Role-based filtering
    if (session.user.role === "admin") {
      // Admin sees all or filtered by courseId
      query = courseId
        ? { $or: [{ scope: "global" }, { scope: "course", course: courseId }] }
        : {}
    } else if (session.user.role === "teacher") {
      // Teacher sees global + their courses
      if (courseId) {
        const course = await Course.findById(courseId)
        if (!course || course.teacher?.toString() !== session.user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        query = { $or: [{ scope: "global" }, { scope: "course", course: courseId }] }
      } else {
        const ownedCourses = await Course.find({ teacher: session.user.id }).select("_id")
        const courseIds = ownedCourses.map((c: any) => c._id)
        query = { $or: [{ scope: "global" }, { scope: "course", course: { $in: courseIds } }] }
      }
    }else if (session.user.role === "student") {

  const student = await Student.findById(session.user.id).select("purchasedCourses")

  const courseIds = student?.purchasedCourses || []

  if (courseId) {
    if (!courseIds.some((id:any) => id.toString() === courseId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    query = {
      $or: [
        { scope: "global" },
        { scope: "course", course: courseId }
      ]
    }

  } else {

    query = {
      $or: [
        { scope: "global" },
        { scope: "course", course: { $in: courseIds } }
      ]
    }

  }
}

    // 5️⃣ Fetch announcements
    const announcements = await Announcement.find(query).sort({ createdAt: -1 }).lean()

    return NextResponse.json({ announcements })
  } catch (error) {
    console.error("Announcements GET error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// POST announcements
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (!["admin", "teacher"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = announcementValidationSchema.parse(body)

    let courseId: string | undefined
    if (validated.scope === "course") {
      if (!validated.course) return NextResponse.json({ error: "Course is required", status: 400 })
      const course = await Course.findById(validated.course)
      if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
      if (session.user.role === "teacher" && course.teacher?.toString() !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      courseId = course._id.toString()
    }

    const announcement = await Announcement.create({
        title: validated.title,
  message: validated.message,
  scope: validated.scope,
  course: validated.scope === "course" ? new mongoose.Types.ObjectId(courseId) : undefined,
  createdBy: session.user.id
    })

    return NextResponse.json({ announcement: announcement.toJSON() }, { status: 201 })
  } catch (error: any) {
    console.error("Announcements POST error:", error)
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}