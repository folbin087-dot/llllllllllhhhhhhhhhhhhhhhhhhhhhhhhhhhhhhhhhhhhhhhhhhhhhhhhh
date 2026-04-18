import { NextRequest, NextResponse } from "next/server"
import { getPublicConfig, isAdmin, isSuperAdmin } from "@/lib/config"

// Get public config (no auth required)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const adminId = searchParams.get("adminId")

  // Public config for all users
  const publicConfig = getPublicConfig()

  // If admin, return additional info
  if (adminId && isAdmin(adminId)) {
    return NextResponse.json({
      ...publicConfig,
      isAdmin: true,
      isSuperAdmin: isSuperAdmin(adminId),
    })
  }

  return NextResponse.json(publicConfig)
}

// Update config (super admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminId, updates } = body

    // Verify super admin
    if (!adminId || !isSuperAdmin(adminId)) {
      return NextResponse.json(
        { error: "Unauthorized. Super admin access required." },
        { status: 403 }
      )
    }

    // In production, update config in database
    // For now, return success with note about env vars
    return NextResponse.json({
      success: true,
      message: "Configuration updates require environment variable changes. Please update .env.local",
      requestedUpdates: updates,
    })
  } catch (error) {
    console.error("Config update error:", error)
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    )
  }
}
