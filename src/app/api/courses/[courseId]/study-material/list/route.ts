import {  NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(
    request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await context.params; // <-- Remove 'await' (params is not a Promise)
  if (!courseId) {
    return NextResponse.json({ error: "Missing courseId in params" }, { status: 400 });
  }

  const dirPath = path.join(process.cwd(), "public", "upload", courseId);

  try {
    const files = await fs.readdir(dirPath);
    const fileList = files.map((filename) => ({
      name: filename,
      url: `/upload/${courseId}/${encodeURIComponent(filename)}`,

    }));
    return NextResponse.json({ files: fileList });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ files: [], error: errorMessage }, { status: 500 });
  }
}