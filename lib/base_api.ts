/**
 * BASE API 連携クライアント（v1 想定）
 * 環境変数 BASE_ACCESS_TOKEN で認証。未設定時はモックデータを返す。
 */

const BASE_API_BASE = "https://api.thebase.in";

/** BASE API の商品画像（サイズ別URL） */
export interface BaseItemImageSet {
  origin: string | null;
  /** 76px幅 */
  img_76?: string | null;
  /** 146px幅 */
  img_146?: string | null;
  /** 300px幅 */
  img_300?: string | null;
  /** 500px幅 */
  img_500?: string | null;
  /** 640px幅 */
  img_640?: string | null;
}

/** バリエーション（色・サイズ等） */
export interface BaseVariation {
  variation_id: number;
  variation: string;
  variation_stock: number;
  variation_identifier: string | null;
  barcode: string | null;
}

/** 管理・LINE配信用に正規化した商品型 */
export interface BaseProduct {
  item_id: number;
  title: string;
  detail: string;
  price: number;
  proper_price: number | null;
  stock: number;
  visible: number;
  list_order: number;
  identifier: string | null;
  modified: number;
  /** 商品ページURL（BASEショップURL + item_id 想定） */
  item_url?: string;
  /** メイン画像URL（表示用：img1_300 または img1_500 優先） */
  image_url: string | null;
  /** 画像セット（API生レスポンス用） */
  img1_origin?: string | null;
  img1_300?: string | null;
  img1_500?: string | null;
  img1_640?: string | null;
  variations?: BaseVariation[];
}

/** BASE API items/search レスポンスの1件（API生形式） */
export interface BaseApiItemRaw {
  item_id: number;
  title: string;
  detail: string;
  price: number;
  proper_price: number | null;
  item_tax_type?: number;
  stock: number;
  visible: number;
  list_order: number;
  identifier: string | null;
  modified: number;
  img1_origin?: string | null;
  img1_76?: string | null;
  img1_146?: string | null;
  img1_300?: string | null;
  img1_500?: string | null;
  img1_640?: string | null;
  img2_origin?: string | null;
  [key: string]: unknown;
  variations?: BaseVariation[];
}

/** API レスポンス */
export interface BaseApiItemsResponse {
  items: BaseApiItemRaw[];
}

function normalizeItem(raw: BaseApiItemRaw, shopItemBaseUrl?: string): BaseProduct {
  const imageUrl =
    raw.img1_500 ?? raw.img1_300 ?? raw.img1_640 ?? raw.img1_origin ?? null;
  const itemUrl = shopItemBaseUrl
    ? `${shopItemBaseUrl.replace(/\/$/, "")}/items/${raw.item_id}`
    : undefined;
  return {
    item_id: raw.item_id,
    title: raw.title,
    detail: raw.detail,
    price: raw.price,
    proper_price: raw.proper_price ?? null,
    stock: raw.stock,
    visible: raw.visible,
    list_order: raw.list_order,
    identifier: raw.identifier ?? null,
    modified: raw.modified,
    item_url: itemUrl,
    image_url: imageUrl,
    img1_origin: raw.img1_origin ?? null,
    img1_300: raw.img1_300 ?? null,
    img1_500: raw.img1_500 ?? null,
    img1_640: raw.img1_640 ?? null,
    variations: raw.variations,
  };
}

/**
 * BASE API で商品一覧を取得する（サーバーサイド用）。
 * @param options.forLine - true のときは LINE 返信用。トークン未設定ならエラーをスロー（モックは返さない）。
 * @param options.limit - 取得件数（デフォルト 50）
 * @param options.shopItemBaseUrl - 商品ページのベースURL
 */
export async function getBaseProducts(options?: {
  limit?: number;
  shopItemBaseUrl?: string;
  forLine?: boolean;
}): Promise<BaseProduct[]> {
  const token = process.env.BASE_ACCESS_TOKEN;
  const limit = options?.limit ?? 50;
  const shopItemBaseUrl = options?.shopItemBaseUrl ?? process.env.BASE_SHOP_ITEM_BASE_URL;
  const forLine = options?.forLine === true;

  if (!token) {
    if (forLine) {
      console.error("[base_api] BASE_ACCESS_TOKEN が未設定です。LINE返信ではモックを使わずエラーにします。");
      throw new Error("BASE_ACCESS_TOKEN is not set");
    }
    return getMockBaseProducts(limit, shopItemBaseUrl);
  }

  try {
    const q = "ペン"; // 木軸ペンなど
    const url = `${BASE_API_BASE}/1/items/search?q=${encodeURIComponent(q)}&limit=${Math.min(limit, 100)}&offset=0`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[base_api] BASE API error:", res.status, text);
      return getMockBaseProducts(limit, shopItemBaseUrl);
    }

    const data = (await res.json()) as BaseApiItemsResponse;
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map((raw) => normalizeItem(raw, shopItemBaseUrl));
  } catch (e) {
    console.warn("[base_api] fetch failed, using mock:", e);
    return getMockBaseProducts(limit, shopItemBaseUrl);
  }
}

/** モック用ダミー商品データ（API仕様不明・トークン未設定時用） */
function getMockBaseProducts(limit: number, shopItemBaseUrl?: string): BaseProduct[] {
  const baseUrl = shopItemBaseUrl ?? "https://kinmokusei.thebase.in";
  const mockItems: BaseProduct[] = [
    {
      item_id: 1001,
      title: "受注生産・木軸ボールペン（エボニー）",
      detail: "漆黒の王者。エボニーを使用した木軸ボールペンです。",
      price: 15800,
      proper_price: 17800,
      stock: 0,
      visible: 1,
      list_order: 1,
      identifier: null,
      modified: Math.floor(Date.now() / 1000),
      item_url: `${baseUrl}/items/1001`,
      image_url: "https://baseec-img-mng.akamaized.net/images/item/origin/45fc036c772c8469fa40396b2ef0fb9b.jpg?imformat=generic&q=90&im=Resize,width=500,type=normal",
    },
    {
      item_id: 1002,
      title: "受注生産・木軸シャープペン（金桑）",
      detail: "御蔵島産金桑の木軸シャープペン。",
      price: 13200,
      proper_price: null,
      stock: 2,
      visible: 1,
      list_order: 2,
      identifier: null,
      modified: Math.floor(Date.now() / 1000),
      item_url: `${baseUrl}/items/1002`,
      image_url: "https://baseec-img-mng.akamaized.net/images/item/origin/2a4de4965fa23b7b89944199713a827e.jpg?imformat=generic&q=90&im=Resize,width=500,type=normal",
    },
    {
      item_id: 1003,
      title: "木軸万年筆（キングウッド）",
      detail: "キングウッドを使用した木軸万年筆。",
      price: 19800,
      proper_price: null,
      stock: 1,
      visible: 1,
      list_order: 3,
      identifier: null,
      modified: Math.floor(Date.now() / 1000),
      item_url: `${baseUrl}/items/1003`,
      image_url: "https://baseec-img-mng.akamaized.net/images/item/origin/45fc036c772c8469fa40396b2ef0fb9b.jpg?imformat=generic&q=90&im=Resize,width=500,type=normal",
    },
  ];
  return mockItems.slice(0, Math.min(limit, mockItems.length));
}
