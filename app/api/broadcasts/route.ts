/**
 * 金杢犀 — 一斉配信 API（broadcasts テーブル・実データのみ）
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** GET: 配信一覧（下書き・予約・送信済） */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("broadcasts")
      .select("id, name, title, body, status, scheduled_at, sent_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[api/broadcasts]", error);
      return NextResponse.json({ broadcasts: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ broadcasts: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[api/broadcasts]", e);
    return NextResponse.json({ broadcasts: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}

/** POST: 新規作成（下書き or 予約）。送信は POST /api/broadcasts/send で実行 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { title?: string; body?: string; status?: string; scheduled_at?: string; image_url?: string };
    const title = (body.title ?? "").trim() || "（無題）";
    const text = (body.body ?? "").trim() || "";
    const status = body.status === "scheduled" ? "scheduled" : "draft";
    const scheduledAt = status === "scheduled" && body.scheduled_at ? body.scheduled_at : null;
    const imageUrl = body.image_url ?? null;

    const messageType = imageUrl ? "image_and_text" : "text";
    const messageContent = imageUrl
      ? { type: "image_and_text", text: text || "（本文なし）", image_url: imageUrl }
      : { type: "text", text: text || "（本文なし）" };

    const { data, error } = await supabase
      .from("broadcasts")
      .insert({
        name: title,
        title,
        body: text,
        image_url: imageUrl,
        message_type: messageType,
        message_content: messageContent,
        status,
        scheduled_at: scheduledAt,
        sent_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, title, status, scheduled_at, created_at")
      .maybeSingle();

    if (error) {
      console.error("[api/broadcasts] insert", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ broadcast: data });
  } catch (e) {
    console.error("[api/broadcasts]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
