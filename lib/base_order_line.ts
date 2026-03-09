/**
 * BASE 注文 → LINE 自動メッセージ送信フロー（設計・枠組み）
 *
 * 【処理フロー】
 * 1. BASE で注文が発生 → Webhook で当サーバーに POST が飛ぶ
 * 2. Webhook 受信 API で注文 payload を検証し、base_orders に保存（base_order_id, payload, line_user_id は後で紐付け）
 * 3. 注文に含まれる商品 ID（item_id）ごとに base_products を参照し、
 *    line_display_image_url が設定されていればその URL をメッセージに添付
 * 4. 購入者を LINE ユーザーと紐付ける（注文者メール・電話などと line_users の紐付けは別途仕様）
 * 5. LINE Messaging API で購入者に「ご購入ありがとうございます」＋ 商品ごとの LINE 専用画像 を送信
 *
 * 本ファイルは上記フローの「商品 ID → line_display_image_url 取得」と
 * 「送信メッセージ組み立て」の枠組みのみ実装。Webhook 受信・LINE 送信は別 API で実装すること。
 */

import { supabase } from "@/lib/supabase_client";

export interface OrderItemLineImage {
  item_id: number;
  title?: string;
  line_display_image_url: string | null;
}

/**
 * 注文に含まれる商品 ID のリストから、LINE 表示用画像 URL を取得する。
 * BASE Webhook で受け取った order の item 一覧の item_id を渡す想定。
 */
export async function getLineDisplayImagesForItems(
  itemIds: number[]
): Promise<OrderItemLineImage[]> {
  if (itemIds.length === 0) return [];

  const { data: rows, error } = await supabase
    .from("base_products")
    .select("base_item_id, title, line_display_image_url")
    .in("base_item_id", itemIds);

  if (error) {
    console.error("[base_order_line] getLineDisplayImagesForItems", error);
    return [];
  }

  const byId = new Map(
    (rows ?? []).map((r: { base_item_id: number; title?: string; line_display_image_url: string | null }) => [
      r.base_item_id,
      { item_id: r.base_item_id, title: r.title ?? undefined, line_display_image_url: r.line_display_image_url },
    ])
  );

  return itemIds.map((id) => byId.get(id) ?? { item_id: id, line_display_image_url: null });
}

/**
 * 購入者への自動メッセージ本文を組み立てる（スタブ）。
 * 実際の LINE 送信は LINE Messaging API を呼ぶ API で行う。
 */
export function buildPurchaseMessageStub(
  orderId: string,
  items: OrderItemLineImage[]
): { text: string; imageUrls: string[] } {
  const text = `ご購入ありがとうございます。（注文ID: ${orderId}）`;
  const imageUrls = items
    .map((i) => i.line_display_image_url)
    .filter((u): u is string => typeof u === "string" && u.length > 0);
  return { text, imageUrls };
}
