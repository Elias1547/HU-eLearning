import mongoose, { Model, Document } from "mongoose"

import { z } from "zod"



export interface IVideo extends Document {
  title: string
  description?: string
  url: string
  hlsUrl?: string
  course: mongoose.Types.ObjectId
  position: number
  duration?: number
  width?: number
  height?: number
  format?: string
  fileSize?: number
  isProcessed: boolean
  processingStatus: "pending" | "processing" | "completed" | "failed"
  publicId?: string
  thumbnails?: string[]
  variants?: { quality: string; url: string; bitrate?: number; resolution?: string }[]
}
// Define the video schema
const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    url: { type: String, required: true },
    hlsUrl: { type: String }, // HLS stream URL
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    position: { type: Number, required: true },
    duration: { type: String },
    captionsUrl: { type: String }, // Added field for captions URL
    quality: { type: String, enum: ['low', 'medium', 'high', 'adaptive'] },
    bitrate: { type: Number }, // Video bitrate in kbps
    resolution: { type: String }, // Video resolution (e.g., "1920x1080")
    framerate: { type: Number }, // Video framerate
    isProcessed: { type: Boolean, default: false }, // Whether video has been processed for HLS
    processingStatus: { 
      type: String, 
      enum: ['pending', 'processing', 'completed', 'failed'], 
      default: 'pending' 
    },
    processingJobId: { type: String }, // Processing job ID for tracking
    processingError: { type: String }, // Error message if processing failed
    fileSize: { type: Number }, // File size in bytes
    format: { type: String }, // Video format (mp4, avi, etc.)
    codec: { type: String }, // Video codec
    audioCodec: { type: String }, // Audio codec
    // Enhanced fields for modern video processing
    publicId: { type: String }, // Cloudinary public ID
    width: { type: Number }, // Video width
    height: { type: Number }, // Video height
    bitRate: { type: Number }, // Bit rate from metadata
    frameRate: { type: Number }, // Frame rate from metadata
    thumbnails: [{ type: String }], // Array of thumbnail URLs
    preview: { type: String }, // Preview clip URL
    availableQualities: [{ type: String }], // Available quality variants
    processedAt: { type: Date }, // When processing completed
    hlsPlaylist: { type: String }, // Master HLS playlist URL
    variants: [{ // Quality variants info
      quality: { type: String },
      url: { type: String },
      bitrate: { type: Number },
      resolution: { type: String }
    }]
  },
  { timestamps: true }
)

// Create the Video model


// Zod validation schema
export const videoValidationSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  url: z.string().url("Invalid video URL"),
  hlsUrl: z.string().url("Invalid HLS URL").optional(),
  course: z.string(),
  position: z.number().int().min(0, "Position must be a non-negative integer"),
  duration: z.string().optional(),
  captionsUrl: z.string().url("Invalid captions URL").optional(),
  quality: z.enum(['low', 'medium', 'high', 'adaptive']).optional(),
  bitrate: z.number().optional(),
  resolution: z.string().optional(),
  framerate: z.number().optional(),
  isProcessed: z.boolean().optional(),
  processingStatus: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  processingError: z.string().optional(),
  fileSize: z.number().optional(),
  format: z.string().optional(),
  codec: z.string().optional(),
  audioCodec: z.string().optional(),
})

export const Video: Model<IVideo> =
  (mongoose.models.Video as Model<IVideo>) ||
  mongoose.model<IVideo>("Video", videoSchema)