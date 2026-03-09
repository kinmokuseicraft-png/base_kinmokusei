/**
 * BASE OAuth2 認証状態
 * GET /api/base/oauth/status → { authenticated: boolean }
 */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("base_settings")
      .select("id")
      .eq("id", 1)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[base/oauth/status]", error);
      return NextResponse.json({ authenticated: false });
    }
    return NextResponse.json({ authenticated: !!data?.id });
  } catch (e) {
    console.error("[base/oauth/status]", e);
    return NextResponse.json({ authenticated: false });
  }
}
