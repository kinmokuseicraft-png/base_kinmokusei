/**
 * 金杢犀 — 一斉配信の送信実行（LINE Broadcast API）
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

const LINE_BROADCAST_URL = "https://api.line.me/v2/bot/message/broadcast";

export async function POST(request: NextRequest) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
  if (!token) {
    return NextResponse.json({ error: "LINE_CHANNEL_ACCESS_TOKEN not set" }, { status: 500 });
  }

  let id: string | null = null;
  try {
    const b = await request.json().catch(() => ({})) as { id?: string };
    id = b.id ?? null;
  } catch {
    id = null;
  }
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { data: row, error: fetchErr } = await supabase
    .from("broadcasts")
    .select("id, body, image_url, status")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "broadcast not found" }, { status: 404 });
  }
  if ((row.status as string) === "sent") {
    return NextResponse.json({ error: "already sent" }, { status: 400 });
  }

  const text = (row.body as string) ?? "";
  const imageUrl = (row.image_url as string | null) ?? null;

  // 画像あり → [imageMessage, textMessage]、なし → [textMessage]
  type LineMessage =
    | { type: "text"; text: string }
    | { type: "image"; originalContentUrl: string; previewImageUrl: string };

  const messages: LineMessage[] = [];
  if (imageUrl) {
    messages.push({
      type: "image",
      originalContentUrl: imageUrl,
      previewImageUrl: imageUrl,
    });
  }
  messages.push({ type: "text", text: text || "（本文なし）" });

  const res = await fetch(LINE_BROADCAST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  });

  const resText = await res.text();
  if (!res.ok) {
    console.error("[broadcasts/send] LINE API", res.status, resText);
    return NextResponse.json({ error: "LINE broadcast failed", detail: resText }, { status: 502 });
  }

  const now = new Date().toISOString();
  await supabase
    .from("broadcasts")
    .update({ status: "sent", sent_at: now, updated_at: now })
    .eq("id", id);

  return NextResponse.json({ ok: true, sent_at: now });
}
