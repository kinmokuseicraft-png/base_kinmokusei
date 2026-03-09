/**
 * 金杢犀 — 配信画像アップロード API
 * 正方形にクロップ済みの画像を受け取り、Supabase Storage に保存して公開URLを返す
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

const BUCKET = "broadcast-images";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "画像ファイルが必要です" }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png" : "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[broadcasts/upload] storage error", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filename);

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (e) {
    console.error("[broadcasts/upload]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
