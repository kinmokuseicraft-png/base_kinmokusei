/**
 * BASE OAuth2 認可URLを発行する
 * GET /api/base/oauth/authorize-url → { url: "https://api.thebase.in/1/oauth/authorize?..." }
 */
import { NextResponse } from "next/server";
import { getBaseOAuthRedirectUri } from "@/lib/base_oauth_url";

const BASE_AUTHORIZE = "https://api.thebase.in/1/oauth/authorize";

/** 商品・注文取得に必要なスコープ */
const DEFAULT_SCOPE = "read_users read_items read_orders";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = process.env.BASE_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "BASE_CLIENT_ID が設定されていません。.env に追加してください。" },
      { status: 500 }
    );
  }

  const redirectUri = getBaseOAuthRedirectUri();

  const scope = process.env.BASE_OAUTH_SCOPE?.trim() || DEFAULT_SCOPE;
  const state = `base_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  });

  const url = `${BASE_AUTHORIZE}?${params.toString()}`;
  return NextResponse.json({ url, redirect_uri: redirectUri, state });
}
