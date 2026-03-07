/**
 * Supabase クライアント（CRM 用）
 * 環境変数: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY（または SUPABASE_SERVICE_ROLE_KEY）
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "dummy-key";

/** サーバー・API 用クライアント（サービスロール推奨） */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// --- 型定義（DB スキーマ想定） ---

/** LINE 顧客（Users テーブル想定） */
export interface DbUser {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  status: "active" | "blocked" | "unknown";
  created_at: string;
  updated_at: string;
  // TODO: 後で実装 - その他カラム（メモ、タグなど）
  [key: string]: unknown;
}

/** メッセージ送受信ログ（Logs テーブル想定） */
export interface DbMessageLog {
  id: string;
  line_user_id: string;
  direction: "in" | "out";
  message_type: string;
  payload: unknown;
  created_at: string;
  // TODO: 後で実装 - 紐づく会話IDなど
  [key: string]: unknown;
}

/** Users テーブル用 Insert/Update 型 */
export type DbUserInsert = Omit<DbUser, "id" | "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

/** Logs テーブル用 Insert 型 */
export type DbMessageLogInsert = Omit<DbMessageLog, "id" | "created_at"> & {
  created_at?: string;
};

// --- CRM 関数枠組み ---

/**
 * LINE の userId を受け取り、顧客として登録または更新する。
 * 既存なら updated_at と display_name / picture_url を更新、なければ新規挿入。
 */
export async function upsertLineUser(params: {
  lineUserId: string;
  displayName?: string | null;
  pictureUrl?: string | null;
}): Promise<{ data: DbUser | null; error: unknown }> {
  const now = new Date().toISOString();
  const row = {
    line_user_id: params.lineUserId,
    display_name: params.displayName ?? null,
    picture_url: params.pictureUrl ?? null,
    status: "active",
    updated_at: now,
  };

  // TODO: 後で実装 - 実際のテーブルに line_user_id の UNIQUE 制約が必要
  try {
    const { data, error } = await supabase
      .from("users")
      .upsert(
        { ...row, created_at: now },
        { onConflict: "line_user_id", ignoreDuplicates: false }
      )
      .select("id, line_user_id, display_name, picture_url, status, created_at, updated_at")
      .maybeSingle();
    return { data: data as DbUser | null, error };
  } catch (e) {
    return { data: null, error: e };
  }
}

/**
 * メッセージの送受信履歴を保存する。
 */
export async function saveMessageLog(params: {
  lineUserId: string;
  direction: "in" | "out";
  messageType: string;
  payload: unknown;
}): Promise<{ data: DbMessageLog | null; error: unknown }> {
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    line_user_id: params.lineUserId,
    direction: params.direction,
    message_type: params.messageType,
    payload: params.payload,
    created_at: now,
  };

  try {
    const { data, error } = await supabase
      .from("message_logs")
      .insert(row)
      .select("id, line_user_id, direction, message_type, created_at")
      .maybeSingle();
    return { data: data as DbMessageLog | null, error };
  } catch (e) {
    return { data: null, error: e };
  }
}
