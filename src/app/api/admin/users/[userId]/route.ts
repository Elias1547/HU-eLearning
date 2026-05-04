import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Student } from "@/models/student";
import { Teacher } from "@/models/teacher";
import { Admin } from "@/models/admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = params;
    const { action, userType } = await req.json();

    if (!["suspend", "activate"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!["student", "teacher", "admin"].includes(userType)) {
      return NextResponse.json({ error: "Invalid user type" }, { status: 400 });
    }

    const isBlocked = action !== "activate";
    let updatedUser;

    switch (userType) {
      case "student":
        updatedUser = await Student.findByIdAndUpdate(
          userId,
          { isBlocked },
          { new: true }
        );
        break;
      case "teacher":
        updatedUser = await Teacher.findByIdAndUpdate(
          userId,
          { isBlocked },
          { new: true }
        );
        break;
      case "admin":
        updatedUser = await Admin.findByIdAndUpdate(
          userId,
          { isBlocked },
          { new: true }
        );
        break;
    }

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: `User ${action}d successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userType, name, email, password, upiId, age } = await req.json();
    if (!["student", "teacher"].includes(userType)) {
      return NextResponse.json({ error: "Invalid user type" }, { status: 400 });
    }
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const updateData: {
      name: string;
      email: string;
      password?: string;
      upiId?: string;
      age?: number;
    } = {
      name: String(name).trim(),
      email: normalizedEmail,
    };

    if (password?.trim()) {
      updateData.password = await bcrypt.hash(String(password).trim(), 10);
    }

    let updatedUser;

    if (userType === "student") {
      const exists = await Student.findOne({
        email: normalizedEmail,
        _id: { $ne: params.userId },
      });
      if (exists) {
        return NextResponse.json(
          { error: "Another student already uses this email" },
          { status: 409 }
        );
      }

      updatedUser = await Student.findByIdAndUpdate(params.userId, updateData, {
        new: true,
        runValidators: true,
      });
    } else {
      if (!upiId?.trim()) {
        return NextResponse.json(
          { error: "UPI ID is required for teachers" },
          { status: 400 }
        );
      }

      const exists = await Teacher.findOne({
        email: normalizedEmail,
        _id: { $ne: params.userId },
      });
      if (exists) {
        return NextResponse.json(
          { error: "Another teacher already uses this email" },
          { status: 409 }
        );
      }

      updateData.upiId = String(upiId).trim();
      updateData.age = age ? Number(age) : undefined;

      updatedUser = await Teacher.findByIdAndUpdate(params.userId, updateData, {
        new: true,
        runValidators: true,
      });
    }

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "User updated successfully",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt,
        isActive: !updatedUser.isBlocked,
        purchasedCourses: updatedUser.purchasedCourses ?? [],
        coursesCreated: updatedUser.coursesCreated ?? [],
        upiId: updatedUser.upiId,
        age: updatedUser.age,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userType } = await req.json();
    if (!["student", "teacher"].includes(userType)) {
      return NextResponse.json({ error: "Invalid user type" }, { status: 400 });
    }

    const deleted =
      userType === "student"
        ? await Student.findByIdAndDelete(params.userId)
        : await Teacher.findByIdAndDelete(params.userId);

    if (!deleted) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}