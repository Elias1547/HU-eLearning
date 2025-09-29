import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import axios from 'axios'

export interface StreamConfig {
  inputUrl: string
  outputPath: string
  streamKey: string
  quality: 'low' | 'medium' | 'high' | 'adaptive' | 'ultra'
  bitrate?: number
  resolution?: string
  framerate?: number
  audioBitrate?: number
  audioChannels?: number
  audioSampleRate?: number
  enableHardwareAcceleration?: boolean
  preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow'
}

export interface VideoProcessingConfig {
  inputPath: string
  outputDir: string
  videoId: string
  generateThumbnails?: boolean
  thumbnailCount?: number
  generatePreview?: boolean
  previewDuration?: number
  watermark?: {
    enabled: boolean
    imagePath?: string
    text?: string
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
    opacity?: number
  }
}

export interface VideoVariant {
  name: string
  width: number
  height: number
  bitrate: number
  codec: string
  profile: string
  level: string
  bufsize: number
  maxrate: number
  fps: number
}

// Modern FFmpeg wrapper for video processing
export class FFmpegProcessor {
  private static async checkFFmpegAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version'])
      ffmpeg.on('close', (code) => {
        resolve(code === 0)
      })
      ffmpeg.on('error', () => {
        resolve(false)
      })
    })
  }

  static async probe(inputPath: string): Promise<{
    duration: number
    width: number
    height: number
    bitrate: number
    fps: number
    format: string
    codecs: {
      video: string
      audio: string
    }
  }> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        inputPath
      ])

      let output = ''
      ffprobe.stdout.on('data', (data) => {
        output += data.toString()
      })

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFprobe failed with code ${code}`))
          return
        }

        try {
          const data = JSON.parse(output)
          const videoStream = data.streams.find((s: any) => s.codec_type === 'video')
          const audioStream = data.streams.find((s: any) => s.codec_type === 'audio')

          if (!videoStream) {
            reject(new Error('No video stream found'))
            return
          }

          resolve({
            duration: parseFloat(data.format.duration || 0),
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            bitrate: parseInt(data.format.bit_rate || 0),
            fps: eval(videoStream.r_frame_rate || '0/1'),
            format: data.format.format_name || '',
            codecs: {
              video: videoStream.codec_name || '',
              audio: audioStream?.codec_name || ''
            }
          })
        } catch (error) {
          reject(new Error(`Failed to parse FFprobe output: ${error}`))
        }
      })

      ffprobe.on('error', (error) => {
        reject(new Error(`FFprobe error: ${error.message}`))
      })
    })
  }

  static async transcode(
    inputPath: string,
    outputPath: string,
    options: {
      width?: number
      height?: number
      bitrate?: string
      fps?: number
      codec?: string
      preset?: string
      crf?: number
      format?: string
      audioCodec?: string
      audioBitrate?: string
      onProgress?: (progress: number, timeProcessed: number) => void
    } = {}
  ): Promise<void> {
    const isAvailable = await this.checkFFmpegAvailability()
    if (!isAvailable) {
      throw new Error('FFmpeg not found. Please install FFmpeg.')
    }

    return new Promise((resolve, reject) => {
      const args: string[] = [
        '-i', inputPath,
        '-y', // Overwrite output file
        '-hide_banner',
        '-loglevel', 'error',
        '-progress', 'pipe:1'
      ]

      // Video codec and settings
      if (options.codec) {
        args.push('-c:v', options.codec)
      } else {
        args.push('-c:v', 'libx264')
      }

      if (options.preset) {
        args.push('-preset', options.preset)
      }

      if (options.crf !== undefined) {
        args.push('-crf', options.crf.toString())
      }

      if (options.width && options.height) {
        args.push('-s', `${options.width}x${options.height}`)
      }

      if (options.fps) {
        args.push('-r', options.fps.toString())
      }

      if (options.bitrate) {
        args.push('-b:v', options.bitrate)
      }

      // Audio settings
      if (options.audioCodec) {
        args.push('-c:a', options.audioCodec)
      } else {
        args.push('-c:a', 'aac')
      }

      if (options.audioBitrate) {
        args.push('-b:a', options.audioBitrate)
      }

      // Output format
      if (options.format) {
        args.push('-f', options.format)
      }

      args.push(outputPath)

      const ffmpeg = spawn('ffmpeg', args)
      let totalDuration = 0

      // Get total duration for progress calculation
      this.probe(inputPath)
        .then(info => {
          totalDuration = info.duration
        })
        .catch(() => {
          // Continue without progress if probe fails
        })

      ffmpeg.stdout.on('data', (data) => {
        const output = data.toString()
        const timeMatch = output.match(/time=(\d+):(\d+):(\d+\.\d+)/)
        
        if (timeMatch && totalDuration > 0 && options.onProgress) {
          const hours = parseInt(timeMatch[1])
          const minutes = parseInt(timeMatch[2])
          const seconds = parseFloat(timeMatch[3])
          const currentTime = hours * 3600 + minutes * 60 + seconds
          const progress = (currentTime / totalDuration) * 100
          options.onProgress(Math.min(progress, 100), currentTime)
        }
      })

      ffmpeg.stderr.on('data', (data) => {
        const error = data.toString()
        if (error.includes('error') || error.includes('Error')) {
          console.error('FFmpeg error:', error)
        }
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`))
        }
      })

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`))
      })
    })
  }

  static async generateThumbnails(
    inputPath: string,
    outputDir: string,
    count: number = 5
  ): Promise<string[]> {
    const info = await this.probe(inputPath)
    const duration = info.duration
    const interval = duration / (count + 1)
    const thumbnails: string[] = []

    for (let i = 1; i <= count; i++) {
      const timestamp = interval * i
      const outputPath = path.join(outputDir, `thumbnail_${i}.jpg`)
      
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', inputPath,
          '-ss', timestamp.toString(),
          '-vframes', '1',
          '-q:v', '2',
          '-y',
          outputPath
        ])

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            thumbnails.push(outputPath)
            resolve()
          } else {
            reject(new Error(`Thumbnail generation failed with code ${code}`))
          }
        })

        ffmpeg.on('error', reject)
      })
    }

    return thumbnails
  }

  static async createHLSPlaylist(
    inputPath: string,
    outputDir: string,
    variants: VideoVariant[]
  ): Promise<string> {
    // Create master playlist
    const masterPlaylistPath = path.join(outputDir, 'master.m3u8')
    let masterContent = '#EXTM3U\n#EXT-X-VERSION:6\n'

    for (const variant of variants) {
      const variantDir = path.join(outputDir, variant.name)
      await fs.mkdir(variantDir, { recursive: true })
      
      const playlistPath = path.join(variantDir, 'index.m3u8')
      
      // Generate HLS segments for this variant
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-i', inputPath,
          '-c:v', variant.codec,
          '-b:v', `${variant.bitrate}k`,
          '-s', `${variant.width}x${variant.height}`,
          '-c:a', 'aac',
          '-b:a', '128k',
          '-hls_time', '10',
          '-hls_playlist_type', 'vod',
          '-hls_segment_filename', path.join(variantDir, 'segment_%03d.ts'),
          '-y',
          playlistPath
        ])

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`HLS generation failed for ${variant.name}`))
          }
        })

        ffmpeg.on('error', reject)
      })

      // Add variant to master playlist
      masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bitrate * 1000},RESOLUTION=${variant.width}x${variant.height}\n`
      masterContent += `${variant.name}/index.m3u8\n`
    }

    await fs.writeFile(masterPlaylistPath, masterContent)
    return masterPlaylistPath
  }
}

// Enhanced video processing functions
export const generateOptimalVariants = (
  width: number,
  height: number,
  duration: number
): VideoVariant[] => {
  const variants: VideoVariant[] = []
  
  // Determine which qualities to generate based on source resolution
  const qualityConfigs = [
    { name: '360p', width: 640, height: 360, bitrate: 800, maxSourceHeight: 360 },
    { name: '480p', width: 854, height: 480, bitrate: 1200, maxSourceHeight: 480 },
    { name: '720p', width: 1280, height: 720, bitrate: 2500, maxSourceHeight: 720 },
    { name: '1080p', width: 1920, height: 1080, bitrate: 5000, maxSourceHeight: 1080 },
  ]

  qualityConfigs.forEach(config => {
    if (height >= config.maxSourceHeight) {
      variants.push({
        name: config.name,
        width: config.width,
        height: config.height,
        bitrate: config.bitrate,
        codec: 'libx264',
        profile: 'high',
        level: '4.0',
        bufsize: config.bitrate * 2,
        maxrate: config.bitrate * 1.5,
        fps: 30
      })
    }
  })

  // Always include at least one variant
  if (variants.length === 0) {
    variants.push({
      name: 'auto',
      width: Math.min(width, 854),
      height: Math.min(height, 480),
      bitrate: 1200,
      codec: 'libx264',
      profile: 'high',
      level: '4.0',
      bufsize: 2400,
      maxrate: 1800,
      fps: 30
    })
  }

  return variants
}

export async function processVideoWithAdaptiveStreaming(
  inputPath: string,
  outputDir: string,
  options: {
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
    onProgress?: (progress: number, stage: string) => void
  } = {}
): Promise<{
  hlsPlaylist: string
  thumbnails: string[]
  preview?: string
  variants: VideoVariant[]
}> {
  await fs.mkdir(outputDir, { recursive: true })
  
  const { onProgress = () => {} } = options

  try {
    // Step 1: Probe video information
    onProgress(5, 'Analyzing video')
    const videoInfo = await FFmpegProcessor.probe(inputPath)
    
    // Step 2: Generate optimal variants
    onProgress(10, 'Planning quality variants')
    const variants = generateOptimalVariants(videoInfo.width, videoInfo.height, videoInfo.duration)
    
    // Step 3: Generate thumbnails
    let thumbnails: string[] = []
    if (options.generateThumbnails !== false) {
      onProgress(20, 'Generating thumbnails')
      const thumbnailDir = path.join(outputDir, 'thumbnails')
      await fs.mkdir(thumbnailDir, { recursive: true })
      thumbnails = await FFmpegProcessor.generateThumbnails(
        inputPath,
        thumbnailDir,
        options.thumbnailCount || 5
      )
    }

    // Step 4: Generate preview clip
    let preview: string | undefined
    if (options.generatePreview) {
      onProgress(30, 'Creating preview clip')
      const previewPath = path.join(outputDir, 'preview.mp4')
      await FFmpegProcessor.transcode(inputPath, previewPath, {
        codec: 'libx264',
        preset: 'fast',
        crf: 23,
        width: Math.min(videoInfo.width, 640),
        height: Math.min(videoInfo.height, 360),
        format: 'mp4'
      })
      preview = previewPath
    }

    // Step 5: Create HLS variants
    onProgress(40, 'Creating adaptive streaming variants')
    const hlsPlaylist = await FFmpegProcessor.createHLSPlaylist(inputPath, outputDir, variants)
    
    onProgress(100, 'Processing complete')

    return {
      hlsPlaylist,
      thumbnails,
      preview,
      variants
    }
  } catch (error) {
    console.error('Video processing failed:', error)
    throw error
  }
}

// Processing queue management
class VideoProcessingQueue {
  private static instance: VideoProcessingQueue
  private queue: Map<string, {
    status: 'queued' | 'processing' | 'completed' | 'error'
    progress: number
    result?: any
    error?: string
    startTime?: number
  }> = new Map()

  static getInstance(): VideoProcessingQueue {
    if (!VideoProcessingQueue.instance) {
      VideoProcessingQueue.instance = new VideoProcessingQueue()
    }
    return VideoProcessingQueue.instance
  }

  async addJob(
    jobId: string,
    inputPath: string,
    outputDir: string,
    options: any = {}
  ): Promise<void> {
    this.queue.set(jobId, {
      status: 'queued',
      progress: 0,
      startTime: Date.now()
    })

    // Process in background
    this.processJob(jobId, inputPath, outputDir, options).catch(error => {
      this.queue.set(jobId, {
        ...this.queue.get(jobId)!,
        status: 'error',
        error: error.message
      })
    })
  }

  private async processJob(
    jobId: string,
    inputPath: string,
    outputDir: string,
    options: any
  ): Promise<void> {
    try {
      this.queue.set(jobId, {
        ...this.queue.get(jobId)!,
        status: 'processing'
      })

      const result = await processVideoWithAdaptiveStreaming(
        inputPath,
        outputDir,
        {
          ...options,
          onProgress: (progress: number, stage: string) => {
            this.queue.set(jobId, {
              ...this.queue.get(jobId)!,
              progress,
              status: 'processing'
            })
          }
        }
      )

      this.queue.set(jobId, {
        ...this.queue.get(jobId)!,
        status: 'completed',
        progress: 100,
        result
      })
    } catch (error) {
      this.queue.set(jobId, {
        ...this.queue.get(jobId)!,
        status: 'error',
        error: (error as Error).message
      })
    }
  }

  getJobStatus(jobId: string) {
    return this.queue.get(jobId)
  }

  cancelJob(jobId: string): boolean {
    const job = this.queue.get(jobId)
    if (job && job.status === 'queued') {
      this.queue.delete(jobId)
      return true
    }
    return false
  }
}

export const videoProcessingQueue = VideoProcessingQueue.getInstance()

// Legacy compatibility functions (to be removed gradually)
export async function startStream(config: StreamConfig): Promise<string> {
  // This function maintains backward compatibility
  // Consider migrating to new adaptive streaming approach
  console.warn('startStream is deprecated. Use processVideoWithAdaptiveStreaming instead.')
  
  const streamId = crypto.randomBytes(16).toString('hex')
  
  try {
    const outputDir = path.join(config.outputPath, streamId)
    await fs.mkdir(outputDir, { recursive: true })
    
    // Convert to new format
    const result = await processVideoWithAdaptiveStreaming(config.inputUrl, outputDir)
    
    return streamId
  } catch (error) {
    console.error('Stream creation failed:', error)
    throw error
  }
}

// Additional streaming utilities
export class VideoStreamingService {
  private activeStreams: Map<string, any> = new Map()
  
  constructor() {}

  async createStream(config: StreamConfig): Promise<string> {
    const streamId = crypto.randomBytes(16).toString('hex')
    
    try {
      const result = await processVideoWithAdaptiveStreaming(config.inputUrl, config.outputPath)
      
      this.activeStreams.set(streamId, {
        config,
        result,
        status: 'active',
        startTime: new Date()
      })
      
      return streamId
    } catch (error) {
      console.error('Stream creation failed:', error)
      throw error
    }
  }

  getStream(streamId: string) {
    return this.activeStreams.get(streamId)
  }

  async stopStream(streamId: string): Promise<boolean> {
    const stream = this.activeStreams.get(streamId)
    if (stream) {
      this.activeStreams.delete(streamId)
      return true
    }
    return false
  }

  listActiveStreams() {
    return Array.from(this.activeStreams.entries()).map(([id, stream]) => ({
      id,
      config: stream.config,
      status: stream.status,
      startTime: stream.startTime
    }))
  }
}

export const videoStreamingService = new VideoStreamingService()
