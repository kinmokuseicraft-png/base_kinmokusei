/**
 * BASE OAuth2 の redirect_uri / origin を一箇所で定義（認可URLとコールバックで完全一致させる）
 * ローカルは 3001 ポート統一。
 */
const LOCAL_PORT = 3001;

/** コールバックのフルURL（認可リクエスト・トークン交換の redirect_uri に使用） */
export function getBaseOAuthRedirectUri(): string {
  const env = process.env.BASE_OAUTH_REDIRECT_URI?.trim();
  if (env) return env.startsWith("http") ? env : `https://${env}`;
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL}/api/base/oauth/callback`;
  return `http://localhost:${LOCAL_PORT}/api/base/oauth/callback`;
}

/** リダイレクト先のオリジン（認証後に /dashboard/base へ戻すときのベースURL） */
export function getBaseOAuthOrigin(): string {
  const redirectUri = process.env.BASE_OAUTH_REDIRECT_URI?.trim();
  if (redirectUri?.startsWith("http://localhost:")) {
    const m = redirectUri.match(/^(https?:\/\/[^/]+)/);
    if (m) return m[1];
    return `http://localhost:${LOCAL_PORT}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://kinmokusei-line.vercel.app";
}
