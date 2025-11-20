// frontend/app/api/settings/route.ts
import { NextResponse } from "next/server";

let storedConfig: any = null; // temporary in-memory storage (replace with DB later)

export async function GET() {
  if (!storedConfig)
    return NextResponse.json(
      { message: "No saved config found" },
      { status: 404 }
    );
  return NextResponse.json(storedConfig);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    storedConfig = body;
    console.log("🧩 Config saved on server:", storedConfig);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to save config:", err);
    return NextResponse.json(
      { error: "Failed to save config" },
      { status: 500 }
    );
  }
}
