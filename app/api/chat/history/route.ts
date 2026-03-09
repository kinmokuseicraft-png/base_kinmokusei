/**
 * 金杢犀 — 個別チャット履歴
 * GET /api/chat/history?line_user_id=xxx
 *
 * messages テーブルで送受信を一元管理:
 *   受信 (inbound): kinmokusei-line webhook が保存
 *   送信 (outbound): base_kinmokusei chat/send が保存
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const lineUserId = request.nextUrl.searchParams.get("line_user_id") ?? "";
  if (!lineUserId) {
    return NextResponse.json({ messages: [] }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("messages")
      .select("id, direction, message_type, content, created_at")
      .eq("line_user_id", lineUserId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const messages = (data ?? []).map((row) => ({
      id: row.id,
      direction: row.direction === "outbound" ? "out" as const : "in" as const,
      text: String(row.content ?? ""),
      created_at: row.created_at,
    }));

    return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[api/chat/history]", e);
    return NextResponse.json({ messages: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
