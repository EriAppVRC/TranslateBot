const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate-rules')
        .setDescription('複数言語翻訳ルールの管理')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('新しい翻訳ルールを追加')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('ルール名（例: auto→ja, ja→zh など）')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('source')
                        .setDescription('元言語')
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
                .addIntegerOption(option =>
                    option
                        .setName('priority')
                        .setDescription('優先度（高いほど優先、デフォルト: 1）')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('現在の翻訳ルール一覧を表示')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('翻訳ルールを削除')
                .addIntegerOption(option =>
                    option
                        .setName('rule-id')
                        .setDescription('削除するルールのID')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('翻訳ルールの有効/無効を切り替え')
                .addIntegerOption(option =>
                    option
                        .setName('rule-id')
                        .setDescription('切り替えるルールのID')
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('有効にするかどうか')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('preset')
                .setDescription('よく使われるルールセットを一括追加')
                .addStringOption(option =>
                    option
                        .setName('preset-type')
                        .setDescription('プリセットの種類')
                        .setRequired(true)
                        .addChoices(
                            { name: '多言語→日本語', value: 'to-japanese' },
                            { name: '日本語→多言語', value: 'from-japanese' },
                            { name: '全言語相互翻訳', value: 'multilingual' }
                        )
                )
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
        
        try {
            switch (subcommand) {
                case 'add':
                    await this.addRule(interaction, db, translator);
                    break;
                case 'list':
                    await this.listRules(interaction, db, translator);
                    break;
                case 'remove':
                    await this.removeRule(interaction, db);
                    break;
                case 'toggle':
                    await this.toggleRule(interaction, db);
                    break;
                case 'preset':
                    await this.addPreset(interaction, db, translator);
                    break;
            }
        } catch (error) {
            console.error('翻訳ルールコマンドエラー:', error);
            await interaction.reply({
                content: '❌ ルール設定中にエラーが発生しました。',
                flags: ['Ephemeral']
            });
        }
    },

    async addRule(interaction, db, translator) {
        const name = interaction.options.getString('name');
        const sourceLang = interaction.options.getString('source');
        const targetLang = interaction.options.getString('target');
        const priority = interaction.options.getInteger('priority') || 1;

        if (sourceLang === targetLang && sourceLang !== 'auto') {
            await interaction.reply({
                content: '❌ 元言語と翻訳先言語を同じにすることはできません。',
                flags: ['Ephemeral']
            });
            return;
        }

        try {
            await db.addTranslationRule(interaction.guild.id, name, sourceLang, targetLang, priority);

            const sourceLanguageName = translator.getLanguageName(sourceLang);
            const targetLanguageName = translator.getLanguageName(targetLang);

            await interaction.reply({
                content: `✅ 翻訳ルール「${name}」を追加しました。\n**${sourceLanguageName}** → **${targetLanguageName}** (優先度: ${priority})`,
                flags: ['Ephemeral']
            });
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                await interaction.reply({
                    content: `❌ 同じ言語ペア（${sourceLang} → ${targetLang}）のルールは既に存在します。`,
                    flags: ['Ephemeral']
                });
            } else {
                throw error;
            }
        }
    },

    async listRules(interaction, db, translator) {
        const rules = await db.getTranslationRules(interaction.guild.id);

        if (rules.length === 0) {
            await interaction.reply({
                content: '❌ 翻訳ルールが設定されていません。\n`/translate-rules add` で新しいルールを追加してください。',
                flags: ['Ephemeral']
            });
            return;
        }

        const embed = {
            title: '📋 翻訳ルール一覧',
            color: 0x00AE86,
            fields: rules.map(rule => ({
                name: `${rule.enabled ? '✅' : '❌'} ${rule.rule_name} (ID: ${rule.id})`,
                value: `${translator.getLanguageName(rule.source_lang)} → ${translator.getLanguageName(rule.target_lang)}\n優先度: ${rule.priority}`,
                inline: true
            })),
            footer: {
                text: '優先度が高いルールから順に適用されます'
            }
        };

        await interaction.reply({
            embeds: [embed],
            flags: ['Ephemeral']
        });
    },

    async removeRule(interaction, db) {
        const ruleId = interaction.options.getInteger('rule-id');

        const changes = await db.removeTranslationRule(interaction.guild.id, ruleId);

        if (changes === 0) {
            await interaction.reply({
                content: `❌ ID ${ruleId} のルールが見つかりません。`,
                flags: ['Ephemeral']
            });
            return;
        }

        await interaction.reply({
            content: `✅ ID ${ruleId} の翻訳ルールを削除しました。`,
            flags: ['Ephemeral']
        });
    },

    async toggleRule(interaction, db) {
        const ruleId = interaction.options.getInteger('rule-id');
        const enabled = interaction.options.getBoolean('enabled');

        const changes = await db.toggleTranslationRule(interaction.guild.id, ruleId, enabled);

        if (changes === 0) {
            await interaction.reply({
                content: `❌ ID ${ruleId} のルールが見つかりません。`,
                flags: ['Ephemeral']
            });
            return;
        }

        const status = enabled ? '有効' : '無効';
        await interaction.reply({
            content: `✅ ID ${ruleId} の翻訳ルールを${status}にしました。`,
            flags: ['Ephemeral']
        });
    },

    async addPreset(interaction, db, translator) {
        const presetType = interaction.options.getString('preset-type');
        
        let rules = [];
        switch (presetType) {
            case 'to-japanese':
                rules = [
                    { name: 'auto→ja', source: 'auto', target: 'JA', priority: 5 }
                ];
                break;
            case 'from-japanese':
                rules = [
                    { name: 'ja→en', source: 'JA', target: 'EN-US', priority: 3 },
                    { name: 'ja→zh', source: 'JA', target: 'ZH', priority: 3 },
                    { name: 'ja→ko', source: 'JA', target: 'KO', priority: 3 }
                ];
                break;
            case 'multilingual':
                rules = [
                    { name: 'auto→ja', source: 'auto', target: 'JA', priority: 5 },
                    { name: 'ja→en', source: 'JA', target: 'EN-US', priority: 3 },
                    { name: 'ja→zh', source: 'JA', target: 'ZH', priority: 3 }
                ];
                break;
        }

        let addedCount = 0;
        for (const rule of rules) {
            try {
                await db.addTranslationRule(interaction.guild.id, rule.name, rule.source, rule.target, rule.priority);
                addedCount++;
            } catch (error) {
                // 既存のルールはスキップ
                if (!error.message.includes('UNIQUE constraint failed')) {
                    throw error;
                }
            }
        }

        await interaction.reply({
            content: `✅ プリセット「${presetType}」から ${addedCount} 個のルールを追加しました。\n\`/translate-rules list\` で確認できます。`,
            flags: ['Ephemeral']
        });
    }
};
