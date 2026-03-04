"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { toast } from "sonner"

type Announcement = {
  _id: string
  title: string
  message: string
  scope: "global" | "course"
  createdAt: string
}

type Course = {
  _id: string
  title: string
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [scope, setScope] = useState<"global" | "course">("course")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [role, setRole] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // Fetch session to detect role
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => setRole(data?.user?.role))
  }, [])

  // Fetch teacher courses
  const fetchCourses = async () => {
    const res = await fetch("/api/teacher/courses")
    const data = await res.json()
    if (res.ok) setCourses(data.courses)
  }

  const fetchAnnouncements = async () => {
    setLoading(true)
    const url =
      scope === "course" && selectedCourse
        ? `/api/announcements?courseId=${selectedCourse}`
        : `/api/announcements`

    const res = await fetch(url)
    const data = await res.json()
    if (res.ok) setAnnouncements(data.announcements)
    setLoading(false)
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [selectedCourse, scope])

  const createAnnouncement = async () => {
    if (scope === "course" && !selectedCourse) {
      return toast.error("Select a course")
    }

    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        message,
        scope,
        ...(scope === "course" && { course: selectedCourse })
      }),
    })

    if (res.ok) {
      toast.success("Announcement created")
      setTitle("")
      setMessage("")
      fetchAnnouncements()
    }
  }

const handleDelete = async (id: string) => {
  const res = await fetch(`/api/announcements/${id}`, {
    method: "DELETE",
  })
  if (res.ok) {
    toast.success("Announcement deleted")
    fetchAnnouncements()
  } else {
    toast.error("Failed to delete announcement")
  }
}

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">

      <h1 className="text-2xl font-bold">
        {role === "admin" ? "Admin Announcements" : "Teacher Announcements"}
      </h1>

      {/* Scope Selector (Admin Only) */}
      {role === "admin" && (
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as any)}
          className="w-full border p-2 rounded"
        >
          <option value="global">Global</option>
          <option value="course">Course</option>
        </select>
      )}

      {/* Course Selector */}
      {scope === "course" && (
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Select a course</option>
          {courses.map((course) => (
            <option key={course._id} value={course._id}>
              {course.title}
            </option>
          ))}
        </select>
      )}

      {/* Create Announcement */}
      <div className="border p-4 rounded space-y-3">
        <h2 className="font-semibold">
          Create {scope === "global" ? "Global" : "Course"} Announcement
        </h2>

        <input
          placeholder="Title"
          className="w-full border p-2 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Message"
          rows={4}
          className="w-full border p-2 rounded"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <Button onClick={createAnnouncement}>
          Post
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div>Loading...</div>
      ) : announcements.length === 0 ? (
        <div>No announcements found.</div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a._id} className="border p-4 rounded shadow-sm">
              <div className="flex justify-between">
                <h3 className="font-semibold">{a.title}</h3>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    a.scope === "global"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {a.scope}
                </span>
              </div>

              <p className="mt-2 text-gray-700">{a.message}</p>

              <div className="text-xs text-gray-400 mt-2">
                {new Date(a.createdAt).toLocaleString()}
              </div>

              <div className="flex justify-end mt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(a._id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}