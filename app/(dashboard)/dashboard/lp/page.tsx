"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type WoodSummary = {
  slug: string;
  wood_name_ja: string;
  catch_copy: string;
  is_published: boolean;
  has_hero_image: boolean;
  sort_order: number;
};

export default function LpDashboardPage() {
  const [woods, setWoods] = useState<WoodSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lp", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { woods?: WoodSummary[] }) => setWoods(d.woods ?? []))
      .catch(() => setWoods([]))
      .finally(() => setLoading(false));
  }, []);

  const togglePublish = async (slug: string, current: boolean) => {
    await fetch(`/api/lp/${encodeURIComponent(slug)}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !current }),
    });
    setWoods((prev) => prev.map((w) => w.slug === slug ? { ...w, is_published: !current } : w));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>LP 管理</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
            各樹種のLPページを管理します。ヒーロー画像の設定・公開/非公開を切り替えられます。
          </p>
        </div>
      </div>

      {loading && <p style={{ color: "var(--color-text-muted)" }}>読み込み中…</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {woods.map((w) => (
          <div
            key={w.slug}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            {/* ステータスインジケーター */}
            <div
              title={w.is_published ? "公開中" : "非公開"}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: w.is_published ? "#2ecc71" : "var(--color-border)",
                flexShrink: 0,
              }}
            />

            {/* 木材名 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{w.wood_name_ja}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{w.catch_copy}</div>
            </div>

            {/* バッジ */}
            <div style={{ display: "flex", gap: "var(--space-1)", flexShrink: 0 }}>
              {w.has_hero_image && (
                <span style={{ fontSize: "0.7rem", padding: "2px 6px", background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
                  画像あり
                </span>
              )}
              <span style={{
                fontSize: "0.7rem",
                padding: "2px 6px",
                background: w.is_published ? "rgba(46,204,113,0.15)" : "var(--color-bg)",
                border: `1px solid ${w.is_published ? "#2ecc71" : "var(--color-border)"}`,
                color: w.is_published ? "#2ecc71" : "var(--color-text-muted)",
              }}>
                {w.is_published ? "公開中" : "非公開"}
              </span>
            </div>

            {/* アクション */}
            <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
              <a
                href={`/liff/lp/${w.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.78rem", padding: "4px 10px", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", textDecoration: "none" }}
              >
                プレビュー
              </a>
              <Link
                href={`/dashboard/lp/${w.slug}`}
                style={{ fontSize: "0.78rem", padding: "4px 10px", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", textDecoration: "none" }}
              >
                編集
              </Link>
              <button
                type="button"
                onClick={() => togglePublish(w.slug, w.is_published)}
                style={{
                  fontSize: "0.78rem",
                  padding: "4px 10px",
                  border: "none",
                  background: w.is_published ? "var(--color-border)" : "var(--color-line)",
                  color: w.is_published ? "var(--color-text)" : "#fff",
                  cursor: "pointer",
                }}
              >
                {w.is_published ? "非公開に" : "公開する"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
