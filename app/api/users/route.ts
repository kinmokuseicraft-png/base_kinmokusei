/**
 * 金杢犀 — 顧客一覧 API（Supabase line_users から実データのみ。モック・ダミーは一切返さない）
 */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("line_users")
      .select("id, line_user_id, display_name, picture_url, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[api/users] line_users fetch error", error);
      return NextResponse.json({ users: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }

    const users = Array.isArray(data) ? data : [];
    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[api/users]", e);
    return NextResponse.json({ users: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
