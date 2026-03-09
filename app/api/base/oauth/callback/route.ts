/**
 * BASE OAuth2 コールバック
 * 認可後に BASE からリダイレクトされ、code をアクセストークンに交換して base_settings に保存し、/dashboard/base へリダイレクトする。
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";
import { getBaseOAuthRedirectUri, getBaseOAuthOrigin } from "@/lib/base_oauth_url";

const BASE_TOKEN_URL = "https://api.thebase.in/1/oauth/token";
const DASHBOARD_BASE = "/dashboard/base";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = getBaseOAuthOrigin();
  const redirectToError = () => NextResponse.redirect(`${origin}${DASHBOARD_BASE}?auth=error`);

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(`${origin}${DASHBOARD_BASE}?auth=denied`);
    }

    if (!code?.trim()) {
      return redirectToError();
    }

    const clientId = process.env.BASE_CLIENT_ID?.trim();
    const clientSecret = process.env.BASE_CLIENT_SECRET?.trim();
    const redirectUri = getBaseOAuthRedirectUri();

    if (!clientId || !clientSecret) {
      console.error("[base/oauth/callback] BASE_CLIENT_ID or BASE_CLIENT_SECRET is missing");
      return redirectToError();
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: code.trim(),
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch(BASE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData.access_token || !tokenData.refresh_token) {
      console.error(
        "[base/oauth/callback] BASE token API error:",
        tokenRes.status,
        JSON.stringify(tokenData)
      );
      return redirectToError();
    }

    const expiresIn = typeof tokenData.expires_in === "number" ? tokenData.expires_in : 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const now = new Date().toISOString();

    const { error: upsertError } = await supabase
      .from("base_settings")
      .upsert(
        {
          id: 1,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          updated_at: now,
        },
        { onConflict: "id" }
      );

    if (upsertError) {
      console.error("[base/oauth/callback] Supabase upsert error", upsertError.message, upsertError.code);
      return redirectToError();
    }

    return NextResponse.redirect(`${origin}${DASHBOARD_BASE}?auth=success`);
  } catch (e) {
    console.error("[base/oauth/callback] Unhandled error", e);
    return redirectToError();
  }
}
