/**
 * 本番仕様: ベースURLの完全固定
 * NEXT_PUBLIC_SITE_URL / BASE_URL 等の環境変数は参照しない。
 * プレビューURL（...-5epg...）は一切使用しない。
 */
const PRODUCTION_DOMAIN = "https://kinmokusei-line.vercel.app";

export const SITE_BASE_URL = PRODUCTION_DOMAIN;
export const WEBHOOK_URL = `${PRODUCTION_DOMAIN}/api/webhook`;
export const LIFF_ENDPOINT_URL = `${PRODUCTION_DOMAIN}/liff`;
