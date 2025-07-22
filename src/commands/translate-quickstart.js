const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate-quickstart')
        .setDescription('翻訳Botのクイックセットアップ（推奨設定で自動設定）')
        .addStringOption(option =>
            option
                .setName('target-language')
                .setDescription('メイン翻訳先言語（デフォルト: 日本語）')
                .setRequired(false)
                .addChoices(
                    { name: '日本語', value: 'JA' },
                    { name: '英語', value: 'EN-US' },
                    { name: '中国語', value: 'ZH' },
                    { name: '韓国語', value: 'KO' },
                    { name: 'フランス語', value: 'FR' },
                    { name: 'ドイツ語', value: 'DE' },
                    { name: 'スペイン語', value: 'ES' }
                )
        )
        .addChannelOption(option =>
            option
                .setName('output-channel')
                .setDescription('翻訳結果出力先チャンネル（未指定で元のチャンネル）')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, db, translator) {
        
        if (!interaction.guild) {
            await interaction.reply({
                content: '❌ このコマンドはサーバー内でのみ使用できます。',
                flags: ['Ephemeral']
            });
            return;
        }
        
        const guildId = interaction.guild.id;
        const targetLang = interaction.options.getString('target-language') || 'JA';
        const outputChannel = interaction.options.getChannel('output-channel');

        // 設定処理開始を通知
        await interaction.deferReply();

        try {
            // 推奨設定を適用
            const settings = {
                enabled: true,
                source_lang: 'auto',
                target_lang: targetLang,
                source_channels: [], // すべてのチャンネルが対象
                target_channel: outputChannel ? outputChannel.id : null,
                whitelisted_roles: [], // すべてのロールが対象
                blacklisted_roles: [] // ブラックリストなし
            };

            await db.updateGuildSettings(guildId, settings);

            // セットアップ完了メッセージ
            const embed = {
                title: '🚀 クイックセットアップ完了！',
                color: 0x00FF00,
                fields: [
                    {
                        name: '✅ 適用された設定',
                        value: `**翻訳機能**: 有効
**元言語**: 自動検出
**翻訳先**: ${translator.getLanguageName(targetLang)}
**対象チャンネル**: すべて
**出力先**: ${outputChannel ? `<#${outputChannel.id}>` : '元のチャンネル'}
**ユーザー制限**: なし`,
                        inline: false
                    },
                    {
                        name: '🎯 すぐに使えます！',
                        value: `メッセージを投稿すると自動で翻訳されます。
手動翻訳: \`/translate text:Hello World\`
設定確認: \`/translate-setup status\`
統計表示: \`/translate-stats server\``,
                        inline: false
                    },
                    {
                        name: '⚙️ 追加設定（オプション）',
                        value: `**特定チャンネルのみ翻訳**: \`/translate-channel add-source\`
**ロール制限**: \`/translate-role add-whitelist\`
**詳細設定**: \`/translate-setup\``,
                        inline: false
                    }
                ],
                footer: {
                    text: 'ヘルプが必要な場合は /translate-help commands をご利用ください'
                },
                timestamp: new Date()
            };

            await interaction.editReply({
                embeds: [embed]
            });

            // 使用量情報も表示
            try {
                const usage = await translator.getUsageInfo();
                if (usage) {
                    const usageEmbed = {
                        title: '📊 DeepL API使用状況',
                        color: 0x0099FF,
                        fields: [
                            {
                                name: '現在の使用量',
                                value: `${usage.characterCount.toLocaleString()} / ${usage.characterLimit.toLocaleString()} 文字 (${usage.percentageUsed}%)`,
                                inline: false
                            }
                        ],
                        footer: {
                            text: '使用量は月次でリセットされます'
                        }
                    };

                    await interaction.followUp({
                        embeds: [usageEmbed],
                        flags: ['Ephemeral']
                    });
                }
            } catch (error) {
                console.log('API使用量の取得をスキップしました:', error.message);
            }

        } catch (error) {
            console.error('クイックスタートエラー:', error);
            await interaction.editReply({
                content: '❌ セットアップ中にエラーが発生しました。手動で `/translate-setup` をお試しください。'
            });
        }
    }
};
