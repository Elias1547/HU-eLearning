import { NextResponse } from "next/server"
import { dbConnect } from "@/lib/dbConnect"
import { Assignment } from "@/models/assignment"

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect()
  await Assignment.findByIdAndDelete(params.id)
  return NextResponse.json({ message: "Deleted" })
}