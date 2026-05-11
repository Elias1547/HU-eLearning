"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"

type SubmissionInfo = {
  _id?: string
  fileUrl?: string
  graded?: boolean
  grade?: number
  score?: number
}

type StudentAssignment = {
  _id: string
  title: string
  dueDate: string
  fileUrl?: string
  mySubmission?: SubmissionInfo | null
}

export default function StudentAssignmentSection({
  courseId,
}: {
  courseId: string
}) {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const fetchAssignments = useCallback(async () => {
    const res = await fetch(`/api/assignments/student?courseId=${courseId}`)
    const data = await res.json()
    setAssignments(Array.isArray(data) ? (data as StudentAssignment[]) : [])
  }, [courseId])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAssignments()
    }, 10000)
    return () => clearInterval(interval)
  }, [fetchAssignments])
  

  // Upload to Cloudinary
  const uploadFileToCloud = async () => {
    if (!file) return null

    const formData = new FormData()
    formData.append("file", file)
    formData.append(
      "upload_preset",
      (process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "").trim()
    )

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "").trim()}/auto/upload`,
      {
        method: "POST",
        body: formData,
      }
    )
  
     

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data?.error?.message || "Cloudinary upload failed")
    }
    if (!data?.secure_url) {
      throw new Error("Cloudinary did not return a file URL")
    }
    return data.secure_url
  
  
  }

  const submitAssignment = async (assignmentId: string) => {
    if (!file) return

    setUploading(true)
    let fileUrl: string | null = null
    try {
      fileUrl = await uploadFileToCloud()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cloudinary upload failed")
      setUploading(false)
      return
    }

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

  const handleStatusBadgeClick = (assignment: StudentAssignment) => {
    if (!assignment.mySubmission) {
      toast.info(`"${assignment.title}" is not submitted yet.`)
      return
    }
    if (assignment.mySubmission.graded) {
      const score =
        assignment.mySubmission.score ?? assignment.mySubmission.grade ?? "N/A"
      toast.success(`"${assignment.title}" graded. Score: ${score}`)
      return
    }
    toast.message(`"${assignment.title}" is submitted and waiting for grade.`)
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
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded border bg-muted/20 p-2">
              <span className="text-sm font-medium">Assignment file:</span>
              <Button asChild size="sm" variant="outline">
                <a href={a.fileUrl} target="_blank" rel="noopener noreferrer">
                  View
                </a>
              </Button>
              <Button asChild size="sm">
                <a href={a.fileUrl} download>
                  Download
                </a>
              </Button>
            </div>
          )}

          {a.mySubmission?.fileUrl && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded border bg-muted/20 p-2">
              <span className="text-sm font-medium">Your submitted file:</span>
              <Button asChild size="sm" variant="outline">
                <a href={a.mySubmission.fileUrl} target="_blank" rel="noopener noreferrer">
                  View Submission
                </a>
              </Button>
              <Button asChild size="sm">
                <a href={a.mySubmission.fileUrl} download>
                  Download Submission
                </a>
              </Button>
            </div>
          )}

          {/* Status Badge */}
          <div className="mt-3">
            {!a.mySubmission ? (
              <Badge
                variant="secondary"
                role="button"
                tabIndex={0}
                className="cursor-pointer"
                onClick={() => handleStatusBadgeClick(a)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleStatusBadgeClick(a)
                  }
                }}
              >
                Not Submitted
              </Badge>
            ) : a.mySubmission.graded ? (
              <Badge
                role="button"
                tabIndex={0}
                className="cursor-pointer bg-green-100 text-green-700 hover:bg-green-100/90"
                onClick={() => handleStatusBadgeClick(a)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleStatusBadgeClick(a)
                  }
                }}
              >
                Graded — Score: {a.mySubmission.score ?? "N/A"}
              </Badge>
            ) : (
              <Badge
                role="button"
                tabIndex={0}
                className="cursor-pointer bg-yellow-100 text-yellow-700 hover:bg-yellow-100/90"
                onClick={() => handleStatusBadgeClick(a)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleStatusBadgeClick(a)
                  }
                }}
              >
                Submitted (Waiting for Grade)
              </Badge>
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