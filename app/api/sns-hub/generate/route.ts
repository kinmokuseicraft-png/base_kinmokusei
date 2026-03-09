/**
 * SNS発信ハブ — 三変化（X / Instagram / LINE）文案を一括生成
 */
import { NextRequest, NextResponse } from "next/server";
import {
  buildSystemPrompt,
  buildTwitterPrompt,
  buildInstagramPrompt,
  buildLineNewsPrompt,
} from "@/src/features/sns-automation/prompts";
import type { GenerateTripleParams, TripleCopy } from "@/src/features/sns-automation/types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

async function callClaude(userPrompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が設定されていません");
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  return text.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateTripleParams;
    const category = body.category ?? "news";
    // imageUrl: 将来 Vision API で杢目等を言語化する際に利用する土台（現状は未使用）
    const systemPrompt = buildSystemPrompt(category);

    const [twitter, instagram, lineNews] = await Promise.all([
      callClaude(buildTwitterPrompt(body), systemPrompt),
      callClaude(buildInstagramPrompt(body), systemPrompt),
      callClaude(buildLineNewsPrompt(body), systemPrompt),
    ]);

    const result: TripleCopy = { twitter, instagram, lineNews };
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/sns-hub/generate]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "生成に失敗しました" },
      { status: 500 }
    );
  }
}
