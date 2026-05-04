import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { getCourseProgressSnapshot, updateCourseProgress } from "@/lib/course-progress";
import { Course } from "@/models/course";
import { Student } from "@/models/student";

const progressUpdateSchema = z.object({
  videoId: z.string().min(1, "Video ID is required"),
  currentTimeSeconds: z.number().min(0),
  durationSeconds: z.number().min(0).optional(),
  markCompleted: z.boolean().optional(),
});

async function ensureStudentHasAccess(studentId: string, courseId: string) {
  const student = await Student.findById(studentId).lean();
  const hasCourse = student?.purchasedCourses?.some(
    (purchasedCourseId: { toString(): string } | string) =>
      purchasedCourseId.toString() === courseId
  );

  return Boolean(hasCourse);
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "student") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await context.params;
    await dbConnect();

    const hasAccess = await ensureStudentHasAccess(session.user.id, courseId);
    if (!hasAccess) {
      return NextResponse.json({ message: "Course access denied" }, { status: 403 });
    }

    const snapshot = await getCourseProgressSnapshot(session.user.id, courseId);

    return NextResponse.json({
      courseId,
      ...snapshot,
      completedVideos: snapshot.completedVideosCount,
      percentage: snapshot.percentageCompleted,
    });
  } catch (error) {
    console.error("Error fetching student progress:", error);
    return NextResponse.json({ message: "Failed to fetch progress" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "student") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await context.params;
    const body = await request.json();
    const validation = progressUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: validation.error.flatten() },
        { status: 400 }
      );
    }

    await dbConnect();

    const course = await Course.findById(courseId).lean();
    if (!course) {
      return NextResponse.json({ message: "Course not found" }, { status: 404 });
    }

    const hasAccess = await ensureStudentHasAccess(session.user.id, courseId);
    if (!hasAccess) {
      return NextResponse.json({ message: "Course access denied" }, { status: 403 });
    }

    const snapshot = await updateCourseProgress({
      studentId: session.user.id,
      courseId,
      ...validation.data,
    });

    return NextResponse.json({
      courseId,
      ...snapshot,
      completedVideos: snapshot.completedVideosCount,
      percentage: snapshot.percentageCompleted,
    });
  } catch (error) {
    console.error("Error updating student progress:", error);
    return NextResponse.json({ message: "Failed to update progress" }, { status: 500 });
  }
}
