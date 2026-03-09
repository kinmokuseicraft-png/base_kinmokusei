/**
 * LP設定更新 API
 * PATCH /api/lp/[slug]/settings
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const body = await req.json() as Record<string, unknown>;

    const { error } = await supabase
      .from("wood_lp_settings")
      .upsert({ slug, ...body }, { onConflict: "slug" });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
