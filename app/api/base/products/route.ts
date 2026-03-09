/**
 * BASE連携 — 商品一覧（キャッシュ優先。?refresh=1 で BASE から全件再取得・同期）
 */
import { NextRequest, NextResponse } from "next/server";
import { getBaseProducts } from "@/lib/base_api";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const refresh = request.nextUrl.searchParams.get("refresh") === "1";
    const products = await getBaseProducts({ forceRefresh: refresh });

    const { data: rows } = await supabase
      .from("base_products")
      .select("base_item_id, line_display_image_url")
      .in("base_item_id", products.map((p) => p.item_id));

    const urlByItemId = new Map<number, string | null>();
    (rows ?? []).forEach((r: { base_item_id: number; line_display_image_url: string | null }) => {
      urlByItemId.set(r.base_item_id, r.line_display_image_url ?? null);
    });

    const merged = products.map((p) => ({
      ...p,
      line_display_image_url: urlByItemId.get(p.item_id) ?? null,
    }));

    const q = request.nextUrl.searchParams.get("q")?.trim();
    const list = q
      ? merged.filter(
          (p) =>
            p.title?.toLowerCase().includes(q.toLowerCase()) ||
            String(p.item_id) === q
        )
      : merged;

    return NextResponse.json({ products: list }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[api/base/products]", e);
    return NextResponse.json({ products: [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
