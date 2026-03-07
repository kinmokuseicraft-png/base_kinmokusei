import Link from "next/link";

export default function DashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
        ダッシュボード
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
        LINE運用と商品管理のコントロールパネルです。
      </p>
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
      </div>
    </div>
  );
}
