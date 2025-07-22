const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate-help')
        .setDescription('翻訳Botの使い方とコマンド一覧を表示')
        .addSubcommand(subcommand =>
            subcommand
                .setName('commands')
                .setDescription('全コマンド一覧を表示')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('初期セットアップ手順を表示')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('features')
                .setDescription('主要機能の説明を表示')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('troubleshooting')
                .setDescription('トラブルシューティング情報を表示')
        ),

    async execute(interaction, db, translator) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'commands':
                    await this.showCommands(interaction);
                    break;
                case 'setup':
                    await this.showSetup(interaction);
                    break;
                case 'features':
                    await this.showFeatures(interaction);
                    break;
                case 'troubleshooting':
                    await this.showTroubleshooting(interaction);
                    break;
            }
        } catch (error) {
            console.error('ヘルプコマンドエラー:', error);
            await interaction.reply({
                content: '❌ ヘルプ表示中にエラーが発生しました。',
                flags: ['Ephemeral']
            });
        }
    },

    async showCommands(interaction) {
        const embed = {
            title: '📋 翻訳Bot コマンド一覧',
            color: 0x00AE86,
            fields: [
                {
                    name: '🔧 基本設定',
                    value: `\`/translate-setup language\` - 翻訳言語を設定
\`/translate-setup toggle\` - 翻訳機能のOn/Off切り替え
\`/translate-setup status\` - 現在の設定状況を表示
\`/translate-setup reset\` - 設定をリセット`,
                    inline: false
                },
                {
                    name: '📺 チャンネル設定',
                    value: `\`/translate-channel add-source\` - 翻訳対象チャンネル追加
\`/translate-channel remove-source\` - 翻訳対象チャンネル削除
\`/translate-channel set-target\` - 翻訳結果出力先設定
\`/translate-channel list\` - チャンネル設定一覧`,
                    inline: false
                },
                {
                    name: '👥 ロール制限',
                    value: `\`/translate-role add-whitelist\` - ホワイトリスト追加
\`/translate-role add-blacklist\` - ブラックリスト追加
\`/translate-role clear\` - ロール制限クリア
\`/translate-role list\` - ロール設定一覧`,
                    inline: false
                },
                {
                    name: '🌐 翻訳機能',
                    value: `\`/translate\` - テキストを手動翻訳
\`/translate-stats server\` - サーバー翻訳統計
\`/translate-stats user\` - ユーザー翻訳統計
\`/translate-stats usage\` - API使用量確認`,
                    inline: false
                },
                {
                    name: '🔧 管理機能（管理者のみ）',
                    value: `\`/translate-admin clear-logs\` - 翻訳ログ削除
\`/translate-admin export-logs\` - ログエクスポート
\`/translate-admin maintenance\` - メンテナンスモード
\`/translate-admin backup-settings\` - 設定バックアップ`,
                    inline: false
                },
                {
                    name: '❓ ヘルプ',
                    value: `\`/translate-help commands\` - このコマンド一覧
\`/translate-help setup\` - 初期セットアップ手順
\`/translate-help features\` - 機能説明
\`/translate-help troubleshooting\` - トラブル解決`,
                    inline: false
                }
            ],
            footer: {
                text: '詳細な使い方は各サブコマンドをご確認ください'
            }
        };

        await interaction.reply({
            embeds: [embed],
            flags: ['Ephemeral']
        });
    },

    async showSetup(interaction) {
        const embed = {
            title: '🚀 初期セットアップ手順',
            color: 0x0099FF,
            description: '翻訳Botを初めて使用する場合の設定手順です。',
            fields: [
                {
                    name: '1️⃣ 基本設定',
                    value: `\`\`\`
/translate-setup language source:自動検出 target:日本語
/translate-setup toggle enabled:true
\`\`\`
**説明**: 翻訳言語を設定し、機能を有効化します。`,
                    inline: false
                },
                {
                    name: '2️⃣ チャンネル設定（オプション）',
                    value: `\`\`\`
/translate-channel add-source channel:#国際交流
/translate-channel set-target channel:#翻訳結果
\`\`\`
**説明**: 特定チャンネルのみを翻訳対象にする場合に設定します。
**未設定の場合**: すべてのチャンネルが対象になります。`,
                    inline: false
                },
                {
                    name: '3️⃣ ロール制限（オプション）',
                    value: `\`\`\`
/translate-role add-whitelist role:@翻訳許可
\`\`\`
**説明**: 特定ロールのみに翻訳機能を制限する場合に設定します。
**未設定の場合**: すべてのユーザーが利用可能です。`,
                    inline: false
                },
                {
                    name: '4️⃣ 動作確認',
                    value: `\`\`\`
/translate text:Hello World from:英語 to:日本語 public:true
/translate-setup status
\`\`\`
**説明**: 手動翻訳で動作を確認し、設定状況をチェックします。`,
                    inline: false
                }
            ],
            footer: {
                text: '設定完了後、メッセージが自動翻訳されるようになります'
            }
        };

        await interaction.reply({
            embeds: [embed],
            flags: ['Ephemeral']
        });
    },

    async showFeatures(interaction) {
        const embed = {
            title: '✨ 主要機能説明',
            color: 0xFF6B6B,
            fields: [
                {
                    name: '🔄 自動翻訳',
                    value: `メッセージが投稿されると自動で翻訳されます。
**対応**: DeepL APIの全言語ペア
**設定**: チャンネル・ロール制限可能
**出力**: 元チャンネルまたは指定チャンネル`,
                    inline: false
                },
                {
                    name: '🎯 チャンネル指定',
                    value: `**翻訳対象**: 特定チャンネルのみ翻訳
**出力先**: 翻訳結果を別チャンネルに投稿
**柔軟性**: 複数チャンネル対応`,
                    inline: true
                },
                {
                    name: '👥 ロール制限',
                    value: `**ホワイトリスト**: 指定ロールのみ翻訳可能
**ブラックリスト**: 指定ロールは翻訳禁止
**競合回避**: 自動でロール競合を解決`,
                    inline: true
                },
                {
                    name: '📊 詳細統計',
                    value: `**サーバー統計**: 総翻訳数、日別トレンド
**ユーザー統計**: 個人の翻訳履歴
**API監視**: DeepL使用量追跡`,
                    inline: false
                },
                {
                    name: '🔧 管理機能',
                    value: `**ログ管理**: エクスポート・削除
**メンテナンス**: 一時停止機能
**バックアップ**: 設定の保存・復元`,
                    inline: true
                },
                {
                    name: '⚡ 高速化機能',
                    value: `**キャッシュ**: 同じ文章の再翻訳を高速化
**エラー処理**: API制限の適切な処理
**最適化**: 不要な翻訳をスキップ`,
                    inline: true
                }
            ],
            footer: {
                text: 'すべての機能は /translate-setup で設定できます'
            }
        };

        await interaction.reply({
            embeds: [embed],
            flags: ['Ephemeral']
        });
    },

    async showTroubleshooting(interaction) {
        const embed = {
            title: '🔧 トラブルシューティング',
            color: 0xFFAA00,
            fields: [
                {
                    name: '❌ 翻訳されない場合',
                    value: `**確認項目**:
1. \`/translate-setup status\` で機能が有効か確認
2. チャンネル設定が正しいか確認
3. ロール制限に引っかかっていないか確認
4. メッセージが短すぎない（10文字以上）か確認

**解決方法**:
\`/translate-setup toggle enabled:true\` で有効化`,
                    inline: false
                },
                {
                    name: '⚠️ コマンドが表示されない',
                    value: `**原因**: Bot権限またはコマンド登録の問題
**解決方法**:
1. Botをサーバーから一度キックし、適切な権限で再招待
2. 管理者にコマンド権限の確認を依頼
3. Bot開発者にコマンド再登録を依頼`,
                    inline: false
                },
                {
                    name: '🚫 API制限エラー',
                    value: `**症状**: "quota exceeded" エラー
**原因**: DeepL APIの月次制限に達した
**解決方法**:
\`/translate-stats usage\` で使用量確認
翌月まで待機、または有料プランにアップグレード`,
                    inline: false
                },
                {
                    name: '🔄 翻訳が重複する',
                    value: `**原因**: 複数の翻訳Botが動作している
**解決方法**:
1. 他の翻訳Botを無効化
2. チャンネル設定で対象を分離
3. \`/translate-admin maintenance enabled:true\` で一時停止`,
                    inline: false
                },
                {
                    name: '📈 統計が表示されない',
                    value: `**原因**: まだ翻訳履歴がない
**解決方法**:
\`/translate text:テスト from:日本語 to:英語\` でテスト翻訳を実行
しばらく使用してから統計を確認`,
                    inline: false
                }
            ],
            footer: {
                text: '解決しない場合は管理者またはBot開発者にお問い合わせください'
            }
        };

        await interaction.reply({
            embeds: [embed],
            flags: ['Ephemeral']
        });
    }
};
