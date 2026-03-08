import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "金杢犀 ライン管理",
  description: "金杢犀ブランド公式LINE 唯一の運用コンソール（Supabase連携）",
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
