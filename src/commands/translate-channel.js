const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate-channel')
        .setDescription('翻訳対象チャンネルと出力先チャンネルを設定')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-source')
                .setDescription('翻訳対象チャンネルを追加')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('翻訳対象にするチャンネル')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-source')
                .setDescription('翻訳対象チャンネルを削除')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('翻訳対象から除外するチャンネル')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-target')
                .setDescription('翻訳結果の出力先チャンネルを設定')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('翻訳結果を出力するチャンネル（未指定で元のチャンネル）')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('現在のチャンネル設定を表示')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

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
                case 'add-source':
                    await this.addSourceChannel(interaction, db, settings);
                    break;
                case 'remove-source':
                    await this.removeSourceChannel(interaction, db, settings);
                    break;
                case 'set-target':
                    await this.setTargetChannel(interaction, db, settings);
                    break;
                case 'list':
                    await this.listChannelSettings(interaction, settings);
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

    async addSourceChannel(interaction, db, settings) {
        const channel = interaction.options.getChannel('channel');
        
        if (settings.source_channels.includes(channel.id)) {
            await interaction.reply({
                content: `❌ <#${channel.id}> は既に翻訳対象チャンネルに設定されています。`,
                flags: ['Ephemeral']
            });
            return;
        }

        settings.source_channels.push(channel.id);
        await db.updateGuildSettings(interaction.guild.id, {
            source_channels: settings.source_channels
        });

        await interaction.reply({
            content: `✅ <#${channel.id}> を翻訳対象チャンネルに追加しました。`,
            flags: ['Ephemeral']
        });
    },

    async removeSourceChannel(interaction, db, settings) {
        const channel = interaction.options.getChannel('channel');
        
        const index = settings.source_channels.indexOf(channel.id);
        if (index === -1) {
            await interaction.reply({
                content: `❌ <#${channel.id}> は翻訳対象チャンネルに設定されていません。`,
                flags: ['Ephemeral']
            });
            return;
        }

        settings.source_channels.splice(index, 1);
        await db.updateGuildSettings(interaction.guild.id, {
            source_channels: settings.source_channels
        });

        await interaction.reply({
            content: `✅ <#${channel.id}> を翻訳対象チャンネルから削除しました。`,
            flags: ['Ephemeral']
        });
    },

    async setTargetChannel(interaction, db, settings) {
        const channel = interaction.options.getChannel('channel');
        
        await db.updateGuildSettings(interaction.guild.id, {
            target_channel: channel ? channel.id : null
        });

        const message = channel 
            ? `✅ 翻訳結果の出力先を <#${channel.id}> に設定しました。`
            : '✅ 翻訳結果を元のチャンネルに出力するように設定しました。';

        await interaction.reply({
            content: message,
            flags: ['Ephemeral']
        });
    },

    async listChannelSettings(interaction, settings) {
        const embed = {
            title: '📺 チャンネル設定',
            color: 0x00AE86,
            fields: [
                {
                    name: '翻訳対象チャンネル',
                    value: settings.source_channels.length > 0 
                        ? settings.source_channels.map(id => `<#${id}>`).join('\n')
                        : 'すべてのチャンネル',
                    inline: true
                },
                {
                    name: '翻訳結果出力先',
                    value: settings.target_channel 
                        ? `<#${settings.target_channel}>`
                        : '元のチャンネル',
                    inline: true
                }
            ],
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
