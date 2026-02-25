"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Video {
  _id: string
  title: string
  description?: string
  url: string
  publicId?: string // required now
  duration?: number
  width?: number
  height?: number
  format?: string
  fileSize?: number
}


interface EditVideoModalProps {
  video: Video
}

export default function EditVideoModal({ video }: EditVideoModalProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(video.title)
  const [description, setDescription] = useState(video.description || "")
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Update state if video changes dynamically
  useEffect(() => {
    setTitle(video.title)
    setDescription(video.description || "")
  }, [video])

  // Upload to Cloudinary
  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", "YOUR_UPLOAD_PRESET") // Replace with your preset

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/video/upload`,
      {
        method: "POST",
        body: formData,
      }
    )
    const data = await res.json()
    return {
      secure_url: data.secure_url as string,
      public_id: data.public_id as string,
      duration: Number(data.duration),
      width: Number(data.width),
      height: Number(data.height),
      format: data.format as string,
      bytes: Number(data.bytes),
    }
  }

  const handleUpdate = async () => {
    try {
      setLoading(true)

      let newUrl = video.url
      let newPublicId = video.publicId
      let metadata: Partial<Video> = {}

      if (videoFile) {
        const uploadResult = await uploadToCloudinary(videoFile)
        newUrl = uploadResult.secure_url
        newPublicId = uploadResult.public_id
        metadata = {
          duration: uploadResult.duration,
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          fileSize: uploadResult.bytes,
        }
      }

      const res = await fetch(`/api/videos/${video._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          videoUrl: newUrl,
          publicId: newPublicId,
          ...metadata,
        }),
      })

      if (!res.ok) throw new Error("Failed to update video")
      toast.success("Video updated successfully")
      router.refresh()
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this video?")) return
    try {
      setLoading(true)
      const res = await fetch(`/api/videos/${video._id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete video")
      toast.success("Video deleted")
      router.refresh()
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Edit</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="flex justify-between items-center">
          <DialogTitle>Edit Video</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon">
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Video title"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
          />
          <Input
            type="file"
            accept="video/*"
            onChange={(e) =>
              setVideoFile(e.target.files ? e.target.files[0] : null)
            }
          />
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={handleDelete} disabled={loading}>
              Delete
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}