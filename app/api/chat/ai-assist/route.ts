/**
 * AIアシスト — 直近チャット履歴から返信案を生成
 * POST /api/chat/ai-assist
 * body: { line_user_id: string, messages: { direction: "in"|"out", text: string }[] }
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      line_user_id?: string;
      messages?: { direction: "in" | "out"; text: string }[];
      user_name?: string;
    };

    const msgs = body.messages ?? [];
    if (msgs.length === 0) {
      return NextResponse.json({ suggestion: "" });
    }

    const history = msgs
      .slice(-10)
      .map((m) => `${m.direction === "in" ? "お客様" : "店主"}：${m.text}`)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: `あなたは木軸ペン工房「金杢犀」の店主として、LINEでお客様に返信する文章を考えます。
- 工房の雰囲気に合わせた、丁寧で温かみのある口調で書いてください
- 返信文のみを出力してください（説明や前置き不要）
- 簡潔に2〜3文以内でまとめてください
- 商品への興味・質問には積極的に対応してください`,
      messages: [
        {
          role: "user",
          content: `以下のチャット履歴を踏まえ、店主としての返信文を1つ考えてください。\n\n${history}`,
        },
      ],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    return NextResponse.json({ suggestion: text });
  } catch (e) {
    console.error("[ai-assist]", e);
    return NextResponse.json({ suggestion: "", error: String(e) }, { status: 500 });
  }
}
