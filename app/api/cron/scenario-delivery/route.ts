/**
 * シナリオ配信 — 特定 scenario_id に紐づくメッセージを順次送信する Cron / API
 * 呼び出し: POST /api/cron/scenario-delivery
 * Body: { "scenario_id": "welcome" } または Query: ?scenario_id=welcome
 * 認証: CRON_SECRET が設定されている場合は Authorization: Bearer <CRON_SECRET> または x-cron-secret ヘッダ必須
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
const CRON_SECRET = process.env.CRON_SECRET ?? "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";

export async function POST(request: NextRequest) {
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    const secretHeader = request.headers.get("x-cron-secret");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : secretHeader;
    if (token !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  let scenarioId: string | null = url.searchParams.get("scenario_id");
  if (!scenarioId) {
    try {
      const body = await request.json().catch(() => ({}));
      scenarioId = (body as { scenario_id?: string }).scenario_id ?? null;
    } catch {
      scenarioId = null;
    }
  }

  if (!scenarioId) {
    return NextResponse.json({ error: "scenario_id required" }, { status: 400 });
  }

  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    return NextResponse.json({ error: "LINE_CHANNEL_ACCESS_TOKEN not set" }, { status: 500 });
  }

  try {
    const { data: steps, error: stepsErr } = await supabase
      .from("scenario_messages")
      .select("id, step_order, message_text")
      .eq("scenario_id", scenarioId)
      .order("step_order", { ascending: true });

    if (stepsErr || !steps?.length) {
      console.warn("[scenario-delivery] scenario_messages not found or error", stepsErr);
      return NextResponse.json({ ok: false, error: "No steps", sent: 0 });
    }

    const { data: users, error: usersErr } = await supabase
      .from("line_users")
      .select("line_user_id")
      .eq("status", "active");

    if (usersErr || !users?.length) {
      return NextResponse.json({ ok: true, sent: 0, message: "No users" });
    }

    let sent = 0;
    for (const u of users) {
      const lineUserId = u.line_user_id as string;
      const { data: progress } = await supabase
        .from("user_scenario_progress")
        .select("current_step")
        .eq("line_user_id", lineUserId)
        .eq("scenario_id", scenarioId)
        .maybeSingle();

      const currentStep = (progress?.current_step as number | null) ?? 0;
      if (currentStep >= steps.length) continue;

      const step = steps[currentStep];
      const text = (step.message_text as string) ?? "";

      const res = await fetch(LINE_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: lineUserId,
          messages: [{ type: "text", text }],
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.error("[scenario-delivery] LINE push failed", { lineUserId: lineUserId.slice(0, 8), status: res.status, body: t });
        continue;
      }

      const nextStep = currentStep + 1;
      await supabase.from("user_scenario_progress").upsert(
        {
          line_user_id: lineUserId,
          scenario_id: scenarioId,
          current_step: nextStep,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "line_user_id,scenario_id" }
      );
      sent++;
    }

    return NextResponse.json({ ok: true, sent, scenario_id: scenarioId });
  } catch (e) {
    console.error("[scenario-delivery]", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
