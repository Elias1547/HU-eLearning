import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { v2 as cloudinary } from "cloudinary"
import { dbConnect } from "@/lib/dbConnect"
import { Video } from "@/models/video"
import { authOptions } from "@/lib/auth"
import { 
  videoProcessingQueue
} from "@/lib/video-streaming"
import crypto from "crypto"
import path from "path"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
  format: string
  width: number
  height: number
  duration?: number
  resource_type: string
  bytes: number
  bit_rate?: number
  frame_rate?: number
  [key: string]: string | number | undefined
}

interface VideoUploadRequest {
  file: File
  title: string
  courseId: string
  description?: string
  position?: number
  enableProcessing?: boolean
  generateThumbnails?: boolean
  generatePreview?: boolean
}

interface VideoDocument {
  _id: string
  title: string
  description?: string
  url: string
  course: string
  position: number
  duration?: string
  isProcessed: boolean
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  processingJobId?: string
  publicId: string
  width?: number
  height?: number
  format?: string
  fileSize?: number
  bitRate?: number
  frameRate?: number
  hlsUrl?: string
  thumbnails?: string[]
  preview?: string
  availableQualities?: string[]
}

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  startTime?: Date
  error?: string
  result?: {
    hlsPlaylist?: string
    thumbnails?: string[]
    preview?: string
    variants?: Array<{ name: string; path: string }>
  }
}

interface UploadResponse {
  message: string
  video: {
    _id: string
    title: string
    url: string
    duration?: string
    processing: boolean
    processingStatus?: string
    processingJobId?: string
  }
  upload: {
    public_id: string
    secure_url: string
    format: string
    duration?: number
    width?: number
    height?: number
    bytes?: number
  }
}

interface StatusResponse {
  status: string
  progress: number
  video: {
    _id: string
    title: string
    url: string
    hlsUrl?: string
    thumbnails?: string[]
    preview?: string
    isProcessed: boolean
    availableQualities?: string[]
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a teacher or admin
    if (session.user.role !== "teacher" && !session.user.isAdmin) {
      return NextResponse.json({ message: "Permission denied" }, { status: 403 })
    }

    await dbConnect()

    const data = await req.formData()
    const file: File | null = data.get("file") as unknown as File
    const title = data.get("title") as string
    const courseId = data.get("courseId") as string
    const description = data.get("description") as string
    const position = parseInt(data.get("position") as string) || 0
    const enableProcessing = data.get("enableProcessing") === "true"
    const generateThumbnails = data.get("generateThumbnails") !== "false"
    const generatePreview = data.get("generatePreview") === "true"

    if (!file) {
      return NextResponse.json({ message: "No file received" }, { status: 400 })
    }

    if (!title || !courseId) {
      return NextResponse.json({ 
        message: "Title and course ID are required" 
      }, { status: 400 })
    }

    // Convert file to buffer for Cloudinary upload
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique video ID
    const videoId = crypto.randomBytes(12).toString('hex')

    try {
      // Upload to Cloudinary with video analysis
      const uploadResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            public_id: `course-videos/${courseId}/${videoId}`,
            folder: `course-videos/${courseId}`,
            overwrite: true,
            quality: "auto",
            fetch_format: "auto",
            // Enable automatic video analysis
            eager: [
              { quality: "auto" },
              { quality: "auto:good" },
              { width: 1280, height: 720, crop: "limit", quality: "auto" }
            ],
            eager_async: true,
            // Extract metadata
            duration: true,
           
            frame_rate: true
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error)
              reject(error)
            } else if (result) {
              resolve(result as CloudinaryUploadResult)
            } else {
              reject(new Error("Upload failed - no result"))
            }
          }
        ).end(buffer)
      })

      console.log("Upload successful:", uploadResult.secure_url)

      // Create video document in database
      const newVideo = new Video({
        title,
        description,
        url: uploadResult.secure_url,
        course: courseId,
        position,
        duration: uploadResult.duration ? Math.round(uploadResult.duration).toString() : undefined,
        isProcessed: false,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        fileSize: uploadResult.bytes,
        bitRate: uploadResult.bit_rate,
        frameRate: uploadResult.frame_rate
      })

      const savedVideo = await newVideo.save()

      // Start background video processing if enabled
      if (enableProcessing) {
        // Generate unique processing job ID
        const processingJobId = `${savedVideo._id}_${Date.now()}`

        // Add to modern processing queue
        await videoProcessingQueue.addJob(
          processingJobId,
          uploadResult.secure_url, // Use Cloudinary URL as input
          path.join(process.cwd(), 'public', 'processed', savedVideo._id.toString()),
          {
            generateThumbnails,
            generatePreview,
            thumbnailCount: 5,
            previewDuration: 30,
            watermark: {
              enabled: false // Can be customized per upload
            },
            onProgress: (progress: number, stage: string) => {
              console.log(`Processing ${processingJobId}: ${progress}% - ${stage}`)
            }
          }
        )

        // Update video document with processing job info
        await (Video as any).findByIdAndUpdate(savedVideo._id, {
          processingJobId,
          processingStatus: 'queued'
        })

        // Poll for processing completion and update video document
        setTimeout(async () => {
          try {
            const jobStatus: JobStatus | null = videoProcessingQueue.getJobStatus(processingJobId)
            if (jobStatus && jobStatus.status === 'completed' && jobStatus.result) {
              await (Video as any).findByIdAndUpdate(savedVideo._id, {
                isProcessed: true,
                hlsUrl: jobStatus.result.hlsPlaylist,
                thumbnails: jobStatus.result.thumbnails,
                preview: jobStatus.result.preview,
                availableQualities: jobStatus.result.variants?.map((v) => v.name)
              })
            }
          } catch (updateError) {
            console.error('Error updating processed video:', updateError)
          }
        }, 10000) // Poll after 10 seconds

        return NextResponse.json({
          message: "Video uploaded and processing started",
          video: {
            _id: savedVideo._id,
            title: savedVideo.title,
            url: savedVideo.url,
            processing: true,
            processingStatus: 'queued',
            processingJobId
          },
          upload: {
            public_id: uploadResult.public_id,
            secure_url: uploadResult.secure_url,
            format: uploadResult.format,
            duration: uploadResult.duration,
            width: uploadResult.width,
            height: uploadResult.height,
            bytes: uploadResult.bytes
          }
        })
      } else {
        return NextResponse.json({
          message: "Video uploaded successfully",
          video: {
            _id: savedVideo._id,
            title: savedVideo.title,
            url: savedVideo.url,
            duration: savedVideo.duration,
            processing: false
          },
          upload: {
            public_id: uploadResult.public_id,
            secure_url: uploadResult.secure_url,
            format: uploadResult.format,
            duration: uploadResult.duration,
            width: uploadResult.width,
            height: uploadResult.height
          }
        })
      }

    } catch (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json(
        { message: "Upload failed", error: uploadError },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET route to check processing status
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const videoId = searchParams.get('videoId')
    const jobId = searchParams.get('jobId')

    if (!videoId && !jobId) {
      return NextResponse.json({ 
        message: "Video ID or Job ID required" 
      }, { status: 400 })
    }

    await dbConnect()

    if (jobId) {
      // Check processing job status
      const jobStatus: JobStatus | null = videoProcessingQueue.getJobStatus(jobId)
      
      if (!jobStatus) {
        return NextResponse.json({ 
          message: "Processing job not found" 
        }, { status: 404 })
      }

      // Also get video info if available
      let videoInfo: Partial<VideoDocument> | null = null
      if (videoId) {
        const video = await (Video as any).findById(videoId).lean() as VideoDocument | null
        if (video) {
          videoInfo = {
            title: video.title,
            url: video.url,
            hlsUrl: video.hlsUrl,
            thumbnails: video.thumbnails,
            preview: video.preview,
            isProcessed: video.isProcessed
          }
        }
      }

      return NextResponse.json({
        job: {
          status: jobStatus.status,
          progress: jobStatus.progress,
          startTime: jobStatus.startTime,
          error: jobStatus.error
        },
        video: videoInfo,
        processing: {
          hlsUrl: jobStatus.result?.hlsPlaylist,
          thumbnails: jobStatus.result?.thumbnails,
          preview: jobStatus.result?.preview,
          variants: jobStatus.result?.variants
        }
      })
    }

    // Fallback to video-based lookup
    const video = await (Video as any).findById(videoId).lean() as VideoDocument | null
    
    if (!video) {
      return NextResponse.json({ 
        message: "Video not found" 
      }, { status: 404 })
    }

    let processingStatus = 'not_started'
    let progress = 0

    if (video.processingJobId) {
      const jobStatus: JobStatus | null = videoProcessingQueue.getJobStatus(video.processingJobId)
      if (jobStatus) {
        processingStatus = jobStatus.status
        progress = jobStatus.progress
      }
    } else if (video.isProcessed) {
      processingStatus = 'completed'
      progress = 100
    }
    
    return NextResponse.json({
      status: processingStatus,
      progress,
      video: {
        _id: video._id,
        title: video.title,
        url: video.url,
        hlsUrl: video.hlsUrl,
        thumbnails: video.thumbnails,
        preview: video.preview,
        isProcessed: video.isProcessed,
        availableQualities: video.availableQualities
      }
    })

  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE route to cancel processing
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ 
        message: "Job ID required" 
      }, { status: 400 })
    }

    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a teacher or admin
    if (session.user.role !== "teacher" && !session.user.isAdmin) {
      return NextResponse.json({ message: "Permission denied" }, { status: 403 })
    }

    const cancelled = videoProcessingQueue.cancelJob(jobId)

    if (cancelled) {
      return NextResponse.json({
        message: "Processing job cancelled successfully"
      })
    } else {
      return NextResponse.json({
        message: "Job not found or cannot be cancelled"
      }, { status: 404 })
    }

  } catch (error) {
    console.error("Job cancellation error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

