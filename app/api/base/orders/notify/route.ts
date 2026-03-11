/**
 * POST /api/base/orders/notify
 * 指定注文の顧客に LINE 発送通知を送る。
 *
 * body: {
 *   unique_key: string        // BASE 注文ID
 *   line_user_id?: string     // 手動指定（省略時はメールで自動検索）
 *   tracking_number?: string  // 追跡番号（任意）
 *   message?: string          // カスタムメッセージ（省略時はデフォルト文）
 * }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getBaseAccessToken } from '@/lib/base_api'
import { supabase } from '@/lib/supabase_client'

export const dynamic = 'force-dynamic'

const BASE_API     = 'https://api.thebase.in'
const LINE_PUSH    = 'https://api.line.me/v2/bot/message/push'
const LINE_TOKEN   = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''

export async function POST(request: NextRequest) {
  if (!LINE_TOKEN) {
    return NextResponse.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not set' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const { unique_key, line_user_id: manualLineUserId, tracking_number, message: customMessage } = body

  if (!unique_key) {
    return NextResponse.json({ error: 'unique_key is required' }, { status: 400 })
  }

  // 1. BASE から注文詳細を取得
  const baseToken = await getBaseAccessToken()
  if (!baseToken) {
    return NextResponse.json({ error: 'BASE access token not set' }, { status: 401 })
  }

  const orderRes = await fetch(`${BASE_API}/1/orders/${unique_key}`, {
    headers: { Authorization: `Bearer ${baseToken}` },
    cache: 'no-store',
  })
  if (!orderRes.ok) {
    const t = await orderRes.text()
    return NextResponse.json({ error: `BASE API ${orderRes.status}: ${t}` }, { status: 400 })
  }
  const orderData = await orderRes.json()
  const order = orderData?.order ?? orderData

  // 2. LINE ユーザーを特定
  let lineUserId = manualLineUserId as string | null

  if (!lineUserId && order.customer_mail) {
    const { data: lineUser } = await supabase
      .from('line_users')
      .select('line_user_id')
      .eq('email', order.customer_mail)
      .maybeSingle()
    lineUserId = lineUser?.line_user_id ?? null
  }

  if (!lineUserId) {
    return NextResponse.json(
      { error: 'LINE ユーザーが見つかりません。メールアドレスの紐付けか手動指定が必要です。', matched: false },
      { status: 404 }
    )
  }

  // 3. メッセージ構築
  const productLines = (order.ordered_products ?? [])
    .map((p: { title: string; variation?: string | null; num: number }) =>
      `・${p.title}${p.variation ? `（${p.variation}）` : ''} × ${p.num}`
    )
    .join('\n')

  const trackingInfo = (tracking_number ?? order.delivery_tracking_number)
    ? `\n\n追跡番号：${tracking_number ?? order.delivery_tracking_number}`
    : ''

  const defaultMessage =
    `木軸ペン工房 金杢犀より、発送のお知らせです。\n\n` +
    `以下の商品を本日発送いたしました。\n\n` +
    `${productLines}` +
    `${trackingInfo}\n\n` +
    `到着まで今しばらくお待ちください。\n` +
    `引き続きどうぞよろしくお願いいたします。`

  const text = customMessage ?? defaultMessage

  // 4. LINE push 送信
  const pushRes = await fetch(LINE_PUSH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: 'text', text }],
    }),
  })

  if (!pushRes.ok) {
    const t = await pushRes.text()
    return NextResponse.json({ error: `LINE push failed: ${pushRes.status} ${t}` }, { status: 500 })
  }

  // 5. messages テーブルに記録
  await supabase.from('messages').insert({
    line_user_id: lineUserId,
    direction: 'outbound',
    message_type: 'text',
    content: { text },
    created_at: new Date().toISOString(),
  }).catch(() => {})

  return NextResponse.json({ ok: true, line_user_id: lineUserId, unique_key })
}
