/**
 * LINE プロフィール一括更新
 * display_name が null の line_users に対して LINE API を呼び出し、名前・アイコンを補完する
 */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

export const dynamic = "force-dynamic";

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";

type ProfileResult = {
  displayName: string | null;
  pictureUrl: string | null;
  lineStatus: number | null;
  lineError: string | null;
};

async function fetchLineProfile(userId: string): Promise<ProfileResult> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    return { displayName: null, pictureUrl: null, lineStatus: null, lineError: "LINE_CHANNEL_ACCESS_TOKEN未設定" };
  }
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { displayName: null, pictureUrl: null, lineStatus: res.status, lineError: errText };
    }
    const data = await res.json() as { displayName?: string; pictureUrl?: string };
    return {
      displayName: data.displayName ?? null,
      pictureUrl: data.pictureUrl ?? null,
      lineStatus: 200,
      lineError: null,
    };
  } catch (e) {
    return { displayName: null, pictureUrl: null, lineStatus: null, lineError: String(e) };
  }
}

export async function POST() {
  try {
    // display_name が null のユーザーを取得
    const { data: nullUsers, error } = await supabase
      .from("line_users")
      .select("id, line_user_id")
      .is("display_name", null);

    if (error) throw error;
    if (!nullUsers || nullUsers.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, message: "対象ユーザーなし" });
    }

    let updated = 0;
    const results: { line_user_id: string; display_name: string | null; ok: boolean; lineStatus?: number | null; lineError?: string | null }[] = [];

    for (const user of nullUsers) {
      const profile = await fetchLineProfile(user.line_user_id);
      if (profile.displayName) {
        const { error: updateErr } = await supabase
          .from("line_users")
          .update({
            display_name: profile.displayName,
            picture_url: profile.pictureUrl,
          })
          .eq("line_user_id", user.line_user_id);

        if (!updateErr) {
          updated++;
          results.push({ line_user_id: user.line_user_id, display_name: profile.displayName, ok: true });
        } else {
          results.push({ line_user_id: user.line_user_id, display_name: null, ok: false, lineError: String(updateErr) });
        }
      } else {
        results.push({
          line_user_id: user.line_user_id,
          display_name: null,
          ok: false,
          lineStatus: profile.lineStatus,
          lineError: profile.lineError,
        });
      }
    }

    return NextResponse.json({ ok: true, updated, total: nullUsers.length, results });
  } catch (e) {
    console.error("[api/users/refresh-profiles]", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
