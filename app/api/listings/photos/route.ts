import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabase-admin";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "File must be a JPEG, PNG, WebP, or GIF image" },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "File must be 5MB or smaller" },
      { status: 400 }
    );
  }

  const extension = file.type.split("/")[1];
  const path = `${session.user.id}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(PHOTOS_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from(PHOTOS_BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
