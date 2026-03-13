/**
 * LINE Rich Menu API ユーティリティ
 *
 * 2タブ構成（はじめての方 / ご愛用の方）:
 *   - MENU_TAB_A: 和紙×墨 / 5列 / 2500×843
 *   - MENU_TAB_B: 漆黒×金 / 3列 / 2500×843
 *   - タブ切り替えは richmenuswitch アクション（Webhook不要）
 *
 * デプロイ手順:
 *   POST /api/admin/richmenu  body: { action: 'deploy-tabs' }
 */

const BASE_URL = 'https://api.line.me/v2/bot'
const DATA_URL = 'https://api-data.line.me/v2/bot'

function headers(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────
export type RichMenuAction =
  | { type: 'message'; text: string; label?: string }
  | { type: 'uri'; uri: string; label?: string }
  | { type: 'postback'; data: string; label?: string; displayText?: string }
  | { type: 'richmenuswitch'; richMenuAliasId: string; data: string }

export interface RichMenuArea {
  bounds: { x: number; y: number; width: number; height: number }
  action: RichMenuAction
}

export interface RichMenuDef {
  size: { width: number; height: number }
  selected: boolean
  name: string
  chatBarText: string
  areas: RichMenuArea[]
}

// ──────────────────────────────────────────────
// 旧メニュー定義（後方互換）
// ──────────────────────────────────────────────
const W1 = 833
const W2 = 834
const H  = 843

export const KINMOKUSEI_MENU: RichMenuDef = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: '金杢犀メインメニュー（旧）',
  chatBarText: 'メニューを開く',
  areas: [
    { bounds: { x: 0,      y: 0, width: W1, height: H }, action: { type: 'message', text: '銘木診断' } },
    { bounds: { x: W1,     y: 0, width: W2, height: H }, action: { type: 'uri', uri: 'https://kinmokuseijp.base.shop' } },
    { bounds: { x: W1+W2,  y: 0, width: W1, height: H }, action: { type: 'uri', uri: 'https://kinmokuseijp.blog' } },
    { bounds: { x: 0,      y: H, width: W1, height: H }, action: { type: 'message', text: '新作・入荷' } },
    { bounds: { x: W1,     y: H, width: W2, height: H }, action: { type: 'message', text: '職人に相談' } },
    { bounds: { x: W1+W2,  y: H, width: W1, height: H }, action: { type: 'message', text: '注文状況' } },
  ],
}

// ──────────────────────────────────────────────
// 新タブ設計 (2500×843)
//
// レイアウト寸法:
//   タブバー  y:   0 〜  95   height: 95
//   コンテンツ y:  95 〜 793   height: 698
//   固定バー  y: 793 〜 843   height: 50
//
// エイリアスID:
//   Tab A → "kinmokusei-menu-a"
//   Tab B → "kinmokusei-menu-b"
// ──────────────────────────────────────────────
const TAB_H  = 280
const CONT_Y = 280
const CONT_H = 1406

export const ALIAS_A = 'kinmokusei-menu-a'
export const ALIAS_B = 'kinmokusei-menu-b'

const BASE_SHOP = process.env.BASE_SHOP_URL ?? 'https://kinmokuseijp.base.shop'
const BLOG_URL  = process.env.BLOG_URL       ?? 'https://kinmokuseijp.blog'

/**
 * Tab A — はじめての方（和紙×墨、5列均等）
 * liffUrl: LIFF ページの URL（例 https://liff.line.me/XXXX）
 */
export function buildMenuTabA(liffUrl?: string): RichMenuDef {
  const COL = 500
  return {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: '金杢犀 Tab A — はじめての方',
    chatBarText: '今日の言葉を、手で残す',
    areas: [
      // タブ「ご愛用の方」→ richmenuswitch to B
      { bounds: { x: 1250, y: 0, width: 1250, height: TAB_H }, action: { type: 'richmenuswitch', richMenuAliasId: ALIAS_B, data: 'switch_to_b' } },
      // Col 1: 金木犀の花言葉
      { bounds: { x: 0,      y: CONT_Y, width: COL, height: CONT_H }, action: liffUrl ? { type: 'uri', uri: `${liffUrl}?page=hanakotoba`, label: '花言葉' } : { type: 'message', text: '花言葉を教えて', label: '花言葉' } },
      // Col 2: ギフト
      { bounds: { x: COL,    y: CONT_Y, width: COL, height: CONT_H }, action: { type: 'uri', uri: BASE_SHOP, label: 'ギフト' } },
      // Col 3: 銘木を知る
      { bounds: { x: COL*2,  y: CONT_Y, width: COL, height: CONT_H }, action: { type: 'uri', uri: BLOG_URL, label: '銘木を知る' } },
      // Col 4: 銘木診断
      { bounds: { x: COL*3,  y: CONT_Y, width: COL, height: CONT_H }, action: liffUrl ? { type: 'uri', uri: liffUrl, label: '銘木診断' } : { type: 'message', text: '銘木診断', label: '銘木診断' } },
      // Col 5: 作品を見る
      { bounds: { x: COL*4,  y: CONT_Y, width: COL, height: CONT_H }, action: { type: 'uri', uri: BASE_SHOP, label: '作品を見る' } },
    ],
  }
}

/**
 * Tab B — ご愛用の方（漆黒×金、3列均等）
 */
export function buildMenuTabB(): RichMenuDef {
  const C1 = 833
  const C2 = 834
  return {
    size: { width: 2500, height: 1686 },
    selected: false,
    name: '金杢犀 Tab B — ご愛用の方',
    chatBarText: '今日の言葉を、手で残す',
    areas: [
      // タブ「はじめての方」→ richmenuswitch to A
      { bounds: { x: 0, y: 0, width: 1250, height: TAB_H }, action: { type: 'richmenuswitch', richMenuAliasId: ALIAS_A, data: 'switch_to_a' } },
      // Col 1: お手入れ
      { bounds: { x: 0,     y: CONT_Y, width: C1, height: CONT_H }, action: { type: 'message', text: 'お手入れ', label: 'お手入れ' } },
      // Col 2: 注文確認
      { bounds: { x: C1,    y: CONT_Y, width: C2, height: CONT_H }, action: { type: 'message', text: '注文確認', label: '注文確認' } },
      // Col 3: 新作
      { bounds: { x: C1+C2, y: CONT_Y, width: C1, height: CONT_H }, action: { type: 'uri', uri: BASE_SHOP, label: '新作' } },
    ],
  }
}

// ──────────────────────────────────────────────
// API 操作
// ──────────────────────────────────────────────

export async function createRichMenu(token: string, def: RichMenuDef): Promise<string> {
  const res = await fetch(`${BASE_URL}/richmenu`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(def),
  })
  if (!res.ok) throw new Error(`createRichMenu: ${res.status} ${await res.text()}`)
  const { richMenuId } = await res.json()
  return richMenuId
}

export async function uploadRichMenuImage(
  token: string,
  richMenuId: string,
  imageBuffer: Buffer | Uint8Array
): Promise<void> {
  const res = await fetch(`${DATA_URL}/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'image/png' },
    body: new Uint8Array(imageBuffer),
  })
  if (!res.ok) throw new Error(`uploadImage: ${res.status} ${await res.text()}`)
}

export async function setDefaultRichMenu(token: string, richMenuId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/user/all/richmenu/${richMenuId}`, {
    method: 'POST',
    headers: headers(token),
  })
  if (!res.ok) throw new Error(`setDefault: ${res.status} ${await res.text()}`)
}

export async function linkRichMenuToUser(
  token: string,
  userId: string,
  richMenuId: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/user/${userId}/richmenu/${richMenuId}`, {
    method: 'POST',
    headers: headers(token),
  })
  if (!res.ok) throw new Error(`linkToUser: ${res.status} ${await res.text()}`)
}

/** リッチメニューエイリアスを作成 */
export async function createRichMenuAlias(
  token: string,
  richMenuAliasId: string,
  richMenuId: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/richmenu/alias`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ richMenuAliasId, richMenuId }),
  })
  if (!res.ok) throw new Error(`createAlias(${richMenuAliasId}): ${res.status} ${await res.text()}`)
}

/** リッチメニューエイリアスを更新（ID先を変更） */
export async function updateRichMenuAlias(
  token: string,
  richMenuAliasId: string,
  richMenuId: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/richmenu/alias/${richMenuAliasId}`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ richMenuId }),
  })
  if (!res.ok) throw new Error(`updateAlias(${richMenuAliasId}): ${res.status} ${await res.text()}`)
}

/** リッチメニューエイリアスを削除（404は無視） */
export async function deleteRichMenuAlias(token: string, richMenuAliasId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/richmenu/alias/${richMenuAliasId}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`deleteAlias(${richMenuAliasId}): ${res.status} ${await res.text()}`)
  }
}

export async function listRichMenus(token: string) {
  const res = await fetch(`${BASE_URL}/richmenu/list`, { headers: headers(token) })
  if (!res.ok) throw new Error(`listRichMenus: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function deleteRichMenu(token: string, richMenuId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/richmenu/${richMenuId}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  if (!res.ok) throw new Error(`deleteRichMenu: ${res.status} ${await res.text()}`)
}
