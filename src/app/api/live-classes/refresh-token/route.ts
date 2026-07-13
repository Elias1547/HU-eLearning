import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { error: "Live classes now use Zoom links directly. Token refresh is no longer required." },
    { status: 410 }
  )
}

export async function GET() {
  return NextResponse.json(
    { error: "Live classes now use Zoom links directly. Token refresh is no longer required." },
    { status: 410 }
  )
}
