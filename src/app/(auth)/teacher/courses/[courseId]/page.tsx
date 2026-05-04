import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Trash2,
  Video,
  Users,
  PlayCircle,
  Settings,
  UserX,
} from "lucide-react";
import { dbConnect } from "@/lib/dbConnect";
import { Course } from "@/models/course";
import { Video as VideoModel } from "@/models/video";
import { Student } from "@/models/student";
import { CourseProgress } from "@/models/course-progress";
import { VideoUploadModal } from "@/components/teacher/video-upload-modal";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

interface TeacherCourse {
  _id: string;
  name: string;
  description: string;
  syllabus?: string;
  price: number;
  duration: string;
  imageUrl?: string;
  isPublished: boolean;
  coupon?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  teacher: string;
  studentsPurchased?: string[];
}

interface VideoData {
  _id: string;
  title: string;
  description?: string;
  url: string;
  position: number;
  duration?: string;
  createdAt: Date;
}

interface StudentData {
  _id: string;
  name: string;
  email: string;
  enrolledAt: Date;
}

interface CourseWithStringId extends TeacherCourse {
  _id: string;
}

interface VideoWithStringId extends VideoData {
  _id: string;
}

interface StudentWithStringId extends StudentData {
  _id: string;
}

interface StudentProgressSummary {
  studentId: string;
  percentageCompleted: number;
  completedVideosCount: number;
  totalWatchTimeSeconds: number;
  started: boolean;
  completed: boolean;
}

interface ProgressDoc {
  student: { toString(): string } | string;
  percentageCompleted?: number;
  completedVideos?: Array<{ toString(): string } | string>;
  totalWatchTimeSeconds?: number;
}

interface GetCourseWithDetailsResult {
  course: CourseWithStringId;
  videos: VideoWithStringId[];
  students: StudentWithStringId[];
  studentProgressMap: Record<string, StudentProgressSummary>;
  averageCompletionPercentage: number;
  completedStudentsCount: number;
}

async function getCourseWithDetails(courseId: string, teacherId: string) {
  await dbConnect();

  try {
    const course = await Course.findOne({
      _id: courseId,
      teacher: teacherId,
    }).lean<TeacherCourse>();

    if (!course) {
      return null;
    }

    const videos = await VideoModel.find({ course: courseId })
      .sort({ position: 1 })
      .lean<VideoData[]>();

    const enrolledStudents = await Student.find({
      _id: { $in: course.studentsPurchased || [] },
    }).lean<StudentData[]>();

    const progressDocs = await CourseProgress.find({
      course: courseId,
      student: { $in: course.studentsPurchased || [] },
    }).lean();

    const studentProgressMap = Object.fromEntries(
      (progressDocs as ProgressDoc[]).map((progress) => [
        progress.student.toString(),
        {
          studentId: progress.student.toString(),
          percentageCompleted: progress.percentageCompleted || 0,
          completedVideosCount: progress.completedVideos?.length || 0,
          totalWatchTimeSeconds: progress.totalWatchTimeSeconds || 0,
          started:
            (progress.percentageCompleted || 0) > 0 ||
            (progress.totalWatchTimeSeconds || 0) > 0,
          completed: (progress.percentageCompleted || 0) >= 100,
        },
      ])
    ) as Record<string, StudentProgressSummary>;

    const progressValues = Object.values(studentProgressMap);
    const averageCompletionPercentage =
      progressValues.length > 0
        ? progressValues.reduce(
            (sum, entry) => sum + entry.percentageCompleted,
            0
          ) / progressValues.length
        : 0;
    const completedStudentsCount = progressValues.filter(
      (entry) => entry.completed
    ).length;

    return {
      course: {
        ...course,
        _id: course._id.toString(),
      } as CourseWithStringId,
      videos: videos.map(
        (video: VideoData): VideoWithStringId => ({
          ...video,
          _id: video._id.toString(),
        })
      ),
      students: enrolledStudents.map(
        (student: StudentData): StudentWithStringId => ({
          ...student,
          _id: student._id.toString(),
        })
      ),
      studentProgressMap,
      averageCompletionPercentage,
      completedStudentsCount,
    } as GetCourseWithDetailsResult;
  } catch (error) {
    console.error("Error fetching course details:", error);
    return null;
  }
}

interface TeacherCoursePageProps {
  params: {
    courseId: string;
  };
}

export default async function TeacherCoursePage({
  params,
}: TeacherCoursePageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "teacher") {
    redirect("/role");
  }

  const { courseId } = params;
  const data = await getCourseWithDetails(courseId, session.user.id);

  if (!data) {
    notFound();
  }

  const {
    course,
    videos,
    students,
    studentProgressMap,
    averageCompletionPercentage,
    completedStudentsCount,
  } = data;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/teacher/courses"
          className="flex items-center text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Courses
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{course.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant={course.isPublished ? "default" : "outline"}>
                  {course.isPublished ? "Published" : "Draft"}
                </Badge>
                <Badge variant="outline">
                  {course.price === 0 ? "Free" : `INR ${course.price}`}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/courses/${course._id}`}>
                <Button variant="outline" size="sm">
                  <Eye className="mr-1 h-4 w-4" /> Preview
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative aspect-video rounded-lg overflow-hidden border">
            <Image
              src={
                course.imageUrl ||
                `/placeholder.svg?height=400&width=800&text=${encodeURIComponent(
                  course.name
                )}`
              }
              alt={course.name}
              fill
              className="object-cover"
            />
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
              <TabsTrigger value="students">
                Students ({students.length})
              </TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Course Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{course.description}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Learning Progress Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Average student completion
                    </span>
                    <span className="font-medium">
                      {Math.round(averageCompletionPercentage)}%
                    </span>
                  </div>
                  <Progress value={averageCompletionPercentage} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Students who finished the course
                    </span>
                    <span className="font-medium">{completedStudentsCount}</span>
                  </div>
                </CardContent>
              </Card>

              {course.syllabus && (
                <Card>
                  <CardHeader>
                    <CardTitle>Syllabus</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{course.syllabus}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="videos" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Course Videos</h3>
                <VideoUploadModal courseId={courseId} />
              </div>

              {videos.length > 0 ? (
                <div className="space-y-3">
                  {videos.map((video, index) => (
                    <Card key={video._id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium">{video.title}</h4>
                              {video.description && (
                                <p className="text-sm text-muted-foreground">
                                  {video.description}
                                </p>
                              )}
                              {video.duration && (
                                <p className="text-xs text-muted-foreground">
                                  {video.duration}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/courses/${courseId}`}>
                              <Button variant="outline" size="sm">
                                <PlayCircle className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No videos yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start building your course by uploading your first video.
                    </p>
                    <VideoUploadModal courseId={courseId} onSuccess={() => {}} />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Enrolled Students</h3>
                <Badge variant="outline">{students.length} enrolled</Badge>
              </div>

              {students.length > 0 ? (
                <div className="space-y-3">
                  {students.map((student) => {
                    const progress = studentProgressMap[student._id];

                    return (
                      <Card key={student._id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-primary/10 text-primary rounded-full w-10 h-10 flex items-center justify-center font-medium">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-medium">{student.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {student.email}
                                </p>
                                <div className="mt-2 space-y-1">
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>
                                      {Math.round(progress?.percentageCompleted || 0)}%
                                      {" "}complete
                                    </span>
                                    <span>
                                      {progress?.completedVideosCount || 0} / {videos.length} videos
                                    </span>
                                  </div>
                                  <Progress
                                    value={progress?.percentageCompleted || 0}
                                    className="h-2 w-56"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline">
                                {progress?.completed
                                  ? "Completed"
                                  : progress?.started
                                    ? "In Progress"
                                    : "Not Started"}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive"
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Block
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">
                      No students enrolled
                    </h3>
                    <p className="text-muted-foreground">
                      Students will appear here once they enroll in your course.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Course Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Publication Status</h4>
                      <p className="text-sm text-muted-foreground">
                        {course.isPublished
                          ? "Your course is live and visible to students"
                          : "Your course is in draft mode"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className={
                        course.isPublished ? "text-amber-600" : "text-green-600"
                      }
                    >
                      {course.isPublished ? (
                        <>
                          <EyeOff className="mr-1 h-4 w-4" /> Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1 h-4 w-4" /> Publish
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/20">
                    <div>
                      <h4 className="font-medium text-destructive">
                        Delete Course
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete this course and all its content
                      </p>
                    </div>
                    <Button variant="destructive">
                      <Trash2 className="mr-1 h-4 w-4" /> Delete Course
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="md:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Videos</span>
                <span className="font-medium">{videos.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Students</span>
                <span className="font-medium">{students.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Avg Progress</span>
                <span className="font-medium">
                  {Math.round(averageCompletionPercentage)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Completions</span>
                <span className="font-medium">{completedStudentsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="font-medium">
                  {course.price === 0 ? "Free" : `INR ${course.price}`}
                </span>
              </div>
              <Progress value={averageCompletionPercentage} className="h-2" />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={course.isPublished ? "default" : "outline"}>
                  {course.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {new Date(course.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-center">
                <VideoUploadModal courseId={courseId} onSuccess={() => {}} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
