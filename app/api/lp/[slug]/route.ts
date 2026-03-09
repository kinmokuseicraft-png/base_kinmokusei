/**
 * LP データ取得 API
 * GET /api/lp/[slug]
 * JSONファイル + Supabase wood_lp_settings をマージして返す
 */
import { NextRequest, NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

export type WoodData = {
  slug: string;
  wood_name_ja: string;
  wood_name_en?: string;
  catch_copy: string;
  classification?: string;
  family?: string;
  origin_countries?: string[];
  specific_gravity?: number;
  hardness?: string;
  red_list?: string;
  color_description?: string;
  grain_description?: string;
  seo_description?: string;
  sections?: { h3: string; subsections: { h4: string; paragraphs: string[] }[] }[];
  // LP設定（Supabaseから）
  hero_image_url: string | null;
  hero_video_url: string | null;
  custom_catch_copy: string | null;
  custom_story: string | null;
  search_keyword: string | null;
  is_published: boolean;
};

function findWoodJsonBySlug(slug: string): Record<string, unknown> | null {
  const woodsDir = join(process.cwd(), "data", "woods");
  try {
    const files = readdirSync(woodsDir).filter(
      (f) => f.endsWith(".json") && !f.includes("_images") && f !== "_template.json"
    );
    for (const file of files) {
      const raw = readFileSync(join(woodsDir, file), "utf-8");
      const data = JSON.parse(raw) as Record<string, unknown>;
      if (data.slug === slug) return data;
    }
  } catch { /* ignore */ }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const jsonData = findWoodJsonBySlug(slug);
  if (!jsonData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Supabase から LP 設定を取得
  const { data: settings } = await supabase
    .from("wood_lp_settings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const result: WoodData = {
    slug,
    wood_name_ja: String(jsonData.wood_name_ja ?? ""),
    wood_name_en: jsonData.wood_name_en ? String(jsonData.wood_name_en) : undefined,
    catch_copy: String(jsonData.catch_copy ?? ""),
    classification: jsonData.classification ? String(jsonData.classification) : undefined,
    family: jsonData.family ? String(jsonData.family) : undefined,
    origin_countries: Array.isArray(jsonData.origin_countries) ? jsonData.origin_countries as string[] : undefined,
    specific_gravity: typeof jsonData.specific_gravity === "number" ? jsonData.specific_gravity : undefined,
    hardness: jsonData.hardness ? String(jsonData.hardness) : undefined,
    red_list: jsonData.red_list ? String(jsonData.red_list) : undefined,
    color_description: jsonData.color_description ? String(jsonData.color_description) : undefined,
    grain_description: jsonData.grain_description ? String(jsonData.grain_description) : undefined,
    seo_description: jsonData.seo_description ? String(jsonData.seo_description) : undefined,
    sections: Array.isArray(jsonData.sections) ? jsonData.sections as WoodData["sections"] : undefined,
    // LP設定
    hero_image_url: settings?.hero_image_url ?? null,
    hero_video_url: settings?.hero_video_url ?? null,
    custom_catch_copy: settings?.custom_catch_copy ?? null,
    custom_story: settings?.custom_story ?? null,
    search_keyword: settings?.search_keyword ?? null,
    is_published: settings?.is_published ?? false,
  };

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
