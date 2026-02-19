"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Upload, Video, X } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface VideoUploadModalProps {
  courseId: string
  onSuccess?: (videoUrl?: string) => void
}

const MAX_SMALL_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_LARGE_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

export function VideoUploadModal({ courseId, onSuccess }: VideoUploadModalProps) {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [position, setPosition] = useState(0)

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]

      if (!file.type.startsWith("video/")) {
        toast.error("Invalid file type: Please select a video file")
        return
      }

      if (file.size > MAX_LARGE_FILE_SIZE) {
        toast.error("File too large : Please select a video file smaller than 1GB")
        return
      }

      setVideoFile(file)
    }
  }

  const clearVideoFile = () => setVideoFile(null)

  const resetForm = () => {
    setVideoFile(null)
    setTitle("")
    setDescription("")
    setPosition(0)
    setUploadProgress(0)
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!videoFile) {
      toast.error("Please select a video file to upload")
      return
    }

    if (!title.trim()) {
      toast.error("Please enter a title for the video")
      return
    }

    setUploading(true)
    setUploadProgress(0)

    let progressInterval: NodeJS.Timeout | undefined
    let videoUrl: string | undefined = undefined

 

   try {
    console.log(
  "Cloud Name:",
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  "Upload Preset:",
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
)
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    toast.error("Cloudinary config missing")
    setUploading(false)
    return
  }

  const formData = new FormData()
  formData.append("file", videoFile)
  formData.append("upload_preset", uploadPreset)
  formData.append("resource_type", "video")

  const xhr = new XMLHttpRequest()

  await new Promise<void>((resolve, reject) => {
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`
    )

   // ✅ Use real progress
  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 100);
      setUploadProgress(percent);
    }
  };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText)

        const videoUrl = data.secure_url
        const publicId = data.public_id

        // 🔥 NOW send metadata to your backend (NO FILE)
        await fetch("/api/videos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            courseId,
            title,
            description,
            position,
            videoUrl,
            publicId,
          }),
        })

        resolve()
      } else {
        reject(new Error("Cloudinary upload failed"))
      }
    }

    xhr.onerror = () => reject(new Error("Upload failed"))
    xhr.send(formData)
  })

  toast.success("Video uploaded successfully")
  resetForm()
  setOpen(false)

  if (onSuccess) onSuccess()

} catch (error) {
  console.error(error)
  toast.error("Failed to upload video")
}}

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Video className="h-4 w-4" />
          Upload Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Course Video</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Video Title*</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              required
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description"
              rows={3}
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              type="number"
              min="0"
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              placeholder="Video position in course"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video">Video File*</Label>
            <div className="flex items-center gap-2">
              <Input
                id="video"
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                required={!videoFile}
                disabled={uploading}
              />
              {videoFile && (
                <Button type="button" variant="outline" size="icon" onClick={clearVideoFile} disabled={uploading}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {videoFile && (
              <div className="text-sm text-muted-foreground">
                <p>Selected: {videoFile.name}</p>
                <p>Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">{uploadProgress}% Uploaded</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading} className="flex-1">
              {uploading ? (
                "Uploading..."
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Upload Video
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )}

