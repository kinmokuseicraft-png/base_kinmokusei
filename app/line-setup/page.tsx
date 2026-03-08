/**
 * LINE設定（運用パス: https://kinmokusei-line.vercel.app/line-setup）
 * Webhook / LIFF URL は本番ドメインのみハードコード。環境変数・動的取得は使用しない。
 */
export default function LineSetupPage() {
  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "1.5rem 2rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
        LINE設定
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
        公式アカウントの編集はLINE側（Manager / Developers）で行います。ここでは本番で使うURLを表示しています。
      </p>

      <section
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          padding: "1.25rem",
          marginBottom: "1.5rem",
          boxShadow: "var(--shadow)",
          border: "1px solid var(--color-border)",
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          設定で使うURL（本番固定・プレビューURLは使用しません）
        </h2>

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.25rem" }}>
            Webhook URL
          </div>
          <code
            style={{
              display: "block",
              padding: "0.75rem",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.9rem",
              wordBreak: "break-all",
            }}
          >
            https://kinmokusei-line.vercel.app/api/webhook
          </code>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            LINE Developers → Messaging API → Webhook URL に貼り付け
          </p>
        </div>

        <div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.25rem" }}>
            LIFF Endpoint URL
          </div>
          <code
            style={{
              display: "block",
              padding: "0.75rem",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.9rem",
              wordBreak: "break-all",
            }}
          >
            https://kinmokusei-line.vercel.app
          </code>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            LINE Developers → LIFF → 該当アプリ → Endpoint URL
          </p>
        </div>
      </section>

      <section
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          padding: "1.25rem",
          boxShadow: "var(--shadow)",
          border: "1px solid var(--color-border)",
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
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
              <span style={{ color: "var(--color-primary)" }}>✓</span>
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
