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
  name: string
}

export default function TeacherAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)

  // Fetch teacher courses
  const fetchCourses = async () => {
    const res = await fetch("/api/teacher/courses")
    const data = await res.json()
     
    if (res.ok) setCourses(data.courses)
   
  }

const handleDelete = async (id: string) => {  // Implement delete functionality
  const res = await fetch(`/api/announcements/${id}`, {
    method: "DELETE",
  })

  if (res.ok) {
    toast.success("Announcement deleted")
    fetchAnnouncements()
  } else {
    toast.error("Delete failed")
  }


}
  const fetchAnnouncements = async () => {
    setLoading(true)
    const url = selectedCourse
      ? `/api/announcements?courseId=${selectedCourse}`
      : `/api/announcements`

    const res = await fetch(url)
    const data = await res.json()
    if (res.ok) setAnnouncements(data.announcements)
    setLoading(false)
  console.log("Announcements:", data)
  }

  useEffect(() => {
    fetchCourses()
    fetchAnnouncements()
    
  }, [selectedCourse])
  

  const createAnnouncement = async () => {
    if (!selectedCourse) return alert("Select a course")

    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        message,
        scope: "course",
        course: selectedCourse,
      }),
    })
if (res.ok) {      
      setTitle("")
      setMessage("")
      fetchAnnouncements()
      toast.success("Announcement created")
    } else {
      toast.error("Failed to create announcement")
    }
  }
 

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">

      <h1 className="text-2xl font-bold">Teacher Announcements</h1>
     

      {/* Course Selector */}
      <select
        value={selectedCourse}
        onChange={(e) => setSelectedCourse(e.target.value)}
        className="w-full border p-2 rounded "
      >
        <option className="bg-black" value="">
          Select a course
        </option>
        {courses.map((course) => (
          <option className="bg-black" key={course._id} value={course._id}>
            {course.name}
          </option>
        ))}
      </select>

      {/* Create Announcement */}
      {selectedCourse && (
        <div className="border p-4 rounded space-y-3">
          <h2 className="font-semibold">Create Course Announcement</h2>

          <input
            placeholder="Course Name"
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

          <Button
            onClick={createAnnouncement}
            className=" px-4 py-2 rounded"
          >
            Post
          </Button>
        </div>
      )}

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
              <p className="mt-2 text-gray-400">{a.message}</p>
              <div className="text-xs text-gray-400 mt-2">
                {new Date(a.createdAt).toLocaleString()}
              </div>
              <div className="flex justify-end mt-2">
                {/* Edit and Delete buttons can be added here */}
              
               {a.scope === "course"  && (
                   
                  <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(a._id)}
                  >
                  Delete
              </Button>
               
               )}
             
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}