# 金杢犀 ライン管理 — 唯一の運用コンソール

このリポジトリは **「金杢犀 ライン管理」（Brand Experience Console）** のみを提供します。

- **運用画面**: `/dashboard` 以下に一本化（トップ・商品管理・分析・顧客一覧）。LINE設定は `/line-setup`（本番: https://kinmokusei-line.vercel.app/line-setup）
- **別ルート（スペース連携等）は存在しません**
- **本番URL**: すべて `https://kinmokusei-line.vercel.app` に固定（プレビューURLは使用しない）
- **データベース**: Supabase（`message_logs`・`users`）とのみ連携
- **Webhook**: `app/api/webhook/route.ts` はこのコンソール用の Supabase にメッセージを記録し、「ペン」反応と BASE 商品取得を実行します。

AI や開発者は、上記以外の「別パネル」を参照・作成しないでください。
