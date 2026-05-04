import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/dbConnect'
import {Student} from '@/models/student'
import {Teacher} from '@/models/teacher'
import {Admin} from '@/models/admin'
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const normalizeUsers = (
      rows: Array<{
        _id: unknown
        name: string
        email: string
        createdAt: Date | string
        isBlocked?: boolean
        purchasedCourses?: unknown[]
        coursesCreated?: unknown[]
      }>
    ) =>
      rows.map((row) => ({
        ...row,
        isActive: !row.isBlocked,
      }))

    let users = []

    switch (type) {
      case 'students':
        users = await Student.find({})
          .select('name email createdAt purchasedCourses isBlocked')
          .sort({ createdAt: -1 })
          .lean()
        users = normalizeUsers(users as never)
        break
      
      case 'teachers':
        users = await Teacher.find({})
          .select('name email createdAt coursesCreated isBlocked upiId age')
          .sort({ createdAt: -1 })
          .lean()
        users = normalizeUsers(users as never)
        break
      
      case 'admins':
        users = await Admin.find({})
          .select('name email createdAt isBlocked')
          .sort({ createdAt: -1 })
          .lean()
        users = normalizeUsers(users as never)
        break
      
      default:
        // Fetch all types
        const [students, teachers, admins] = await Promise.all([
          Student.find({})
            .select('name email createdAt purchasedCourses isBlocked')
            .sort({ createdAt: -1 })
            .lean(),
          Teacher.find({})
            .select('name email createdAt coursesCreated isBlocked upiId age')
            .sort({ createdAt: -1 })
            .lean(),
          Admin.find({})
            .select('name email createdAt isBlocked')
            .sort({ createdAt: -1 })
            .lean()
        ])

        return NextResponse.json({
          students: normalizeUsers((students || []) as never),
          teachers: normalizeUsers((teachers || []) as never),
          admins: normalizeUsers((admins || []) as never)
        })
    }

    return NextResponse.json({
      users: users || []
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    await dbConnect()
    const body = await request.json()
    const { userType } = body as { userType?: "student" | "teacher" }

    if (!userType || !["student", "teacher"].includes(userType)) {
      return NextResponse.json({ error: "Invalid user type" }, { status: 400 })
    }

    if (!body.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      )
    }

    const email = String(body.email).trim().toLowerCase()
    const hashedPassword = await bcrypt.hash(String(body.password).trim(), 10)

    if (userType === "student") {
      const exists = await Student.findOne({ email })
      if (exists) {
        return NextResponse.json(
          { error: "Student with this email already exists" },
          { status: 409 }
        )
      }

      const student = await Student.create({
        name: String(body.name).trim(),
        email,
        password: hashedPassword,
      })

      return NextResponse.json(
        {
          message: "Student created successfully",
          user: {
            _id: student._id,
            name: student.name,
            email: student.email,
            createdAt: student.createdAt,
            purchasedCourses: student.purchasedCourses ?? [],
            isActive: !student.isBlocked,
          },
        },
        { status: 201 }
      )
    }

    const exists = await Teacher.findOne({ email })
    if (exists) {
      return NextResponse.json(
        { error: "Teacher with this email already exists" },
        { status: 409 }
      )
    }

    if (!body.upiId?.trim()) {
      return NextResponse.json(
        { error: "UPI ID is required for teachers" },
        { status: 400 }
      )
    }

    const teacher = await Teacher.create({
      name: String(body.name).trim(),
      email,
      password: hashedPassword,
      upiId: String(body.upiId).trim(),
      age: body.age ? Number(body.age) : undefined,
    })

    return NextResponse.json(
      {
        message: "Teacher created successfully",
        user: {
          _id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          createdAt: teacher.createdAt,
          coursesCreated: teacher.coursesCreated ?? [],
          upiId: teacher.upiId,
          age: teacher.age,
          isActive: !teacher.isBlocked,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
