import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Course } from "@/models/course"
import { TeacherAnalyticsClient } from "./teacher-analytics-client"

export default async function TeacherAnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "teacher") {
    redirect("/role")
  }

  await dbConnect()
  const courses = await (Course as any).find({ teacher: session.user.id })
    .select("_id name isPublished")
    .sort({ updatedAt: -1 })
    .lean()

  const options = courses.map((c: { _id: unknown; name?: string; isPublished?: boolean }) => ({
    id: String(c._id),
    name: c.name,
    isPublished: !!c.isPublished,
  }))

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Course analytics</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Track enrollment progress and quiz performance for each of your courses.
        </p>
      </div>

      {options.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-10 text-center">
          <p className="text-muted-foreground">You do not have any courses yet.</p>
          <Link href="/teacher/courses/create" className="mt-4 inline-block text-primary underline-offset-4 hover:underline">
            Create a course
          </Link>
        </div>
      ) : (
        <TeacherAnalyticsClient courses={options} />
      )}
    </div>
  )
}
