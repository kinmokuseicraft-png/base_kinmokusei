/**
 * POST /api/base/webhook
 * BASE からの Webhook を受信し、注文お礼・発送通知を LINE に自動送信する。
 *
 * BASE Developer Console で以下を設定:
 *   Webhook URL: https://kinmokusei-line.vercel.app/api/base/webhook
 *   購読イベント: order_add, order_status_update
 *
 * Vercel 環境変数:
 *   BASE_WEBHOOK_SECRET — BASEアプリのAPI Secret（署名検証用）
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase_client'

export const dynamic = 'force-dynamic'

const LINE_PUSH   = 'https://api.line.me/v2/bot/message/push'
const LINE_TOKEN  = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''
const WEBHOOK_SECRET = process.env.BASE_WEBHOOK_SECRET ?? ''

/** BASE Webhook の署名を検証（HMAC-SHA256 / hex） */
function verifySignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('[base/webhook] BASE_WEBHOOK_SECRET 未設定 → 署名検証をスキップ')
    return true
  }
  const hash = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')
  return hash === signature
}

/** LINE Push メッセージ送信 */
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
  if (!res.ok) console.error('[base/webhook] LINE push失敗', res.status, await res.text())
}

/** メールアドレスから LINE User ID を検索 */
async function findLineUser(customerMail: string): Promise<string | null> {
  const { data } = await supabase
    .from('line_users')
    .select('line_user_id')
    .eq('email', customerMail.toLowerCase().trim())
    .maybeSingle()
  return data?.line_user_id ?? null
}

/** 通知記録（重複防止）。重複の場合は false を返す */
async function recordNotification(
  uniqueKey: string,
  eventType: string,
  lineUserId: string | null,
  customerMail: string,
  payload: unknown,
  sent: boolean,
): Promise<boolean> {
  const { error } = await supabase.from('base_order_notifications').insert({
    unique_key: uniqueKey,
    event_type: eventType,
    line_user_id: lineUserId,
    customer_mail: customerMail,
    sent,
    payload,
  })
  if (error?.code === '23505') return false  // uniqueインデックス違反 = 重複
  return true
}

type OrderedProduct = { title: string; num: number; variation?: string | null }

function buildProductLines(products: OrderedProduct[]): string {
  return products
    .map((p) => `・${p.title}${p.variation ? `（${p.variation}）` : ''} × ${p.num}`)
    .join('\n')
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // BASE は X-Base-Hmac-Sha256 ヘッダーで署名を送る
  const signature = request.headers.get('x-base-hmac-sha256') ?? ''
  console.log('[base/webhook] 受信', { bodyLength: rawBody.length, hasSig: !!signature })

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = payload.event as string
  // BASE は "ordered" キーの下に注文データを入れる場合がある
  const order = (payload.ordered ?? payload) as Record<string, unknown>
  const uniqueKey = (order.unique_key ?? payload.unique_key) as string | undefined
  const customerMail = (order.customer_mail as string | undefined) ?? ''

  console.log('[base/webhook] イベント', { event, uniqueKey, hasCustomerMail: !!customerMail })

  if (!uniqueKey) {
    return NextResponse.json({ error: 'missing unique_key' }, { status: 400 })
  }

  const lineUserId = customerMail ? await findLineUser(customerMail) : null
  const products = (order.ordered_products as OrderedProduct[] | undefined) ?? []

  // ───────────────────────────────────────────
  // 注文完了お礼メッセージ
  // ───────────────────────────────────────────
  if (event === 'order_add') {
    const ok = await recordNotification(uniqueKey, 'order_add', lineUserId, customerMail, payload, !!lineUserId)
    if (!ok) {
      console.log('[base/webhook] order_add 重複スキップ', uniqueKey)
      return NextResponse.json({ ok: true, skipped: true })
    }

    if (lineUserId) {
      const productLines = buildProductLines(products)
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
      console.log('[base/webhook] 注文お礼 送信完了', { uniqueKey })
    } else {
      console.log('[base/webhook] order_add: LINE未紐付け（メール未登録）', { customerMail })
    }
    return NextResponse.json({ ok: true })
  }

  // ───────────────────────────────────────────
  // 発送通知（base_is_send = 1 になったとき）
  // ───────────────────────────────────────────
  if (event === 'order_status_update') {
    const baseIsSend = order.base_is_send as number | undefined
    if (baseIsSend !== 1) {
      // 発送済み以外のステータス変更は無視
      return NextResponse.json({ ok: true, skipped: true })
    }

    const ok = await recordNotification(uniqueKey, 'shipped', lineUserId, customerMail, payload, !!lineUserId)
    if (!ok) {
      console.log('[base/webhook] shipped 重複スキップ', uniqueKey)
      return NextResponse.json({ ok: true, skipped: true })
    }

    if (lineUserId) {
      const trackingNumber = (order.delivery_tracking_number as string | undefined)?.trim() || null
      const carrier = (order.delivery_service as string | undefined)?.trim()
        || (order.delivery_company as string | undefined)?.trim()
        || (order.delivery_method as string | undefined)?.trim()
        || null
      const productLines = buildProductLines(products)
      const carrierLine = carrier ? `\n配送業者：${carrier}` : ''
      const trackingLine = trackingNumber ? `\n追跡番号：${trackingNumber}` : ''
      const deliveryInfo = (carrierLine || trackingLine) ? `\n${carrierLine}${trackingLine}` : ''
      const text =
        `木軸ペン工房 金杢犀より、発送のお知らせです。\n\n` +
        `以下の商品を本日発送いたしました。\n\n` +
        `${productLines}` +
        `${deliveryInfo}\n\n` +
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
      console.log('[base/webhook] 発送通知 送信完了', { uniqueKey, trackingNumber })
    } else {
      console.log('[base/webhook] shipped: LINE未紐付け', { customerMail })
    }
    return NextResponse.json({ ok: true })
  }

  // その他のイベントは無視
  console.log('[base/webhook] 未対応イベント', event)
  return NextResponse.json({ ok: true, skipped: true })
}
