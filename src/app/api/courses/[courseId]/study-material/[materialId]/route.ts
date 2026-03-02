// src/app/api/courses/[courseId]/study-material/[materialId]/route.ts
import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function DELETE(
  req: Request,
  { params }: { params: { courseId: string; materialId: string } } // no Promise here
) {
  try {
    const { courseId, materialId } = params

    if (!courseId || !materialId) {
      return NextResponse.json({ error: "Missing courseId or materialId" }, { status: 400 })
    }

    const fileName = decodeURIComponent(materialId)
    const filePath = path.join(process.cwd(), "public", "upload", courseId, fileName)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    fs.unlinkSync(filePath) // ✅ Deletes file from disk

    return NextResponse.json({ success: true, message: `${fileName} deleted` })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}