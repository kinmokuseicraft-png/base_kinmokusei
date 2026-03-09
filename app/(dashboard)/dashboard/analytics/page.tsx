"use client";

import { useEffect, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type MessageStats = { total: number; incoming: number; outgoing: number; error?: string };
type FriendTrend = { month: string; count: number }[];
type WoodView = { name: string; count: number; color: string }[];
type MessageByDay = { day: string; incoming: number; outgoing: number }[];

const DEFAULT_FRIEND: FriendTrend = [
  { month: "1月", count: 0 },
  { month: "2月", count: 0 },
  { month: "3月", count: 0 },
  { month: "4月", count: 0 },
  { month: "5月", count: 0 },
  { month: "6月", count: 0 },
];
const DEFAULT_WOOD: WoodView = [{ name: "タグなし", count: 0, color: "#9ca3af" }];
const DEFAULT_MSG: MessageByDay = [
  { day: "日", incoming: 0, outgoing: 0 },
  { day: "月", incoming: 0, outgoing: 0 },
  { day: "火", incoming: 0, outgoing: 0 },
  { day: "水", incoming: 0, outgoing: 0 },
  { day: "木", incoming: 0, outgoing: 0 },
  { day: "金", incoming: 0, outgoing: 0 },
  { day: "土", incoming: 0, outgoing: 0 },
];

export default function AnalyticsPage() {
  const [messageStats, setMessageStats] = useState<MessageStats | null>(null);
  const [friendTrend, setFriendTrend] = useState<FriendTrend>(DEFAULT_FRIEND);
  const [woodViewData, setWoodViewData] = useState<WoodView>(DEFAULT_WOOD);
  const [messageData, setMessageData] = useState<MessageByDay>(DEFAULT_MSG);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data: { messages?: { total: number; incoming: number; outgoing: number }; error?: string }) =>
        setMessageStats(data.messages ?? null)
      )
      .catch(() => setMessageStats(null));
  }, []);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((data: { friendTrend?: FriendTrend; woodViewData?: WoodView; messageByDay?: MessageByDay }) => {
        setFriendTrend(Array.isArray(data.friendTrend) && data.friendTrend.length ? data.friendTrend : DEFAULT_FRIEND);
        setWoodViewData(Array.isArray(data.woodViewData) && data.woodViewData.length ? data.woodViewData : DEFAULT_WOOD);
        setMessageData(Array.isArray(data.messageByDay) && data.messageByDay.length ? data.messageByDay : DEFAULT_MSG);
      })
      .catch(() => {
        setFriendTrend(DEFAULT_FRIEND);
        setWoodViewData(DEFAULT_WOOD);
        setMessageData(DEFAULT_MSG);
      });
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "var(--space-2)", fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
        分析
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
        友だち追加数・メッセージ・人気木材の推移（メッセージ数はDB連携）
      </p>

      {messageStats && (
        <section
          style={{
            background: "var(--color-surface)",
            padding: "var(--space-4)",
            marginBottom: "var(--space-4)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h2 style={{ fontSize: "0.95rem", fontFamily: "var(--font-serif)", fontWeight: 600, marginBottom: "var(--space-2)", color: "var(--color-text)" }}>
            総メッセージ数（message_logs 反映）
          </h2>
          <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {messageStats.total.toLocaleString()} 件
            <span style={{ fontSize: "0.9rem", fontWeight: 400, color: "var(--color-text-muted)", marginLeft: "0.5rem" }}>
              受信 {messageStats.incoming} / 送信 {messageStats.outgoing}
            </span>
          </p>
        </section>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <section style={{ background: "var(--color-surface)", padding: "var(--space-4)", border: "1px solid var(--color-border)" }}>
          <h2 style={{ fontSize: "0.95rem", fontFamily: "var(--font-serif)", fontWeight: 600, marginBottom: "var(--space-3)", color: "var(--color-text)" }}>
            友だち追加数の推移（users テーブル）
          </h2>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={friendTrend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section style={{ background: "var(--color-surface)", padding: "var(--space-4)", border: "1px solid var(--color-border)" }}>
          <h2 style={{ fontSize: "0.95rem", fontFamily: "var(--font-serif)", fontWeight: 600, marginBottom: "var(--space-3)", color: "var(--color-text)" }}>
            よく見られている木材（タグ集計）
          </h2>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={woodViewData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {woodViewData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                  }}
                  formatter={(value: number) => [`${value} 回`, "閲覧"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section style={{ background: "var(--color-surface)", padding: "var(--space-4)", border: "1px solid var(--color-border)" }}>
          <h2 style={{ fontSize: "0.95rem", fontFamily: "var(--font-serif)", fontWeight: 600, marginBottom: "var(--space-3)", color: "var(--color-text)" }}>
            週間メッセージ数（message_logs 曜日別）
          </h2>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={messageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                  }}
                />
                <Bar dataKey="incoming" name="受信" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outgoing" name="送信" fill="#9ca3af" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
