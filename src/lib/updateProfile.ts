import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

// Replace with your DB logic
import { connectDB } from "@/lib/db"
import User from "@/models/User"

export async function updateProfileHandler(req: NextRequest) {
  try {
    await connectDB()

    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await req.json()

    const {
      name,
      email,
      bio,
      phone,
      website,
      profileImage,
    } = body

    // 🔒 Basic validation (server-side)
    if (!name || !email) {
      return NextResponse.json(
        { message: "Name and email are required" },
        { status: 400 }
      )
    }

    // ✅ Update user
    const updatedUser = await User.findByIdAndUpdate(
      token.id,
      {
        name,
        email,
        bio,
        phone,
        website,
        profileImage,
      },
      { new: true }
    )

    if (!updatedUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      user: updatedUser,
    })
  } catch (error) {
    console.error("Profile update error:", error)

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}