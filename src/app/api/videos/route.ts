import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Video } from "@/models/video"
import { Course } from "@/models/course"
import { notifyCourseStudents } from "@/lib/notifications"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const body = await req.json()

    const {
      courseId,
      title,
      description,
      position,
      videoUrl,
      publicId,
      duration,
      width,
      height,
      format,
      fileSize
    } = body

    if (!videoUrl || !publicId) {
      return NextResponse.json({ error: "Missing video data" }, { status: 400 })
    }

    const course = await Course.findById(courseId).select("name teacher").lean()
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    if (session.user.role === "teacher" && course.teacher?.toString() !== session.user.id) {
      return NextResponse.json({ error: "You can only upload videos to your own courses" }, { status: 403 })
    }

    const video = await Video.create({
      title,
      description,
      url: videoUrl,
      publicId,
      course: courseId,
      position,
      duration,
      width,
      height,
      format,
      fileSize,
      isProcessed: true,
      processingStatus: "completed"
    })

    await notifyCourseStudents(courseId, {
      type: "video_uploaded",
      title: `New video uploaded in ${course.name}`,
      link: `/courses/${courseId}/learn/${video._id.toString()}`,
      data: { videoId: video._id.toString() },
    }).catch((error) => console.error("Video notification error:", error))

    return NextResponse.json({ success: true, video })
  } catch (error) {
    console.error("Video save error:", error)
    return NextResponse.json({ error: "Failed to save video" }, { status: 500 })
  }}
