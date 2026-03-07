import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "金杢犀 コントロールパネル",
  description: "LINE運用・商品管理ダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
