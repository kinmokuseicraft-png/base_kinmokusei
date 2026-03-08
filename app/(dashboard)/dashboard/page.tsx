"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DashboardStats = {
  friends: number;
  messages: { total: number; incoming: number; outgoing: number };
  error?: string;
};

/**
 * 金杢犀 ライン管理 — ダッシュボードトップ（唯一の運用画面）
 * 総友達数・総メッセージ数は Supabase message_logs / users から集計。
 */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data: DashboardStats) => setStats(data))
      .catch(() =>
        setStats({
          friends: 0,
          messages: { total: 0, incoming: 0, outgoing: 0 },
        })
      );
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
        ダッシュボード
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
        金杢犀 ライン管理の運用画面です。統計は Supabase の message_logs から反映されます。
      </p>

      {stats && (
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow)",
              border: "1px solid var(--color-border)",
              minWidth: "140px",
            }}
          >
            <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
              総友達数
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              {stats.error ? "—" : stats.friends.toLocaleString()}
            </div>
          </div>
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              boxShadow: "var(--shadow)",
              border: "1px solid var(--color-border)",
              minWidth: "140px",
            }}
          >
            <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
              総メッセージ数
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              {stats.error ? "—" : stats.messages.total.toLocaleString()}
            </div>
            {!stats.error && (
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                受信 {stats.messages.incoming} / 送信 {stats.messages.outgoing}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link
          href="/dashboard/products"
          style={{
            display: "block",
            padding: "1rem 1.5rem",
            background: "var(--color-surface)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
            fontWeight: 500,
          }}
        >
          商品管理・BASE連携 →
        </Link>
        <Link
          href="/line-setup"
          style={{
            display: "block",
            padding: "1rem 1.5rem",
            background: "var(--color-surface)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
            fontWeight: 500,
          }}
        >
          LINE設定 →
        </Link>
      </div>
    </div>
  );
}
