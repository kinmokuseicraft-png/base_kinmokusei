/**
 * LINE設定。表示URLはすべて固定文字列（変数・env・location 未使用）。
 */
export default function LineSetupPage() {
  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "0 var(--space-2)" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "var(--space-2)", fontFamily: "var(--font-serif)", color: "var(--color-text)" }}>
        LINE設定
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
        金杢犀の公式アカウント編集はLINE側（Manager / Developers）で行います。ここでは本番で使うURLを表示しています。
      </p>

      <section style={{ background: "var(--color-surface)", padding: "var(--space-4)", marginBottom: "var(--space-4)", border: "1px solid var(--color-border)" }}>
        <h2 style={{ fontSize: "0.95rem", fontFamily: "var(--font-serif)", fontWeight: 600, marginBottom: "var(--space-3)", color: "var(--color-text)" }}>
          設定で使うURL
        </h2>

        <div style={{ marginBottom: "var(--space-4)" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "var(--space-1)", color: "var(--color-text-muted)" }}>
            Webhook URL
          </div>
          <code
            style={{
              display: "block",
              padding: "var(--space-3)",
              background: "var(--color-surface-alt)",
              border: "1px solid var(--color-border)",
              fontSize: "0.85rem",
              wordBreak: "break-all",
            }}
          >
            {"https://kinmokusei-line.vercel.app/api/webhook"}
          </code>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
            LINE Developers → Messaging API → Webhook URL に貼り付け
          </p>
        </div>

        <div>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "var(--space-1)", color: "var(--color-text-muted)" }}>
            LIFF Endpoint URL
          </div>
          <code
            style={{
              display: "block",
              padding: "var(--space-3)",
              background: "var(--color-surface-alt)",
              border: "1px solid var(--color-border)",
              fontSize: "0.85rem",
              wordBreak: "break-all",
            }}
          >
            {"https://kinmokusei-line.vercel.app"}
          </code>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
            LINE Developers → LIFF → 該当アプリ → Endpoint URL
          </p>
        </div>
      </section>

      <section style={{ background: "var(--color-surface)", padding: "var(--space-4)", border: "1px solid var(--color-border)" }}>
        <h2 style={{ fontSize: "0.95rem", fontFamily: "var(--font-serif)", fontWeight: 600, marginBottom: "var(--space-3)", color: "var(--color-text)" }}>
          編集時のチェックリスト
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {[
            "プロフィール（アカウント名・説明文・アイコン）",
            "カバー画像",
            "Webhook URLを本番に設定し、検証・利用をオン",
            "あいさつメッセージはオフ（返信はWebhookで実施）",
            "リッチメニュー画像アップロード＋エリアのアクション設定",
            "LIFF Endpoint URL を本番に設定し、LIFF ID を環境変数へ",
          ].map((item, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.35rem 0",
                fontSize: "0.9rem",
              }}
            >
              <span style={{ color: "var(--color-line)", fontWeight: 600 }}>✓</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <p style={{ marginTop: "1.5rem", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
        編集の詳細手順はリポジトリの docs を参照してください。
      </p>
    </div>
  );
}
