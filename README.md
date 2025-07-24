# 🌍 Discord Translation Bot

> **高性能なDeepL API駆動Discord翻訳Bot**  
> リアルタイム自動翻訳とスマートな設定管理を提供

[![Discord.js](https://img.shields.io/badge/discord.js-v14.21.0-blue.svg)](https://discord.js.org/)
[![DeepL API](https://img.shields.io/badge/DeepL-API%20v2-green.svg)](https://www.deepl.com/docs-api)
[![Node.js](https://img.shields.io/badge/node.js-v18+-brightgreen.svg)](https://nodejs.org/)

---

## ✨ 特徴

### 🚀 **高度な翻訳機能**
- 📝 **リアルタイム自動翻訳** - メッセージ投稿時の即座翻訳
- 🎯 **精密なチャンネル制御** - 翻訳対象と出力先の柔軟な設定
- 🧠 **インテリジェント検出** - 翻訳不要テキストの自動判別
- ⚡ **高速キャッシュシステム** - 重複翻訳の最適化

### 👥 **アクセス制御**
- 🔐 **ロールベース制限** - ホワイトリスト/ブラックリスト機能
- 🛡️ **権限管理** - 管理者・モデレータ・一般ユーザー対応
- 🎚️ **細かな制御** - チャンネル別・ユーザー別設定

### 📊 **統計・監視**
- 📈 **詳細統計** - サーバー・ユーザー別翻訳データ
- 🔍 **API使用量監視** - DeepL使用量のリアルタイム表示
- 📋 **ログ管理** - 翻訳履歴の保存・エクスポート機能
- 🔧 **メンテナンスモード** - システム保守時の一時停止

---

## ⚡ クイックスタート

### 1️⃣ **Botを起動**
```bash
npm start
```

### 2️⃣ **Discord内で初期設定**
```bash
/translate-quickstart target-language:日本語
```

### 3️⃣ **すぐに使える！**
メッセージを投稿すると自動翻訳されます 🎉

---

## 📋 主要コマンド

| 目的 | コマンド | 説明 |
|------|----------|------|
| 🚀 **クイック設定** | `/translate-quickstart` | 推奨設定で即座にセットアップ |
| 🔤 **手動翻訳** | `/translate text:Hello` | テキストを手動で翻訳 |
| ⚙️ **設定確認** | `/translate-setup status` | 現在の設定状況を表示 |
| 📊 **統計表示** | `/translate-stats server` | 翻訳統計を確認 |
| ❓ **ヘルプ** | `/translate-help commands` | 全コマンド一覧を表示 |

---

## 🛠️ セットアップ

### **前提条件**
- Node.js 18.0.0 以上
- Discord Bot Token
- DeepL API Key

### **インストール手順**

1. **リポジトリのクローン**
```bash
git clone https://github.com/your-username/discord-translation-bot.git
cd discord-translation-bot
```

2. **依存関係のインストール**
```bash
npm install
```

3. **環境変数の設定**
`.env`ファイルを作成し、以下を設定：
```env
# Discord Bot設定
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_application_client_id
GUILD_ID=your_server_id_for_development  # 開発時のみ

# DeepL API設定
DEEPL_API_KEY=your_deepl_api_key

# 翻訳設定
MAX_TRANSLATE_LENGTH=5000

# データベース設定（オプション）
DB_PATH=./translate_bot.sqlite
```

4. **コマンドの登録**
```bash
npm run deploy
```

5. **Botの起動**
```bash
npm start
```

---

## 📚 詳細コマンドリスト

### 🔧 **基本設定**
```bash
/translate-setup language    # 翻訳言語ペアを設定
/translate-setup toggle      # 翻訳機能のOn/Off切り替え
/translate-setup status      # 現在の設定状況を表示
/translate-setup reset       # 設定をリセット
```

### 📺 **チャンネル設定**
```bash
/translate-channel add-source     # 翻訳対象チャンネル追加
/translate-channel remove-source  # 翻訳対象チャンネル削除
/translate-channel set-target     # 翻訳結果出力先設定
/translate-channel list           # チャンネル設定一覧
```

### 👥 **ロール制限**
```bash
/translate-role add-whitelist     # ホワイトリスト追加
/translate-role add-blacklist     # ブラックリスト追加
/translate-role clear             # ロール制限クリア
/translate-role list              # ロール設定一覧
```

### 🌐 **翻訳機能**
```bash
/translate                        # テキストを手動翻訳
/translate-stats server           # サーバー翻訳統計
/translate-stats user             # ユーザー翻訳統計
/translate-stats usage            # API使用量確認
```

### 🔧 **管理機能**（管理者のみ）
```bash
/translate-admin clear-logs       # 翻訳ログ削除
/translate-admin export-logs      # ログエクスポート
/translate-admin maintenance      # メンテナンスモード
/translate-admin backup-settings  # 設定バックアップ
```

### ❓ **ヘルプ**
```bash
/translate-help commands          # このコマンド一覧
/translate-help setup             # 初期セットアップ手順
/translate-help features          # 機能説明
/translate-help troubleshooting   # トラブル解決
```

---

## 🔐 必要な権限

### **Discord Bot権限**
- `applications.commands` - スラッシュコマンド使用
- `bot` - Bot基本機能

### **サーバー内権限**
- ✅ メッセージの表示
- ✅ メッセージの送信
- ✅ メッセージ履歴の表示
- ✅ 埋め込みリンクの送信
- ✅ 他のメンバーのメンションを許可

### **特権インテント（重要）**
- 🔓 `MESSAGE CONTENT INTENT` - 自動翻訳に**必須**

---

## 🌍 対応言語

### **ソース言語（自動検出対応）**
日本語、英語、中国語、韓国語、フランス語、ドイツ語、スペイン語、イタリア語、ポルトガル語、ロシア語、その他DeepLサポート言語

### **ターゲット言語**
- 🇯🇵 日本語（JA）
- 🇺🇸 英語（EN-US）
- 🇬🇧 英語（EN-GB）
- 🇨🇳 中国語（ZH）
- 🇰🇷 韓国語（KO）
- 🇫🇷 フランス語（FR）
- 🇩🇪 ドイツ語（DE）
- 🇪🇸 スペイン語（ES）
- 🇮🇹 イタリア語（IT）
- 🇵🇹 ポルトガル語（PT）
- 🇷🇺 ロシア語（RU）

---

## 🏗️ アーキテクチャ

```
📦 TranslationBot/
├── 🔧 src/
│   ├── 🤖 index.js              # メインBotエントリポイント
│   ├── 🚀 deploy-commands.js    # コマンド登録スクリプト
│   ├── 📁 commands/             # スラッシュコマンド群
│   │   ├── translate.js         # 手動翻訳
│   │   ├── translate-setup.js   # 基本設定
│   │   ├── translate-channel.js # チャンネル設定
│   │   ├── translate-role.js    # ロール制限
│   │   ├── translate-stats.js   # 統計表示
│   │   ├── translate-admin.js   # 管理機能
│   │   ├── translate-help.js    # ヘルプシステム
│   │   ├── translate-quickstart.js # クイックスタート
│   │   └── translate-rules.js   # カスタムルール
│   └── 🛠️ utils/
│       ├── database.js          # SQLiteデータベース管理
│       ├── database-fixed.js    # DB修復ユーティリティ
│       └── translation.js       # DeepL API統合
├── 📊 translate_bot.sqlite      # SQLiteデータベース
├── ⚙️ .env                     # 環境変数設定
├── 📦 package.json             # プロジェクト設定
└── 📖 README.md               # このファイル
```

---

## 🔧 開発

### **利用可能なスクリプト**
```bash
npm start        # 本番モードで起動
npm run dev      # 開発モード（ホットリロード）
npm run deploy   # コマンドをDiscordに登録
npm run test     # 接続テスト
```

### **環境設定**
- **開発**: `GUILD_ID`を設定してサーバー固有コマンド使用
- **本番**: `GUILD_ID`を削除してグローバルコマンド使用

---

## 🐛 トラブルシューティング

### **よくある問題**

#### ❌ **自動翻訳が動作しない**
**原因**: MESSAGE CONTENT INTENTが無効  
**解決**: Discord Developer Portal → Bot → Privileged Gateway Intents → MESSAGE CONTENT INTENTを有効化

#### ❌ **コマンドが表示されない**
**原因**: コマンドが登録されていない  
**解決**: `npm run deploy`を実行

#### ❌ **API制限エラー**
**原因**: DeepL APIの使用量超過  
**解決**: `/translate-stats usage`で使用量確認、翌月まで待機またはプラン変更

#### ❌ **データベースエラー**
**原因**: SQLiteファイルの破損  
**解決**: `database-fixed.js`ユーティリティで修復
