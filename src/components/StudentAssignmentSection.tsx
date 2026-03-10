"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import Countdown from "./countdown"
import { Button } from "./ui/button"

export default function StudentAssignmentSection({
  courseId,
}: {
  courseId: string
}) {
  const [assignments, setAssignments] = useState<any[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchAssignments = async () => {
    const res = await fetch(`/api/assignments/student?courseId=${courseId}`)
    const data = await res.json()
    setAssignments(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    fetchAssignments()
  }, [courseId])
  

  // Upload to Cloudinary
  const uploadFileToCloud = async () => {
    if (!file) return null

    const formData = new FormData()
    formData.append("file", file)
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
    )

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: "POST",
        body: formData,
      }
    )
  
     

    const data = await res.json()
    return data.secure_url
  
  
  }

  const submitAssignment = async (assignmentId: string) => {
    if (!file) return

    setUploading(true)
    const fileUrl = await uploadFileToCloud()

    await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId,
        fileUrl,
      }),
    })

    setFile(null)
    setUploading(false)
    fetchAssignments()
    toast.success("Assignment submitted successfully!")
  }
  const getCountdown = (dueDate: string) => {
    const diff = new Date(dueDate).getTime() - new Date().getTime()
    if (diff <= 0) return "Deadline Passed"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff / (1000 * 60)) % 60)

    return `${hours}h ${minutes}m remaining`
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">My Assignments</h1>
      {assignments.length === 0 && (
        <p className="text-gray-600">No assignments found for this course.</p>
      )}

      {assignments.map(a => (
        <div key={a._id} className="border p-4 mb-4 rounded shadow-sm">

          {/* Title */}
          <h2 className="font-semibold text-lg">{a.title}</h2>
          <p className="text-sm text-gray-600">
            Due: {new Date(a.dueDate).toLocaleString()}
          </p>

          {/* Countdown */}
          <p className="text-xs text-blue-600 mt-1">
            ⏳ {getCountdown(a.dueDate)}
          </p>
     
          {/* Assignment File */}
          {a.fileUrl && (
            <a
              href={a.fileUrl}
              target="_blank"
              className="underline text-sm block mt-2 text-gray-400"
            >
              📄 View Assignment File
            </a>
          )}

          {/* Status Badge */}
          <div className="mt-3">
            {!a.mySubmission ? (
              <span className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-500">
                Not Submitted
              </span>
            ) : a.mySubmission.graded ? (
              <span className="px-3 py-1 text-xs rounded bg-green-100 text-green-600">
                Graded — Score: {a.mySubmission.score ?? "N/A"}
              </span>
            ) : (
              <span className="px-3 py-1 text-xs rounded bg-yellow-100 text-yellow-600">
                Submitted (Waiting for Grade)
              </span>
            )}
          </div>

          {/* Submit Section */}
          {!a.mySubmission && getCountdown(a.dueDate) !== "Deadline Passed" && (
            <div className="mt-4">
              <input
                type="file"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="border p-2 w-full mb-2"
              />

              <Button
                onClick={() => submitAssignment(a._id)}
                disabled={uploading}
                variant="secondary"
             
              >
                {uploading ? "Submitting..." : "Submit Assignment"}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}