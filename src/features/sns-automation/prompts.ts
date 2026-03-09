/**
 * SNS発信ハブ — 三変化生成用プロンプト
 */

import type { GenerateTripleParams } from "./types";
import type { SnsCategory } from "./types";

function productContext(product: GenerateTripleParams["product"], includeUrl: boolean): string {
  if (!product) return "";
  const lines = [
    `商品名: ${product.title}`,
    `価格: ${product.price}円`,
    includeUrl && product.item_url ? `URL: ${product.item_url}` : null,
  ].filter(Boolean);
  return lines.length ? `\n【紹介する商品】\n${lines.join("\n")}` : "";
}

/** カテゴリーごとのトーン・フォーカス指示（全プラットフォーム共通の路線） */
function categoryGuidance(category: SnsCategory): string {
  const map: Record<SnsCategory, string> = {
    news: "【路線】告知・事実を簡潔に。新作・イベント・お知らせなど、事実ベースで信頼感のあるトーン。",
    meimoku_column: "【路線】銘木の深い専門知識。木種の特徴・産地・杢の見方など、読み物として引き込む解説調。",
    work_intro: "【路線】作品を「道具」として解説。書き味・重さ・握り・使いどころなど、実用の魅力にフォーカス。",
    craftsman_news: "【路線】工房の日常・風景。職人の一日、道具の手入れ、窓から見える景色など、等身大の近況。",
    meimoku_diagnosis: "【路線】銘木診断の32キャラクター設定を活用。その木の「性格」や物語を、親しみやすく。",
    atelier_tools: "【路線】CNC・レーザー彫刻機など工房の道具を紹介。技術と手仕事の両立、制作の裏側。",
    aging: "【路線】経年変化と「育てる楽しみ」。使い込むほど味わいが増す提案、手入れのヒント。",
    craftsman_aesthetic: "【路線】職人の暮らしや芸術への造詣。ものづくりと生活・文化の接点、美意識。",
    wood_history: "【路線】その木が届くまでの物語。山から工房へ、選定の理由や出会いの経緯。",
  };
  return map[category] ?? map.news;
}

export function buildSystemPrompt(category: SnsCategory): string {
  const guidance = categoryGuidance(category);
  return `あなたは木軸ペン工房「金杢犀」のSNS担当です。職人の想いと商品の魅力を、プラットフォームごとのトーンで表現してください。
${guidance}`;
}

export function buildTwitterPrompt(params: GenerateTripleParams): string {
  const productBlock = productContext(params.product, params.includeUrl.x);
  const urlInstruction = params.includeUrl.x && params.product?.item_url
    ? "必要に応じて商品URLを文末に含めてよい。"
    : "URLは含めず、この木材の魅力を言葉だけで140文字以内で表現して。";
  const categoryLine = categoryGuidance(params.category);
  return `【Twitter (X) 用】
140文字以内。木材の希少性や製作の「音」、1点物である緊張感を伝える。
${categoryLine}${productBlock}
${urlInstruction}
職人のメモ: ${params.memo || "（なし）"}`;
}

export function buildInstagramPrompt(params: GenerateTripleParams): string {
  const productBlock = productContext(params.product, params.includeUrl.instagram);
  const categoryLine = categoryGuidance(params.category);
  return `【Instagram 用】
情緒的な長文。写真の美しさを補完するストーリーテリング。文末に適切なハッシュタグを5〜8個付ける。
${categoryLine}${productBlock}
職人のメモ: ${params.memo || "（なし）"}`;
}

export function buildLineNewsPrompt(params: GenerateTripleParams): string {
  const productBlock = productContext(params.product, params.includeUrl.line);
  const categoryLine = categoryGuidance(params.category);
  return `【LINE ニュース（工房だより）用】
友だち向けの丁寧な「工房だより」。通知は鳴らさず、ニュース一覧に載せる形式。温かみのある文体。
${categoryLine}${productBlock}
職人のメモ: ${params.memo || "（なし）"}`;
}
