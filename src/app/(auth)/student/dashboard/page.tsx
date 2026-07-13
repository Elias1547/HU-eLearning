import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/dbConnect";
import { Student } from "@/models/student";
import { Course } from "@/models/course";
import { Review } from "@/models/review";
import { RequestRefund } from "@/models/request-refund";
import { CourseProgress } from "@/models/course-progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Award,
  Clock,
  Star,
  PlayCircle,
  User,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  FileText,
  Video,
  MessageCircle,
} from "lucide-react";
import { authOptions } from "@/lib/auth";

interface ReviewType {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string | Date;
  course?: {
    name?: string;
  };
}

interface TeacherType {
  name?: string;
}

interface EnrolledCourseType {
  _id: string;
  name: string;
  imageUrl?: string;
  teacher?: TeacherType;
  duration?: string;
  price?: number;
}

function sumVideoProgressSeconds(vp: unknown): number {
  if (!vp || typeof vp !== "object") return 0;
  if (vp instanceof Map) {
    let s = 0;
    for (const v of vp.values()) s += Number(v) || 0;
    return s;
  }
  return Object.values(vp as Record<string, number>).reduce((a, b) => a + (Number(b) || 0), 0);
}

interface RefundRequestType {
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

type DashboardProgressRow = {
  course?: unknown;
  percentageCompleted?: number;
  lastAccessedVideo?: unknown;
  breakdown?: { lessons?: unknown };
  isComplete?: boolean;
  videoProgress?: unknown;
};

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== "student") {
    redirect("/role");
  }

  await dbConnect();

  // Fetch student data
  const student = await (Student as any).findById(session.user.id).lean();

  if (!student) {
    redirect("/role");
  }

  // Fetch enrolled courses with teacher info
  const enrolledCourses: EnrolledCourseType[] = await (Course as any).find({
    _id: { $in: student.purchasedCourses || [] },
  })
    .populate("teacher", "name")
    .lean();

  // Fetch student's reviews
  const reviews: ReviewType[] = await (Review as any).find({ student: student._id })
    .populate("course", "name")
    .lean();

  // Fetch student's refund requests
  const refundRequests: RefundRequestType[] = await (RequestRefund as any).find({
    studentId: student._id,
  })
    .populate("courseId", "name price")
    .populate("studentId", "name email")
    .populate("processedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  const courseIds = ((student.purchasedCourses || []) as unknown[]).map((id: unknown) => String(id));
  const progressRows: DashboardProgressRow[] = courseIds.length
    ? ((await (CourseProgress as any).find({
        student: student._id,
        course: { $in: courseIds },
      }).lean()) as DashboardProgressRow[])
    : [];
  const progressByCourse = new Map(
    progressRows.map((row: DashboardProgressRow) => [String(row.course), row])
  );

  // Calculate stats
  const totalCourses = enrolledCourses.length;
  const completedCourses = progressRows.filter(
    (row: DashboardProgressRow) => !!row.isComplete
  ).length;
  const totalReviews = reviews.length;
  const pendingRefunds = refundRequests.filter(req => req.requestStatus === "pending").length;
  const acceptedRefunds = refundRequests.filter(req => req.requestStatus === "accepted").length;

  const averageRating: number =
    reviews.length > 0
      ? reviews.reduce(
          (sum: number, review: ReviewType) =>
            sum + (typeof review.rating === "number" ? review.rating : 0),
          0
        ) / reviews.length
      : 0;

  const totalWatchSeconds = progressRows.reduce(
    (sum: number, row: DashboardProgressRow) => sum + sumVideoProgressSeconds(row.videoProgress),
    0
  );
  const estimatedHours =
    totalWatchSeconds > 0 ? Math.round((totalWatchSeconds / 3600) * 10) / 10 : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm dark:bg-card/50 dark:ring-white/[0.04] sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome back, {student.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Pick up where you left off—your enrolled courses and activity are organized below.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 lg:gap-5">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Enrolled courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-400">
                <BookOpen className="h-4 w-4" />
              </span>
              <span className="text-2xl font-bold tabular-nums">{totalCourses}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCourses > 0 ? "Keep learning!" : "Start your first course"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <Award className="h-4 w-4" />
              </span>
              <span className="text-2xl font-bold tabular-nums">{completedCourses}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCourses > 0
                ? `${
                    totalCourses === 0
                      ? 0
                      : ((completedCourses / totalCourses) * 100).toFixed(0)
                  }% completion rate`
                : "No courses completed"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reviews written
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300">
                <Star className="h-4 w-4" />
              </span>
              <span className="text-2xl font-bold tabular-nums">{totalReviews}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg rating: {averageRating > 0 ? averageRating.toFixed(1) : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Learning hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
                <Clock className="h-4 w-4" />
              </span>
              <span className="text-2xl font-bold tabular-nums">{estimatedHours}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {estimatedHours > 0 ? "From your video watch time" : "Watch lessons to build this stat"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Refund requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-800 dark:text-orange-300">
                <RefreshCw className="h-4 w-4" />
              </span>
              <span className="text-2xl font-bold tabular-nums">{refundRequests.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingRefunds} pending • {acceptedRefunds} approved
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Link href="/courses">
          <Card className="h-full cursor-pointer border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
            <CardContent className="p-6 text-center">
              <BookOpen className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">Browse courses</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Discover new learning opportunities
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/student/live-classes">
          <Card className="h-full cursor-pointer border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
            <CardContent className="p-6 text-center">
              <Video className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">Live classes</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Join live streaming sessions
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/student/message">
          <Card className="h-full cursor-pointer border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
            <CardContent className="p-6 text-center">
              <MessageCircle className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">Messages</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Chat with instructors
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/student/profile">
          <Card className="h-full cursor-pointer border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
            <CardContent className="p-6 text-center">
              <User className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">Profile</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your account settings
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/student/dashboard#my-learning" className="block h-full">
          <Card className="h-full cursor-pointer border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
            <CardContent className="p-6 text-center">
              <TrendingUp className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">My learning</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                View progress across your enrolled courses
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Refund Requests Section */}
      {refundRequests.length > 0 && (
        <div className="mb-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Refund requests</h2>
            {pendingRefunds > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {pendingRefunds} Pending Review
              </Badge>
            )}
          </div>

          <div className="grid gap-4">
            {refundRequests.slice(0, 3).map((request) => {
              const getStatusBadge = (status: string) => {
                switch (status) {
                  case "pending":
                    return (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending Review
                      </Badge>
                    );
                  case "accepted":
                    return (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    );
                  case "rejected":
                    return (
                      <Badge variant="destructive" className="bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                      </Badge>
                    );
                  default:
                    return <Badge variant="outline">{status}</Badge>;
                }
              };

              const getCategoryLabel = (category: string) => {
                switch (category) {
                  case "duplicate":
                    return "Duplicate Payment";
                  case "not_as_described":
                    return "Not as Described";
                  case "other":
                    return "Other";
                  default:
                    return category;
                }
              };

              return (
                <Card key={request._id} className={`${
                  request.requestStatus === "accepted" ? "border-l-4 border-l-green-500" :
                  request.requestStatus === "rejected" ? "border-l-4 border-l-red-500" :
                  "border-l-4 border-l-yellow-500"
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{request.courseId.name}</CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ₹{request.amount}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(request.requestedAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {getCategoryLabel(request.refundReasonCategory)}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(request.requestStatus)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {request.reason && (
                      <div>
                        <h4 className="font-medium mb-1 text-sm">Reason:</h4>
                        <p className="rounded-md bg-muted/80 p-2 text-sm text-muted-foreground">
                          {request.reason}
                        </p>
                      </div>
                    )}

                    {request.processedBy && (
                      <div className="text-xs text-muted-foreground">
                        Processed by: {request.processedBy.name}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {request.requestStatus === "pending" && (
                        <div className="flex items-center gap-2 text-yellow-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Awaiting instructor review...</span>
                        </div>
                      )}
                      
                      {request.requestStatus === "accepted" && (
                        <Link href={`/refund?courseId=${request.courseId._id}&courseName=${encodeURIComponent(request.courseId.name)}&studentId=${student._id}`} className="flex-1">
                          <Button className="w-full bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Proceed with Refund
                          </Button>
                        </Link>
                      )}
                      
                      {request.requestStatus === "rejected" && (
                        <div className="flex items-center gap-2 text-red-600">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Request was rejected by instructor</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {refundRequests.length > 3 && (
            <div className="text-center mt-4">
              <Button variant="outline">View All Refund Requests</Button>
            </div>
          )}
        </div>
      )}

      {/* My Courses Section */}
      <div id="my-learning" className="mb-8 scroll-mt-28">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">My courses</h2>
          <Link href="/courses">
            <Button variant="outline" className="font-semibold">
              Browse more courses
            </Button>
          </Link>
        </div>

        {enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((course: EnrolledCourseType) => {
              const row = progressByCourse.get(String(course._id));
              const progressPercent = Math.min(
                100,
                Math.round(Number(row?.percentageCompleted ?? 0) * 100) / 100
              );
              const lastAccessed = row?.lastAccessedVideo
                ? String(row.lastAccessedVideo)
                : null;
              const continueHref = lastAccessed
                ? `/courses/${course._id}/learn/${lastAccessed}`
                : `/courses/${course._id}/learn`;

              // Check if there's a refund request for this course
              const courseRefundRequest = refundRequests.find(
                req => req.courseId._id.toString() === course._id.toString()
              );

              return (
                <Card
                  key={course._id}
                  className="overflow-hidden border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
                >
                  <div className="aspect-video relative bg-muted">
                    <Image
                      src={course.imageUrl || "/course-placeholder.svg"}
                      alt={course.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-background/90 px-2 py-1 rounded text-xs font-medium">
                      {progressPercent}% Complete
                    </div>
                    {courseRefundRequest && (
                      <div className="absolute top-2 left-2">
                        {courseRefundRequest.requestStatus === "pending" && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                            Refund Pending
                          </Badge>
                        )}
                        {courseRefundRequest.requestStatus === "accepted" && (
                          <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                            Refund Approved
                          </Badge>
                        )}
                        {courseRefundRequest.requestStatus === "rejected" && (
                          <Badge variant="destructive" className="bg-red-100 text-red-800 text-xs">
                            Refund Rejected
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <CardHeader className="pb-3">
                    <CardTitle className="line-clamp-1">
                      {course.name}
                    </CardTitle>
                    <CardDescription>
                      By {course.teacher?.name || "Unknown"} •{" "}
                      {course.duration || "Self-paced"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="mb-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm font-medium">{progressPercent}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>

                    <div className="flex gap-2">
                      <Link href={continueHref} className="flex-1">
                        <Button className="w-full">
                          <PlayCircle className="h-4 w-4 mr-2" />
                          {progressPercent > 0 ? "Continue" : "Start"}
                        </Button>
                      </Link>
                      {!courseRefundRequest && course.price && course.price > 0 && (
                        <Link href={`/request-refund?courseId=${course._id}&courseName=${encodeURIComponent(course.name)}&price=${course.price}&studentId=${student._id}`}>
                          <Button variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
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
              <h3 className="text-xl font-medium mb-2">
                No courses enrolled yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Start your learning journey by enrolling in your first course
              </p>
              <Link href="/courses">
                <Button>Browse Courses</Button>
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
            {reviews.slice(0, 4).map((review: ReviewType) => (
              <Card key={review._id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium line-clamp-1">
                      {review.course?.name || "Unknown Course"}
                    </h4>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= review.rating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {review.comment}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {reviews.length > 4 && (
            <div className="text-center mt-4">
              <Link href="/student/profile">
                <Button variant="outline">View All Reviews</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
