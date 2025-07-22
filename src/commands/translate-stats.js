const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate-stats')
        .setDescription('翻訳統計情報を表示')
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('サーバーの翻訳統計を表示')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('ユーザーの翻訳統計を表示')
                .addUserOption(option =>
                    option
                        .setName('target')
                        .setDescription('統計を表示するユーザー（未指定で自分）')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('usage')
                .setDescription('DeepL API使用量を表示')
        ),

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
        const stats = await db.getTranslationStats(guildId);
        
        // 過去7日間の統計を取得
        const weeklyStats = await this.getWeeklyStats(db, guildId);
        
        // 人気の翻訳言語ペアを取得
        const popularLanguages = await this.getPopularLanguagePairs(db, guildId);

        const embed = {
            title: `📊 ${interaction.guild.name} の翻訳統計`,
            color: 0x00AE86,
            fields: [
                {
                    name: '📈 基本統計',
                    value: `**総翻訳数**: ${(stats.total_translations || 0).toLocaleString()}\n**今日の翻訳数**: ${stats.daily_translations || 0}\n**7日間平均**: ${Math.round(weeklyStats.average || 0)}`,
                    inline: true
                },
                {
                    name: '👑 最も活発なユーザー',
                    value: stats.most_active_user ? `<@${stats.most_active_user}>\n(${stats.most_active_count || 0}回)` : 'データなし',
                    inline: true
                },
                {
                    name: '🌍 人気の言語ペア',
                    value: popularLanguages.length > 0 ? 
                        popularLanguages.map(pair => `${pair.source_lang} → ${pair.target_lang}: ${pair.count}回`).join('\n') :
                        'データなし',
                    inline: false
                }
            ],
            footer: {
                text: `データ期間: ${stats.created_at || '不明'} ～ 現在`
            },
            timestamp: new Date()
        };

        // 週次トレンドグラフ（簡易版）
        if (weeklyStats.daily) {
            const trendLine = weeklyStats.daily.map(count => 
                '█'.repeat(Math.max(1, Math.round(count / 10)))
            ).join('\n');
            
            embed.fields.push({
                name: '📅 7日間のトレンド',
                value: '```\n' + trendLine + '\n```',
                inline: false
            });
        }

        await interaction.reply({
            embeds: [embed],
            ephemeral: false
        });
    },

    async showUserStats(interaction, db) {
        const targetUser = interaction.options.getUser('target') || interaction.user;
        const guildId = interaction.guild.id;
        
        const userStats = await this.getUserStats(db, guildId, targetUser.id);
        
        if (!userStats || userStats.total === 0) {
            await interaction.reply({
                content: `${targetUser.displayName}の翻訳記録は見つかりませんでした。`,
                flags: ['Ephemeral']
            });
            return;
        }

        const embed = {
            title: `👤 ${targetUser.displayName} の翻訳統計`,
            color: 0x00AE86,
            thumbnail: {
                url: targetUser.displayAvatarURL()
            },
            fields: [
                {
                    name: '📊 翻訳回数',
                    value: `**総回数**: ${userStats.total}\n**今日**: ${userStats.today}\n**今週**: ${userStats.thisWeek}`,
                    inline: true
                },
                {
                    name: '📅 アクティブ期間',
                    value: `**初回翻訳**: ${userStats.firstTranslation}\n**最新翻訳**: ${userStats.lastTranslation}`,
                    inline: true
                },
                {
                    name: '🏆 ランキング',
                    value: `サーバー内 **${userStats.rank || '?'}位**`,
                    inline: true
                },
                {
                    name: '🌍 よく使う言語ペア',
                    value: userStats.favoriteLanguages.length > 0 ?
                        userStats.favoriteLanguages.slice(0, 3).map(pair => 
                            `${pair.source_lang} → ${pair.target_lang}: ${pair.count}回`
                        ).join('\n') :
                        'データなし',
                    inline: false
                }
            ],
            footer: {
                text: `統計生成時刻`
            },
            timestamp: new Date()
        };

        await interaction.reply({
            embeds: [embed],
            ephemeral: interaction.options.getUser('target') ? false : true
        });
    },

    async showAPIUsage(interaction, translator) {
        try {
            const usageInfo = await translator.getUsageInfo();
            
            if (!usageInfo) {
                await interaction.reply({
                    content: '❌ DeepL APIの使用量情報を取得できませんでした。',
                    flags: ['Ephemeral']
                });
                return;
            }

            const remainingChars = usageInfo.characterLimit - usageInfo.characterCount;
            const progressBar = this.createProgressBar(parseFloat(usageInfo.percentageUsed), 20);

            const embed = {
                title: '🔧 DeepL API使用量',
                color: parseFloat(usageInfo.percentageUsed) > 80 ? 0xFF0000 : 0x00AE86,
                fields: [
                    {
                        name: '📊 使用量',
                        value: `**使用済み**: ${usageInfo.characterCount.toLocaleString()}文字\n**制限**: ${usageInfo.characterLimit.toLocaleString()}文字\n**残り**: ${remainingChars.toLocaleString()}文字`,
                        inline: true
                    },
                    {
                        name: '📈 使用率',
                        value: `**${usageInfo.percentageUsed}%**\n${progressBar}`,
                        inline: true
                    }
                ],
                footer: {
                    text: '使用量は月次でリセットされます'
                },
                timestamp: new Date()
            };

            if (parseFloat(usageInfo.percentageUsed) > 90) {
                embed.description = '⚠️ **警告**: API使用量が90%を超えています！';
            } else if (parseFloat(usageInfo.percentageUsed) > 80) {
                embed.description = '⚠️ API使用量が80%を超えています。';
            }

            await interaction.reply({
                embeds: [embed],
                flags: ['Ephemeral']
            });
        } catch (error) {
            await interaction.reply({
                content: `❌ API使用量の取得に失敗しました: ${error.message}`,
                flags: ['Ephemeral']
            });
        }
    },

    // ヘルパーメソッド
    async getWeeklyStats(db, guildId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count
                FROM translation_logs 
                WHERE guild_id = ? AND created_at >= datetime('now', '-7 days')
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `;
            
            db.db.all(query, [guildId], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                const daily = rows.map(row => row.count);
                const average = daily.length > 0 ? daily.reduce((a, b) => a + b, 0) / daily.length : 0;

                resolve({
                    daily: daily,
                    average: average
                });
            });
        });
    },

    async getPopularLanguagePairs(db, guildId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    source_lang,
                    target_lang,
                    COUNT(*) as count
                FROM translation_logs 
                WHERE guild_id = ?
                GROUP BY source_lang, target_lang
                ORDER BY count DESC
                LIMIT 5
            `;
            
            db.db.all(query, [guildId], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows || []);
            });
        });
    },

    async getUserStats(db, guildId, userId) {
        return new Promise((resolve, reject) => {
            const queries = [
                // 基本統計
                `SELECT 
                    COUNT(*) as total,
                    MIN(created_at) as first_translation,
                    MAX(created_at) as last_translation
                FROM translation_logs 
                WHERE guild_id = ? AND user_id = ?`,
                // 今日の統計
                `SELECT COUNT(*) as today
                FROM translation_logs 
                WHERE guild_id = ? AND user_id = ? AND date(created_at) = date('now')`,
                // 今週の統計
                `SELECT COUNT(*) as this_week
                FROM translation_logs 
                WHERE guild_id = ? AND user_id = ? AND created_at >= datetime('now', '-7 days')`,
                // 言語ペア統計
                `SELECT 
                    source_lang, 
                    target_lang, 
                    COUNT(*) as count
                FROM translation_logs 
                WHERE guild_id = ? AND user_id = ?
                GROUP BY source_lang, target_lang
                ORDER BY count DESC
                LIMIT 5`
            ];

            let results = {};
            let completed = 0;

            queries.forEach((query, index) => {
                db.db.all(query, [guildId, userId], (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    switch (index) {
                        case 0:
                            results.total = rows[0]?.total || 0;
                            results.firstTranslation = rows[0]?.first_translation || 'なし';
                            results.lastTranslation = rows[0]?.last_translation || 'なし';
                            break;
                        case 1:
                            results.today = rows[0]?.today || 0;
                            break;
                        case 2:
                            results.thisWeek = rows[0]?.this_week || 0;
                            break;
                        case 3:
                            results.favoriteLanguages = rows || [];
                            break;
                    }

                    completed++;
                    if (completed === queries.length) {
                        resolve(results);
                    }
                });
            });
        });
    },

    createProgressBar(percentage, length) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percentage}%`;
    }
};
