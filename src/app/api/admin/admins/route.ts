import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Admin, adminValidationSchema } from "@/models/admin";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = adminValidationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    await dbConnect();

    const existingAdmin = await Admin.findOne({ email: parsed.data.email });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "An admin with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    const admin = await Admin.create({
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
    });

    return NextResponse.json(
      {
        message: "Admin created successfully",
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
          createdAt: admin.createdAt,
          isActive: !admin.isBlocked,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
