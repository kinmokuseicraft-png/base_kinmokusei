/**
 * AI返信候補 送信 API
 * POST /api/users/[id]/send-suggestion
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase_client'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  const { data: user } = await supabase
    .from('line_users')
    .select('line_user_id, custom_fields')
    .eq('id', id)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const payload = await req.json().catch(() => null)
  const editedText = typeof payload?.text === 'string' ? payload.text.trim() : ''
  const text = editedText || String((user.custom_fields as Record<string, unknown>)?.consult_reply_suggestion ?? '').trim()

  if (!text) {
    return NextResponse.json({ error: '送信する文章がありません' }, { status: 400 })
  }

  // LINE Messaging API で送信
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!lineToken) {
    return NextResponse.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN が未設定です' }, { status: 500 })
  }

  const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${lineToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: user.line_user_id,
      messages: [{ type: 'text', text }],
    }),
  })

  if (!lineRes.ok) {
    const err = await lineRes.text()
    return NextResponse.json({ error: `LINE送信失敗: ${err}` }, { status: 500 })
  }

  // messagesテーブルに保存
  await supabase.from('messages').insert({
    line_user_id: user.line_user_id,
    direction: 'outbound',
    message_type: 'text',
    content: text,
  })

  return NextResponse.json({ ok: true })
}
