const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate-role')
        .setDescription('ロールベースの翻訳制限を設定')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-whitelist')
                .setDescription('ホワイトリストにロールを追加（指定ロールのみ翻訳可能）')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('ホワイトリストに追加するロール')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-whitelist')
                .setDescription('ホワイトリストからロールを削除')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('ホワイトリストから削除するロール')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-blacklist')
                .setDescription('ブラックリストにロールを追加（指定ロールは翻訳不可）')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('ブラックリストに追加するロール')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-blacklist')
                .setDescription('ブラックリストからロールを削除')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('ブラックリストから削除するロール')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('すべてのロール制限をクリア')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('クリアする制限タイプ')
                        .setRequired(true)
                        .addChoices(
                            { name: 'ホワイトリスト', value: 'whitelist' },
                            { name: 'ブラックリスト', value: 'blacklist' },
                            { name: 'すべて', value: 'all' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('現在のロール制限設定を表示')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

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
            const settings = await db.getGuildSettings(guildId);

            switch (subcommand) {
                case 'add-whitelist':
                    await this.addWhitelistRole(interaction, db, settings);
                    break;
                case 'remove-whitelist':
                    await this.removeWhitelistRole(interaction, db, settings);
                    break;
                case 'add-blacklist':
                    await this.addBlacklistRole(interaction, db, settings);
                    break;
                case 'remove-blacklist':
                    await this.removeBlacklistRole(interaction, db, settings);
                    break;
                case 'clear':
                    await this.clearRoleRestrictions(interaction, db, settings);
                    break;
                case 'list':
                    await this.listRoleSettings(interaction, settings);
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

    async addWhitelistRole(interaction, db, settings) {
        const role = interaction.options.getRole('role');
        
        if (settings.whitelisted_roles.includes(role.id)) {
            await interaction.reply({
                content: `❌ ${role.name} は既にホワイトリストに設定されています。`,
                flags: ['Ephemeral']
            });
            return;
        }

        // ブラックリストから削除（競合を避けるため）
        const blacklistIndex = settings.blacklisted_roles.indexOf(role.id);
        if (blacklistIndex !== -1) {
            settings.blacklisted_roles.splice(blacklistIndex, 1);
        }

        settings.whitelisted_roles.push(role.id);
        await db.updateGuildSettings(interaction.guild.id, {
            whitelisted_roles: settings.whitelisted_roles,
            blacklisted_roles: settings.blacklisted_roles
        });

        await interaction.reply({
            content: `✅ ${role.name} をホワイトリストに追加しました。${blacklistIndex !== -1 ? '\n（ブラックリストからも削除されました）' : ''}`,
            flags: ['Ephemeral']
        });
    },

    async removeWhitelistRole(interaction, db, settings) {
        const role = interaction.options.getRole('role');
        
        const index = settings.whitelisted_roles.indexOf(role.id);
        if (index === -1) {
            await interaction.reply({
                content: `❌ ${role.name} はホワイトリストに設定されていません。`,
                flags: ['Ephemeral']
            });
            return;
        }

        settings.whitelisted_roles.splice(index, 1);
        await db.updateGuildSettings(interaction.guild.id, {
            whitelisted_roles: settings.whitelisted_roles
        });

        await interaction.reply({
            content: `✅ ${role.name} をホワイトリストから削除しました。`,
            flags: ['Ephemeral']
        });
    },

    async addBlacklistRole(interaction, db, settings) {
        const role = interaction.options.getRole('role');
        
        if (settings.blacklisted_roles.includes(role.id)) {
            await interaction.reply({
                content: `❌ ${role.name} は既にブラックリストに設定されています。`,
                flags: ['Ephemeral']
            });
            return;
        }

        // ホワイトリストから削除（競合を避けるため）
        const whitelistIndex = settings.whitelisted_roles.indexOf(role.id);
        if (whitelistIndex !== -1) {
            settings.whitelisted_roles.splice(whitelistIndex, 1);
        }

        settings.blacklisted_roles.push(role.id);
        await db.updateGuildSettings(interaction.guild.id, {
            whitelisted_roles: settings.whitelisted_roles,
            blacklisted_roles: settings.blacklisted_roles
        });

        await interaction.reply({
            content: `✅ ${role.name} をブラックリストに追加しました。${whitelistIndex !== -1 ? '\n（ホワイトリストからも削除されました）' : ''}`,
            flags: ['Ephemeral']
        });
    },

    async removeBlacklistRole(interaction, db, settings) {
        const role = interaction.options.getRole('role');
        
        const index = settings.blacklisted_roles.indexOf(role.id);
        if (index === -1) {
            await interaction.reply({
                content: `❌ ${role.name} はブラックリストに設定されていません。`,
                flags: ['Ephemeral']
            });
            return;
        }

        settings.blacklisted_roles.splice(index, 1);
        await db.updateGuildSettings(interaction.guild.id, {
            blacklisted_roles: settings.blacklisted_roles
        });

        await interaction.reply({
            content: `✅ ${role.name} をブラックリストから削除しました。`,
            flags: ['Ephemeral']
        });
    },

    async clearRoleRestrictions(interaction, db, settings) {
        const type = interaction.options.getString('type');
        
        const updates = {};
        let message = '';

        switch (type) {
            case 'whitelist':
                updates.whitelisted_roles = [];
                message = 'ホワイトリストをクリアしました。';
                break;
            case 'blacklist':
                updates.blacklisted_roles = [];
                message = 'ブラックリストをクリアしました。';
                break;
            case 'all':
                updates.whitelisted_roles = [];
                updates.blacklisted_roles = [];
                message = 'すべてのロール制限をクリアしました。';
                break;
        }

        await db.updateGuildSettings(interaction.guild.id, updates);

        await interaction.reply({
            content: `✅ ${message}`,
            flags: ['Ephemeral']
        });
    },

    async listRoleSettings(interaction, settings) {
        const embed = {
            title: '👥 ロール制限設定',
            color: 0x00AE86,
            fields: [
                {
                    name: 'ホワイトリスト（翻訳可能）',
                    value: settings.whitelisted_roles.length > 0 
                        ? settings.whitelisted_roles.map(id => `<@&${id}>`).join('\n')
                        : '設定なし（すべてのロール）',
                    inline: true
                },
                {
                    name: 'ブラックリスト（翻訳不可）',
                    value: settings.blacklisted_roles.length > 0 
                        ? settings.blacklisted_roles.map(id => `<@&${id}>`).join('\n')
                        : '設定なし',
                    inline: true
                }
            ],
            description: settings.whitelisted_roles.length > 0 
                ? '⚠️ ホワイトリストが設定されている場合、そのロールを持つユーザーのみ翻訳機能を使用できます。'
                : 'ブラックリストに登録されたロールのユーザーは翻訳機能を使用できません。',
            footer: {
                text: '設定を変更するには他のサブコマンドを使用してください'
            }
        };

        await interaction.reply({
            embeds: [embed],
            flags: ['Ephemeral']
        });
    }
};
