/**
 * 金杢犀 ライン管理 — LINE Webhook
 * 宛先（LINE Developers に登録するURL）: https://kinmokusei-line.vercel.app/api/webhook
 * このルートは Supabase（message_logs）と連携。ペン反応・BASE 商品取得を実行。
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getBaseProducts } from "@/lib/base_api";
import { buildFlexMessageForReply } from "@/lib/line_flex_generator";
import { saveMessageLog, upsertLineUser, addUserTag } from "@/lib/supabase_client";

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";

/** LINE Webhook の署名を検証。失敗時は false（呼び出し元で 401 を返すこと） */
function validateSignature(body: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET) {
    console.error("[webhook] 署名検証エラー: LINE_CHANNEL_SECRET が未設定です。401 を返却し、以降の処理は行いません。");
    return false;
  }
  const hash = crypto
    .createHmac("sha256", LINE_CHANNEL_SECRET)
    .update(body)
    .digest("base64");
  const ok = hash === signature;
  if (!ok) {
    console.error("[webhook] 署名検証エラー: 署名が一致しません。401 を返却し、replyMessage は実行しません。", {
      hashLength: hash.length,
      sigLength: signature.length,
    });
  } else {
    console.log("[webhook] 署名検証: 成功");
  }
  return ok;
}

/**
 * 「ペン」トリガー判定: 正規表現で「ペン」「pen」「ぺん」のいずれか完全一致（前後空白除く）
 */
const PEN_TRIGGER_REGEX = /^(ペン|pen|ぺん)$/i;
function isPenTrigger(text: string): boolean {
  const normalized = text.trim();
  return PEN_TRIGGER_REGEX.test(normalized);
}

/** キーワード → ユーザーに付与するタグ（LINE のメッセージと完全一致で付与） */
const KEYWORD_TAGS: Record<string, string> = {
  エボニー: "エボニー",
  金桑: "金桑",
  キングウッド: "キングウッド",
  ウォールナット: "ウォールナット",
  屋久杉: "屋久杉",
};

function getTagForKeyword(text: string): string | null {
  const normalized = text.trim();
  return KEYWORD_TAGS[normalized] ?? null;
}

/** LINE にテキストメッセージを返信（確実に 1 回だけ実行） */
async function replyWithText(replyToken: string, text: string): Promise<boolean> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error("[webhook] LINE_CHANNEL_ACCESS_TOKEN が未設定のため返信できません");
    return false;
  }
  console.log("[webhook] LINE 返信 API を呼び出します（outgoing request）", { replyToken: replyToken.slice(0, 8) + "..." });
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
  const resText = await res.text();
  if (!res.ok) {
    console.error("[webhook] LINE 返信 API エラー", { status: res.status, body: resText });
    return false;
  }
  console.log("[webhook] LINE 返信成功（テキスト）");
  return true;
}

/** LINE に Flex カルーセルを返信（確実に 1 回だけ実行） */
async function replyWithFlex(replyToken: string, flexMessage: { type: "flex"; altText: string; contents: unknown }): Promise<boolean> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error("[webhook] LINE_CHANNEL_ACCESS_TOKEN が未設定のため返信できません");
    return false;
  }
  console.log("[webhook] LINE 返信 API を呼び出します（outgoing request・Flex）", { replyToken: replyToken.slice(0, 8) + "..." });
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
  const resText = await res.text();
  if (!res.ok) {
    console.error("[webhook] LINE 返信 API エラー（Flex）", { status: res.status, body: resText });
    return false;
  }
  console.log("[webhook] LINE 返信成功（Flex カルーセル）");
  return true;
}

type WebhookEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type: string };
  message?: { type: string; text?: string };
};

/** POST: LINE プラットフォームからの Webhook */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";

  console.log("[webhook] POST 受信", { bodyLength: rawBody.length, hasSignature: !!signature });

  if (!validateSignature(rawBody, signature)) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody) as { events?: WebhookEvent[] };
    const events = body.events ?? [];

    if (events.length === 0) {
      console.log("[webhook] イベント 0 件のため 200 で終了");
      return NextResponse.json({ ok: true });
    }

    for (const event of events) {
      const userId = event.source?.userId ?? "";
      const replyToken = event.replyToken;

      console.log("[webhook] イベント", { type: event.type, userId: userId ? `${userId.slice(0, 8)}...` : "", hasReplyToken: !!replyToken });

      if (event.type !== "message" || event.message?.type !== "text") continue;

      const text = event.message.text ?? "";
      console.log("[webhook] テキスト受信", { textPreview: text.slice(0, 50), isPenTrigger: isPenTrigger(text) });

      try {
        await upsertLineUser({ lineUserId: userId });
      } catch (upsertErr) {
        console.warn("[webhook] users upsert 失敗:", upsertErr);
      }

      const tag = getTagForKeyword(text);
      if (tag) {
        try {
          const { error: tagErr } = await addUserTag(userId, tag);
          if (tagErr) console.warn("[webhook] タグ付与失敗:", tagErr);
          else console.log("[webhook] タグ付与", { tag, userId: userId.slice(0, 8) + "..." });
        } catch (_) {}
      }

      try {
        await saveMessageLog({
          lineUserId: userId,
          direction: "in",
          messageType: "text",
          payload: { text },
        });
      } catch (logErr) {
        console.warn("[webhook] message_logs 保存失敗（受信）:", logErr);
      }

      if (!replyToken) {
        console.log("[webhook] replyToken なしのためこのイベントはスキップ");
        continue;
      }

      if (!isPenTrigger(text)) continue;

      console.log("[webhook] ペントリガー一致 → BASE 商品取得またはエラー返信を実行");

      try {
        const products = await getBaseProducts({ limit: 10, forLine: true });
        console.log("[webhook] BASE 商品取得件数:", products.length);

        const flexMessage = buildFlexMessageForReply(products);
        const sent = await replyWithFlex(replyToken, flexMessage);
        if (!sent) continue;

        try {
          await saveMessageLog({
            lineUserId: userId,
            direction: "out",
            messageType: "flex",
            payload: { altText: flexMessage.altText, productCount: products.length },
          });
        } catch (outLogErr) {
          console.warn("[webhook] message_logs 保存失敗（送信）:", outLogErr);
        }
      } catch (baseErr) {
        const msg = baseErr instanceof Error ? baseErr.message : String(baseErr);
        console.error("[webhook] BASE連携エラー（LINEにエラーメッセージを返信）:", msg);
        await replyWithText(
          replyToken,
          "申し訳ありません。いま商品情報の取得に失敗しました。BASE連携エラーです。しばらくしてから再度お試しください。"
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhook] 処理中に例外", e);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}

/** GET: Webhook URL 検証用 */
export async function GET() {
  return NextResponse.json({ status: "ok", service: "kinmokusei-webhook" });
}
