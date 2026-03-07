# 本番環境ステータス（kinmokusei-line）

**前提:** 今後の機能追加・コード修正の提案は、この本番環境を前提に行います。

| 項目 | 状態 |
|------|------|
| 本番URL | https://kinmokusei-line.vercel.app |
| LINE Webhook | 連携済み（AI返信確認済み） |
| データベース | Supabase 接続正常 |
| Cron | 1日1回（毎日 0:00 UTC）で `/api/cron` を実行（kinmokusei-line/vercel.json） |

- 機能追加・不具合修正は、上記本番URL・Webhook・Supabase が動いていることを前提に提案します。
- Cron が必要な処理は、手動実行や外部スケジューラなど別手段を案内します。
