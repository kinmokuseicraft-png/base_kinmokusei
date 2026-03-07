import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getBaseProducts } from "@/lib/base_api";
import { buildFlexMessageForReply } from "@/lib/line_flex_generator";

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";

/** LINE Webhook の署名を検証 */
function validateSignature(body: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET) return false;
  const hash = crypto
    .createHmac("sha256", LINE_CHANNEL_SECRET)
    .update(body)
    .digest("base64");
  return hash === signature;
}

/** POST: LINE プラットフォームからの Webhook */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-line-signature") ?? "";

    if (!validateSignature(rawBody, signature)) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as { events?: Array<{
      type: string;
      replyToken?: string;
      source?: { userId?: string; type: string };
      message?: { type: string; text?: string };
    }> };

    const events = body.events ?? [];
    if (events.length === 0) {
      return NextResponse.json({ ok: true });
    }

    for (const event of events) {
      if (event.type !== "message" || event.message?.type !== "text") continue;
      const text = event.message.text ?? "";
      const replyToken = event.replyToken;
      if (!replyToken) continue;

      // 「ペン」が含まれていれば BASE 商品をカルーセルで返信
      if (text.includes("ペン")) {
        const products = await getBaseProducts({ limit: 10 });
        const flexMessage = buildFlexMessageForReply(products);

        const res = await fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            replyToken,
            messages: [flexMessage],
          }),
        });

        if (!res.ok) {
          // TODO: 後で実装 - ログやリトライ
          console.warn("[webhook] LINE reply failed:", res.status, await res.text());
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhook] error:", e);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}

/** GET: Webhook URL 検証用（LINE Developers で設定時に叩かれることがある） */
export async function GET() {
  return NextResponse.json({ status: "ok", service: "kinmokusei-webhook" });
}
