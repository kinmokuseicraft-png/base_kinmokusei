/**
 * SNS発信ハブ — 型定義
 */

/** 投稿カテゴリー（トーン・フォーカス制御用） */
export type SnsCategory =
  | "news"
  | "meimoku_column"
  | "work_intro"
  | "craftsman_news"
  | "meimoku_diagnosis"
  | "atelier_tools"
  | "aging"
  | "craftsman_aesthetic"
  | "wood_history";

export const SNS_CATEGORIES: { value: SnsCategory; label: string; sub?: string }[] = [
  { value: "news", label: "ニュース", sub: "告知・事実" },
  { value: "meimoku_column", label: "銘木コラム", sub: "深い専門知識" },
  { value: "work_intro", label: "作品紹介", sub: "道具としての解説" },
  { value: "craftsman_news", label: "職人の近況", sub: "工房の日常・風景" },
  { value: "meimoku_diagnosis", label: "銘木診断連動", sub: "32キャラの設定活用" },
  { value: "atelier_tools", label: "工房の道具", sub: "CNC・レーザー機等の紹介" },
  { value: "aging", label: "経年変化", sub: "育てる楽しみの提案" },
  { value: "craftsman_aesthetic", label: "職人の美学", sub: "暮らしや芸術への造詣" },
  { value: "wood_history", label: "木材の履歴書", sub: "その木が届くまでの物語" },
];

export interface SnsProductOption {
  item_id: number;
  title: string;
  price: number;
  image_url: string | null;
  item_url?: string;
  line_display_image_url?: string | null;
}

export interface GenerateTripleParams {
  /** 今日の職人の想い（メモ） */
  memo: string;
  /** 投稿カテゴリー（トーン・フォーカス制御） */
  category: SnsCategory;
  /** 任意：紹介するペン（未選択でも生成可） */
  product?: SnsProductOption | null;
  /** 任意：アップロード画像URL（Vision用の土台） */
  imageUrl?: string | null;
  /** プラットフォーム別に商品URLを本文に含めるか */
  includeUrl: {
    x: boolean;
    instagram: boolean;
    line: boolean;
  };
}

export interface TripleCopy {
  twitter: string;
  instagram: string;
  lineNews: string;
}
