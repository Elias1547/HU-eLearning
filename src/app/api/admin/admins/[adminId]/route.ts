import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Admin } from "@/models/admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: { adminId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, password } = await req.json();
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const existingAdmin = await Admin.findOne({
      email: email.trim().toLowerCase(),
      _id: { $ne: params.adminId },
    });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "Another admin already uses this email" },
        { status: 409 }
      );
    }

    const updateData: {
      name: string;
      email: string;
      password?: string;
    } = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
    };

    if (password?.trim()) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await Admin.findByIdAndUpdate(params.adminId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Admin updated successfully",
      admin: {
        _id: updated._id,
        name: updated.name,
        email: updated.email,
        createdAt: updated.createdAt,
        isActive: !updated.isBlocked,
      },
    });
  } catch (error) {
    console.error("Error updating admin:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { adminId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const target = await Admin.findById(params.adminId);
    if (!target) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    if (target.email === session.user.email) {
      return NextResponse.json(
        { error: "You cannot delete your own admin account" },
        { status: 400 }
      );
    }

    const adminCount = await Admin.countDocuments();
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last admin account" },
        { status: 400 }
      );
    }

    await Admin.findByIdAndDelete(params.adminId);
    return NextResponse.json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error("Error deleting admin:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
