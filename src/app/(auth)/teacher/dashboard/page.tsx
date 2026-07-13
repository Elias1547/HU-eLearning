import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/dbConnect";
import { Teacher } from "@/models/teacher";
import { Course } from "@/models/course";
import { Student } from "@/models/student";
import { Review } from "@/models/review";
import { RequestRefund } from "@/models/request-refund";
import { CourseProgress } from "@/models/course-progress";
import { Video as VideoModel } from "@/models/video";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, DollarSign, Users, Star, Plus, Eye, EyeOff, BarChart3, RefreshCw, Video, MessageCircle } from "lucide-react";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import React from "react";
import { SaleTimer, SalePriceBlock } from "@/components/courses/course-sales";
import RefundRequestsSection from "@/components/teacher/refund-requests-section";

// Sale interface (separate)
interface SaleData {
  _id: string;
  amount: number;
  saleTime: string;
  expiryTime?: string;
  notes?: string;
}

interface ITeacher {
  _id: string;
  name: string;
  email: string;
  password: string;
  upiId: string;
  age?: number;
  coursesCreated: string[];
  totalEarnings: number;
  ratings: string[];
  averageRating: number;
  isBlocked: boolean;
  loginAttempts: number;
  lockUntil: Date | null;
  lastLogin: Date | null;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  bio: string;
  phone: string;
  website: string;
  profileImage: string;
  createdAt: Date;
  updatedAt: Date;
  isLocked?: boolean;
}

interface ICourse {
  _id: string;
  name: string;
  imageUrl?: string;
  duration?: string;
  studentsPurchased?: string[];
  price: number;
  isPublished: boolean;
}

interface IReview {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string | Date;
  student?: {
    _id: string;
    name: string;
  };
  course?: {
    _id: string;
    name: string;
  };
}

interface IRefundRequest {
  _id: string;
  courseId: {
    _id: string;
    name: string;
    price: number;
  };
  studentId: {
    _id: string;
    name: string;
    email: string;
  };
  amount: number;
  reason?: string;
  notes?: string;
  refundReasonCategory: "duplicate" | "not_as_described" | "other";
  requestStatus: "pending" | "accepted" | "rejected";
  processedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  attachments?: string[];
  requestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default async function TeacherDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "teacher") {
    redirect("/role");
  }

  await dbConnect();

  // Fetch teacher data
  const teacher: ITeacher | null = await Teacher.findById(session.user.id).lean();

  if (!teacher) {
    redirect("/role");
  }

  // Fix: Ensure type match for teacher._id and course.teacher
  const teacherId =
    typeof teacher._id === "string"
      ? new mongoose.Types.ObjectId(teacher._id)
      : teacher._id;

  // Fetch courses created by the teacher (handle both ObjectId and string)
  const coursesRaw = await Course.find({
    $or: [{ teacher: teacherId }, { teacher: teacherId.toString() }],
  }).lean();

  // Serialize courses to ensure all ObjectIds are converted to strings
  const courses: ICourse[] = coursesRaw.map((course: any) => ({
    ...course,
    _id: course._id.toString(),
    teacher: course.teacher.toString(),
    studentsPurchased: course.studentsPurchased?.map((id: any) => id.toString()) || [],
  }));

  const courseIds: string[] = courses.map((course) => course._id);

  // Count total students across all courses
  const totalStudents = await Student.countDocuments({
    purchasedCourses: { $in: courseIds },
  });

  // Fetch reviews for teacher's courses
  const reviewsRaw = await Review.find({
    course: { $in: courseIds },
  })
    .populate("student", "name")
    .populate("course", "name")
    .lean();

  // Serialize reviews to ensure all ObjectIds are converted to strings
  const reviews: IReview[] = reviewsRaw.map((review: any) => ({
    ...review,
    _id: review._id.toString(),
    student: {
      ...review.student,
      _id: review.student._id.toString(),
    },
    course: {
      ...review.course,
      _id: review.course._id.toString(),
    },
  }));

  // Fetch refund requests for teacher's courses
  const refundRequestsRaw = await RequestRefund.find({
    courseId: { $in: courseIds },
  })
    .populate("courseId", "name price")
    .populate("studentId", "name email")
    .populate("processedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  // Serialize refund requests to ensure all ObjectIds are converted to strings
  const refundRequests: IRefundRequest[] = refundRequestsRaw.map((request: any) => ({
    ...request,
    _id: request._id.toString(),
    courseId: {
      ...request.courseId,
      _id: request.courseId._id.toString(),
    },
    studentId: {
      ...request.studentId,
      _id: request.studentId._id.toString(),
    },
    processedBy: request.processedBy ? {
      ...request.processedBy,
      _id: request.processedBy._id.toString(),
    } : null,
  }));

  // Calculate average rating
  const averageRating: number =
    reviews.length > 0
      ? reviews.reduce((sum: number, review: IReview) => sum + review.rating, 0) / reviews.length
      : 0;

  // Calculate total revenue (placeholder - would need payment system)
  const totalRevenue = courses.reduce((sum, course) => {
    const studentCount = course.studentsPurchased?.length || 0;
    return sum + course.price * studentCount;
  }, 0);

  // Get published courses count
  const publishedCourses = courses.filter((course) => course.isPublished).length;

  // Get pending refund requests count
  const pendingRefunds = refundRequests.filter((req) => req.requestStatus === "pending").length;

  const totalVideosByCourse = await Promise.all(
    courseIds.map(async (id) => ({
      courseId: id,
      totalVideos: await VideoModel.countDocuments({ course: id }),
    }))
  );
  const videosMap = new Map(totalVideosByCourse.map((item) => [item.courseId, item.totalVideos]));

  const progressRowsRaw = await CourseProgress.find({ course: { $in: courseIds } })
    .populate("student", "name email")
    .populate("course", "name")
    .sort({ updatedAt: -1 })
    .limit(24)
    .lean();

  type ProgressRow = {
    _id: string;
    studentName: string;
    studentEmail: string;
    courseName: string;
    completedVideos: number;
    totalVideos: number;
    percentageCompleted: number;
    updatedAt?: Date | string;
  };

  const progressRows: ProgressRow[] = progressRowsRaw.map((row: any) => {
    const courseIdStr = row.course?._id?.toString?.() || row.course?.toString?.() || "";
    const totalVideos = videosMap.get(courseIdStr) || 0;
    const completedVideos = row.completedVideos?.length || 0;
    return {
      _id: row._id.toString(),
      studentName: row.student?.name || "Student",
      studentEmail: row.student?.email || "",
      courseName: row.course?.name || "Course",
      completedVideos,
      totalVideos,
      percentageCompleted:
        totalVideos > 0
          ? Math.round((completedVideos / totalVideos) * 10000) / 100
          : row.percentageCompleted || 0,
      updatedAt: row.updatedAt,
    };
  });

  // Fetch all active sales for teacher's courses using API route
  async function fetchSaleForCourse(courseId: string): Promise<SaleData | null> {
    try {
      const baseUrl =
        process.env.NEXTAUTH_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const res = await fetch(
        `${baseUrl}/api/courses/${courseId}/sales`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const saleData: { sales?: SaleData[] } = await res.json();
      const now = new Date();
      const activeSale = saleData.sales?.find(
        (sale) =>
          new Date(sale.saleTime) <= now &&
          (!sale.expiryTime || new Date(sale.expiryTime) >= now)
      );
      return activeSale || null;
    } catch {
      return null;
    }
  }

  // Fetch all sales for dashboard courses
  const sales: Record<string, SaleData | null> = {};
  await Promise.all(
    courses.map(async (course) => {
      sales[course._id.toString()] = await fetchSaleForCourse(course._id.toString());
    })
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-6 rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm dark:bg-card/50 dark:ring-white/[0.04] sm:p-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Instructor workspace
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {teacher.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Manage courses, review refunds, and monitor learner progress from one calm overview.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-sm">
            <span className="font-medium text-foreground/80">{teacher.email}</span>
            <span aria-hidden className="hidden text-border sm:inline">
              ·
            </span>
            <span>UPI: {teacher.upiId}</span>
            {teacher.age && (
              <>
                <span aria-hidden className="hidden text-border sm:inline">
                  ·
                </span>
                <span>Age: {teacher.age}</span>
              </>
            )}
            {teacher.phone && (
              <>
                <span aria-hidden className="hidden text-border sm:inline">
                  ·
                </span>
                <span>{teacher.phone}</span>
              </>
            )}
            {teacher.website && (
              <>
                <span aria-hidden className="hidden text-border sm:inline">
                  ·
                </span>
                <a
                  href={teacher.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Website
                </a>
              </>
            )}
          </div>
          {teacher.bio && (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{teacher.bio}</p>
          )}
        </div>
        <Link href="/teacher/courses/create" className="shrink-0">
          <Button className="gap-2 font-semibold shadow-sm">
            <Plus className="h-4 w-4" />
            Create course
          </Button>
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 lg:gap-5">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-400">
                <BookOpen className="h-4 w-4" />
              </span>
              <span className="text-2xl font-bold tabular-nums">{courses.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{publishedCourses} published</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <Users className="h-4 w-4" />
              </span>
              <span className="text-2xl font-bold tabular-nums">{totalStudents}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all courses</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
                <DollarSign className="h-4 w-4" />
              </span>
              <span className="text-2xl font-bold tabular-nums">₹{totalRevenue.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Average rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300">
                <Star className="h-4 w-4" />
              </span>
              <span className="text-2xl font-bold tabular-nums">{averageRating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">From {reviews.length} reviews</p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending refunds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-800 dark:text-orange-300">
                <RefreshCw className="h-4 w-4" />
              </span>
              <span className="text-2xl font-bold tabular-nums">{pendingRefunds}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Link href="/teacher/courses/create">
          <Card className="h-full cursor-pointer border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
            <CardContent className="p-6 text-center">
              <Plus className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">Create course</h3>
              <p className="mt-1 text-sm text-muted-foreground">Start a new course</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/teacher/courses">
          <Card className="h-full cursor-pointer border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
            <CardContent className="p-6 text-center">
              <BookOpen className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">My courses</h3>
              <p className="mt-1 text-sm text-muted-foreground">Manage existing courses</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/teacher/live-classes">
          <Card className="h-full cursor-pointer border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
            <CardContent className="p-6 text-center">
              <Video className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">Live classes</h3>
              <p className="mt-1 text-sm text-muted-foreground">Manage live streaming</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/teacher/message">
          <Card className="h-full cursor-pointer border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
            <CardContent className="p-6 text-center">
              <MessageCircle className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">Messages</h3>
              <p className="mt-1 text-sm text-muted-foreground">Chat with students</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/teacher/reviews">
          <Card className="h-full cursor-pointer border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
            <CardContent className="p-6 text-center">
              <BarChart3 className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">Reviews</h3>
              <p className="mt-1 text-sm text-muted-foreground">View all your reviews</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Refund Requests Section */}
      {refundRequests.length > 0 && (
        <div className="mb-8 my-1">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Refund requests</h2>
            {pendingRefunds > 0 && (
              <Badge variant="destructive" className="text-sm">
                {pendingRefunds} Pending
              </Badge>
            )}
          </div>

          <RefundRequestsSection initialRequests={refundRequests} />
        </div>
      )}

      {/* Student Video Progress */}
     {/*  <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Student video progress</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent Progress Updates</CardTitle>
            <CardDescription>
              Track how students are progressing through your course videos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {progressRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No student progress data yet. Once students start watching, progress will appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {progressRows.map((row) => (
                  <div key={row._id} className="rounded border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{row.studentName}</p>
                        <p className="text-xs text-muted-foreground">{row.studentEmail}</p>
                      </div>
                      <Badge variant="outline">{row.percentageCompleted.toFixed(1)}%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{row.courseName}</p>
                    <div className="w-full bg-muted rounded h-2">
                      <div
                        className="bg-primary h-2 rounded"
                        style={{ width: `${Math.max(0, Math.min(100, row.percentageCompleted))}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {row.completedVideos} / {row.totalVideos} videos completed
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div> */}

      {/* My Courses Section */}
      <div className="mb-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">My courses</h2>
          <Link href="/teacher/courses">
            <Button variant="outline" className="font-semibold">
              View all courses
            </Button>
          </Link>
        </div>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 6).map((course: ICourse) => {
              // Count students for this course
              const courseStudents = course.studentsPurchased?.length || 0;

              // Get course reviews
              const courseReviews = reviews.filter(
                (review: IReview) => review.course?._id?.toString() === course._id.toString()
              );

              // Calculate course rating
              const courseRating =
                courseReviews.length > 0
                  ? courseReviews.reduce((sum: number, review: IReview) => sum + review.rating, 0) / courseReviews.length
                  : 0;

              // Sale logic
              const sale = sales[course._id.toString()];
              return (
                <Card
                  key={course._id.toString()}
                  className="relative overflow-hidden border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
                >
                  <div className="aspect-video relative bg-muted">
                    <Image
                      src={
                        course.imageUrl ||
                        `/placeholder.svg?height=200&width=400&text=${encodeURIComponent(course.name) || "/placeholder.svg"}`
                      }
                      alt={course.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-2 items-end">
                      <Badge variant={course.isPublished ? "default" : "secondary"}>
                        {course.isPublished ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Draft
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="line-clamp-1">{course.name}</CardTitle>
                    <CardDescription>
                      {course.duration || "Self-paced"} • {courseStudents} students enrolled
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{courseRating.toFixed(1)}</span>
                        <span className="text-muted-foreground text-sm">({courseReviews.length})</span>
                      </div>
                      <div className="font-medium">
                        {sale ? (
                          <>
                            <SalePriceBlock sale={sale} price={course.price} />
                            <SaleTimer expiryTime={sale.expiryTime} />
                          </>
                        ) : (
                          course.price === 0 ? "Free" : `₹${course.price}`
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/courses/${course._id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          Manage
                        </Button>
                      </Link>
                      <Link href={`/courses/${course._id}`} className="flex-1">
                        <Button className="w-full" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-medium mb-2">No courses created yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first course to start teaching and sharing your knowledge
              </p>
              <Link href="/teacher/courses/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Course
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Reviews */}
      {reviews.length > 0 && (
        <div>
          <h2 className="mb-6 text-xl font-bold tracking-tight sm:text-2xl">Recent reviews</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {reviews.slice(0, 4).map((review: IReview) => (
              <Card key={review._id.toString()}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium line-clamp-1">{review.course?.name || "Unknown Course"}</h4>
                      <p className="text-sm text-muted-foreground">by {review.student?.name || "Anonymous"}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${star <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{review.comment}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {reviews.length > 4 && (
            <div className="text-center mt-4">
              <Link href="/teacher/reviews">
                <Button variant="outline">View All Reviews</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
