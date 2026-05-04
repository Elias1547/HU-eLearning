import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { LiveClass } from "@/models/live-class"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"

interface LiveStreamPageProps {
  params: {
    id: string
  }
}

export default async function LiveStreamPage({ params }: LiveStreamPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/role")
  }

  await dbConnect()

  const liveClass = await LiveClass.findById(params.id).lean()
  if (!liveClass || !liveClass.meetingUrl) {
    redirect("/student/live-classes")
  }

  if (session.user.role === "teacher") {
    const teacher = await Teacher.findById(session.user.id).lean()
    if (!teacher || liveClass.teacher.toString() !== teacher._id.toString()) {
      redirect("/teacher/live-classes")
    }
  } else if (session.user.role === "student") {
    const student = await Student.findById(session.user.id).lean()
    if (
      !student ||
      student.isBlocked ||
      !student.purchasedCourses?.some((courseId) => courseId.toString() === liveClass.course.toString())
    ) {
      redirect("/student/live-classes")
    }

    await LiveClass.findByIdAndUpdate(liveClass._id, {
      $addToSet: { attendees: student._id },
    })
  } else if (session.user.role === "admin") {
    redirect("/admin/dashboard")
  } else {
    redirect("/role")
  }

  redirect(liveClass.meetingUrl)
}

export async function generateMetadata() {
  return {
    title: "Zoom Live Class - EduLearn",
    description: "Launch the Zoom live class session",
  }
}
