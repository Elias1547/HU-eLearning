import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { dbConnect } from "@/lib/dbConnect"
import { LiveClass } from "@/models/live-class"
import { Teacher } from "@/models/teacher"
import { rateLimit } from "@/lib/utils"

// Rate limiting configuration
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 10,
})

interface StartStreamResponse {
  meetingUrl?: string
  status: string
  message: string
}

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         request.ip || 
         'unknown'
}

// Helper function to validate teacher access
async function validateTeacherAccess(teacherId: string, liveClassId: string) {
  const teacher = await Teacher.findById(teacherId).lean()
  if (!teacher) {
    throw new Error("Teacher not found")
  }
  
  if (teacher.isBlocked) {
    throw new Error("Teacher account is blocked")
  }

  const liveClass = await LiveClass.findById(liveClassId).lean()
  if (!liveClass) {
    throw new Error("Live class not found")
  }
  
  if (liveClass.teacher.toString() !== teacherId) {
    throw new Error("You can only start your own live classes")
  }

  return { teacher, liveClass }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const ip = getClientIP(request)
    const { success } = await limiter.limit(ip)
    if (!success) {
      return NextResponse.json({ error: "Too many stream start requests" }, { status: 429 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    // Validate teacher access
    const { liveClass } = await validateTeacherAccess(session.user.id, params.id)

    if (liveClass.isLive) {
      return NextResponse.json({ error: "Live class is already active" }, { status: 409 })
    }

    if (liveClass.status === 'ended' || liveClass.status === 'cancelled') {
      return NextResponse.json({ error: "Cannot start an ended or cancelled live class" }, { status: 400 })
    }

    // Update live class status
    await LiveClass.findByIdAndUpdate(params.id, {
      isLive: true,
      status: 'live',
      startedAt: new Date(),
      updatedAt: new Date()
    })

    const response: StartStreamResponse = {
      meetingUrl: typeof liveClass.meetingUrl === "string" ? liveClass.meetingUrl : undefined,
      status: "live",
      message: "Live class started successfully"
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Error starting stream:", error)
    
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      
      if (error.message.includes("blocked")) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      
      if (error.message.includes("already")) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      
      if (error.message.includes("Cannot start")) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    // Validate teacher access
    const { liveClass } = await validateTeacherAccess(session.user.id, params.id)

    if (!liveClass.isLive && liveClass.status !== 'live') {
      return NextResponse.json({ error: "Live class is not currently active" }, { status: 400 })
    }

    // Update live class status
    await LiveClass.findByIdAndUpdate(params.id, {
      isLive: false,
      status: 'ended',
      endedAt: new Date(),
      updatedAt: new Date()
    })

    return NextResponse.json({
      message: "Live class ended successfully"
    })

  } catch (error) {
    console.error("Error stopping stream:", error)
    
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      
      if (error.message.includes("blocked")) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 
