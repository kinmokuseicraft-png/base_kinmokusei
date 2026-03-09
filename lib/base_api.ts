/**
 * BASE API 連携クライアント（v1 想定）
 * トークンは .env の BASE_ACCESS_TOKEN または Supabase base_settings の access_token を使用。
 */

import { supabase } from "@/lib/supabase_client";

const BASE_API_BASE = "https://api.thebase.in";

/**
 * BASE API 用アクセストークンを取得する。
 * 優先: BASE_ACCESS_TOKEN（.env）→ base_settings（Supabase id=1）の access_token。
 */
export async function getBaseAccessToken(): Promise<string | null> {
  const envToken = process.env.BASE_ACCESS_TOKEN?.trim();
  if (envToken) return envToken;

  const { data } = await supabase
    .from("base_settings")
    .select("access_token")
    .eq("id", 1)
    .maybeSingle();

  const token = (data as { access_token?: string } | null)?.access_token?.trim();
  return token ?? null;
}

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

const PAGE_SIZE = 100; // BASE API の最大 limit

/**
 * BASE API で全件をページネーション取得（GET /1/items：検索キーワード不要、order=list_order）。
 * 進捗をターミナルにログする。
 */
export async function fetchAllBaseProductsFromApi(options?: {
  shopItemBaseUrl?: string;
  forLine?: boolean;
}): Promise<BaseProduct[]> {
  const token = await getBaseAccessToken();
  const shopItemBaseUrl = options?.shopItemBaseUrl ?? process.env.BASE_SHOP_ITEM_BASE_URL;
  const forLine = options?.forLine === true;

  if (!token) {
    if (forLine) throw new Error("BASE access token is not set");
    return [];
  }

  const all: BaseProduct[] = [];
  let offset = 0;

  // GET /1/items は検索キーワード不要で全商品を list_order 順に取得できる
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const params = new URLSearchParams({
      order: "list_order",
      sort: "asc",
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    const url = `${BASE_API_BASE}/1/items?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[base_api] BASE API error:", res.status, text);
      break;
    }

    const data = (await res.json()) as BaseApiItemsResponse;
    const items = Array.isArray(data?.items) ? data.items : [];
    const normalized = items.map((raw) => normalizeItem(raw, shopItemBaseUrl));
    all.push(...normalized);
    console.log(`[base_api] ${all.length}件取得済み...`);

    if (items.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    if (offset >= 10000) break; // API の offset 上限
  }

  return all;
}

/**
 * BASE から取得した商品一覧を base_products に同期する。
 * 既存の line_display_image_url は上書きしない。
 */
export async function syncBaseProductsToSupabase(products: BaseProduct[]): Promise<void> {
  if (products.length === 0) return;
  const ids = products.map((p) => p.item_id);
  const { data: existing } = await supabase
    .from("base_products")
    .select("base_item_id, line_display_image_url")
    .in("base_item_id", ids);
  const urlByItemId = new Map<number, string | null>();
  (existing ?? []).forEach((r: { base_item_id: number; line_display_image_url: string | null }) => {
    urlByItemId.set(r.base_item_id, r.line_display_image_url ?? null);
  });

  const now = new Date().toISOString();
  const rows = products.map((p) => ({
    base_item_id: p.item_id,
    title: p.title,
    image_url: p.image_url,
    item_url: p.item_url ?? null,
    price: p.price,
    stock: p.stock,
    list_order: p.list_order,
    line_display_image_url: urlByItemId.get(p.item_id) ?? null,
    updated_at: now,
  }));

  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await supabase.from("base_products").upsert(chunk, { onConflict: "base_item_id" });
  }
}

/**
 * base_products キャッシュから商品一覧を取得（list_order 順）。
 */
export async function getBaseProductsFromCache(shopItemBaseUrl?: string): Promise<BaseProduct[]> {
  const { data: rows } = await supabase
    .from("base_products")
    .select("base_item_id, title, image_url, item_url, price, stock, list_order, line_display_image_url")
    .order("list_order", { ascending: true })
    .order("base_item_id", { ascending: true });

  const baseUrl = shopItemBaseUrl ?? process.env.BASE_SHOP_ITEM_BASE_URL;
  return (rows ?? []).map((r: Record<string, unknown>) => ({
    item_id: r.base_item_id as number,
    title: (r.title as string) ?? "",
    detail: "",
    price: (r.price as number) ?? 0,
    proper_price: null,
    stock: (r.stock as number) ?? 0,
    visible: 1,
    list_order: (r.list_order as number) ?? 0,
    identifier: null,
    modified: 0,
    item_url: (r.item_url as string) ?? undefined,
    image_url: (r.image_url as string) ?? null,
    line_display_image_url: (r.line_display_image_url as string) ?? null,
  })) as BaseProduct[];
}

/**
 * BASE API で商品一覧を取得する（サーバーサイド用）。
 * デフォルトは Supabase キャッシュ優先。forceRefresh で BASE から全件再取得・同期。
 * @param options.forceRefresh - true で BASE から全件取得し base_products を更新してから返す
 * @param options.useCache - false にすると常に API 取得（キャッシュを使わない）
 * @param options.limit - 指定時は先頭 N 件のみ返す（LINE 返信などで利用）
 * @param options.forLine - true のときは LINE 返信用。トークン未設定ならエラーをスロー。
 */
export async function getBaseProducts(options?: {
  shopItemBaseUrl?: string;
  forLine?: boolean;
  forceRefresh?: boolean;
  useCache?: boolean;
  limit?: number;
}): Promise<BaseProduct[]> {
  const token = await getBaseAccessToken();
  const shopItemBaseUrl = options?.shopItemBaseUrl ?? process.env.BASE_SHOP_ITEM_BASE_URL;
  const forLine = options?.forLine === true;
  const forceRefresh = options?.forceRefresh === true;
  const useCache = options?.useCache !== false;
  const limit = options?.limit;

  if (!token) {
    if (forLine) {
      console.error("[base_api] BASE アクセストークンが未設定です（.env または base_settings）。LINE返信ではエラーにします。");
      throw new Error("BASE access token is not set");
    }
    if (useCache) {
      const cached = await getBaseProductsFromCache(shopItemBaseUrl);
      if (cached.length > 0) return limit != null ? cached.slice(0, limit) : cached;
    }
    console.warn("[base_api] BASE アクセストークン未設定のため商品一覧は空で返します。");
    return [];
  }

  try {
    if (useCache && !forceRefresh) {
      const cached = await getBaseProductsFromCache(shopItemBaseUrl);
      if (cached.length > 0) return limit != null ? cached.slice(0, limit) : cached;
    }

    console.log("[base_api] BASE API から全件取得を開始します...");
    const products = await fetchAllBaseProductsFromApi({ shopItemBaseUrl, forLine });
    if (products.length === 0) {
      const cached = await getBaseProductsFromCache(shopItemBaseUrl);
      return limit != null ? cached.slice(0, limit) : cached;
    }
    console.log(`[base_api] 全${products.length}件取得完了。base_products に同期します...`);
    await syncBaseProductsToSupabase(products);
    return limit != null ? products.slice(0, limit) : products;
  } catch (e) {
    console.warn("[base_api] fetch failed:", e);
    const cached = await getBaseProductsFromCache(shopItemBaseUrl);
    return limit != null ? cached.slice(0, limit) : cached;
  }
}

