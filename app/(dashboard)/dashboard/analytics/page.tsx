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

const FRIEND_DATA = [
  { month: "1月", count: 42 },
  { month: "2月", count: 58 },
  { month: "3月", count: 71 },
  { month: "4月", count: 85 },
  { month: "5月", count: 92 },
  { month: "6月", count: 108 },
];

const WOOD_VIEW_DATA = [
  { name: "エボニー", count: 28, color: "#2d5016" },
  { name: "金桑", count: 22, color: "#5a8c2a" },
  { name: "キングウッド", count: 18, color: "#8b6914" },
  { name: "ウォールナット", count: 15, color: "#4a3728" },
  { name: "屋久杉", count: 12, color: "#6b5344" },
  { name: "その他", count: 25, color: "#9ca3af" },
];

const MESSAGE_DATA = [
  { day: "月", incoming: 12, outgoing: 14 },
  { day: "火", incoming: 19, outgoing: 18 },
  { day: "水", incoming: 8, outgoing: 9 },
  { day: "木", incoming: 15, outgoing: 16 },
  { day: "金", incoming: 22, outgoing: 21 },
  { day: "土", incoming: 31, outgoing: 30 },
  { day: "日", incoming: 25, outgoing: 24 },
];

export default function AnalyticsPage() {
  const [messageStats, setMessageStats] = useState<MessageStats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data: { messages?: { total: number; incoming: number; outgoing: number }; error?: string }) =>
        setMessageStats(data.messages ?? null)
      )
      .catch(() => setMessageStats(null));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
        分析
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
        友だち追加数・メッセージ・人気木材の推移（メッセージ数はDB連携）
      </p>

      {messageStats && (
        <section
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius)",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            boxShadow: "var(--shadow)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h2 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>
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

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <section
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius)",
            padding: "1.25rem",
            boxShadow: "var(--shadow)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
            友だち追加数の推移
          </h2>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={FRIEND_DATA}>
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

        <section
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius)",
            padding: "1.25rem",
            boxShadow: "var(--shadow)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
            よく見られている木材
          </h2>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={WOOD_VIEW_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {WOOD_VIEW_DATA.map((entry, i) => (
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

        <section
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius)",
            padding: "1.25rem",
            boxShadow: "var(--shadow)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
            週間メッセージ数（受信 / 送信）
          </h2>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={MESSAGE_DATA}>
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
