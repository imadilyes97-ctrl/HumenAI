import { NextRequest, NextResponse } from "next/server";

// HumenAI — Tenant management API

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, sector } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Missing required fields: name, email" },
        { status: 400 }
      );
    }

    // TODO: Create tenant in database
    // 1. Generate unique slug from name
    // 2. Create tenant record
    // 3. Create admin user
    // 4. Create default channel configs
    // 5. Initialize default settings based on sector template
    // 6. Return tenant data + session token

    const tenant = {
      id: `tenant_${Date.now()}`,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      plan: "standard",
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error("Tenant creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");

  if (!tenantId) {
    return NextResponse.json(
      { error: "Tenant ID required" },
      { status: 400 }
    );
  }

  // TODO: Fetch tenant from database
  return NextResponse.json({
    id: tenantId,
    name: "Demo Boutique",
    plan: "standard",
  });
}
