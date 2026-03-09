/**
 * LIFF メールアドレス登録API
 * POST /api/liff/register-email
 * body: { line_user_id: string, email: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { line_user_id, email } = await req.json() as { line_user_id?: string; email?: string };

    if (!line_user_id || !email) {
      return NextResponse.json({ error: "line_user_id と email は必須です" }, { status: 400 });
    }

    // メールアドレスの簡易バリデーション
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 });
    }

    const { error } = await supabase
      .from("line_users")
      .upsert(
        {
          line_user_id,
          email,
          email_registered_at: new Date().toISOString(),
        },
        { onConflict: "line_user_id" }
      );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[liff/register-email]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
