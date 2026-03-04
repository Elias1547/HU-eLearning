import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Announcement, announcementValidationSchema } from "@/models/announcement"
import { Course } from "@/models/course"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import { notifyMany } from "@/lib/notifications"

function toIdString(id: unknown) {
  if (typeof id === "string") return id
  if (id && typeof (id as { toString?: unknown }).toString === "function") return (id as { toString: () => string }).toString()
  return ""
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await dbConnect()
    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get("courseId")

    if (session.user.role === "admin") {
      const query: Record<string, unknown> = {}
      if (courseId) {
        query.$or = [{ scope: "global" }, { scope: "course", course: courseId }]
      }
      const announcements = await Announcement.find(query).sort({ createdAt: -1 }).lean()
      return NextResponse.json({ announcements })
    }

    if (session.user.role === "teacher") {
      if (courseId) {
        const course = await Course.findById(courseId).lean()
        if (!course || course.teacher?.toString() !== session.user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        const announcements = await Announcement.find({
          $or: [{ scope: "global" }, { scope: "course", course: courseId }],
        })
          .sort({ createdAt: -1 })
          .lean()
        return NextResponse.json({ announcements })
      }

      // teacher: global + course announcements for owned courses
      const ownedCourses = (await Course.find({ teacher: session.user.id }).select("_id").lean()) as unknown as {
        _id: unknown
      }[]
      const courseIds = ownedCourses.map((c) => c._id)
      const announcements = await Announcement.find({
        $or: [{ scope: "global" }, { scope: "course", course: { $in: courseIds } }],
      })
        .sort({ createdAt: -1 })
        .lean()
      return NextResponse.json({ announcements })
    }

    if (session.user.role === "student") {
      const student = await Student.findById(session.user.id).lean()
      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

      const purchasedCourses = (student.purchasedCourses || []).map((id: unknown) => toIdString(id)).filter(Boolean)
      const allowedCourses = courseId ? [courseId] : purchasedCourses

      if (courseId && !purchasedCourses.includes(courseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      const announcements = await Announcement.find({
        $or: [{ scope: "global" }, { scope: "course", course: { $in: allowedCourses } }],
      })
        .sort({ createdAt: -1 })
        .lean()
      return NextResponse.json({ announcements })
    }

    return NextResponse.json({ error: "Invalid role" }, { status: 403 })
  } catch (error) {
    console.error("Announcements GET error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (session.user.role !== "admin" && session.user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await dbConnect()

    const body = await req.json()
    const validated = announcementValidationSchema.parse(body)

    if (validated.scope === "global" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Only admins can create global announcements" }, { status: 403 })
    }

    if (validated.scope === "course" && !validated.course) {
      return NextResponse.json({ error: "course is required for course announcements" }, { status: 400 })
    }

    if (validated.scope === "course") {
      const course = await Course.findById(validated.course).lean()
      if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
      if (session.user.role === "teacher" && course.teacher?.toString() !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const announcement = await Announcement.create({
      scope: validated.scope,
      course: validated.scope === "course" ? validated.course : undefined,
      createdBy: session.user.id,
      createdByRole: session.user.role,
      title: validated.title,
      message: validated.message,
      createdAt: new Date(),
    })

    // Notifications
    if (validated.scope === "global") {
      const [students, teachers] = await Promise.all([
        Student.find({}).select("_id").lean(),
        Teacher.find({}).select("_id").lean(),
      ])
      await notifyMany(
        [
          ...(students as unknown as { _id: unknown }[]).map((s) => ({ userId: toIdString(s._id), userRole: "student" as const })),
          ...(teachers as unknown as { _id: unknown }[]).map((t) => ({ userId: toIdString(t._id), userRole: "teacher" as const })),
        ],
        {
          type: "announcement",
          title: validated.title,
          body: validated.message,
          link: "/",
          data: { scope: "global", announcementId: announcement._id.toString() },
        }
      )
    } else if (validated.scope === "course" && validated.course) {
      const students = await Student.find({ purchasedCourses: validated.course }).select("_id").lean()
      await notifyMany(
        (students as unknown as { _id: unknown }[]).map((s) => ({ userId: toIdString(s._id), userRole: "student" as const })),
        {
          type: "announcement",
          title: validated.title,
          body: validated.message,
          link: `/courses/${validated.course}`,
          courseId: validated.course,
          data: { scope: "course", announcementId: announcement._id.toString() },
        }
      )
    }

    return NextResponse.json({ announcement: announcement.toJSON() }, { status: 201 })
  } catch (error) {
    console.error("Announcements POST error:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

