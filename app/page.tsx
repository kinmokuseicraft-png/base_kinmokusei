import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1 style={{ marginBottom: "1rem", fontSize: "1.5rem" }}>
        金杢犀 ライン管理
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
        唯一の運用コンソール（ダッシュボード）
      </p>
      <Link
        href="/dashboard"
        style={{
          display: "inline-block",
          padding: "0.75rem 1.5rem",
          background: "var(--color-primary)",
          color: "#fff",
          borderRadius: "var(--radius-sm)",
          fontWeight: 600,
        }}
      >
        ダッシュボードへ
      </Link>
    </main>
  );
}
