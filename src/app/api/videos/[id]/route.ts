import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Video } from "@/models/video"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

/* =========================================
   PUT → Update metadata (and replace video if needed)
========================================= */

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const body = await req.json()

    const {
      title,
      description,
      videoUrl,
      publicId,
      duration,
      width,
      height,
      format,
      fileSize,
      position
    } = body

    const video = await Video.findById(params.id)

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // 🔥 If video replaced → delete old Cloudinary file
  if (video.publicId) {
  const oldPublicId: string = video.publicId;

  await cloudinary.uploader.destroy(oldPublicId, {
    resource_type: "video",
  });
}

    // Update only provided fields
    video.title = title ?? video.title
    video.description = description ?? video.description
    video.url = videoUrl ?? video.url
    video.publicId = publicId ?? video.publicId
    video.duration = duration ?? video.duration
    video.width = width ?? video.width
    video.height = height ?? video.height
    video.format = format ?? video.format
    video.fileSize = fileSize ?? video.fileSize
    video.position = position ?? video.position

    await video.save()

    return NextResponse.json({ success: true, video })

  } catch (error) {
    console.error("Video update error:", error)
    return NextResponse.json({ error: "Failed to update video" }, { status: 500 })
  }
}


/* =========================================
   DELETE → Remove from DB + Cloudinary
========================================= */

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const video = await Video.findById(params.id)

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // 🔥 Delete from Cloudinary
    if (video.publicId) {
      await cloudinary.uploader.destroy(video.publicId, {
        resource_type: "video",
      })
    }

    // Delete from DB
    await Video.findByIdAndDelete(params.id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Video delete error:", error)
    return NextResponse.json({ error: "Failed to delete video" }, { status: 500 })
  }
}