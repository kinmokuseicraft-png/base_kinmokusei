/**
 * BASE連携 — 商品の LINE 表示用画像 URL を更新
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const baseItemId = parseInt(itemId, 10);
  if (Number.isNaN(baseItemId)) {
    return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
  }

  let body: { line_display_image_url?: string | null } = {};
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lineDisplayImageUrl =
    body.line_display_image_url === undefined
      ? undefined
      : body.line_display_image_url === ""
        ? null
        : String(body.line_display_image_url).trim() || null;

  try {
    const { error } = await supabase
      .from("base_products")
      .upsert(
        {
          base_item_id: baseItemId,
          line_display_image_url: lineDisplayImageUrl ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "base_item_id" }
      );

    if (error) {
      console.error("[api/base/products PATCH]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, base_item_id: baseItemId, line_display_image_url: lineDisplayImageUrl ?? null });
  } catch (e) {
    console.error("[api/base/products PATCH]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
