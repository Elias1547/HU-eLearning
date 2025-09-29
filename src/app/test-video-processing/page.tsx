'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Video,
  Download,
  Eye,
  Settings,
  RefreshCw
} from 'lucide-react'
import AdaptiveVideoPlayer from '@/components/video/adaptive-video-player'

interface ProcessingJob {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'error'
  progress: number
  videoId?: string
  result?: {
    hlsPlaylist: string
    thumbnails: string[]
    preview?: string
    variants: any[]
  }
  error?: string
}

export default function VideoProcessingTest() {
  const [videoId, setVideoId] = useState('')
  const [processing, setProcessing] = useState<ProcessingJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const startProcessing = async () => {
    if (!videoId) {
      setError('Please enter a video ID')
      return
    }

    setError(null)
    setProcessing(null)
    setResult(null)

    try {
      const response = await fetch('/api/videos/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          options: {
            generateThumbnails: true,
            thumbnailCount: 5,
            generatePreview: true,
            previewDuration: 30,
            watermark: {
              enabled: false
            }
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start processing')
      }

      setProcessing({
        id: data.processingJobId,
        status: 'queued',
        progress: 0,
        videoId: data.videoId
      })

      // Start polling for status
      pollProcessingStatus(data.processingJobId, data.videoId)

    } catch (err) {
      setError((err as Error).message)
    }
  }

  const pollProcessingStatus = async (jobId: string, vId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/videos/process?jobId=${jobId}&videoId=${vId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Failed to get status')
        }

        setProcessing(prev => prev ? {
          ...prev,
          status: data.job.status,
          progress: data.job.progress,
          error: data.job.error
        } : null)

        if (data.job.status === 'completed') {
          setResult(data)
          return // Stop polling
        }

        if (data.job.status === 'error') {
          setError(data.job.error || 'Processing failed')
          return // Stop polling
        }

        // Continue polling if still processing
        if (data.job.status === 'processing' || data.job.status === 'queued') {
          setTimeout(poll, 2000)
        }

      } catch (err) {
        setError((err as Error).message)
      }
    }

    setTimeout(poll, 1000) // Start polling after 1 second
  }

  const retryProcessing = async () => {
    if (!videoId) return

    try {
      const response = await fetch('/api/videos/process', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          action: 'retry'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to retry processing')
      }

      setError(null)
      setProcessing({
        id: data.processingJobId,
        status: 'queued',
        progress: 0,
        videoId
      })

      pollProcessingStatus(data.processingJobId, videoId)

    } catch (err) {
      setError((err as Error).message)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Video className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      queued: 'secondary',
      processing: 'default',
      completed: 'default',
      error: 'destructive'
    }

    const colors: Record<string, string> = {
      queued: 'bg-blue-100 text-blue-800',
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Video Processing System Test
        </h1>
        <p className="text-gray-600">
          Test the new FFmpeg-based video processing with adaptive streaming
        </p>
      </div>

      <div className="grid gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Start Video Processing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="videoId">Video ID</Label>
              <Input
                id="videoId"
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                placeholder="Enter video ID to process"
                disabled={processing?.status === 'processing'}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={startProcessing}
                disabled={!videoId || processing?.status === 'processing'}
                className="flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Start Processing</span>
              </Button>
              
              {processing?.status === 'error' && (
                <Button
                  onClick={retryProcessing}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Retry</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Processing Status */}
        {processing && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {getStatusIcon(processing.status)}
                <span>Processing Status</span>
                {getStatusBadge(processing.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-gray-500">{Math.round(processing.progress)}%</span>
                </div>
                <Progress value={processing.progress} className="w-full" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Job ID:</span>
                  <p className="text-gray-600 font-mono text-xs">{processing.id}</p>
                </div>
                <div>
                  <span className="font-medium">Video ID:</span>
                  <p className="text-gray-600 font-mono text-xs">{processing.videoId}</p>
                </div>
              </div>

              {processing.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{processing.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results Display */}
        {result && result.job.status === 'completed' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Processing Complete</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Video Info */}
              {result.video && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Video Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Title:</span>
                      <p className="text-gray-600">{result.video.title}</p>
                    </div>
                    <div>
                      <span className="font-medium">Original URL:</span>
                      <p className="text-gray-600 truncate">{result.video.url}</p>
                    </div>
                    {result.video.availableQualities && (
                      <div>
                        <span className="font-medium">Available Qualities:</span>
                        <div className="flex space-x-1 mt-1">
                          {result.video.availableQualities.map((quality: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {quality}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Processing Results */}
              {result.result && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Processing Results</h3>
                  <div className="space-y-3">
                    {result.result.hlsPlaylist && (
                      <div>
                        <span className="font-medium text-sm">HLS Playlist:</span>
                        <p className="text-gray-600 text-xs font-mono bg-gray-50 p-2 rounded">
                          {result.result.hlsPlaylist}
                        </p>
                      </div>
                    )}
                    
                    {result.result.thumbnails && result.result.thumbnails.length > 0 && (
                      <div>
                        <span className="font-medium text-sm">Thumbnails Generated:</span>
                        <p className="text-gray-600 text-sm">{result.result.thumbnails.length} thumbnails</p>
                      </div>
                    )}
                    
                    {result.result.preview && (
                      <div>
                        <span className="font-medium text-sm">Preview Clip:</span>
                        <p className="text-gray-600 text-xs font-mono bg-gray-50 p-2 rounded">
                          {result.result.preview}
                        </p>
                      </div>
                    )}

                    {result.result.variants && result.result.variants.length > 0 && (
                      <div>
                        <span className="font-medium text-sm">Quality Variants:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {result.result.variants.map((variant: any, index: number) => (
                            <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                              <p><strong>Quality:</strong> {variant.name}</p>
                              <p><strong>Resolution:</strong> {variant.width}x{variant.height}</p>
                              <p><strong>Bitrate:</strong> {variant.bitrate}k</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Video Player */}
              {result.video?.hlsUrl && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3">Adaptive Video Player</h3>
                  <AdaptiveVideoPlayer
                    src={result.video.hlsUrl}
                    title={result.video.title}
                    className="w-full"
                    autoPlay={false}
                    controls={true}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>System Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-4 border rounded-lg">
                <Video className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p className="font-medium">Modern FFmpeg</p>
                <p className="text-gray-600">Direct spawn implementation</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Play className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="font-medium">HLS Adaptive Streaming</p>
                <p className="text-gray-600">Multiple quality variants</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Eye className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <p className="font-medium">Enhanced Player</p>
                <p className="text-gray-600">HLS.js integration</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
