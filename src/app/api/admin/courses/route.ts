import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Course } from "@/models/course";
import { Teacher } from "@/models/teacher";

export async function POST(req: NextRequest) {
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

    if (
      !name?.trim() ||
      !description?.trim() ||
      !syllabus?.trim() ||
      !duration?.trim() ||
      !category?.trim() ||
      !level?.trim() ||
      !teacherId
    ) {
      return NextResponse.json(
        { error: "Missing required fields for course creation" },
        { status: 400 }
      );
    }

    await dbConnect();

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const createdCourse = await Course.create({
      name: name.trim(),
      description: description.trim(),
      syllabus: syllabus.trim(),
      price: Number(price ?? 0),
      duration: duration.trim(),
      category: category.trim(),
      level: level.trim(),
      teacher: teacher._id,
      imageUrl: imageUrl?.trim() || undefined,
      isPublished: Boolean(isPublished),
      studentsPurchased: [],
    });

    await Teacher.findByIdAndUpdate(teacherId, {
      $addToSet: { coursesCreated: createdCourse._id },
    });

    const populatedCourse = await Course.findById(createdCourse._id)
      .populate("teacher", "name email")
      .lean();

    return NextResponse.json(
      { message: "Course created successfully", course: populatedCourse },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating admin course:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
