import { NextResponse } from "next/server"
import { dbConnect } from "@/lib/dbConnect"
import { Assignment } from "@/models/assignment"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect()

    const assignment = await Assignment.findById(params.id)

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    // Delete file from Cloudinary if publicId exists
    if (assignment.publicId) {
      await cloudinary.uploader.destroy(assignment.publicId)
    }

    // Delete assignment from DB
    await Assignment.findByIdAndDelete(params.id)

    return NextResponse.json({ message: "Deleted successfully" })
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}