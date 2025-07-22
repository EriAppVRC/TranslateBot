const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate-setup')
        .setDescription('翻訳機能の基本設定')
        .addSubcommand(subcommand =>
            subcommand
                .setName('language')
                .setDescription('翻訳言語を設定')
                .addStringOption(option =>
                    option
                        .setName('source')
                        .setDescription('元言語（autoで自動検出）')
                        .setRequired(true)
                        .addChoices(
                            { name: '自動検出', value: 'auto' },
                            { name: '日本語', value: 'JA' },
                            { name: '英語', value: 'EN' },
                            { name: '中国語', value: 'ZH' },
                            { name: '韓国語', value: 'KO' },
                            { name: 'フランス語', value: 'FR' },
                            { name: 'ドイツ語', value: 'DE' },
                            { name: 'スペイン語', value: 'ES' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('target')
                        .setDescription('翻訳先言語')
                        .setRequired(true)
                        .addChoices(
                            { name: '日本語', value: 'JA' },
                            { name: '英語（アメリカ）', value: 'EN-US' },
                            { name: '英語（イギリス）', value: 'EN-GB' },
                            { name: '中国語（簡体字）', value: 'ZH' },
                            { name: '韓国語', value: 'KO' },
                            { name: 'フランス語', value: 'FR' },
                            { name: 'ドイツ語', value: 'DE' },
                            { name: 'スペイン語', value: 'ES' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('翻訳機能のOn/Off切り替え')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('翻訳機能を有効にするか')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('現在の設定状況を表示')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('設定をデフォルトにリセット')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction, db, translator) {
        const subcommand = interaction.options.getSubcommand();
        
        if (!interaction.guild) {
            await interaction.reply({
                content: '❌ このコマンドはサーバー内でのみ使用できます。',
                flags: ['Ephemeral']
            });
            return;
        }
        
        const guildId = interaction.guild.id;

        try {
            switch (subcommand) {
                case 'language':
                    await this.setLanguage(interaction, db, translator);
                    break;
                case 'toggle':
                    await this.toggleTranslation(interaction, db);
                    break;
                case 'status':
                    await this.showStatus(interaction, db, translator);
                    break;
                case 'reset':
                    await this.resetSettings(interaction, db);
                    break;
            }
        } catch (error) {
            console.error('コマンドエラー:', error);
            await interaction.reply({
                content: '❌ 設定の更新中にエラーが発生しました。',
                flags: ['Ephemeral']
            });
        }
    },

    async setLanguage(interaction, db, translator) {
        const sourceLang = interaction.options.getString('source');
        const targetLang = interaction.options.getString('target');

        if (sourceLang === targetLang && sourceLang !== 'auto') {
            await interaction.reply({
                content: '❌ 元言語と翻訳先言語を同じにすることはできません。',
                flags: ['Ephemeral']
            });
            return;
        }

        await db.updateGuildSettings(interaction.guild.id, {
            source_lang: sourceLang,
            target_lang: targetLang
        });

        const sourceLanguageName = translator.getLanguageName(sourceLang);
        const targetLanguageName = translator.getLanguageName(targetLang);

        await interaction.reply({
            content: `✅ 翻訳言語を設定しました。\n**元言語**: ${sourceLanguageName}\n**翻訳先**: ${targetLanguageName}`,
            flags: ['Ephemeral']
        });
    },

    async toggleTranslation(interaction, db) {
        const enabled = interaction.options.getBoolean('enabled');

        await db.updateGuildSettings(interaction.guild.id, {
            enabled: enabled
        });

        const status = enabled ? '有効' : '無効';
        const emoji = enabled ? '✅' : '❌';

        await interaction.reply({
            content: `${emoji} 翻訳機能を${status}にしました。`,
            flags: ['Ephemeral']
        });
    },

    async showStatus(interaction, db, translator) {
        const settings = await db.getGuildSettings(interaction.guild.id);
        const stats = await db.getTranslationStats(interaction.guild.id);
        
        // DeepL API使用量を取得
        let usageInfo = null;
        try {
            usageInfo = await translator.getUsageInfo();
        } catch (error) {
            console.log('使用量情報の取得に失敗しました:', error.message);
        }

        const embed = {
            title: '⚙️ 翻訳Bot設定状況',
            color: settings.enabled ? 0x00AE86 : 0xFF0000,
            fields: [
                {
                    name: '状態',
                    value: settings.enabled ? '🟢 有効' : '🔴 無効',
                    inline: true
                },
                {
                    name: '翻訳設定',
                    value: `**元言語**: ${translator.getLanguageName(settings.source_lang)}\n**翻訳先**: ${translator.getLanguageName(settings.target_lang)}`,
                    inline: true
                },
                {
                    name: '統計情報',
                    value: `**総翻訳数**: ${stats.total_translations || 0}\n**今日の翻訳数**: ${stats.daily_translations || 0}`,
                    inline: true
                },
                {
                    name: 'チャンネル設定',
                    value: `**対象**: ${settings.source_channels.length === 0 ? 'すべて' : `${settings.source_channels.length}チャンネル`}\n**出力先**: ${settings.target_channel ? '<#' + settings.target_channel + '>' : '元のチャンネル'}`,
                    inline: true
                },
                {
                    name: 'ロール制限',
                    value: `**ホワイトリスト**: ${settings.whitelisted_roles.length}個\n**ブラックリスト**: ${settings.blacklisted_roles.length}個`,
                    inline: true
                }
            ]
        };

        if (usageInfo) {
            embed.fields.push({
                name: 'DeepL API使用量',
                value: `**使用済み**: ${usageInfo.characterCount.toLocaleString()}文字\n**制限**: ${usageInfo.characterLimit.toLocaleString()}文字\n**使用率**: ${usageInfo.percentageUsed}%`,
                inline: true
            });
        }

        embed.footer = {
            text: `サーバーID: ${interaction.guild.id} | 最終更新: ${settings.updated_at || '未設定'}`
        };

        await interaction.reply({
            embeds: [embed],
            flags: ['Ephemeral']
        });
    },

    async resetSettings(interaction, db) {
        // デフォルト設定で更新
        await db.updateGuildSettings(interaction.guild.id, {
            enabled: true,
            source_lang: 'auto',
            target_lang: 'JA',
            source_channels: [],
            target_channel: null,
            whitelisted_roles: [],
            blacklisted_roles: []
        });

        await interaction.reply({
            content: '✅ 設定をデフォルトにリセットしました。\n**元言語**: 自動検出\n**翻訳先**: 日本語\n**その他制限**: すべて解除',
            flags: ['Ephemeral']
        });
    }
};
