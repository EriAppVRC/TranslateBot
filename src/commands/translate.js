const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('テキストを手動で翻訳')
        .addStringOption(option =>
            option
                .setName('text')
                .setDescription('翻訳するテキスト')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('from')
                .setDescription('元言語（未指定で自動検出）')
                .setRequired(false)
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
                .setName('to')
                .setDescription('翻訳先言語（未指定でサーバー設定）')
                .setRequired(false)
                .addChoices(
                    { name: '日本語', value: 'JA' },
                    { name: '英語（アメリカ）', value: 'EN-US' },
                    { name: '英語（イギリス）', value: 'EN-GB' },
                    { name: '中国語', value: 'ZH' },
                    { name: '韓国語', value: 'KO' },
                    { name: 'フランス語', value: 'FR' },
                    { name: 'ドイツ語', value: 'DE' },
                    { name: 'スペイン語', value: 'ES' }
                )
        )
        .addBooleanOption(option =>
            option
                .setName('public')
                .setDescription('翻訳結果を全員に表示するか（デフォルト: あなたのみ）')
                .setRequired(false)
        ),

    async execute(interaction, db, translator) {
        const text = interaction.options.getString('text');
        const sourceLang = interaction.options.getString('from') || 'auto';
        const publicResult = interaction.options.getBoolean('public') || false;

        // 翻訳先言語の決定
        let targetLang = interaction.options.getString('to');
        if (!targetLang) {
            if (!interaction.guild) {
                targetLang = 'JA'; // デフォルトで日本語
            } else {
                const settings = await db.getGuildSettings(interaction.guild.id);
                targetLang = settings.target_lang;
            }
        }

        // 翻訳可能かチェック
        if (!translator.isTranslatable(text)) {
            await interaction.reply({
                content: '❌ このテキストは翻訳できません。テキストの長さや内容を確認してください。',
                flags: ['Ephemeral']
            });
            return;
        }

        // 同じ言語への翻訳をチェック
        if (sourceLang === targetLang && sourceLang !== 'auto') {
            await interaction.reply({
                content: '❌ 元言語と翻訳先言語が同じです。',
                flags: ['Ephemeral']
            });
            return;
        }

        try {
            // 翻訳を実行（時間がかかる可能性があるため、deferで応答を遅延）
            await interaction.deferReply({ ephemeral: !publicResult });

            const translatedText = await translator.translate(text, sourceLang, targetLang);

            if (!translatedText || translatedText === text) {
                await interaction.editReply({
                    content: '❌ 翻訳に失敗したか、翻訳の必要がないテキストです。'
                });
                return;
            }

            // 結果を表示
            const embed = {
                title: '🌐 翻訳結果',
                color: 0x00AE86,
                fields: [
                    {
                        name: `📝 元のテキスト (${translator.getLanguageName(sourceLang)})`,
                        value: text.length > 1000 ? text.substring(0, 1000) + '...' : text,
                        inline: false
                    },
                    {
                        name: `✨ 翻訳結果 (${translator.getLanguageName(targetLang)})`,
                        value: translatedText.length > 1000 ? translatedText.substring(0, 1000) + '...' : translatedText,
                        inline: false
                    }
                ],
                footer: {
                    text: `翻訳者: ${interaction.user.displayName} | DeepL APIを使用`,
                    icon_url: interaction.user.displayAvatarURL()
                },
                timestamp: new Date()
            };

            await interaction.editReply({
                embeds: [embed]
            });

            // ログに記録 (サーバー内の場合のみ)
            if (interaction.guild) {
                await db.logTranslation(
                    interaction.guild.id, 
                    interaction.user.id, 
                    text, 
                    translatedText, 
                    sourceLang, 
                    targetLang
                );
            }

        } catch (error) {
            console.error('手動翻訳エラー:', error);
            
            const errorMessage = error.message.startsWith('❌') ? 
                error.message : 
                '❌ 翻訳中にエラーが発生しました。しばらく待ってからお試しください。';

            await interaction.editReply({
                content: errorMessage
            });
        }
    }
};
