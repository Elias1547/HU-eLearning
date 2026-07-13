import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Course } from "@/models/course"
import { Quiz, quizValidationSchema } from "@/models/quiz"
import { Student } from "@/models/student"
import { notifyMany } from "@/lib/notifications"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const body = await req.json()
    const courseId = body.courseId
    if (!courseId) return NextResponse.json({ error: "courseId is required" }, { status: 400 })

    // Validate frontend payload
    const validated = quizValidationSchema.parse(body)

    // Ensure course exists and teacher owns it
    const course = await Course.findById(courseId).lean()
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })
    if (course.teacher?.toString() !== session.user.id) {
      return NextResponse.json({ error: "You can only create quizzes for your own courses" }, { status: 403 })
    }

    // Map courseId -> course for Mongoose
    const quiz = await Quiz.create({
      course: courseId,
      teacher: session.user.id,
      title: validated.title,
      description: validated.description,
      questions: validated.questions,
      timeLimitSeconds: validated.timeLimitSeconds,
      passingScorePercent: validated.passingScorePercent,
      attemptLimit: validated.attemptLimit,
      showAnswersAfterSubmission: validated.showAnswersAfterSubmission,
      instantResults: validated.instantResults,
      shuffleQuestions: validated.shuffleQuestions,
      published: validated.published, // <-- ensure we take value from frontend exactly
      requiredForCertificate: validated.requiredForCertificate,
    })

    // Notify students if published
    if (quiz.published) {
      const students = await Student.find({ purchasedCourses: courseId }).select("_id").lean()
      await notifyMany(
        students.map((s: { _id: { toString: () => string } }) => ({
          userId: s._id.toString(),
          userRole: "student" as const,
        })),
        {
          type: "quiz_published",
          title: `New quiz published: ${quiz.title}`,
          body: "A new quiz is now available in your course.",
          link: `/courses/${courseId}`,
          courseId,
          data: { quizId: quiz._id.toString() },
        }
      )
    }

    return NextResponse.json({ quiz: quiz.toJSON() }, { status: 201 })
  } catch (error) {
    console.error("Quiz create error:", error)
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
