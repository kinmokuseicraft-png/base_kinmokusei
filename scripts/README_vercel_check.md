# Vercel デプロイ確認スクリプト

「デプロイが出ない」原因を切り分けるための 2 本のスクリプトです。

## 1. API でデプロイ件数を確認（根本原因の切り分け）

**目的:** 本当にデプロイが 0 件なのか、それとも一覧のフィルターで隠れているだけなのかを確認する。

```powershell
# 1. https://vercel.com/account/tokens で Token を発行
# 2. 環境変数に設定（PowerShell）
$env:VERCEL_TOKEN = "あなたのトークン"

# 3. 実行
cd C:\Users\tsuba\Desktop\base_kinmokusei
python scripts/vercel_list_deployments.py
```

- **件数が 0 の場合** → まだ 1 件もデプロイができていない。Deploy Hook の URL をブラウザで開くか、`kinmokusei-line` で `git push origin main` を実行してから再度確認。
- **件数が 1 以上の場合** → デプロイは存在する。Vercel の画面で「Clear Filters」を押すと表示される可能性が高い。

## 2. ブラウザで「Clear Filters」を自動クリック

**目的:** Deployments ページを開き、フィルターをクリアして表示をリセットする。

```powershell
cd C:\Users\tsuba\Desktop\base_kinmokusei
python scripts/vercel_browser_clear_filters.py
```

- ブラウザが起動し、Vercel の Deployments ページを開きます。
- 未ログインの場合はログインしてから、同じコマンドを再実行してください。
- スクリプトが「Clear Filters」をクリックし、5 秒後にブラウザを閉じます。

## 根本原因としてありがちなこと（単純なもの）

| 原因 | 確認方法 |
|------|----------|
| **Status フィルターで非表示** | 上記 2 のスクリプトで Clear Filters を実行する。または手動で Status を「すべて」にする。 |
| **デプロイがまだ 0 件** | 上記 1 の API で件数確認。0 件なら Deploy Hook URL を開くか main に push。 |
| **別フォルダで push している** | 必ず `C:\Users\tsuba\Desktop\kinmokusei-line` で `git push origin main` を実行する。 |
