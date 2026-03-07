/**
 * LIFF 用レイアウト（LINE 内ブラウザ向け・モバイル最適化）
 */
export default function LiffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--color-bg)",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
      }}
    >
      {children}
    </div>
  );
}
