import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EnhancedVideoUploader from '@/components/video/enhanced-video-uploader'
import AdaptiveVideoPlayer from '@/components/video/adaptive-video-player'

export default function VideoTestPage() {
  const handleUploadComplete = (videos: any[]) => {
    console.log('Upload completed:', videos)
  }

  const handleUploadProgress = (progress: number) => {
    console.log('Upload progress:', progress)
  }

  // Sample HLS URL for testing (replace with actual HLS master playlist URL)
  const sampleHlsUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Enhanced Video Processing System
        </h1>
        <p className="text-gray-600">
          Test the comprehensive video upload, processing, and adaptive streaming capabilities
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Video Upload</TabsTrigger>
          <TabsTrigger value="player">Adaptive Player</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Video Uploader</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedVideoUploader
                onUploadComplete={handleUploadComplete}
                onUploadProgress={handleUploadProgress}
                maxFiles={5}
                maxSize={500}
                enableProcessing={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="player" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Adaptive Video Player</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  This player supports HLS adaptive streaming with multiple quality options
                </p>
                <AdaptiveVideoPlayer
                  src={sampleHlsUrl}
                  title="Sample Adaptive Video"
                  className="w-full max-w-4xl mx-auto"
                  autoPlay={false}
                  controls={true}
                  onTimeUpdate={(time) => console.log('Time update:', time)}
                  onDurationChange={(duration) => console.log('Duration:', duration)}
                />
                <div className="text-xs text-gray-500 mt-2">
                  Sample URL: {sampleHlsUrl}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Video Processing Features */}
            <Card>
              <CardHeader>
                <CardTitle>Video Processing Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">FFmpeg Integration</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Adaptive HLS Streaming</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Multiple Quality Variants (360p, 480p, 720p, 1080p)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Automatic Thumbnail Generation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Preview Clip Creation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Watermarking Support</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Background Processing Queue</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Progress Tracking</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Player Features */}
            <Card>
              <CardHeader>
                <CardTitle>Player Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">HLS.js Integration</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Adaptive Bitrate Streaming</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Quality Selection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Custom Controls</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Fullscreen Support</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Volume Control</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Progress Seek</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Error Handling</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Endpoints */}
            <Card>
              <CardHeader>
                <CardTitle>Enhanced API Endpoints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="font-semibold">POST</span> <code className="bg-gray-100 px-2 py-1 rounded text-xs">/api/cloudinary/enhanced-upload</code>
                    <p className="text-gray-600 text-xs mt-1">Enhanced video upload with metadata extraction</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">POST</span> <code className="bg-gray-100 px-2 py-1 rounded text-xs">/api/videos/process</code>
                    <p className="text-gray-600 text-xs mt-1">Start video processing with adaptive streaming</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">GET</span> <code className="bg-gray-100 px-2 py-1 rounded text-xs">/api/videos/process?videoId=xxx</code>
                    <p className="text-gray-600 text-xs mt-1">Check processing status and progress</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">DELETE</span> <code className="bg-gray-100 px-2 py-1 rounded text-xs">/api/videos/process?videoId=xxx</code>
                    <p className="text-gray-600 text-xs mt-1">Cancel ongoing video processing</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Specifications */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="font-semibold">Supported Formats:</span>
                    <p className="text-gray-600">MP4, AVI, MOV, WMV, FLV, WebM, MKV</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Quality Variants:</span>
                    <p className="text-gray-600">360p, 480p, 720p, 1080p (adaptive)</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Streaming Protocol:</span>
                    <p className="text-gray-600">HLS (HTTP Live Streaming)</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Video Codecs:</span>
                    <p className="text-gray-600">H.264, H.265/HEVC</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Audio Codecs:</span>
                    <p className="text-gray-600">AAC, MP3</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Max File Size:</span>
                    <p className="text-gray-600">500MB per file</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Thumbnails:</span>
                    <p className="text-gray-600">5 auto-generated thumbnails</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Preview:</span>
                    <p className="text-gray-600">30-second preview clips</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
