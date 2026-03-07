/**
 * LINE Flex Message（カルーセル型）ジェネレーター
 * BASE 商品データから、トーク画面で表示するカルーセル用 JSON を生成する。
 */

import type { BaseProduct } from "./base_api";

/** LINE Flex Message のカルーセルコンテナ */
export interface LineFlexCarousel {
  type: "carousel";
  contents: LineFlexBubble[];
}

/** カルーセル内の1バブル */
export interface LineFlexBubble {
  type: "bubble";
  hero?: {
    type: "image";
    url: string;
    size: "full" | "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
    aspectRatio?: string;
    aspectMode?: "cover" | "fit";
  };
  body?: {
    type: "box";
    layout: "vertical";
    contents: unknown[];
  };
  footer?: {
    type: "box";
    layout: "vertical";
    contents: unknown[];
  };
}

/**
 * 商品配列から、LINE のカルーセル型 Flex Message 用 JSON を生成する。
 * 各バブル: 商品画像（hero）、タイトル・価格（body）、「詳細を見る」ボタン（footer、BASE商品URL）
 * @param products - BASE 商品の配列（最大10件推奨：カルーセルは最大10バブル）
 * @returns Flex Message の contents にそのまま渡せるオブジェクト
 */
export function buildProductCarousel(products: BaseProduct[]): LineFlexCarousel {
  const maxBubbles = 10;
  const bubbles: LineFlexBubble[] = products.slice(0, maxBubbles).map((p) => {
    const heroImageUrl =
      p.image_url && p.image_url.startsWith("http")
        ? p.image_url
        : "https://via.placeholder.com/300x300?text=No+Image";
    const detailUrl = p.item_url ?? `https://thebase.in/items/${p.item_id}`;

    return {
      type: "bubble",
      hero: {
        type: "image",
        url: heroImageUrl,
        size: "full",
        aspectRatio: "1:1",
        aspectMode: "cover",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: p.title,
            weight: "bold",
            wrap: true,
            size: "md",
            maxLines: 2,
          },
          {
            type: "text",
            text: `¥${p.price.toLocaleString()}`,
            size: "xl",
            weight: "bold",
            color: "#1DB446",
            margin: "md",
          },
          ...(p.stock !== undefined && p.stock <= 2
            ? [
                {
                  type: "text",
                  text: p.stock === 0 ? "在庫切れ" : `残り${p.stock}点`,
                  size: "xs",
                  color: p.stock === 0 ? "#FF0000" : "#FF8C00",
                  margin: "sm",
                },
              ]
            : []),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "詳細を見る",
              uri: detailUrl,
            },
            style: "primary",
            color: "#1DB446",
          },
        ],
      },
    };
  });

  return {
    type: "carousel",
    contents: bubbles,
  };
}

/**
 * Flex Message 全体のメッセージオブジェクトを組み立てる（reply 用）。
 * @param products - BASE 商品の配列
 * @returns LINE Messaging API の message に渡すオブジェクト
 */
export function buildFlexMessageForReply(products: BaseProduct[]): {
  type: "flex";
  altText: string;
  contents: LineFlexCarousel;
} {
  const carousel = buildProductCarousel(products);
  const altText =
    products.length > 0
      ? `商品のご案内（${products.length}件）`
      : "商品のご案内";
  return {
    type: "flex",
    altText,
    contents: carousel,
  };
}
