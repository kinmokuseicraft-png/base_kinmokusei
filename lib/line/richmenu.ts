/**
 * LINE Rich Menu API ユーティリティ
 *
 * 使い方:
 *   const id = await createRichMenu(KINMOKUSEI_MENU)
 *   await uploadRichMenuImage(id, pngBuffer)
 *   await setDefaultRichMenu(id)
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
  | { type: 'postback'; data: string; label?: string }

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
// 金杢犀 メニュー定義 (2500×1686, 3列×2行)
// ──────────────────────────────────────────────

/** 横幅3分割 */
const W1 = 833
const W2 = 834
/** 縦2分割 */
const H = 843

export const KINMOKUSEI_MENU: RichMenuDef = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: '金杢犀メインメニュー',
  chatBarText: 'メニューを開く',
  areas: [
    // ─── 上段 ───
    {
      bounds: { x: 0,        y: 0, width: W1, height: H },
      action: { type: 'message', text: '銘木診断', label: '銘木診断' },
    },
    {
      bounds: { x: W1,       y: 0, width: W2, height: H },
      action: { type: 'uri', uri: 'https://kinmokuseijp.base.shop', label: 'ショップ' },
    },
    {
      bounds: { x: W1 + W2,  y: 0, width: W1, height: H },
      action: { type: 'uri', uri: 'https://kinmokuseijp.blog', label: '銘木図鑑' },
    },
    // ─── 下段 ───
    {
      bounds: { x: 0,        y: H, width: W1, height: H },
      action: { type: 'message', text: '新作・入荷', label: '新作・入荷' },
    },
    {
      bounds: { x: W1,       y: H, width: W2, height: H },
      action: { type: 'message', text: '職人に相談', label: '職人に相談' },
    },
    {
      bounds: { x: W1 + W2,  y: H, width: W1, height: H },
      action: { type: 'message', text: '注文状況', label: '注文状況' },
    },
  ],
}

// ──────────────────────────────────────────────
// API 操作
// ──────────────────────────────────────────────

/** リッチメニューを作成して richMenuId を返す */
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

/** PNG バイナリをリッチメニューに紐付ける */
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

/** デフォルトリッチメニューに設定 */
export async function setDefaultRichMenu(token: string, richMenuId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/user/all/richmenu/${richMenuId}`, {
    method: 'POST',
    headers: headers(token),
  })
  if (!res.ok) throw new Error(`setDefault: ${res.status} ${await res.text()}`)
}

/** 特定ユーザーにリッチメニューを紐付ける */
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

/** 既存リッチメニュー一覧を取得 */
export async function listRichMenus(token: string) {
  const res = await fetch(`${BASE_URL}/richmenu/list`, { headers: headers(token) })
  if (!res.ok) throw new Error(`listRichMenus: ${res.status} ${await res.text()}`)
  return res.json()
}

/** リッチメニューを削除 */
export async function deleteRichMenu(token: string, richMenuId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/richmenu/${richMenuId}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  if (!res.ok) throw new Error(`deleteRichMenu: ${res.status} ${await res.text()}`)
}
