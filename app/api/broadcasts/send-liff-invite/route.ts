/**
 * POST /api/broadcasts/send-liff-invite
 * 既存友達全員に「メール登録のお願い」ブロードキャストを送信する。
 * 送信後、broadcasts テーブルに記録する。
 */
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase_client'

export const dynamic = 'force-dynamic'

const LINE_BROADCAST_URL = 'https://api.line.me/v2/bot/message/broadcast'
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''
const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? ''

export async function POST() {
  if (!TOKEN) {
    return NextResponse.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not set' }, { status: 500 })
  }
  if (!LIFF_ID) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_LIFF_ID not set' }, { status: 500 })
  }

  const liffUrl = `https://liff.line.me/${LIFF_ID}`

  const messageText =
    `木軸ペン工房 金杢犀です。\n\n` +
    `このたび、ご注文の発送状況をLINEでお知らせするサービスを開始いたしました。\n\n` +
    `ご利用には、一度以下のリンクからアクセスいただくだけで設定が完了します。\n\n` +
    `${liffUrl}\n\n` +
    `ご不便をおかけしますが、よりスムーズなご連絡のためご協力をお願いいたします。`

  // LINE Broadcast 送信
  const res = await fetch(LINE_BROADCAST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      messages: [{ type: 'text', text: messageText }],
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    return NextResponse.json({ error: 'LINE broadcast failed', detail }, { status: 502 })
  }

  const now = new Date().toISOString()

  // broadcasts テーブルに記録（履歴管理）
  await supabase.from('broadcasts').insert({
    title: 'メール登録のお願い（LIFF誘導）',
    body: messageText,
    status: 'sent',
    sent_at: now,
    created_at: now,
    updated_at: now,
  })

  return NextResponse.json({ ok: true, sent_at: now })
}
