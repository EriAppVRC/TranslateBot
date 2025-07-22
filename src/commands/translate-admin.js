const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate-admin')
        .setDescription('翻訳Bot管理コマンド')
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear-logs')
                .setDescription('翻訳ログをクリア')
                .addIntegerOption(option =>
                    option
                        .setName('days')
                        .setDescription('何日前より古いログを削除するか（デフォルト: 30日）')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(365)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('export-logs')
                .setDescription('翻訳ログをエクスポート')
                .addIntegerOption(option =>
                    option
                        .setName('limit')
                        .setDescription('エクスポートする件数（デフォルト: 100）')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(1000)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('maintenance')
                .setDescription('メンテナンスモードの切り替え')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('メンテナンスモードを有効にするか')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('backup-settings')
                .setDescription('現在の設定をバックアップ')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

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

        await interaction.deferReply({ flags: ['Ephemeral'] });

        try {
            const deletedCount = await new Promise((resolve, reject) => {
                const query = `
                    DELETE FROM translation_logs 
                    WHERE guild_id = ? AND created_at < datetime('now', '-${days} days')
                `;
                
                db.db.run(query, [guildId], function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(this.changes);
                });
            });

            await interaction.editReply({
                content: `✅ ${days}日前より古い翻訳ログを削除しました。（${deletedCount}件削除）`
            });

        } catch (error) {
            await interaction.editReply({
                content: `❌ ログの削除中にエラーが発生しました: ${error.message}`
            });
        }
    },

    async exportLogs(interaction, db) {
        const limit = interaction.options.getInteger('limit') || 100;
        const guildId = interaction.guild.id;

        await interaction.deferReply({ flags: ['Ephemeral'] });

        try {
            const logs = await new Promise((resolve, reject) => {
                const query = `
                    SELECT 
                        user_id,
                        original_text,
                        translated_text,
                        source_lang,
                        target_lang,
                        created_at
                    FROM translation_logs 
                    WHERE guild_id = ?
                    ORDER BY created_at DESC
                    LIMIT ?
                `;
                
                db.db.all(query, [guildId, limit], (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(rows || []);
                });
            });

            if (logs.length === 0) {
                await interaction.editReply({
                    content: '📊 エクスポートできる翻訳ログがありません。'
                });
                return;
            }

            // CSVデータを生成
            const csvHeader = 'ユーザーID,元テキスト,翻訳テキスト,元言語,翻訳先言語,作成日時\n';
            const csvData = logs.map(log => {
                const escapeCsv = (str) => `"${str.replace(/"/g, '""')}"`;
                return [
                    log.user_id,
                    escapeCsv(log.original_text),
                    escapeCsv(log.translated_text),
                    log.source_lang,
                    log.target_lang,
                    log.created_at
                ].join(',');
            }).join('\n');

            const csvContent = csvHeader + csvData;
            const buffer = Buffer.from(csvContent, 'utf8');

            await interaction.editReply({
                content: `📊 翻訳ログを${logs.length}件エクスポートしました。`,
                files: [{
                    attachment: buffer,
                    name: `translation_logs_${interaction.guild.name}_${new Date().toISOString().split('T')[0]}.csv`
                }]
            });

        } catch (error) {
            await interaction.editReply({
                content: `❌ ログのエクスポート中にエラーが発生しました: ${error.message}`
            });
        }
    },

    async toggleMaintenance(interaction, db) {
        const enabled = interaction.options.getBoolean('enabled');
        const guildId = interaction.guild.id;

        // メンテナンスモードは翻訳機能を無効にする
        await db.updateGuildSettings(guildId, {
            enabled: !enabled, // メンテナンスモードがtrueなら翻訳を無効に
            maintenance_mode: enabled
        });

        const status = enabled ? '🔧 メンテナンスモードを有効にしました。翻訳機能は一時的に停止します。' : 
                                '✅ メンテナンスモードを無効にしました。翻訳機能が再開されます。';

        await interaction.reply({
            content: status,
            flags: ['Ephemeral']
        });

        // パブリック通知（オプション）
        if (enabled) {
            const embed = {
                title: '🔧 メンテナンス通知',
                description: '翻訳Botは現在メンテナンス中です。しばらくお待ちください。',
                color: 0xFFAA00,
                timestamp: new Date()
            };

            try {
                await interaction.followUp({
                    embeds: [embed]
                });
            } catch (error) {
                // パブリック通知が失敗しても処理を続行
                console.log('メンテナンス通知の送信に失敗しました:', error);
            }
        }
    },

    async backupSettings(interaction, db) {
        const guildId = interaction.guild.id;

        await interaction.deferReply({ flags: ['Ephemeral'] });

        try {
            const settings = await db.getGuildSettings(guildId);
            const stats = await db.getTranslationStats(guildId);

            const backupData = {
                guild_id: guildId,
                guild_name: interaction.guild.name,
                backup_date: new Date().toISOString(),
                settings: settings,
                stats: stats
            };

            const backupJson = JSON.stringify(backupData, null, 2);
            const buffer = Buffer.from(backupJson, 'utf8');

            await interaction.editReply({
                content: '✅ 設定データをバックアップしました。',
                files: [{
                    attachment: buffer,
                    name: `translate_bot_backup_${interaction.guild.name}_${new Date().toISOString().split('T')[0]}.json`
                }]
            });

        } catch (error) {
            await interaction.editReply({
                content: `❌ バックアップ作成中にエラーが発生しました: ${error.message}`
            });
        }
    }
};
