import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Course } from "@/models/course";
import { Teacher } from "@/models/teacher";
import { Video } from "@/models/video";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      syllabus,
      price,
      duration,
      category,
      level,
      teacherId,
      imageUrl,
      isPublished,
    } = body as {
      name?: string;
      description?: string;
      syllabus?: string;
      price?: number;
      duration?: string;
      category?: string;
      level?: string;
      teacherId?: string;
      imageUrl?: string;
      isPublished?: boolean;
    };

    await dbConnect();

    const existing = await Course.findById(params.courseId);
    if (!existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const previousTeacherId = existing.teacher.toString();

    if (teacherId) {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
      }
      existing.teacher = teacher._id;
    }

    if (typeof name === "string") existing.name = name.trim();
    if (typeof description === "string") existing.description = description.trim();
    if (typeof syllabus === "string") existing.syllabus = syllabus.trim();
    if (typeof duration === "string") existing.duration = duration.trim();
    if (typeof category === "string") existing.category = category.trim();
    if (typeof level === "string") existing.level = level.trim();
    if (typeof price === "number") existing.price = price;
    if (typeof imageUrl === "string") existing.imageUrl = imageUrl.trim() || undefined;
    if (typeof isPublished === "boolean") existing.isPublished = isPublished;

    await existing.save();

    if (teacherId && teacherId !== previousTeacherId) {
      await Teacher.findByIdAndUpdate(previousTeacherId, {
        $pull: { coursesCreated: existing._id },
      });
      await Teacher.findByIdAndUpdate(teacherId, {
        $addToSet: { coursesCreated: existing._id },
      });
    }

    const populated = await Course.findById(existing._id)
      .populate("teacher", "name email")
      .lean();

    return NextResponse.json({ message: "Course updated successfully", course: populated });
  } catch (error) {
    console.error("Error updating admin course:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const course = await Course.findById(params.courseId);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const teacherId = course.teacher.toString();
    await Video.deleteMany({ course: course._id });
    await Course.findByIdAndDelete(course._id);
    await Teacher.findByIdAndUpdate(teacherId, {
      $pull: { coursesCreated: course._id },
    });

    return NextResponse.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin course:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
