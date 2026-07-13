import { NextRequest, NextResponse } from "next/server";
import { cloudinaryManager } from "@/lib/media/cloudinary";
import { getSupabaseAdminClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as "image" | "video" || "image";
    const tenantId = formData.get("tenantId") as string;

    if (!file) return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Fichier trop volumineux (max 10 MB)" }, { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await cloudinaryManager.upload(buffer, type);

    if (tenantId) {
      const supabase = getSupabaseAdminClient();
      await supabase.from("media_assets").insert({
        tenant_id: tenantId,
        type,
        format: result.format,
        url: result.url,
        secure_url: result.secureUrl,
        public_id: result.publicId,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Échec de l'upload" }, { status: 500 });
  }
}
