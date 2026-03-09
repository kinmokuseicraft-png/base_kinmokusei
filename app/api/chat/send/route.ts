/**
 * 金杢犀 — 個別プッシュ送信（LINE Push API + message_logs 保存）
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export async function POST(request: NextRequest) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
  if (!token) {
    return NextResponse.json({ error: "LINE_CHANNEL_ACCESS_TOKEN not set" }, { status: 500 });
  }

  let lineUserId: string | null = null;
  let text = "";
  try {
    const body = await request.json().catch(() => ({})) as { line_user_id?: string; text?: string };
    lineUserId = body.line_user_id ?? null;
    text = (body.text ?? "").trim();
  } catch {
    lineUserId = null;
  }
  if (!lineUserId || !text) {
    return NextResponse.json({ error: "line_user_id and text required" }, { status: 400 });
  }

  const res = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text }],
    }),
  });

  const resText = await res.text();
  if (!res.ok) {
    console.error("[chat/send] LINE push", res.status, resText);
    return NextResponse.json({ error: "LINE push failed", detail: resText }, { status: 502 });
  }

  try {
    await supabase.from("messages").insert({
      line_user_id: lineUserId,
      direction: "outbound",
      message_type: "text",
      content: text,
    });
  } catch (logErr) {
    console.warn("[chat/send] messages save failed", logErr);
  }

  return NextResponse.json({ ok: true });
}
