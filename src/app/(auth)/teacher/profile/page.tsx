import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/dbConnect";
import { Teacher } from "@/models/teacher";
import { Course } from "@/models/course";
import { Student } from "@/models/student";
import { Review } from "@/models/review";
import { TeacherProfile } from "@/components/profile/teacher-profile";
import { authOptions } from "@/lib/auth";

interface CourseLean {
  _id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  isPublished: boolean;
  studentsPurchased?: string[];
  createdAt: Date;
}

interface ReviewLean {
  _id: string;
  rating: number;
  comment: string;
  student: { name?: string } | null;
  course: { name?: string } | null;
  createdAt: Date;
}

async function getTeacherData(teacherId: string) {
  await dbConnect();

  try {
    const teacher = await Teacher.findById(teacherId).lean();

    if (!teacher) {
      return null;
    }

    const courses = await Course.find({ teacher: teacherId }).lean();

    // Total students
    const totalStudents = await Student.countDocuments({
      purchasedCourses: {
        $in: courses.map((course: CourseLean) => course._id),
      },
    });

    // Reviews
    const reviews = await Review.find({
      course: {
        $in: courses.map((course: CourseLean) => course._id),
      },
    })
      .populate("student", "name")
      .populate("course", "name")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Average rating
    const averageRating =
      (reviews as ReviewLean[]).length > 0
        ? (reviews as ReviewLean[]).reduce(
            (total: number, review: ReviewLean) =>
              total + review.rating,
            0
          ) / (reviews as ReviewLean[]).length
        : 0;

    // Revenue
    const totalRevenue = (courses as CourseLean[]).reduce(
      (total: number, course: CourseLean) => {
        const studentsCount =
          course.studentsPurchased?.length || 0;

        return total + course.price * studentsCount;
      },
      0
    );

    return {
      teacher: {
        _id: teacher._id.toString(),
        name: teacher.name,
        email: teacher.email,
        bio: teacher.bio || "",
        phone: teacher.phone || "",
        website: teacher.website || "",
        profileImage: teacher.profileImage || "",
        createdAt: teacher.createdAt,
      },

      courses: (courses as CourseLean[]).map(
        (course: CourseLean) => ({
          _id: course._id.toString(),
          name: course.name,
          description: course.description,
          imageUrl: course.imageUrl || "",
          price: course.price,
          isPublished: course.isPublished,
          studentCount:
            course.studentsPurchased?.length || 0,
          createdAt: course.createdAt,
        })
      ),

      stats: {
        totalCourses: courses.length,
        totalStudents,
        totalRevenue,
        averageRating,
        publishedCourses: (courses as CourseLean[]).filter(
          (course: CourseLean) => course.isPublished
        ).length,
      },

      recentReviews: (reviews as ReviewLean[]).map(
        (review: ReviewLean) => ({
          _id: review._id.toString(),
          rating: review.rating,
          comment: review.comment,

          student: {
            name: review.student?.name || "Anonymous",
          },

          course: {
            name:
              review.course?.name || "Unknown Course",
          },

          createdAt: review.createdAt,
        })
      ),
    };
  } catch (error) {
    console.error("Error fetching teacher data:", error);
    return null;
  }
}

export default async function TeacherProfilePage() {
  const session = await getServerSession(authOptions);

  // Protect route
  if (!session?.user) {
    redirect("/role");
  }

  if (session.user.role !== "teacher") {
    redirect("/role");
  }

  const data = await getTeacherData(session.user.id);

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm text-center">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                Profile Not Found
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Unable to load your profile data.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="w-full overflow-hidden">
          <TeacherProfile data={data} />
        </div>
      </div>
    </main>
  );
}