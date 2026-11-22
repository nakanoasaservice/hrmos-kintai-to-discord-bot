# HRMOS 勤怠 Discord Bot

HRMOS勤怠の勤怠打刻情報を自動的にDiscordに通知するCloudflare Workersアプリケーションです。

## 機能

- 5分ごとに新しい勤怠打刻情報を取得
- 打刻情報をDiscordのWebhook URLに通知

## セットアップ

### 前提条件

- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) (versions from `package.json`)
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

1. `wrangler.jsonc`ファイルを編集してください：

```jsonc
// 会社名を設定（HRMOSでの会社名）
"vars": {
  "HRMOS_COMPANY_NAME": "<YOUR_COMPANY_NAME>"
}

// KVネームスペースIDを設定
"kv_namespaces": [
  {
    "binding": "AUTH_TOKENS",
    "id": "<YOUR_KV_ID>"
  }
]
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

## Development toolchain

Use Node.js 24 and the pnpm version pinned in `package.json`.
Run `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, and `pnpm build`.
Vite+ provides formatting, linting, type checks and tests. Tests run locally
in the Cloudflare Workers runtime. The build task bundles with Wrangler in
dry-run mode; it does not deploy. Use `pnpm dev` for local development.

Update Vite+ and its bundled tools together with `vp migrate`, then update the
pinned `setup-vp` version in CI and refresh the pnpm lockfile. Run the project's
checks before committing toolchain updates.

### Runtime versions

`package.json` is the source of truth for development Node.js (`devEngines.runtime`)
and pnpm (`packageManager`). The major versions in `mise.toml` only bootstrap the
environment. Install the [global Vite+ CLI](https://viteplus.dev/guide/global-cli)
with environment management enabled, then use `vp install --frozen-lockfile`
and `vp run <script>` to run with the declared versions. `pnpm` commands also use
them when the Vite+ shims are active. The project-local CLI alone does not switch
Node.js versions.

CI reads the same manifest automatically; compatibility-test matrices explicitly
override Node.js. pnpm runtime management is disabled so it does not override
Vite+'s selection. Keep any consumer-facing `engines.node` support range separate
from the development pin.
