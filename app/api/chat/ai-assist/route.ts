/**
 * AIアシスト — チャット履歴 + BASE商品DBを参照して返信案を生成
 * POST /api/chat/ai-assist
 * body: { line_user_id: string, messages: { direction: "in"|"out", text: string }[] }
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** 直近の受信メッセージからキーワードを抽出して商品を検索 */
async function searchRelevantProducts(recentText: string): Promise<string> {
  try {
    const { data } = await supabase
      .from("base_products")
      .select("title, detail, price")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (!data || data.length === 0) return "";

    const lower = recentText.toLowerCase();
    const matched = (data as { title: string; detail: string | null; price: number }[]).filter((p) => {
      const t = (p.title ?? "").toLowerCase();
      const d = (p.detail ?? "").toLowerCase();
      // タイトルまたは説明文にキーワードが含まれるものを優先
      return (
        t.split(/[\s　・（）()【】]/).some((word) => word.length >= 2 && lower.includes(word)) ||
        lower.split(/[\s　]/).some((word) => word.length >= 2 && (t.includes(word) || d.includes(word)))
      );
    });

    const targets = matched.length > 0 ? matched.slice(0, 5) : (data as { title: string; detail: string | null; price: number }[]).slice(0, 5);

    return targets
      .map((p) => `・${p.title}（¥${p.price.toLocaleString()}）${p.detail ? "：" + p.detail.slice(0, 80) : ""}`)
      .join("\n");
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      line_user_id?: string;
      messages?: { direction: "in" | "out"; text: string }[];
    };

    const msgs = body.messages ?? [];
    if (msgs.length === 0) {
      return NextResponse.json({ suggestion: "" });
    }

    const history = msgs
      .slice(-10)
      .map((m) => `${m.direction === "in" ? "お客様" : "店主"}：${m.text}`)
      .join("\n");

    // 直近の受信メッセージを収集してDB検索
    const recentInbound = msgs
      .filter((m) => m.direction === "in")
      .slice(-3)
      .map((m) => m.text)
      .join(" ");

    const productContext = recentInbound ? await searchRelevantProducts(recentInbound) : "";

    const productSection = productContext
      ? `\n\n【参考：関連する取扱商品】\n${productContext}`
      : "";

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: `あなたは木軸ペン工房 金杢犀の店主として、LINEでお客様に返信する文章を考えます。
- 工房の雰囲気に合わせた、丁寧で温かみのある口調で書いてください
- 返信文のみを出力してください（説明や前置き不要、かぎ括弧も不要）
- 簡潔に2〜3文以内でまとめてください
- 商品への興味・質問には、提供された商品情報を参考に具体的に対応してください
- 商品情報がある場合は価格や特徴に触れても構いません`,
      messages: [
        {
          role: "user",
          content: `以下のチャット履歴を踏まえ、店主としての返信文を1つ考えてください。${productSection}\n\n【チャット履歴】\n${history}`,
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
