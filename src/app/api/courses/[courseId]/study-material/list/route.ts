import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await context.params; // ✅ MUST await

  if (!courseId) {
    return NextResponse.json(
      { error: "Missing courseId in params" },
      { status: 400 }
    );
  }

  const dirPath = path.join(process.cwd(), "public", "upload", courseId);

  try {
    const files = await fs.readdir(dirPath);

    const fileList = files.map((filename) => ({
      name: filename,
      url: `/upload/${courseId}/${filename}`,
    }));

    return NextResponse.json({ files: fileList });
  } catch (err) {
    return NextResponse.json({ files: [] });
  }
}