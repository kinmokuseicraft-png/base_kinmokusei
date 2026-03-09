/**
 * 全LP一覧 API
 * GET /api/lp  → JSONファイル一覧 + Supabase設定をマージ
 */
import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

export async function GET() {
  const woodsDir = join(process.cwd(), "data", "woods");
  let files: string[] = [];
  try {
    files = readdirSync(woodsDir).filter(
      (f) => f.endsWith(".json") && !f.includes("_images") && f !== "_template.json"
    );
  } catch {
    return NextResponse.json({ woods: [] });
  }

  const woods = files.map((file) => {
    try {
      const raw = readFileSync(join(woodsDir, file), "utf-8");
      const data = JSON.parse(raw) as Record<string, unknown>;
      return {
        slug: String(data.slug ?? ""),
        wood_name_ja: String(data.wood_name_ja ?? ""),
        catch_copy: String(data.catch_copy ?? ""),
      };
    } catch { return null; }
  }).filter(Boolean) as { slug: string; wood_name_ja: string; catch_copy: string }[];

  // Supabaseの公開設定を取得
  const { data: settings } = await supabase
    .from("wood_lp_settings")
    .select("slug, is_published, hero_image_url, sort_order");

  const settingsMap = new Map(
    (settings ?? []).map((s: { slug: string; is_published: boolean; hero_image_url: string | null; sort_order: number }) => [s.slug, s])
  );

  const merged = woods.map((w) => ({
    ...w,
    is_published: settingsMap.get(w.slug)?.is_published ?? false,
    has_hero_image: !!settingsMap.get(w.slug)?.hero_image_url,
    sort_order: settingsMap.get(w.slug)?.sort_order ?? 0,
  })).sort((a, b) => a.sort_order - b.sort_order || a.wood_name_ja.localeCompare(b.wood_name_ja, "ja"));

  return NextResponse.json({ woods: merged }, { headers: { "Cache-Control": "no-store" } });
}
