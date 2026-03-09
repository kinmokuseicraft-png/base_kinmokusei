/**
 * 顧客カルテ一覧 API
 * customer_logs を集計し、LINE表示名・最終訪問・興味関心を返す
 */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // customer_logs から全件取得（直近 2000 件）
    const { data: logs, error: logsErr } = await supabase
      .from("customer_logs")
      .select("line_user_id, event_type, event_data, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (logsErr) throw logsErr;

    if (!logs || logs.length === 0) {
      return NextResponse.json({ customers: [] });
    }

    // line_user_id ごとに集計
    type Agg = {
      line_user_id: string;
      last_visit: string;
      event_counts: Record<string, number>;
    };

    const map = new Map<string, Agg>();
    for (const log of logs) {
      const uid = log.line_user_id ?? "__anonymous__";
      if (!map.has(uid)) {
        map.set(uid, { line_user_id: uid, last_visit: log.created_at, event_counts: {} });
      }
      const agg = map.get(uid)!;
      // last_visit はすでに降順なので最初の行が最新
      agg.event_counts[log.event_type] = (agg.event_counts[log.event_type] ?? 0) + 1;
    }

    // line_users と突合（line_user_id が存在するもののみ）
    const knownIds = [...map.keys()].filter((id) => id !== "__anonymous__");
    const { data: users } = knownIds.length
      ? await supabase
          .from("line_users")
          .select("line_user_id, display_name, picture_url")
          .in("line_user_id", knownIds)
      : { data: [] };

    const userMap = new Map<string, { display_name: string | null; picture_url: string | null }>();
    (users ?? []).forEach((u: { line_user_id: string; display_name: string | null; picture_url: string | null }) => {
      userMap.set(u.line_user_id, { display_name: u.display_name, picture_url: u.picture_url });
    });

    // 興味関心ラベル: product_click / news_tap / video_play / wood_tap / scroll_depth
    const INTEREST_LABEL: Record<string, string> = {
      product_click: "商品",
      news_tap: "お知らせ",
      video_play: "動画",
      wood_tap: "銘木",
      scroll_depth: "LP閲覧",
      page_view: "ページ閲覧",
    };

    const customers = [...map.values()]
      .filter((a) => a.line_user_id !== "__anonymous__")
      .sort((a, b) => (a.last_visit > b.last_visit ? -1 : 1))
      .map((agg) => {
        const user = userMap.get(agg.line_user_id);
        // 最もカウントが多いイベントを top_interest に
        let topEvent = "";
        let topCount = 0;
        for (const [evt, cnt] of Object.entries(agg.event_counts)) {
          if (cnt > topCount) { topCount = cnt; topEvent = evt; }
        }
        return {
          line_user_id: agg.line_user_id,
          display_name: user?.display_name ?? null,
          picture_url: user?.picture_url ?? null,
          last_visit: agg.last_visit,
          top_interest: INTEREST_LABEL[topEvent] ?? topEvent,
          total_events: Object.values(agg.event_counts).reduce((s, c) => s + c, 0),
          event_counts: agg.event_counts,
        };
      });

    return NextResponse.json({ customers }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[api/customers]", e);
    return NextResponse.json({ customers: [] }, { status: 200 });
  }
}
