import { NextRequest, NextResponse } from "next/server";
import {
  AdminAuthorizationError,
  requireStaff,
} from "@/lib/supabase/admin.server";
import { createPrivilegedClient } from "@/lib/supabase/privileged.server";
import { SUPABASE_UPLOAD_TIMEOUT_MS } from "@/lib/supabase/bounded-fetch.server";

export async function POST(request: NextRequest) {
  try {
    await requireStaff();
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json(
        {
          error:
            error.status === 401 ? "Authentication required" : "Access denied",
        },
        { status: error.status }
      );
    }
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    // This service-controlled client bypasses Storage RLS only after the staff
    // authorization above, and its larger file transfer is still bounded.
    const adminClient = createPrivilegedClient(SUPABASE_UPLOAD_TIMEOUT_MS);
    const { error } = await adminClient.storage
      .from("menu-images")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
    }

    const { data: urlData } = adminClient.storage
      .from("menu-images")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch {
    return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
  }
}
