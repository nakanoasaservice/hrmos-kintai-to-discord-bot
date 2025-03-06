# HRMOS 勤怠 Discord Bot

HRMOS勤怠の勤怠打刻情報を自動的にDiscordに通知するCloudflare Workersアプリケーションです。

## 機能

- 5分ごとに新しい勤怠打刻情報を取得
- 打刻情報をDiscordのWebhook URLに通知

## セットアップ

### 前提条件

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)
- [Cloudflare](https://www.cloudflare.com/)アカウント
- HRMOSアカウント（API利用可能なもの）
- DiscordのWebhook URL

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/nakanoasaservice/hrmos-kintai-to-discord-bot.git
cd hrmos-kintai-to-discord-bot

# 依存関係をインストール
pnpm install
```

### 設定

1. `wrangler.toml`ファイルを編集してください：

```toml
# 会社名を設定（HRMOSでの会社名）
HRMOS_COMPANY_NAME = "<YOUR_COMPANY_NAME>"

# KVネームスペースIDを設定
[[kv_namespaces]]
binding = "AUTH_TOKENS"
id = "<YOUR_KV_ID>"
```

2. シークレットを設定：

```bash
# HRMOSのシークレットキーを設定
wrangler secret put HRMOS_SECRET_KEY

# DiscordのWebhook URLを設定
wrangler secret put DISCORD_WEBHOOK_URL
```

### デプロイ

```bash
# 開発環境で実行
pnpm run dev

# 本番環境にデプロイ
pnpm run deploy
```

## 使用技術

- [Cloudflare Workers](https://workers.cloudflare.com/) - サーバーレス実行環境
- [TypeScript](https://www.typescriptlang.org/) - 型安全な開発
- [date-fns](https://date-fns.org/) - 日付操作
- [valibot](https://valibot.dev/) - データバリデーション
- [discord-api-types](https://github.com/discordjs/discord-api-types) - Discord API連携

## ライセンス

MIT ライセンス (詳細は[LICENSE](LICENSE)ファイルを参照してください)
