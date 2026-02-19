import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Video } from "@/models/video"

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

    return NextResponse.json({ success: true, video })
  } catch (error) {
    console.error("Video save error:", error)
    return NextResponse.json({ error: "Failed to save video" }, { status: 500 })
  }}