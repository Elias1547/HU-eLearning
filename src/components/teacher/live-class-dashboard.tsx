"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Play, Square, Users, Copy, ExternalLink, Video } from 'lucide-react'
import { format } from 'date-fns'

interface LiveClass {
  _id: string
  course: { _id: string; title: string }
  title: string
  description?: string
  scheduledDate: string
  duration: number
  platform: 'zoom'
  meetingUrl: string
  joinUrl: string
  meetingId?: string
  passcode?: string
  status: 'scheduled' | 'live' | 'ended' | 'cancelled'
  isLive: boolean
  attendees: string[]
  startedAt?: string
  endedAt?: string
}

interface Course {
  _id: string
  title: string
}

export default function TeacherLiveClassDashboard() {
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const [newLiveClass, setNewLiveClass] = useState({
    course: '',
    title: '',
    description: '',
    scheduledDate: '',
    duration: 60,
    platform: 'zoom' as const,
    meetingUrl: '',
    meetingId: '',
    passcode: ''
  })

  useEffect(() => {
    fetchLiveClasses()
    fetchCourses()
  }, [])

  const fetchLiveClasses = async () => {
    try {
      const response = await fetch('/api/teacher/live-classes')
      if (response.ok) {
        const data = await response.json()
        setLiveClasses(data.liveClasses || [])
      } else {
        console.error('Failed to fetch live classes')
        toast.error("Failed to fetch live classes")
      }
    } catch (error) {
      console.error('Error fetching live classes:', error)
      toast.error("Failed to fetch live classes")
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/teacher/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const handleCreateLiveClass = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/live-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLiveClass)
      })

      if (response.ok) {
        const data = await response.json()
        setLiveClasses([data.liveClass, ...liveClasses])
        setIsCreateDialogOpen(false)
        setNewLiveClass({
          course: '',
          title: '',
          description: '',
          scheduledDate: '',
          duration: 60,
          platform: 'zoom',
          meetingUrl: '',
          meetingId: '',
          passcode: ''
        })
        toast.success("Live class scheduled successfully")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to create live class")
      }
    } catch (error) {
      console.error('Error creating live class:', error)
      toast.error("Failed to create live class")
    }
  }

  const openZoomMeeting = (joinUrl: string) => {
    if (!joinUrl) {
      toast.error("No Zoom launch link found for this class")
      return
    }

    window.open(joinUrl, '_blank', 'noopener,noreferrer')
  }

  const startLiveClass = async (liveClassId: string, joinUrl: string) => {
    try {
      const response = await fetch(`/api/live-classes/${liveClassId}/start-stream`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || "Failed to start live class")
      }

      await fetchLiveClasses()
      openZoomMeeting(joinUrl)
      toast.success("Live class started successfully")
    } catch (error) {
      console.error('Error starting live class:', error)
      toast.error((error as Error).message || "Failed to start live class")
    }
  }

  const endLiveClass = async (liveClassId: string) => {
    try {
      const response = await fetch(`/api/live-classes/${liveClassId}/start-stream`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || "Failed to end live class")
      }

      await fetchLiveClasses()
      toast.success("Live class ended successfully")
    } catch (error) {
      console.error('Error ending live class:', error)
      toast.error((error as Error).message || "Failed to end live class")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.info("Link copied to clipboard")
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "secondary" | "destructive" | "outline"> = {
      scheduled: 'secondary',
      live: 'destructive',
      ended: 'outline',
      cancelled: 'outline'
    }
    return <Badge variant={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>
  }

  if (loading) {
    return <div className="p-6">Loading live classes...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Live Classes</h1>
          <p className="text-muted-foreground">Schedule and manage your Zoom sessions</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Live Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule New Live Class</DialogTitle>
              <DialogDescription>
                Create a Zoom session for your students and share the meeting details
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateLiveClass} className="space-y-4">
              <div>
                <Label htmlFor="course">Course</Label>
                <Select 
                  value={newLiveClass.course} 
                  onValueChange={(value) => setNewLiveClass({...newLiveClass, course: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newLiveClass.title}
                  onChange={(e) => setNewLiveClass({...newLiveClass, title: e.target.value})}
                  placeholder="Live class title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newLiveClass.description}
                  onChange={(e) => setNewLiveClass({...newLiveClass, description: e.target.value})}
                  placeholder="Describe what will be covered"
                />
              </div>

              <div>
                <Label htmlFor="meetingUrl">Zoom Meeting Link</Label>
                <Input
                  id="meetingUrl"
                  type="url"
                  value={newLiveClass.meetingUrl}
                  onChange={(e) => setNewLiveClass({...newLiveClass, meetingUrl: e.target.value})}
                  placeholder="https://zoom.us/j/..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="meetingId">Meeting ID (Optional)</Label>
                <Input
                  id="meetingId"
                  value={newLiveClass.meetingId}
                  onChange={(e) => setNewLiveClass({...newLiveClass, meetingId: e.target.value})}
                  placeholder="123 456 7890"
                />
              </div>

              <div>
                <Label htmlFor="passcode">Passcode (Optional)</Label>
                <Input
                  id="passcode"
                  value={newLiveClass.passcode}
                  onChange={(e) => setNewLiveClass({...newLiveClass, passcode: e.target.value})}
                  placeholder="Enter Zoom passcode"
                />
              </div>

              <div>
                <Label htmlFor="scheduledDate">Scheduled Date & Time</Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  value={newLiveClass.scheduledDate}
                  onChange={(e) => setNewLiveClass({...newLiveClass, scheduledDate: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  max="300"
                  value={newLiveClass.duration}
                  onChange={(e) => setNewLiveClass({...newLiveClass, duration: parseInt(e.target.value)})}
                />
              </div>

              <div className="sticky bottom-0 flex gap-2 border-t bg-background pt-4">
                <Button type="submit" className="flex-1">Schedule</Button>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Live Classes List */}
      <div className="grid gap-4">
        {liveClasses.map(liveClass => (
          <Card key={liveClass._id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {liveClass.title}
                    {getStatusBadge(liveClass.status)}
                  </CardTitle>
                  <CardDescription>
                    {liveClass.course.title} - {format(new Date(liveClass.scheduledDate), 'PPP p')}
                  </CardDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                      <Video className="w-3.5 h-3.5" />
                      Zoom
                    </span>
                    {liveClass.meetingId && <span>Meeting ID: {liveClass.meetingId}</span>}
                    {liveClass.passcode && <span>Passcode: {liveClass.passcode}</span>}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {liveClass.status === 'scheduled' && (
                    <Button onClick={() => startLiveClass(liveClass._id, liveClass.joinUrl)}>
                      <Play className="w-4 h-4 mr-2" />
                      Start on Zoom
                    </Button>
                  )}
                  
                  {liveClass.status === 'live' && (
                    <Button 
                      variant="destructive" 
                      onClick={() => endLiveClass(liveClass._id)}
                    >
                      <Square className="w-4 h-4 mr-2" />
                      End
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => openZoomMeeting(liveClass.joinUrl)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Zoom
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(liveClass.meetingUrl)}
                    aria-label="Copy Zoom link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {liveClass.description && (
                <p className="text-sm text-muted-foreground mb-4">{liveClass.description}</p>
              )}

              <div className="mb-4 rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-medium">Zoom link</p>
                <p className="break-all text-muted-foreground">{liveClass.meetingUrl}</p>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {liveClass.attendees.length} attendees
                </span>
                <span>{liveClass.duration} minutes</span>
                {liveClass.startedAt && (
                  <span>Started: {format(new Date(liveClass.startedAt), 'p')}</span>
                )}
                {liveClass.endedAt && (
                  <span>Ended: {format(new Date(liveClass.endedAt), 'p')}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {liveClasses.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No live classes scheduled yet.</p>
              <p className="text-sm text-muted-foreground">Create your first Zoom class to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
