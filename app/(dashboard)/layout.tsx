import ConsoleSidebar from "@/components/ConsoleSidebar";

/**
 * 金杢犀 ブランドエクスペリエンスコンソール（ダーク・金）
 * /dashboard 以下をサイドバー付きで表示。
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <ConsoleSidebar />
      <main style={{ flex: 1, padding: "1.5rem 2rem", overflow: "auto", background: "var(--color-bg)" }}>
        {children}
      </main>
    </div>
  );
}
