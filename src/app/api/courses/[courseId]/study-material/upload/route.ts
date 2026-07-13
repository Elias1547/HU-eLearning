import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Course } from "@/models/course";
import { notifyCourseStudents } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ Await params FIRST
  const params = await context.params;
  const courseId = params?.courseId;

  if (!courseId) {
    return NextResponse.json(
      { error: "Missing courseId in params" },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    const course = await Course.findById(courseId).select("name teacher").lean();
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (course.teacher?.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You can only upload materials to your own courses" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "upload",
      courseId
    );

    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, file.name);

    await fs.writeFile(filePath, buffer);

    const fileUrl = `/upload/${courseId}/${file.name}`;

    await notifyCourseStudents(courseId, {
      type: "material_uploaded",
      title: `New study material added in ${course.name}`,
      link: `/courses/${courseId}`,
      data: { fileName: file.name, url: fileUrl },
    }).catch((error) => console.error("Study material notification error:", error));

    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
