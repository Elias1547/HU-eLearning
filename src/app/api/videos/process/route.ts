import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { Video } from "@/models/video"
import { 
  videoProcessingQueue
} from "@/lib/video-streaming"
import path from 'path'
import crypto from 'crypto'

interface ProcessVideoRequest {
  videoId: string
  cloudinaryUrl: string
  options?: {
    generateThumbnails?: boolean
    thumbnailCount?: number
    generatePreview?: boolean
    previewDuration?: number
    watermark?: {
      enabled: boolean
      text?: string
      position?: string
      opacity?: number
    }
    quality?: 'low' | 'medium' | 'high' | 'adaptive'
  }
}

interface VideoDocument {
  _id: string
  title: string
  url: string
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'
  processingJobId?: string
  processingError?: string
  isProcessed: boolean
  hlsUrl?: string
  thumbnails?: string[]
  preview?: string
  availableQualities?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const body: ProcessVideoRequest = await request.json()
    const { videoId, cloudinaryUrl, options = {} } = body

    if (!videoId || !cloudinaryUrl) {
      return NextResponse.json({ 
        error: "Video ID and Cloudinary URL are required" 
      }, { status: 400 })
    }

    // Verify video exists and user has permission
    const video = await (Video as any).findById(videoId) as VideoDocument | null
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Check if video is already being processed
    if (video.processingStatus === 'processing') {
      return NextResponse.json({ 
        error: "Video is already being processed" 
      }, { status: 400 })
    }

    // Generate processing job ID
    const processingId = crypto.randomBytes(16).toString('hex')
    const outputDir = path.join(process.cwd(), 'public', 'videos', videoId)

    const processingOptions = {
      generateThumbnails: options.generateThumbnails !== false,
      thumbnailCount: options.thumbnailCount || 5,
      generatePreview: options.generatePreview !== false,
      previewDuration: options.previewDuration || 30,
      watermark: options.watermark || null,
      onProgress: (progress: number, stage: string) => {
        console.log(`Video ${videoId} processing: ${progress}% - ${stage}`)
      }
    }

    try {
      // Start processing using the new FFmpeg implementation
      await videoProcessingQueue.addJob(
        processingId,
        cloudinaryUrl,
        outputDir,
        processingOptions
      )

      // Update video record with processing status
      await (Video as any).findByIdAndUpdate(videoId, {
        processingStatus: 'processing',
        processingJobId: processingId,
        processingStartedAt: new Date()
      })

      return NextResponse.json({
        success: true,
        processingId,
        status: 'processing',
        message: 'Video processing started successfully'
      })

    } catch (processingError) {
      console.error("Video processing failed:", processingError)
      
      // Update video status to failed
      await (Video as any).findByIdAndUpdate(videoId, {
        processingStatus: 'failed',
        processingError: (processingError as Error).message,
        processingCompletedAt: new Date()
      })

      return NextResponse.json({ 
        error: "Video processing failed",
        details: (processingError as Error).message
      }, { status: 500 })
    }
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 })
  }
}

// GET - Check processing status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    const processingId = searchParams.get('processingId')

    if (!videoId && !processingId) {
      return NextResponse.json(
        { error: 'Video ID or Processing ID is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    let video: VideoDocument | null = null
    let jobStatus = null

    if (videoId) {
      video = await (Video as any).findById(videoId) as VideoDocument | null
      if (!video) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        )
      }

      if (video.processingJobId) {
        jobStatus = videoProcessingQueue.getJobStatus(video.processingJobId)
      }
    } else if (processingId) {
      jobStatus = videoProcessingQueue.getJobStatus(processingId)
    }

    if (!jobStatus) {
      return NextResponse.json({
        status: 'not_found',
        message: 'Processing job not found'
      })
    }

    // If processing is completed, update video record
    if (jobStatus.status === 'completed' && video && jobStatus.result) {
      const result = jobStatus.result
      
      await (Video as any).findByIdAndUpdate(video._id, {
        processingStatus: 'completed',
        isProcessed: true,
        hlsUrl: result.hlsPlaylist,
        thumbnails: result.thumbnails,
        preview: result.preview,
        availableQualities: result.variants?.map((v: { name: string; bitrate: number; width: number; height: number }) => v.name),
        processingCompletedAt: new Date()
      })

      return NextResponse.json({
        status: 'completed',
        progress: 100,
        hlsUrl: result.hlsPlaylist,
        thumbnails: result.thumbnails,
        preview: result.preview,
        qualities: result.variants.map((v: any) => ({
          quality: v.name,
          url: path.join('/videos', video._id.toString(), `${v.name}/index.m3u8`),
          bitrate: v.bitrate,
          resolution: `${v.width}x${v.height}`
        }))
      })
    }

    // If processing failed
    if (jobStatus.status === 'error' && video) {
      await Video.findByIdAndUpdate(video._id, {
        processingStatus: 'failed',
        processingError: jobStatus.error,
        processingCompletedAt: new Date()
      })
    }

    return NextResponse.json({
      status: jobStatus.status,
      progress: jobStatus.progress || 0,
      error: jobStatus.error,
      startTime: jobStatus.startTime
    })

  } catch (error) {
    console.error('Error checking processing status:', error)
    return NextResponse.json(
      { error: 'Failed to check processing status' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel processing
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    const processingId = searchParams.get('processingId')

    if (!videoId && !processingId) {
      return NextResponse.json(
        { error: 'Video ID or Processing ID is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    let video = null
    let targetProcessingId = processingId

    if (videoId) {
      video = await Video.findById(videoId)
      if (!video) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        )
      }

      targetProcessingId = video.processingId
    }

    if (!targetProcessingId) {
      return NextResponse.json(
        { error: 'No processing job found' },
        { status: 404 }
      )
    }

    // Attempt to cancel the job
    const cancelled = videoProcessingQueue.cancelJob(targetProcessingId)

    if (video && cancelled) {
      await Video.findByIdAndUpdate(video._id, {
        processingStatus: 'cancelled',
        processingCompletedAt: new Date()
      })
    }

    return NextResponse.json({
      success: cancelled,
      message: cancelled ? 'Processing cancelled' : 'Could not cancel processing (may be already completed)'
    })

  } catch (error) {
    console.error('Error cancelling processing:', error)
    return NextResponse.json(
      { error: 'Failed to cancel processing' },
      { status: 500 }
    )
  }
}
