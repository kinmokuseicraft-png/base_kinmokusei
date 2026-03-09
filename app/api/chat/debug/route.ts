/**
 * デバッグ: messages テーブルの実データ確認
 * GET /api/chat/debug?line_user_id=xxx
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const lineUserId = request.nextUrl.searchParams.get("line_user_id") ?? "";

  const { data, error, count } = await supabase
    .from("messages")
    .select("id, direction, message_type, content, created_at", { count: "exact" })
    .eq("line_user_id", lineUserId)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ lineUserId, count, data, error }, { headers: { "Cache-Control": "no-store" } });
}
