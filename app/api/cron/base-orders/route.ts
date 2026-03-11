/**
 * GET /api/cron/base-orders
 * Vercel Cron Job で定期実行（10分おき）。
 * BASE の注文一覧をポーリングして、新規注文お礼・発送通知を LINE に自動送信する。
 *
 * vercel.json で cron: "*/10 * * * *" を設定すること。
 * CRON_SECRET 環境変数で不正アクセスを防止。
 */
import { NextRequest, NextResponse } from 'next/server'
import { getBaseAccessToken } from '@/lib/base_api'
import { supabase } from '@/lib/supabase_client'

export const dynamic = 'force-dynamic'

const LINE_PUSH  = 'https://api.line.me/v2/bot/message/push'
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''
const BASE_API   = 'https://api.thebase.in'

/** LINE Push 送信 */
async function pushLine(lineUserId: string, text: string): Promise<void> {
  if (!LINE_TOKEN) return
  const res = await fetch(LINE_PUSH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({ to: lineUserId, messages: [{ type: 'text', text }] }),
  })
  if (!res.ok) console.error('[cron/base-orders] LINE push失敗', res.status, await res.text())
}

/** メールから LINE User ID を検索 */
async function findLineUser(email: string): Promise<string | null> {
  const { data } = await supabase
    .from('line_users')
    .select('line_user_id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()
  return data?.line_user_id ?? null
}

/**
 * 通知記録（重複防止）。
 * すでに記録があれば false（送信スキップ）、なければ true（送信する）。
 */
async function shouldSendAndRecord(
  uniqueKey: string,
  eventType: string,
  lineUserId: string | null,
  customerMail: string,
  sent: boolean,
): Promise<boolean> {
  const { error } = await supabase.from('base_order_notifications').insert({
    unique_key: uniqueKey,
    event_type: eventType,
    line_user_id: lineUserId,
    customer_mail: customerMail,
    sent,
  })
  if (error?.code === '23505') return false  // 重複 → スキップ
  return true
}

type OrderedProduct = { title: string; num: number; variation?: string | null }

function buildProductLines(products: OrderedProduct[]): string {
  return (products ?? [])
    .map((p) => `・${p.title}${p.variation ? `（${p.variation}）` : ''} × ${p.num}`)
    .join('\n')
}

interface BaseOrder {
  unique_key: string
  customer_mail: string
  dispatch_status: string   // 'ordered' | 'dispatched' | 'cancelled' | ...
  delivery_tracking_number?: string | null
  ordered_products?: OrderedProduct[]
}

export async function GET(request: NextRequest) {
  // Cron Secret 検証（Vercel が Authorization: Bearer <secret> を付けて呼ぶ）
  const cronSecret = process.env.CRON_SECRET ?? ''
  if (cronSecret) {
    const auth = request.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const baseToken = await getBaseAccessToken()
  if (!baseToken) {
    return NextResponse.json({ error: 'BASE token not set' }, { status: 500 })
  }

  // 直近30日の注文を取得（BASE APIは更新日時フィルタ非対応のため日付範囲で取得）
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const params = new URLSearchParams({
    start_ordered: startDate,
    limit: '100',
    offset: '0',
  })

  const res = await fetch(`${BASE_API}/1/orders?${params}`, {
    headers: { Authorization: `Bearer ${baseToken}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    const t = await res.text()
    console.error('[cron/base-orders] BASE API error', res.status, t)
    return NextResponse.json({ error: `BASE API ${res.status}` }, { status: 502 })
  }

  const data = await res.json() as { orders?: BaseOrder[] }
  const orders = data.orders ?? []
  console.log(`[cron/base-orders] ${orders.length}件取得`)

  let thankyouSent = 0
  let shippingSent = 0

  for (const order of orders) {
    const { unique_key, customer_mail, dispatch_status, delivery_tracking_number, ordered_products } = order
    if (!customer_mail) continue

    const lineUserId = await findLineUser(customer_mail)

    // ── 新規注文お礼（初回のみ）──
    const doThankyou = await shouldSendAndRecord(unique_key, 'order_add', lineUserId, customer_mail, !!lineUserId)
    if (doThankyou && lineUserId) {
      const productLines = buildProductLines(ordered_products ?? [])
      const text =
        `木軸ペン工房 金杢犀です。\n\n` +
        `このたびはご注文いただきありがとうございます。\n\n` +
        `${productLines}\n\n` +
        `丁寧に仕上げてお届けいたします。\n` +
        `発送時にはまたLINEでお知らせします。\n\n` +
        `どうぞよろしくお願いいたします。`
      await pushLine(lineUserId, text)
      await supabase.from('messages').insert({
        line_user_id: lineUserId,
        direction: 'outbound',
        message_type: 'text',
        content: { text },
        created_at: new Date().toISOString(),
      })
      thankyouSent++
    }

    // ── 発送通知（dispatch_status が dispatched のときのみ）──
    if (dispatch_status === 'dispatched') {
      const doShipping = await shouldSendAndRecord(unique_key, 'shipped', lineUserId, customer_mail, !!lineUserId)
      if (doShipping && lineUserId) {
        const productLines = buildProductLines(ordered_products ?? [])
        const trackingInfo = delivery_tracking_number
          ? `\n\n追跡番号：${delivery_tracking_number}`
          : ''
        const text =
          `木軸ペン工房 金杢犀より、発送のお知らせです。\n\n` +
          `以下の商品を本日発送いたしました。\n\n` +
          `${productLines}` +
          `${trackingInfo}\n\n` +
          `到着まで今しばらくお待ちください。\n` +
          `引き続きどうぞよろしくお願いいたします。`
        await pushLine(lineUserId, text)
        await supabase.from('messages').insert({
          line_user_id: lineUserId,
          direction: 'outbound',
          message_type: 'text',
          content: { text },
          created_at: new Date().toISOString(),
        })
        shippingSent++
      }
    }
  }

  console.log(`[cron/base-orders] 完了 thankyou=${thankyouSent} shipping=${shippingSent}`)
  return NextResponse.json({ ok: true, orders: orders.length, thankyouSent, shippingSent })
}
