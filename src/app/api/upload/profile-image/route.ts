import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "No file uploaded" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "Only image uploads are allowed" },
        { status: 400 }
      );
    }

    const maxFileSize = 5 * 1024 * 1024;
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { message: "Image must be 5MB or smaller" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "upload", "profiles");
    await mkdir(uploadDir, { recursive: true });

    const fileExtension = path.extname(file.name) || ".png";
    const baseName = path.basename(file.name, fileExtension);
    const uniqueName = `${Date.now()}-${sanitizeFileName(baseName)}${fileExtension}`;
    const filePath = path.join(uploadDir, uniqueName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json({
      message: "Uploaded",
      url: `/upload/profiles/${uniqueName}`,
    });
  } catch (error) {
    console.error("Profile image upload failed:", error);
    return NextResponse.json(
      { message: "Upload failed" },
      { status: 500 }
    );
  }
}
