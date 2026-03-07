# 本番デプロイと LINE 設定の案内

**line_go_live.py** は次のだけを行います（Vercel CLI のみ使用、ブラウザ操作なし）。

1. **Vercel で設定する環境変数のキー名一覧**をターミナルに出力
2. **npx vercel deploy --prod** を実行
3. **発行された本番 URL** をターミナルに出力
4. **LINE Developers で手動登録する内容**を案内文として出力

環境変数の値は Vercel の管理画面から手動で設定してください。LINE の Webhook URL / LIFF Endpoint も LINE Developers コンソールで手動で登録してください。

```powershell
cd C:\Users\tsuba\Desktop\base_kinmokusei
python scripts/line_go_live.py
```

詳細な手順は **kinmokusei-line/docs/DEPLOY_MANUAL.md** を参照してください。
