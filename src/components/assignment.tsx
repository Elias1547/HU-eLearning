"use client"

import { useCallback, useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { toast } from "sonner"

type SubmissionItem = {
  _id: string
  fileUrl: string
  graded?: boolean
  studentId?: { name?: string }
  assignmentId?: { _id?: string } | string
}

type AssignmentItem = {
  _id: string
  title: string
  description?: string
  dueDate: string
  fileUrl?: string
  mySubmission?: SubmissionItem
  submissions?: SubmissionItem[]
}

export default function AssignmentSection({
  courseId,
  isTeacher,
}: {
  courseId: string
  isTeacher: boolean
}) {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // ✅ Fetch assignments + submissions
  const fetchAssignments = useCallback(async () => {
    try {
      const assignmentRes = await fetch(
        `/api/assignments?courseId=${courseId}`
      )
      const assignmentData = await assignmentRes.json()

      if (!Array.isArray(assignmentData)) {
        setAssignments([])
        return
      }

      // If teacher, fetch submissions
      if (isTeacher) {
        const submissionRes = await fetch(
          `/api/submissions?courseId=${courseId}`
        )
        const submissionData = await submissionRes.json()

        const merged = (assignmentData as AssignmentItem[]).map((assignment) => {
          const relatedSubs = submissionData.filter(
            (sub: SubmissionItem) =>
              sub.assignmentId?._id === assignment._id ||
              sub.assignmentId === assignment._id
          )

          return {
            ...assignment,
            submissions: relatedSubs,
          }
        })

        setAssignments(merged)
      } else {
        setAssignments(assignmentData as AssignmentItem[])
      }
    } catch (error) {
      console.error("Fetch failed:", error)
      setAssignments([])
    }
  }, [courseId, isTeacher])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  // ✅ Upload file to Cloudinary
const uploadFileToCloud = async (): Promise<string | null> => {
  if (!file) return null

  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append(
      "upload_preset",
      (process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "").trim()
    )

    const xhr = new XMLHttpRequest()

    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "").trim()}/auto/upload`
    )

    xhr.upload.onprogress = event => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        setUploadProgress(percent)
      }
    }

    xhr.onload = () => {
      const response = JSON.parse(xhr.responseText)

      if (xhr.status !== 200) {
        console.error("Cloudinary error:", response)
        toast.error(response.error?.message || "Upload failed")
        reject(response)
        return
      }

      if (!response.secure_url) {
        reject("No file URL returned")
        return
      }

      resolve(response.secure_url)
    }

    xhr.onerror = () => reject("Upload failed")

    xhr.send(formData)
  })
}

  const createAssignment = async () => {
    try {
      setUploading(true)

      let fileUrl = null
      if (file) {
        fileUrl = await uploadFileToCloud()
      }
      await fetch("/api/assignments", {
        
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title,
          description,
          dueDate,
          fileUrl,
        }),
      })

      setTitle("")
      setDescription("")
      setDueDate("")
      setFile(null)
      setUploadProgress(0)

      await fetchAssignments()
    } catch (error) {
      console.error(error)
      toast.error("Failed to create assignment")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Assignments</h1>

      {/* 👨‍🏫 Teacher Create Form */}
      {isTeacher && (
        <div className="border p-4 mb-6 rounded">
          <input
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="border p-2 w-full mb-2"
          />

          <textarea
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="border p-2 w-full mb-2"
          />

          <input
            type="datetime-local"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="border p-2 w-full mb-2"
          />

          <input
            type="file"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="border p-2 w-full mb-2"
          />

          <Button onClick={createAssignment} disabled={uploading}>
            {uploading ? "Uploading..." : "Create Assignment"}
          </Button>

          {uploading && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded h-2">
                <div
                  className="bg-blue-500 h-2 rounded"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs mt-1">{uploadProgress}% uploaded</p>
            </div>
          )}
        </div>
      )}

      {/* 📋 Assignment List */}
      {assignments.map(a => (
        <div key={a._id} className="border p-4 mb-4 rounded shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-semibold text-lg">{a.title}</h2>
              <p className="text-sm text-gray-600">
                Due: {new Date(a.dueDate).toLocaleString()}
              </p>

              {a.fileUrl && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded border bg-muted/20 p-2">
                  <span className="text-sm font-medium">Assignment file:</span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={a.fileUrl} target="_blank" rel="noopener noreferrer">
                      View
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <a href={a.fileUrl} download>
                      Download
                    </a>
                  </Button>
                </div>
              )}

              {!isTeacher && a.mySubmission?.fileUrl && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded border bg-muted/20 p-2">
                  <span className="text-sm font-medium">Your submitted file:</span>
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={a.mySubmission.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Submission
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <a href={a.mySubmission.fileUrl} download>
                      Download Submission
                    </a>
                  </Button>
                </div>
              )}
            </div>

            {isTeacher && (
              <Button
                onClick={async () => {
                  await fetch(`/api/assignments/${a._id}`, {
                    method: "DELETE",
                  })
                  await fetchAssignments()
                  toast.success("Assignment deleted successfully!")
                }}
                className="bg-red-500 text-white px-3 py-1 text-xs rounded"
              >
                Delete
              </Button>
            )}
          </div>

          {/* 🏷 Badge */}
         {isTeacher && (
  <div className="mt-3">
    {!a.submissions || a.submissions.length === 0 ? (
      <Badge variant="secondary">
        Assignment Not Submitted Yet
      </Badge>
    ) : (
      <Button
        onClick={async () => {
          await fetch(`/api/assignments/${a._id}/grade-all`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assignmentId: a._id,
            }),
          })

          toast.success("All submissions marked as graded")
          fetchAssignments()
        }}
        className={`px-3 py-1 text-xs rounded ${
          a.submissions.some((s) => !s.graded)
            ? "bg-yellow-100 text-yellow-700"
            : "bg-green-100 text-green-700"
        }`}
      >
        {a.submissions.some((s) => !s.graded)
          ? `${a.submissions.filter((s) => !s.graded).length} Waiting for Grade`
          : "All Graded"}
      </Button>
    )}
  </div>
)}

          {/* 👨‍🏫 Submissions */}
          {isTeacher && a.submissions?.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <h3 className="font-medium mb-2">Submissions</h3>

              {a.submissions.map((sub) => (
                <div
                  key={sub._id}
                  className="flex justify-between items-center border p-2 mb-2 rounded"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">
                      {sub.studentId?.name || "Student"} submission:
                    </span>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={sub.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </Link>
                    </Button>
                    <Button asChild size="sm">
                      <a href={sub.fileUrl} download>
                        Download
                      </a>
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        sub.graded
                          ? "bg-green-100 text-green-600"
                          : "bg-yellow-100 text-yellow-600"
                      }`}
                    >
                      {sub.graded ? "Graded" : "Waiting for Grade"}
                    </span>
                    {!sub.graded && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await fetch(`/api/submissions/${sub._id}/grade`, {
                            method: "PATCH",
                          })
                          toast.success("Submission marked graded")
                          fetchAssignments()
                        }}
                      >
                        Mark Graded
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}