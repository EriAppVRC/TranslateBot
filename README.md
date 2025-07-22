# DeepL APIを使用したDiscord翻訳botです。

## ⚡ クイックスタート

### 1. Botを起動
```bash
npm start
```

### 2. Discord内で初期設定
```
/translate-quickstart target-language:日本語
```

### 3. すぐに使える！
メッセージを投稿すると自動翻訳されます 🎉

## 📋 主要コマンド

| 目的 | コマンド | 説明 |
|-----|---------|------|
| **クイック設定** | `/translate-quickstart` | 推奨設定で即座にセットアップ |
| **手動翻訳** | `/translate text:Hello` | テキストを手動で翻訳 |
| **設定確認** | `/translate-setup status` | 現在の設定状況を表示 |
| **統計表示** | `/translate-stats server` | 翻訳統計を確認 |
| **ヘルプ** | `/translate-help commands` | 全コマンド一覧を表示 |

## 🎯 機能

- 📝 メッセージの自動翻訳
- 🎯 チャンネル指定での翻訳設定
- 👥 ロール指定によるホワイトリスト/ブラックリスト
- ⚙️ スラッシュコマンドでの設定管理
- 📊 翻訳統計とログ機能
- 🔄 翻訳のOn/Off切り替え
- 🌍 多言語対応

## セットアップ

1. 依存関係のインストール
```bash
npm install
```

2. 環境変数の設定（`.env`ファイルを作成）
```
DISCORD_TOKEN=your_discord_bot_token
DEEPL_API_KEY=your_deepl_api_key
```

3. botの起動
```bash
npm start
```

## コマンド

### スラッシュコマンド

- `/translate-setup` - 翻訳設定を行う
- `/translate-channel` - 翻訳対象チャンネルと出力先を設定
- `/translate-role` - ロールベースの制限設定
- `/translate-toggle` - 翻訳機能のOn/Off切り替え
- `/translate-stats` - 翻訳統計を表示

## 必要な権限

- メッセージを読む
- メッセージを送信する
- スラッシュコマンドを使用する
- メッセージ履歴を読む

## 対応言語

DeepL APIがサポートするすべての言語ペアに対応しています。
