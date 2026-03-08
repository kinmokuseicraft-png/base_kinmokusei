"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ConsoleSidebar() {
  const pathname = usePathname() ?? "";
  const active = (key: string) => {
    if (key === "top") return pathname === "/dashboard";
    if (key === "line-setup") return pathname === "/line-setup";
    return pathname.startsWith("/dashboard/" + key);
  };
  const link = (key: string, href: string, label: string) => (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "0.6rem 1.25rem",
        fontSize: "0.95rem",
        color: active(key) ? "var(--color-line)" : "var(--color-sidebar-muted)",
        fontWeight: active(key) ? 600 : 400,
      }}
    >
      {label}
    </Link>
  );

  return (
    <aside
      style={{
        width: "240px",
        minHeight: "100vh",
        background: "var(--color-sidebar-bg)",
        borderRight: "1px solid var(--color-sidebar-border)",
        padding: "1.5rem 0",
        boxShadow: "2px 0 12px rgba(0,0,0,0.15)",
      }}
    >
      <div
        style={{
          padding: "0 1rem 1rem",
          borderBottom: "1px solid var(--color-sidebar-border)",
          marginBottom: "1rem",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            fontWeight: 700,
            fontSize: "1.1rem",
            color: "var(--color-gold)",
            letterSpacing: "0.02em",
          }}
        >
          金杢犀 ライン管理
        </Link>
        <div style={{ fontSize: "0.75rem", color: "var(--color-sidebar-muted)", marginTop: "0.25rem" }}>
          ブランドエクスペリエンスコンソール
        </div>
      </div>
      <nav>
        {link("top", "/dashboard", "トップ")}
        {link("products", "/dashboard/products", "商品管理・BASE連携")}
        {link("analytics", "/dashboard/analytics", "分析")}
        {link("users", "/dashboard/users", "顧客一覧")}
        {link("line-setup", "/line-setup", "LINE設定")}
      </nav>
    </aside>
  );
}
