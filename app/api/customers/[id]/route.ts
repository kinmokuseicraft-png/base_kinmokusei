/**
 * 顧客カルテ詳細 API
 * [id] = line_user_id (URLエンコード済み)
 * customer_logs の全タイムライン + base_products 結合
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";

async function fetchAndSaveProfile(lineUserId: string) {
  if (!LINE_TOKEN) return;
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId)}`, {
      headers: { Authorization: `Bearer ${LINE_TOKEN}` },
    });
    if (!res.ok) return;
    const profile = await res.json() as { displayName?: string; pictureUrl?: string };
    if (profile.displayName) {
      await supabase.from("line_users").update({
        display_name: profile.displayName,
        picture_url: profile.pictureUrl ?? null,
      }).eq("line_user_id", lineUserId);
    }
  } catch { /* ignore */ }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lineUserId = decodeURIComponent(params.id);

    // ユーザー情報
    let { data: user } = await supabase
      .from("line_users")
      .select("line_user_id, display_name, picture_url, status, created_at")
      .eq("line_user_id", lineUserId)
      .maybeSingle();

    // display_name が null なら LINE API から自動取得して再クエリ
    if (user && !user.display_name) {
      await fetchAndSaveProfile(lineUserId);
      const { data: refreshed } = await supabase
        .from("line_users")
        .select("line_user_id, display_name, picture_url, status, created_at")
        .eq("line_user_id", lineUserId)
        .maybeSingle();
      if (refreshed) user = refreshed;
    }

    // 行動ログ（最新 200 件）
    const { data: logs, error: logsErr } = await supabase
      .from("customer_logs")
      .select("id, event_type, event_data, page, created_at")
      .eq("line_user_id", lineUserId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (logsErr) throw logsErr;

    // ログ内の product_id を収集
    const productIds = new Set<string>();
    for (const log of logs ?? []) {
      const pid = (log.event_data as Record<string, unknown>)?.product_id;
      if (pid && typeof pid === "string") productIds.add(pid);
      // item_id (number) も対応
      const iid = (log.event_data as Record<string, unknown>)?.item_id;
      if (iid) productIds.add(String(iid));
    }

    // base_products からタイトル・画像を取得
    type ProductRow = {
      base_item_id: number;
      title: string | null;
      image_url: string | null;
      line_display_image_url: string | null;
    };
    let products: ProductRow[] = [];
    if (productIds.size > 0) {
      const numericIds = [...productIds].map(Number).filter((n) => !isNaN(n));
      if (numericIds.length > 0) {
        const { data } = await supabase
          .from("base_products")
          .select("base_item_id, title, image_url, line_display_image_url")
          .in("base_item_id", numericIds);
        products = (data ?? []) as ProductRow[];
      }
    }

    const productMap = new Map<string, ProductRow>();
    products.forEach((p) => productMap.set(String(p.base_item_id), p));

    // event_counts 集計（グラフ用）
    const event_counts: Record<string, number> = {};
    for (const log of logs ?? []) {
      event_counts[log.event_type] = (event_counts[log.event_type] ?? 0) + 1;
    }

    return NextResponse.json({
      user: user ?? null,
      logs: logs ?? [],
      event_counts,
      products: Object.fromEntries(productMap),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[api/customers/[id]]", e);
    return NextResponse.json({ user: null, logs: [], event_counts: {}, products: {} }, { status: 200 });
  }
}
