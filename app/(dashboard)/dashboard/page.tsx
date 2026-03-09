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
      <h1 style={{ fontSize: "1.5rem", marginBottom: "var(--space-2)", fontFamily: "var(--font-serif)" }}>
        ダッシュボード
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
        金杢犀 ライン管理の運用画面です。統計は Supabase の message_logs から反映されます。
      </p>

      {stats && (
        <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
          <div
            style={{
              padding: "var(--space-4) var(--space-5)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              minWidth: "160px",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
              総友達数
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--color-text)" }}>
              {stats.error ? "—" : stats.friends.toLocaleString()}
            </div>
          </div>
          <div
            style={{
              padding: "var(--space-4) var(--space-5)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              minWidth: "160px",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
              総メッセージ数
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--color-text)" }}>
              {stats.error ? "—" : stats.messages.total.toLocaleString()}
            </div>
            {!stats.error && (
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                受信 {stats.messages.incoming} / 送信 {stats.messages.outgoing}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <Link
          href="/dashboard/products"
          style={{
            display: "block",
            padding: "var(--space-3) var(--space-4)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-strong)",
            color: "var(--color-text)",
            fontWeight: 500,
            fontSize: "0.9rem",
          }}
        >
          商品管理・BASE連携 →
        </Link>
        <Link
          href="/line-setup"
          style={{
            display: "block",
            padding: "var(--space-3) var(--space-4)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-strong)",
            color: "var(--color-text)",
            fontWeight: 500,
            fontSize: "0.9rem",
          }}
        >
          LINE設定 →
        </Link>
      </div>
    </div>
  );
}
