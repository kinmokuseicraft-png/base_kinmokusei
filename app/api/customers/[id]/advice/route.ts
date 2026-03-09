/**
 * AIコンシェルジュ — 顧客別接客アドバイス生成（チャット対応版）
 * POST body: { history?: {role:'user'|'assistant', content:string}[] }
 *   history が空 = 初回生成
 *   history に過去の交換が入っている = 追加指示による磨き直し
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

// ─── 型 ──────────────────────────────────────────────
type ChatMessage = { role: "user" | "assistant"; content: string };

// ─── 定数 ────────────────────────────────────────────
const EVENT_LABEL: Record<string, string> = {
  page_view: "ページ閲覧",
  scroll_depth: "スクロール深度到達",
  news_tap: "工房たよりタップ",
  product_click: "商品クリック",
  video_play: "動画再生",
  wood_tap: "銘木タップ",
};

const STORY_CATEGORIES = [
  "作品紹介（完成した木軸ペンの物語）",
  "銘木コラム（木材の個性・希少性）",
  "木材の履歴書（産地・歴史・科学的特性）",
  "経年変化（使い込むほど深まる美）",
  "工房の道具（職人のこだわり道具）",
  "職人の近況（日常・制作風景）",
  "職人の美学（ものづくりの哲学）",
  "銘木診断連動（パーソナル木材マッチング）",
  "お知らせ（展示会・新作発表）",
];

const SYSTEM_PROMPT = `あなたは「金杢犀（きんもくせい）」の職人・Tsubasaです。
工房で一本一本手作りする木軸ペンと、厳選した銘木を扱う小さなアトリエを営んでいます。
お客様との距離が近く、銘木の美しさと使い込む喜びを語る職人として、
温かみと品格のある言葉でお客様に寄り添います。

あなたの発信テーマ（9つのカテゴリーエンジン）:
${STORY_CATEGORIES.join("\n")}

【重要】Tsubasaからの追加指示がある場合は、その意図を最優先してください。
言い回しの変更・商品の差し替え・トーンの調整など、どんな修正も誠実に反映します。

出力は必ず以下のJSONフォーマットのみで返してください（前後に説明文・マークダウンは不要）:
{
  "customer_type": "顧客タイプの説明（50〜80文字）",
  "recommended_woods": [
    { "title": "商品名", "reason": "推薦理由（30〜50文字）" },
    { "title": "商品名", "reason": "推薦理由（30〜50文字）" }
  ],
  "story_direction": "次に届けるべき物語の方向性（カテゴリー名と具体的テーマ、60〜100文字）",
  "line_message": "LINEでそのまま送れるメッセージ草案（150〜250文字。親密で品位のある敬語。絵文字は使わない）"
}`;

// ─── POST ────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lineUserId = decodeURIComponent(params.id);
    const body = await req.json().catch(() => ({})) as { history?: ChatMessage[] };
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

    // ─ 初回のみ: 顧客データを取得してプロンプトを構築 ─
    // history が空 = 初回生成。有りの場合は既に組み込み済み
    const isFirstGeneration = history.length === 0;

    let firstUserPrompt = "";

    if (isFirstGeneration) {
      // 1. ユーザー情報
      const { data: user } = await supabase
        .from("line_users")
        .select("display_name, tags, created_at")
        .eq("line_user_id", lineUserId)
        .maybeSingle();

      // 2. 行動ログ（最新 50 件）
      const { data: logs } = await supabase
        .from("customer_logs")
        .select("event_type, event_data, created_at")
        .eq("line_user_id", lineUserId)
        .order("created_at", { ascending: false })
        .limit(50);

      // 3. 閲覧した商品
      const productIds = new Set<number>();
      for (const log of logs ?? []) {
        const d = log.event_data as Record<string, unknown>;
        const id = d?.item_id ?? d?.product_id;
        if (id) productIds.add(Number(id));
      }

      type ProductRow = {
        base_item_id: number;
        title: string | null;
        price: number | null;
      };

      let viewedProducts: ProductRow[] = [];
      if (productIds.size > 0) {
        const { data } = await supabase
          .from("base_products")
          .select("base_item_id, title, price")
          .in("base_item_id", [...productIds]);
        viewedProducts = (data ?? []) as ProductRow[];
      }

      // 4. 在庫商品一覧（最大 30 件）
      const { data: allProducts } = await supabase
        .from("base_products")
        .select("base_item_id, title, price")
        .gt("stock", 0)
        .order("base_item_id", { ascending: false })
        .limit(30);

      // ログ整形
      const logSummary = (logs ?? []).slice(0, 30).map((l) => {
        const d = l.event_data as Record<string, unknown>;
        const detail = (() => {
          if (l.event_type === "scroll_depth") return `${d.depth ?? ""}%到達`;
          if (l.event_type === "news_tap") return String(d.title ?? d.category ?? "");
          if (l.event_type === "product_click" || l.event_type === "wood_tap")
            return String(d.title ?? d.wood_name ?? d.item_id ?? "");
          return "";
        })();
        return `・${EVENT_LABEL[l.event_type] ?? l.event_type}${detail ? `（${detail}）` : ""}`;
      }).join("\n");

      const tagsText = Array.isArray(user?.tags) && user.tags.length
        ? user.tags.join("、") : "（タグなし）";

      firstUserPrompt = `【お客様情報】
名前: ${user?.display_name ?? "匿名"}
LINEタグ: ${tagsText}
LINE登録日: ${user?.created_at ? new Date(user.created_at).toLocaleDateString("ja-JP") : "不明"}

【行動ログ（最近の行動）】
${logSummary || "（ログなし）"}

【興味を示した商品】
${viewedProducts.length ? viewedProducts.map((p) => `・${p.title ?? "不明"} (¥${(p.price ?? 0).toLocaleString()})`).join("\n") : "（なし）"}

【在庫中の商品一覧（提案候補）】
${(allProducts ?? []).map((p) => `・${p.title ?? "不明"} (¥${(p.price ?? 0).toLocaleString()})`).join("\n")}

上記の情報をもとに、このお客様への最適な接客アドバイスをJSONで生成してください。
おすすめの銘木は、在庫中の商品一覧から選んでください。`;
    }

    // ─ Claude へ送るメッセージ列を構築 ─
    // 初回: [{ role: "user", content: firstUserPrompt }]
    // 追加指示: history（既に初回プロンプト + AI応答 + 追加指示が入っている）
    const messages: ChatMessage[] = isFirstGeneration
      ? [{ role: "user", content: firstUserPrompt }]
      : history;

    // ─ Claude API 呼び出し ─
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI response did not contain valid JSON");

    const advice = JSON.parse(jsonMatch[0]);

    // 初回の場合は firstUserPrompt を返す（クライアント側で history に追加させるため）
    return NextResponse.json(
      {
        ok: true,
        advice,
        assistantMessage: raw.trim(),
        ...(isFirstGeneration ? { initialUserPrompt: firstUserPrompt } : {}),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[api/customers/[id]/advice]", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
