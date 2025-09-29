'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Play,
  CheckCircle,
  Clock,
  BookOpen,
  Award,
  Target,
  BarChart3,
  Users,
  Calendar,
  Download,
  Share2,
  Bookmark,
  Star,
  Video,
  FileText,
  Lock,
  ChevronRight,
  PlayCircle,
  Pause,
  Eye,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  Zap,
  Shield,
  Globe,
  Monitor,
  Smartphone,
  Headphones
} from 'lucide-react'

interface Video {
  _id: string
  title: string
  description?: string
  duration: string
  position: number
  url?: string
  thumbnail?: string
  isCompleted?: boolean
  isLocked?: boolean
  views?: number
  likes?: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
}

interface Course {
  _id: string
  name: string
  description: string
  thumbnail?: string
  instructor: {
    name: string
    avatar?: string
    bio?: string
  }
  level: string
  category: string
  duration: string
  studentsCount: number
  rating: number
  price: number
  videos: Video[]
  skills: string[]
  requirements: string[]
  learningOutcomes: string[]
}

interface CourseProgress {
  completedVideos: number
  totalVideos: number
  percentage: number
  lastAccessedVideo?: string
  timeSpent: number
}

interface CourseLearnPageProps {
  params: {
    courseId: string
  }
}

export default function CourseLearnPage({ params }: CourseLearnPageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { courseId } = params

  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<string>('overview')

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    fetchCourseData()
  }, [session, status, courseId])

  const fetchCourseData = async () => {
    try {
      setLoading(true)
      
      // Fetch course data
      const courseResponse = await fetch(`/api/courses/${courseId}`)
      if (!courseResponse.ok) {
        throw new Error('Failed to fetch course data')
      }
      const courseData = await courseResponse.json()
      setCourse(courseData)

      // Fetch progress data
      const progressResponse = await fetch(`/api/student/progress/${courseId}`)
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        setProgress(progressData)
      }

    } catch (error) {
      console.error('Error fetching course data:', error)
      setError('Failed to load course data')
    } finally {
      setLoading(false)
    }
  }

  const handleStartVideo = (videoId: string) => {
    router.push(`/courses/${courseId}/learn/${videoId}`)
  }

  const handleContinueWatching = () => {
    if (progress?.lastAccessedVideo) {
      router.push(`/courses/${courseId}/learn/${progress.lastAccessedVideo}`)
    } else if (course?.videos.length) {
      router.push(`/courses/${courseId}/learn/${course.videos[0]._id}`)
    }
  }

  const formatDuration = (duration: string | number) => {
    if (typeof duration === 'string') return duration
    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-64 w-full rounded-lg" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Course Not Found</h1>
          <p className="text-muted-foreground mb-4">{error || 'The course you are looking for does not exist.'}</p>
          <Link href="/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href={`/courses/${courseId}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ← Back to course details
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{course.name}</h1>
                <p className="text-muted-foreground">by {course.instructor.name}</p>
              </div>
            </div>
            
            {progress && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-2">Course Progress</div>
                <div className="flex items-center space-x-2">
                  <Progress value={progress.percentage} className="w-32" />
                  <span className="text-sm font-medium">{Math.round(progress.percentage)}%</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {progress.completedVideos} of {progress.totalVideos} videos completed
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Continue Watching Section */}
            {progress && progress.percentage > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Play className="h-5 w-5" />
                    <span>Continue Watching</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        You're {Math.round(progress.percentage)}% complete
                      </p>
                      <Progress value={progress.percentage} className="w-64 mb-4" />
                    </div>
                    <Button onClick={handleContinueWatching} className="flex items-center space-x-2">
                      <PlayCircle className="h-4 w-4" />
                      <span>Continue Learning</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Course Content Tabs */}
            <Tabs value={selectedSection} onValueChange={setSelectedSection} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="community">Community</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Course Description */}
                <Card>
                  <CardHeader>
                    <CardTitle>About This Course</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {course.description}
                    </p>

                    {/* Learning Outcomes */}
                    {course.learningOutcomes && course.learningOutcomes.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold mb-3 flex items-center">
                          <Target className="h-4 w-4 mr-2" />
                          What You'll Learn
                        </h3>
                        <ul className="space-y-2">
                          {course.learningOutcomes.map((outcome, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Skills */}
                    {course.skills && course.skills.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold mb-3 flex items-center">
                          <Zap className="h-4 w-4 mr-2" />
                          Skills You'll Gain
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {course.skills.map((skill, index) => (
                            <Badge key={index} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Requirements */}
                    {course.requirements && course.requirements.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center">
                          <Shield className="h-4 w-4 mr-2" />
                          Requirements
                        </h3>
                        <ul className="space-y-1">
                          {course.requirements.map((requirement, index) => (
                            <li key={index} className="text-sm text-muted-foreground">
                              • {requirement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Course Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Video className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                      <div className="text-2xl font-bold">{course.videos.length}</div>
                      <div className="text-sm text-muted-foreground">Videos</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Clock className="h-6 w-6 mx-auto mb-2 text-green-500" />
                      <div className="text-2xl font-bold">{course.duration}</div>
                      <div className="text-sm text-muted-foreground">Duration</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Users className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                      <div className="text-2xl font-bold">{course.studentsCount}</div>
                      <div className="text-sm text-muted-foreground">Students</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Star className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                      <div className="text-2xl font-bold">{course.rating}</div>
                      <div className="text-sm text-muted-foreground">Rating</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="curriculum" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Curriculum</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {course.videos.length} videos • {course.duration} total length
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {course.videos.map((video, index) => (
                        <div
                          key={video._id}
                          className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                            video.isCompleted ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <div className="flex-shrink-0">
                                {video.isCompleted ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : video.isLocked ? (
                                  <Lock className="h-5 w-5 text-gray-400" />
                                ) : (
                                  <PlayCircle className="h-5 w-5 text-blue-500" />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-medium text-gray-500">
                                    {index + 1}.
                                  </span>
                                  <h3 className="font-medium truncate">{video.title}</h3>
                                  {video.difficulty && (
                                    <Badge 
                                      variant="secondary" 
                                      className={`text-xs ${getDifficultyColor(video.difficulty)}`}
                                    >
                                      {video.difficulty}
                                    </Badge>
                                  )}
                                </div>
                                
                                {video.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {video.description}
                                  </p>
                                )}
                                
                                <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{video.duration}</span>
                                  </div>
                                  {video.views && (
                                    <div className="flex items-center space-x-1">
                                      <Eye className="h-3 w-3" />
                                      <span>{video.views} views</span>
                                    </div>
                                  )}
                                  {video.likes && (
                                    <div className="flex items-center space-x-1">
                                      <ThumbsUp className="h-3 w-3" />
                                      <span>{video.likes}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {!video.isLocked && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartVideo(video._id)}
                                  className="flex items-center space-x-1"
                                >
                                  <Play className="h-4 w-4" />
                                  <span>{video.isCompleted ? 'Rewatch' : 'Watch'}</span>
                                </Button>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resources" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Resources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Download className="h-5 w-5 text-blue-500" />
                            <h3 className="font-medium">Downloadable Resources</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Access course materials, exercises, and supplementary content
                          </p>
                          <Button variant="outline" size="sm">
                            View Downloads
                          </Button>
                        </div>

                        <div className="border rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <FileText className="h-5 w-5 text-green-500" />
                            <h3 className="font-medium">Course Notes</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Take and organize your personal notes throughout the course
                          </p>
                          <Button variant="outline" size="sm">
                            Open Notes
                          </Button>
                        </div>

                        <div className="border rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Award className="h-5 w-5 text-purple-500" />
                            <h3 className="font-medium">Certificates</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Earn certificates upon course completion
                          </p>
                          <Button variant="outline" size="sm">
                            View Progress
                          </Button>
                        </div>

                        <div className="border rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <BarChart3 className="h-5 w-5 text-orange-500" />
                            <h3 className="font-medium">Learning Analytics</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Track your learning progress and performance
                          </p>
                          <Button variant="outline" size="sm">
                            View Analytics
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="community" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Community</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">Community Features Coming Soon</h3>
                      <p className="text-muted-foreground mb-4">
                        Connect with fellow students, ask questions, and participate in discussions.
                      </p>
                      <Button variant="outline">
                        Join Waitlist
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleContinueWatching} 
                  className="w-full flex items-center space-x-2"
                >
                  <PlayCircle className="h-4 w-4" />
                  <span>
                    {progress && progress.percentage > 0 ? 'Continue Learning' : 'Start Course'}
                  </span>
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="flex items-center space-x-1">
                    <Bookmark className="h-3 w-3" />
                    <span>Bookmark</span>
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center space-x-1">
                    <Share2 className="h-3 w-3" />
                    <span>Share</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Instructor Info */}
            <Card>
              <CardHeader>
                <CardTitle>Instructor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {course.instructor.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-medium">{course.instructor.name}</h3>
                    <p className="text-sm text-muted-foreground">Course Instructor</p>
                  </div>
                </div>
                {course.instructor.bio && (
                  <p className="text-sm text-muted-foreground">
                    {course.instructor.bio}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Course Info */}
            <Card>
              <CardHeader>
                <CardTitle>Course Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Level</span>
                  <Badge variant="secondary">{course.level}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Category</span>
                  <span>{course.category}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Videos</span>
                  <span>{course.videos.length} lessons</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Access</span>
                  <div className="flex items-center space-x-1 text-green-600">
                    <Globe className="h-3 w-3" />
                    <span>Lifetime</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Device Compatibility */}
            <Card>
              <CardHeader>
                <CardTitle>Available On</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <Monitor className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs">Desktop</span>
                  </div>
                  <div className="flex flex-col items-center space-y-1">
                    <Smartphone className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs">Mobile</span>
                  </div>
                  <div className="flex flex-col items-center space-y-1">
                    <Headphones className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs">Audio</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
