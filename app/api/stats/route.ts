import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

/**
 * 金杢犀 ライン管理用 — ダッシュボード統計（Supabase の message_logs / users から集計）
 * 総友達数・総メッセージ数を一本のAPIで返す。
 */
export async function GET() {
  try {
    let friends = 0;
    let incoming = 0;
    let outgoing = 0;

    const { count: friendsCount, error: eFriends } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true });

    if (!eFriends && friendsCount != null) {
      friends = friendsCount;
    } else {
      const { data: distinctUsers, error: eDistinct } = await supabase
        .from("message_logs")
        .select("line_user_id");
      if (!eDistinct && distinctUsers?.length) {
        const set = new Set(distinctUsers.map((r) => r.line_user_id));
        friends = set.size;
      }
    }

    const { count: totalIn, error: eIn } = await supabase
      .from("message_logs")
      .select("id", { count: "exact", head: true })
      .eq("direction", "in");

    const { count: totalOut, error: eOut } = await supabase
      .from("message_logs")
      .select("id", { count: "exact", head: true })
      .eq("direction", "out");

    if (!eIn && totalIn != null) incoming = totalIn;
    if (!eOut && totalOut != null) outgoing = totalOut;

    const total = incoming + outgoing;
    const hasError = !!eFriends && !!eIn && !!eOut;

    return NextResponse.json({
      friends,
      messages: { total, incoming, outgoing },
      error: hasError ? "DB not configured or table missing" : undefined,
    });
  } catch (e) {
    console.error("[stats]", e);
    return NextResponse.json(
      { friends: 0, messages: { total: 0, incoming: 0, outgoing: 0 }, error: String(e) },
      { status: 500 }
    );
  }
}
