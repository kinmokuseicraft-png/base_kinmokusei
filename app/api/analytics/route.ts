/**
 * 分析用 API — message_logs / line_users から集計（実データのみ）
 */
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase_client";

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];
const WOOD_COLORS: Record<string, string> = {
  エボニー: "#2d5016",
  金桑: "#5a8c2a",
  キングウッド: "#8b6914",
  ウォールナット: "#4a3728",
  屋久杉: "#6b5344",
  その他: "#9ca3af",
};

export async function GET() {
  try {
    const { data: users } = await supabase.from("line_users").select("created_at, tags");
    const { data: logs } = await supabase
      .from("message_logs")
      .select("direction, created_at");

    const now = new Date();
    const months: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: `${d.getMonth() + 1}月`,
        count: 0,
      });
    }

    if (users?.length) {
      users.forEach((u) => {
        const created = u.created_at as string | undefined;
        if (!created) return;
        const d = new Date(created);
        for (let i = 0; i < 6; i++) {
          const slot = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          if (d.getFullYear() === slot.getFullYear() && d.getMonth() === slot.getMonth()) {
            months[i].count++;
            break;
          }
        }
      });
    }

    const tagCounts: Record<string, number> = {};
    if (users?.length) {
      users.forEach((u) => {
        const tags = (u.tags as string[] | null) ?? [];
        tags.forEach((t) => {
          tagCounts[t] = (tagCounts[t] ?? 0) + 1;
        });
      });
    }
    const woodViewData = Object.entries(tagCounts).map(([name, count]) => ({
      name,
      count,
      color: WOOD_COLORS[name] ?? WOOD_COLORS["その他"],
    }));
    if (woodViewData.length === 0) {
      woodViewData.push({ name: "タグなし", count: 0, color: WOOD_COLORS["その他"] });
    }

    const byDay: Record<number, { incoming: number; outgoing: number }> = {};
    DAY_NAMES.forEach((_, i) => {
      byDay[i] = { incoming: 0, outgoing: 0 };
    });
    if (logs?.length) {
      logs.forEach((log) => {
        const dir = log.direction as string;
        const created = log.created_at as string;
        const day = new Date(created).getDay();
        if (dir === "in") byDay[day].incoming++;
        else if (dir === "out") byDay[day].outgoing++;
      });
    }
    const messageData = DAY_NAMES.map((day, i) => ({
      day,
      incoming: byDay[i].incoming,
      outgoing: byDay[i].outgoing,
    }));

    return NextResponse.json({
      friendTrend: months,
      woodViewData,
      messageByDay: messageData,
    });
  } catch (e) {
    console.error("[analytics]", e);
    return NextResponse.json(
      {
        friendTrend: [],
        woodViewData: [],
        messageByDay: DAY_NAMES.map((day, i) => ({ day, incoming: 0, outgoing: 0 })),
        error: String(e),
      },
      { status: 500 }
    );
  }
}
