import ConsoleSidebar from "@/components/ConsoleSidebar";

/**
 * 金杢犀 — /line-setup はサイドバー付き共通レイアウト内で表示（Webhook URL は編集しない）
 */
export default function LineSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)" }}>
      <ConsoleSidebar />
      <main style={{ flex: 1, padding: "1.5rem 2rem", overflow: "auto", background: "var(--color-bg)" }}>
        {children}
      </main>
    </div>
  );
}
