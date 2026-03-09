"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  Package,
  ShoppingBag,
  BarChart3,
  Users,
  Settings,
  Share2,
  BookUser,
  GitBranch,
  FileText,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const NAV = [
  { key: "top", href: "/dashboard", label: "トップ", Icon: LayoutDashboard },
  { key: "broadcasts", href: "/dashboard/broadcasts", label: "一斉配信", Icon: Radio },
  { key: "scenarios", href: "/dashboard/scenarios", label: "シナリオ", Icon: GitBranch },
  { key: "users", href: "/dashboard/users", label: "友達管理", Icon: Users },
  { key: "chat", href: "/dashboard/chat", label: "チャット", Icon: BookUser },
  { key: "sns-hub", href: "/dashboard/sns-hub", label: "SNS発信ハブ", Icon: Share2 },
  { key: "lp", href: "/dashboard/lp", label: "LP管理", Icon: FileText },
  { key: "products", href: "/dashboard/products", label: "商品管理", Icon: Package },
  { key: "base", href: "/dashboard/base", label: "BASE連携", Icon: ShoppingBag },
  { key: "analytics", href: "/dashboard/analytics", label: "分析", Icon: BarChart3 },
  { key: "line-setup", href: "/line-setup", label: "LINE設定", Icon: Settings },
] as const;

export default function ConsoleSidebar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const active = (key: string) => {
    if (key === "top") return pathname === "/dashboard";
    if (key === "line-setup") return pathname === "/line-setup";
    return pathname.startsWith("/dashboard/" + key);
  };

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <aside
      style={{
        width: "240px",
        minHeight: "100vh",
        background: "var(--color-sidebar-bg)",
        borderRight: "1px solid var(--color-sidebar-border)",
        padding: "var(--space-5) 0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "0 var(--space-3) var(--space-3)",
          borderBottom: "1px solid var(--color-sidebar-border)",
          marginBottom: "var(--space-3)",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            fontWeight: 600,
            fontSize: "1.05rem",
            fontFamily: "var(--font-serif)",
            color: "var(--color-sidebar-text)",
            letterSpacing: "0.02em",
            display: "block",
          }}
        >
          Brand Experience Console
        </Link>
        <div style={{ fontSize: "0.7rem", color: "var(--color-sidebar-muted)", marginTop: "var(--space-1)" }}>
          金杢犀 — 発信統合
        </div>
      </div>
      <nav style={{ flex: 1 }}>
        {NAV.map(({ key, href, label, Icon }) => (
          <Link
            key={key}
            href={href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-3)",
              fontSize: "0.9rem",
              color: active(key) ? "var(--color-line)" : "var(--color-sidebar-muted)",
              fontWeight: active(key) ? 600 : 400,
              borderLeft: active(key) ? "2px solid var(--color-line)" : "2px solid transparent",
              marginLeft: "1px",
            }}
          >
            <Icon size={18} strokeWidth={1.5} />
            {label}
          </Link>
        ))}
      </nav>
      <div style={{ padding: "var(--space-3)", borderTop: "1px solid var(--color-sidebar-border)" }}>
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            width: "100%",
            padding: "var(--space-2) var(--space-3)",
            fontSize: "0.85rem",
            color: "var(--color-sidebar-muted)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <LogOut size={16} strokeWidth={1.5} />
          ログアウト
        </button>
      </div>
    </aside>
  );
}
