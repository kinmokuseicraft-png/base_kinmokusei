/**
 * SNS発信ハブ — 投稿の保存（sns_posts）
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export type SnsPostStatus = "draft" | "sent";

export interface SnsPostInsert {
  product_id?: number | null;
  original_memo?: string | null;
  image_url?: string | null;
  x_copy: string;
  insta_copy: string;
  line_copy: string;
  status?: SnsPostStatus;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SnsPostInsert;
    const row = {
      product_id: body.product_id ?? null,
      original_memo: body.original_memo ?? null,
      image_url: body.image_url ?? null,
      x_copy: body.x_copy ?? "",
      insta_copy: body.insta_copy ?? "",
      line_copy: body.line_copy ?? "",
      status: (body.status ?? "draft") as SnsPostStatus,
    };

    const { data, error } = await supabase
      .from("sns_posts")
      .insert(row)
      .select("id, created_at")
      .maybeSingle();

    if (error) {
      console.error("[api/sns-hub/posts]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data?.id, created_at: data?.created_at });
  } catch (e) {
    console.error("[api/sns-hub/posts]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "保存に失敗しました" },
      { status: 500 }
    );
  }
}
