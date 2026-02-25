"use client"

import { useState, useEffect } from "react"

export default function AssignmentSection({
  courseId,
  isTeacher,
}: {
  courseId: string
  isTeacher: boolean
}) {
  const [assignments, setAssignments] = useState<any[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

 const fetchAssignments = async () => {
  const res = await fetch(`/api/assignments?courseId=${courseId}`)
  const data = await res.json()

  if (Array.isArray(data)) {
    setAssignments(data)
  } else {
    console.error("API returned:", data)
    setAssignments([])
  }
}
  useEffect(() => {
    fetchAssignments()
  }, [courseId])

  // ✅ Upload file to Cloudinary
  const uploadFileToCloud = async () => {
    if (!file) return null

    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!)

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

  const createAssignment = async () => {
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
    setUploading(false)
    fetchAssignments()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Assignments</h1>

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

          {/* File Upload */}
          <input
            type="file"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="border p-2 w-full mb-2"
          />

          <button
            onClick={createAssignment}
            disabled={uploading}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            {uploading ? "Uploading..." : "Create Assignment"}
          </button>
        </div>
      )}

     {/* 📋 Assignment List */}
{assignments.map(a => (
  <div key={a._id} className="border p-4 mb-4 rounded shadow-sm">

    {/* Header */}
    <div className="flex justify-between items-start">
      <div>
        <h2 className="font-semibold text-lg">{a.title}</h2>

        <p className="text-sm text-gray-600">
          Due: {new Date(a.dueDate).toLocaleString()}
        </p>

        {/* Assignment File */}
        {a.fileUrl && (
          <div className="mt-2">
            <a
              href={a.fileUrl}
              target="_blank"
              className="text-blue-600 underline text-sm"
            >
              📄 View Uploaded Assignment File
            </a>
          </div>
        )}
      </div>

      {/* Delete Button */}
      {isTeacher && (
        <button
          onClick={async () => {
            await fetch(`/api/assignments/${a._id}`, {
              method: "DELETE",
            })
            fetchAssignments()
          }}
          className="bg-red-500 text-white px-3 py-1 text-xs rounded"
        >
          Delete
        </button>
      )}
    </div>

    {/* 🏷 Badge Section */}
    {isTeacher && (
      <div className="mt-3">
        {(!a.submissions || a.submissions.length === 0) ? (
          <span className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-600">
            Assignment Not Submitted Yet
          </span>
        ) : (
          <button
            onClick={async () => {
              await fetch(`/api/assignments/${a._id}/grade-all`, {
                method: "PATCH",
              })
              fetchAssignments()
            }}
            className={`px-3 py-1 text-xs rounded ${
              a.submissions.some((s: any) => !s.graded)
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {a.submissions.some((s: any) => !s.graded)
              ? "Click to Mark All Graded"
              : "All Graded"}
          </button>
        )}
      </div>
    )}

    {/* 👨‍🏫 Submissions */}
    {isTeacher && a.submissions?.length > 0 && (
      <div className="mt-4 border-t pt-3">
        <h3 className="font-medium mb-2">Submissions</h3>

        {a.submissions.map((sub: any) => (
          <div
            key={sub._id}
            className="flex justify-between items-center border p-2 mb-2 rounded"
          >
            <a
              href={sub.fileUrl}
              target="_blank"
              className="text-blue-500 underline"
            >
              View Submission
            </a>

            <span
              className={`text-xs px-2 py-1 rounded ${
                sub.graded
                  ? "bg-green-100 text-green-600"
                  : "bg-yellow-100 text-yellow-600"
              }`}
            >
              {sub.graded ? "Graded" : "Not Graded"}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
))}
    </div>
  )
}