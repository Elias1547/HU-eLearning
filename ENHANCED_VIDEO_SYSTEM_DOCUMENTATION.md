# Enhanced Video Processing System Documentation

## Overview

This comprehensive video processing system provides advanced video upload, processing, and streaming capabilities with FFmpeg integration, adaptive HLS streaming, and Cloudinary optimization.

## Features

### Video Processing
- **FFmpeg Integration**: Advanced video processing with industry-standard tools
- **Adaptive HLS Streaming**: Multiple quality variants for optimal viewing experience
- **Quality Variants**: 360p, 480p, 720p, 1080p automatically generated
- **Thumbnail Generation**: 5 thumbnails automatically extracted from videos
- **Preview Clips**: 30-second preview clips for quick content overview
- **Watermarking**: Custom watermark overlay support
- **Background Processing**: Queue-based processing for handling multiple videos
- **Progress Tracking**: Real-time processing progress updates

### Video Player
- **HLS.js Integration**: Professional-grade adaptive streaming player
- **Quality Selection**: Manual quality switching with auto-adaptive option
- **Custom Controls**: Professional video player controls
- **Fullscreen Support**: Native fullscreen playback
- **Volume Control**: Precise volume and mute controls
- **Progress Seeking**: Accurate timeline scrubbing
- **Error Handling**: Graceful error recovery and network resilience

### Upload System
- **Drag & Drop**: Intuitive file upload interface
- **Multiple Formats**: Support for MP4, AVI, MOV, WMV, FLV, WebM, MKV
- **Progress Tracking**: Real-time upload progress
- **Validation**: File size and format validation
- **Batch Upload**: Multiple file upload support
- **Error Handling**: Comprehensive error reporting

## API Endpoints

### Enhanced Cloudinary Upload
```
POST /api/cloudinary/enhanced-upload
```
**Purpose**: Upload videos with automatic metadata extraction and processing queue management

**Request**:
```typescript
FormData {
  file: File,
  enableProcessing: boolean
}
```

**Response**:
```typescript
{
  secure_url: string,
  public_id: string,
  duration: number,
  bytes: number,
  width: number,
  height: number,
  format: string,
  resource_type: string
}
```

### Video Processing
```
POST /api/videos/process
```
**Purpose**: Start video processing with adaptive streaming

**Request**:
```typescript
{
  videoId: string,
  options?: {
    qualities?: string[],
    watermark?: boolean,
    thumbnails?: number,
    preview?: boolean
  }
}
```

**Response**:
```typescript
{
  success: boolean,
  processingId: string,
  status: 'queued' | 'processing' | 'completed' | 'error'
}
```

### Processing Status
```
GET /api/videos/process?videoId={id}
```
**Purpose**: Check video processing status and progress

**Response**:
```typescript
{
  status: 'queued' | 'processing' | 'completed' | 'error',
  progress: number, // 0-100
  hlsUrl?: string,
  thumbnails?: string[],
  qualities?: Array<{
    quality: string,
    url: string,
    bitrate: number
  }>,
  error?: string
}
```

### Cancel Processing
```
DELETE /api/videos/process?videoId={id}
```
**Purpose**: Cancel ongoing video processing

**Response**:
```typescript
{
  success: boolean,
  message: string
}
```

## Components

### AdaptiveVideoPlayer
A professional HLS video player with adaptive streaming support.

**Props**:
```typescript
interface AdaptiveVideoPlayerProps {
  src: string                              // HLS master playlist URL
  poster?: string                          // Video poster image
  title?: string                           // Video title
  className?: string                       // Additional CSS classes
  autoPlay?: boolean                       // Auto-play on load
  controls?: boolean                       // Show player controls
  onTimeUpdate?: (currentTime: number) => void
  onDurationChange?: (duration: number) => void
}
```

**Usage**:
```jsx
<AdaptiveVideoPlayer
  src="https://example.com/video.m3u8"
  title="My Video"
  className="w-full max-w-4xl"
  autoPlay={false}
  controls={true}
  onTimeUpdate={(time) => console.log('Current time:', time)}
  onDurationChange={(duration) => console.log('Duration:', duration)}
/>
```

### EnhancedVideoUploader
A comprehensive video upload component with drag-and-drop support.

**Props**:
```typescript
interface EnhancedVideoUploaderProps {
  onUploadComplete?: (videos: VideoFile[]) => void
  onUploadProgress?: (progress: number) => void
  maxFiles?: number                        // Maximum number of files
  maxSize?: number                         // Maximum file size in MB
  acceptedFormats?: string[]               // Accepted file formats
  enableProcessing?: boolean               // Enable automatic processing
  className?: string                       // Additional CSS classes
}
```

**Usage**:
```jsx
<EnhancedVideoUploader
  onUploadComplete={(videos) => console.log('Uploaded:', videos)}
  onUploadProgress={(progress) => console.log('Progress:', progress)}
  maxFiles={5}
  maxSize={500}
  enableProcessing={true}
/>
```

## Video Processing Service

### Core Functions

#### processVideoWithAdaptiveStreaming
```typescript
async function processVideoWithAdaptiveStreaming(
  videoUrl: string,
  options: ProcessingOptions
): Promise<ProcessingResult>
```
Main function for processing videos with adaptive streaming capabilities.

#### generateOptimalVariants
```typescript
function generateOptimalVariants(
  width: number,
  height: number,
  duration: number
): QualityVariant[]
```
Generates optimal quality variants based on video dimensions and duration.

#### transcodeMultipleVariants
```typescript
async function transcodeMultipleVariants(
  inputPath: string,
  variants: QualityVariant[],
  onProgress: (progress: number) => void
): Promise<TranscodeResult[]>
```
Transcodes video into multiple quality variants for adaptive streaming.

### Processing Queue

The system includes a robust background processing queue that:
- Manages multiple concurrent processing jobs
- Provides progress tracking for each job
- Handles errors gracefully with retry mechanisms
- Stores processing status in the database
- Supports job cancellation

## Configuration

### FFmpeg Configuration
```typescript
const ffmpegConfig = {
  codec: 'libx264',
  audioCodec: 'aac',
  format: 'hls',
  segmentTime: 10,
  hlsPlaylistType: 'vod',
  hlsSegmentFilename: '%03d.ts'
}
```

### Quality Variants
```typescript
const qualityVariants = [
  { name: '360p', width: 640, height: 360, bitrate: '800k' },
  { name: '480p', width: 854, height: 480, bitrate: '1200k' },
  { name: '720p', width: 1280, height: 720, bitrate: '2500k' },
  { name: '1080p', width: 1920, height: 1080, bitrate: '5000k' }
]
```

### Cloudinary Configuration
```typescript
const cloudinaryConfig = {
  resource_type: 'video',
  chunk_size: 6000000,
  eager: [
    { format: 'mp4', quality: 'auto' },
    { format: 'webm', quality: 'auto' }
  ],
  eager_async: true
}
```

## Error Handling

### Upload Errors
- File size validation
- Format validation
- Network error recovery
- Timeout handling

### Processing Errors
- FFmpeg execution errors
- Invalid video format handling
- Insufficient storage space
- Network connectivity issues

### Player Errors
- HLS loading errors
- Network error recovery
- Media error handling
- Fallback video support

## Performance Optimization

### Video Processing
- Parallel processing for multiple quality variants
- Optimized FFmpeg parameters for speed and quality
- Intelligent quality variant selection based on source video
- Background processing to avoid blocking user interface

### Player Performance
- Adaptive bitrate switching based on network conditions
- Preloading optimization
- Buffer management for smooth playback
- Efficient memory usage

### Upload Optimization
- Chunked uploads for large files
- Resume capability for interrupted uploads
- Parallel uploads for multiple files
- Progress tracking without blocking UI

## Testing

### Test the System
Access the test page at `/test-video` to:
1. Upload videos with the enhanced uploader
2. Test adaptive video playback
3. Monitor processing progress
4. Verify quality variant generation

### Sample HLS URLs for Testing
- Test Stream 1: `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`
- Test Stream 2: `https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8`

## Dependencies

### Required Packages
```json
{
  "hls.js": "^1.4.12",
  "@types/hls.js": "^1.0.0",
  "react-dropzone": "^14.2.3",
  "cloudinary": "^1.41.0",
  "fluent-ffmpeg": "^2.1.2",
  "@types/fluent-ffmpeg": "^2.1.21"
}
```

### System Requirements
- Node.js 18+
- FFmpeg installed on server
- Cloudinary account with video processing enabled
- Sufficient storage for video files and processing

## Security Considerations

### File Upload Security
- File type validation
- Size limits enforcement
- Virus scanning (recommended)
- User authentication required

### Processing Security
- Input sanitization for FFmpeg commands
- Resource limits for processing jobs
- Timeout enforcement
- Error logging without exposing sensitive information

### Streaming Security
- Signed URLs for private content
- Token-based access control
- CORS configuration
- Rate limiting for API endpoints

## Monitoring and Analytics

### Key Metrics
- Upload success/failure rates
- Processing completion times
- Video quality distribution
- Playback performance metrics
- Error rates by category

### Logging
- Upload events with metadata
- Processing status changes
- Player events and errors
- Performance metrics

## Future Enhancements

### Planned Features
- Live streaming integration
- Subtitle/caption support
- Advanced video analytics
- CDN integration for global delivery
- Machine learning-based quality optimization
- Real-time video filters and effects

### Scalability Improvements
- Horizontal scaling for processing workers
- Database sharding for video metadata
- Caching strategies for frequently accessed videos
- Edge computing for processing optimization
