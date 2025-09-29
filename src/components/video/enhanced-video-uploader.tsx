'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Video, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface VideoFile {
  file: File
  id: string
  preview: string
  uploadProgress: number
  processingProgress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
  cloudinaryUrl?: string
  videoId?: string
  duration?: number
  size?: number
  dimensions?: { width: number; height: number }
  thumbnails?: string[]
  hlsUrl?: string
  qualities?: Array<{ quality: string; url: string }>
}

interface EnhancedVideoUploaderProps {
  onUploadComplete?: (videos: VideoFile[]) => void
  onUploadProgress?: (progress: number) => void
  maxFiles?: number
  maxSize?: number // in MB
  acceptedFormats?: string[]
  enableProcessing?: boolean
  className?: string
}

export default function EnhancedVideoUploader({
  onUploadComplete,
  onUploadProgress,
  maxFiles = 5,
  maxSize = 500, // 500MB default
  acceptedFormats = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
  enableProcessing = true,
  className = ''
}: EnhancedVideoUploaderProps) {
  const [videos, setVideos] = useState<VideoFile[]>([])
  const [overallProgress, setOverallProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const processingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (videos.length + acceptedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`)
      return
    }

    const newVideos: VideoFile[] = acceptedFiles.map(file => {
      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is ${maxSize}MB`)
        return null
      }

      // Validate file format
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      if (!fileExtension || !acceptedFormats.includes(fileExtension)) {
        toast.error(`File ${file.name} format not supported`)
        return null
      }

      return {
        file,
        id: Math.random().toString(36).substr(2, 9),
        preview: URL.createObjectURL(file),
        uploadProgress: 0,
        processingProgress: 0,
        status: 'pending' as const
      }
    }).filter(Boolean) as VideoFile[]

    setVideos(prev => [...prev, ...newVideos])
  }, [videos.length, maxFiles, maxSize, acceptedFormats])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': acceptedFormats.map(format => `.${format}`)
    },
    multiple: true,
    disabled: isUploading
  })

  const removeVideo = (id: string) => {
    setVideos(prev => {
      const video = prev.find(v => v.id === id)
      if (video?.preview) {
        URL.revokeObjectURL(video.preview)
      }
      
      // Clear processing interval
      const interval = processingIntervals.current.get(id)
      if (interval) {
        clearInterval(interval)
        processingIntervals.current.delete(id)
      }
      
      return prev.filter(v => v.id !== id)
    })
  }

  const uploadVideo = async (video: VideoFile): Promise<VideoFile> => {
    const formData = new FormData()
    formData.append('file', video.file)
    formData.append('enableProcessing', enableProcessing.toString())

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          setVideos(prev => prev.map(v => 
            v.id === video.id 
              ? { ...v, uploadProgress: progress, status: 'uploading' }
              : v
          ))
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText)
            const updatedVideo: VideoFile = {
              ...video,
              status: enableProcessing ? 'processing' : 'completed',
              uploadProgress: 100,
              cloudinaryUrl: response.secure_url,
              videoId: response.public_id,
              duration: response.duration,
              size: response.bytes,
              dimensions: response.width && response.height ? {
                width: response.width,
                height: response.height
              } : undefined
            }
            resolve(updatedVideo)
          } catch (error) {
            reject(new Error('Failed to parse response'))
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`))
        }
      }

      xhr.onerror = () => {
        reject(new Error('Upload failed'))
      }

      xhr.open('POST', '/api/cloudinary/enhanced-upload')
      xhr.send(formData)
    })
  }

  const checkProcessingStatus = async (videoId: string): Promise<any> => {
    try {
      const response = await fetch(`/api/videos/process?videoId=${videoId}`)
      if (!response.ok) throw new Error('Failed to check status')
      return await response.json()
    } catch (error) {
      console.error('Error checking processing status:', error)
      return null
    }
  }

  const startProcessingCheck = (video: VideoFile) => {
    if (!video.videoId) return

    const interval = setInterval(async () => {
      const status = await checkProcessingStatus(video.videoId!)
      
      if (status) {
        setVideos(prev => prev.map(v => {
          if (v.id === video.id) {
            if (status.status === 'completed') {
              // Clear interval when completed
              const intervalId = processingIntervals.current.get(video.id)
              if (intervalId) {
                clearInterval(intervalId)
                processingIntervals.current.delete(video.id)
              }

              return {
                ...v,
                status: 'completed',
                processingProgress: 100,
                hlsUrl: status.hlsUrl,
                thumbnails: status.thumbnails,
                qualities: status.qualities
              }
            } else if (status.status === 'error') {
              // Clear interval on error
              const intervalId = processingIntervals.current.get(video.id)
              if (intervalId) {
                clearInterval(intervalId)
                processingIntervals.current.delete(video.id)
              }

              return {
                ...v,
                status: 'error',
                error: status.error || 'Processing failed'
              }
            } else {
              return {
                ...v,
                processingProgress: status.progress || 0
              }
            }
          }
          return v
        }))
      }
    }, 2000) // Check every 2 seconds

    processingIntervals.current.set(video.id, interval)
  }

  const uploadAllVideos = async () => {
    setIsUploading(true)
    const pendingVideos = videos.filter(v => v.status === 'pending')
    
    try {
      for (let i = 0; i < pendingVideos.length; i++) {
        const video = pendingVideos[i]
        
        try {
          const uploadedVideo = await uploadVideo(video)
          
          setVideos(prev => prev.map(v => 
            v.id === video.id ? uploadedVideo : v
          ))

          if (enableProcessing && uploadedVideo.videoId) {
            startProcessingCheck(uploadedVideo)
          }

          // Update overall progress
          const progress = ((i + 1) / pendingVideos.length) * 100
          setOverallProgress(progress)
          onUploadProgress?.(progress)
          
        } catch (error) {
          console.error('Upload error:', error)
          setVideos(prev => prev.map(v => 
            v.id === video.id 
              ? { ...v, status: 'error', error: (error as Error).message }
              : v
          ))
        }
      }

      toast.success('All videos uploaded successfully!')
      onUploadComplete?.(videos.filter(v => v.status === 'completed' || v.status === 'processing'))
      
    } catch (error) {
      console.error('Upload process error:', error)
      toast.error('Failed to upload videos')
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusIcon = (status: VideoFile['status']) => {
    switch (status) {
      case 'pending':
        return <Upload className="h-4 w-4 text-gray-500" />
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Upload className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: VideoFile['status']) => {
    const variants: Record<VideoFile['status'], any> = {
      pending: 'secondary',
      uploading: 'default',
      processing: 'outline',
      completed: 'default',
      error: 'destructive'
    }

    const colors: Record<VideoFile['status'], string> = {
      pending: 'bg-gray-100 text-gray-800',
      uploading: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800'
    }

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the videos here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop videos here or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports: {acceptedFormats.join(', ').toUpperCase()} • Max {maxFiles} files • Max {maxSize}MB each
                </p>
              </div>
            )}
          </div>

          {videos.length > 0 && (
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {videos.length} video{videos.length > 1 ? 's' : ''} selected
              </p>
              <Button
                onClick={uploadAllVideos}
                disabled={isUploading || videos.every(v => v.status !== 'pending')}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload All'
                )}
              </Button>
            </div>
          )}

          {isUploading && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-gray-500">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video List */}
      {videos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {videos.map((video) => (
                <div key={video.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      <div className="relative">
                        <video
                          src={video.preview}
                          className="w-16 h-16 object-cover rounded"
                          muted
                        />
                        <div className="absolute -top-1 -right-1">
                          {getStatusIcon(video.status)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {video.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(video.file.size)}
                          {video.duration && ` • ${formatDuration(video.duration)}`}
                          {video.dimensions && ` • ${video.dimensions.width}x${video.dimensions.height}`}
                        </p>
                        <div className="mt-1">
                          {getStatusBadge(video.status)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVideo(video.id)}
                      disabled={video.status === 'uploading' || video.status === 'processing'}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Upload Progress */}
                  {video.status === 'uploading' && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">Uploading</span>
                        <span className="text-xs text-gray-500">{Math.round(video.uploadProgress)}%</span>
                      </div>
                      <Progress value={video.uploadProgress} className="h-1" />
                    </div>
                  )}

                  {/* Processing Progress */}
                  {video.status === 'processing' && enableProcessing && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">Processing</span>
                        <span className="text-xs text-gray-500">{Math.round(video.processingProgress)}%</span>
                      </div>
                      <Progress value={video.processingProgress} className="h-1" />
                    </div>
                  )}

                  {/* Error Message */}
                  {video.status === 'error' && video.error && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{video.error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Completed Info */}
                  {video.status === 'completed' && (
                    <div className="space-y-2">
                      {video.hlsUrl && (
                        <div className="text-xs text-green-600">
                          ✓ HLS streaming ready
                        </div>
                      )}
                      {video.thumbnails && video.thumbnails.length > 0 && (
                        <div className="text-xs text-green-600">
                          ✓ {video.thumbnails.length} thumbnails generated
                        </div>
                      )}
                      {video.qualities && video.qualities.length > 0 && (
                        <div className="text-xs text-green-600">
                          ✓ {video.qualities.length} quality variants available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
