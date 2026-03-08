import Link from "next/link";

/**
 * 金杢犀（きんもくせい）LINE管理 — ブランドエクスペリエンスコンソール
 * 唯一の運用画面。/dashboard と /line-setup のみ。他パネルは存在しない。
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: "240px",
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
          padding: "1.5rem 0",
          boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ padding: "0 1rem 1rem", borderBottom: "1px solid var(--color-border)", marginBottom: "1rem" }}>
          <Link href="/dashboard" style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--color-text)" }}>
            金杢犀 ライン管理
          </Link>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            唯一の運用コンソール
          </div>
        </div>
        <nav>
          <Link
            href="/dashboard"
            style={{
              display: "block",
              padding: "0.6rem 1.25rem",
              color: "var(--color-text-muted)",
              fontSize: "0.95rem",
            }}
          >
            トップ
          </Link>
          <Link
            href="/dashboard/products"
            style={{
              display: "block",
              padding: "0.6rem 1.25rem",
              color: "var(--color-text-muted)",
              fontSize: "0.95rem",
            }}
          >
            商品管理・BASE連携
          </Link>
          <Link
            href="/dashboard/analytics"
            style={{
              display: "block",
              padding: "0.6rem 1.25rem",
              color: "var(--color-text-muted)",
              fontSize: "0.95rem",
            }}
          >
            分析
          </Link>
          <Link
            href="/dashboard/users"
            style={{
              display: "block",
              padding: "0.6rem 1.25rem",
              color: "var(--color-text-muted)",
              fontSize: "0.95rem",
            }}
          >
            顧客一覧
          </Link>
          <Link
            href="/line-setup"
            style={{
              display: "block",
              padding: "0.6rem 1.25rem",
              color: "var(--color-text-muted)",
              fontSize: "0.95rem",
            }}
          >
            LINE設定
          </Link>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: "1.5rem 2rem", overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
