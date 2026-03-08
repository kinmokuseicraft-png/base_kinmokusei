/**
 * /line-setup はルートレイアウトのみ使用（ダッシュボードサイドバーは使わない）
 * 運用URL: https://kinmokusei-line.vercel.app/line-setup
 */
export default function LineSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      {children}
    </div>
  );
}
