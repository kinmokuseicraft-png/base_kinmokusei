/**
 * LINE メールアドレス取得権限申請用 — ユーザー向け同意画面モックアップ
 * URL: /temp-auth-notice（申請時のスクリーンショット用）
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "公式LINE連携 | 金杢犀",
  description: "金杢犀公式LINE連携の同意画面",
};

export default function TempAuthNoticePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
        paddingBottom: "env(safe-area-inset-bottom, var(--space-6))",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.5rem",
            fontWeight: 600,
            color: "var(--color-text)",
            textAlign: "center",
            marginBottom: "var(--space-6)",
            letterSpacing: "0.02em",
            lineHeight: 1.4,
          }}
        >
          木軸ペン工房 金杢犀<br />
          公式LINE連携
        </h1>

        <p
          style={{
            fontSize: "0.9375rem",
            color: "var(--color-text-muted)",
            lineHeight: 1.8,
            marginBottom: "var(--space-6)",
            textAlign: "left",
          }}
        >
          本連携により、お客様のメールアドレスを取得します。取得したメールアドレスは、BASEショップでの購入履歴との照合、および銘木コラムや新着商品のご案内にのみ利用いたします。
        </p>

        <div
          style={{
            marginTop: "var(--space-6)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            aria-label="同意してLINEログイン（モックアップ）"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              maxWidth: "320px",
              padding: "var(--space-4) var(--space-5)",
              background: "var(--color-line)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius)",
              fontFamily: "var(--font-sans)",
              fontSize: "1rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              cursor: "default",
              boxShadow: "none",
            }}
          >
            同意してLINEログイン
          </button>
        </div>
      </div>
    </div>
  );
}
