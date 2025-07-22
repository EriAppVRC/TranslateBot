require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const DatabaseManager = require('./utils/database');
const TranslationManager = require('./utils/translation');

class TranslateBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent, // Developer Portalで有効化済み
                GatewayIntentBits.GuildMembers
            ]
        });

        this.client.commands = new Collection();
        this.db = new DatabaseManager();
        this.translator = new TranslationManager();
        
        this.setupEventHandlers();
        this.loadCommands();
    }

    setupEventHandlers() {
        this.client.once('ready', () => {
            console.log(`✅ ${this.client.user.tag} がログインしました！`);
            
            // Intent状態の詳細確認
            const intents = this.client.options.intents;
            console.log('\n📊 Intent詳細診断:');
            console.log(`🏢 Guilds: ${intents.has(GatewayIntentBits.Guilds) ? '✅' : '❌'}`);
            console.log(`💬 GuildMessages: ${intents.has(GatewayIntentBits.GuildMessages) ? '✅' : '❌'}`);
            console.log(`📝 MessageContent: ${intents.has(GatewayIntentBits.MessageContent) ? '✅' : '❌'}`);
            console.log(`👥 GuildMembers: ${intents.has(GatewayIntentBits.GuildMembers) ? '✅' : '❌'}`);
            
            const hasMessageContent = intents.has(GatewayIntentBits.MessageContent);
            if (!hasMessageContent) {
                console.log('\n⚠️  重要: MESSAGE CONTENT INTENTが無効です');
                console.log('🔧 解決方法:');
                console.log('1. Discord Developer Portal (https://discord.com/developers/applications)');
                console.log('2. あなたのアプリケーション → Bot → Privileged Gateway Intents');
                console.log('3. MESSAGE CONTENT INTENT にチェックを入れる');
                console.log('4. Save Changes を押す');
                console.log('5. Botを完全に再起動する');
                console.log('\n✅ 現在利用可能: スラッシュコマンドのみ');
                console.log('❌ 現在利用不可: 自動翻訳機能\n');
            } else {
                console.log('\n✅ すべてのIntentが有効です - 全機能利用可能！');
            }
            
            this.client.user.setActivity(`翻訳待機中 | ${hasMessageContent ? '全機能' : 'コマンドのみ'}`, { type: 'WATCHING' });
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;

            const command = this.client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, this.db, this.translator);
            } catch (error) {
                console.error(`コマンドエラー (${interaction.commandName}):`, error.message);
                console.error('スタックトレース:', error.stack);
                
                const errorMessage = '❌ コマンドの実行中にエラーが発生しました。';
                
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: errorMessage, flags: ['Ephemeral'] });
                    } else {
                        await interaction.reply({ content: errorMessage, flags: ['Ephemeral'] });
                    }
                } catch (replyError) {
                    console.error('エラー応答の送信に失敗:', replyError.message);
                }
            }
        });

        this.client.on('messageCreate', async (message) => {
            // Botのメッセージは無視
            if (message.author.bot) return;

            // メッセージ内容の詳細ログ
            console.log(`📝 メッセージ受信: "${message.content}" (長さ: ${message.content?.length || 0})`);

            // Message Content Intentが無効の場合はスキップ
            if (!message.content || message.content.trim() === '') {
                console.log('⚠️ メッセージ内容が空または取得できません。MESSAGE CONTENT INTENTを確認してください。');
                return;
            }

            try {
                await this.handleTranslation(message);
            } catch (error) {
                console.error(`翻訳エラー:`, error.message);
                console.error('詳細:', error);
            }
        });
    }

    async handleTranslation(message) {
        if (!message || !message.guild || !message.author) return;

        console.log(`🔄 翻訳処理開始: "${message.content}"`);

        const guildSettings = await this.db.getGuildSettings(message.guild.id);
        console.log(`⚙️ ギルド設定:`, {
            enabled: guildSettings?.enabled,
            source_lang: guildSettings?.source_lang,
            target_lang: guildSettings?.target_lang,
            source_channels: guildSettings?.source_channels,
            current_channel: message.channel.id
        });
        
        // 翻訳機能が無効の場合はスキップ
        if (!guildSettings || !guildSettings.enabled) {
            console.log('❌ 翻訳機能が無効です');
            return;
        }

        // 指定チャンネルでない場合はスキップ
        if (guildSettings.source_channels && guildSettings.source_channels.length > 0 && 
            !guildSettings.source_channels.includes(message.channel.id)) {
            console.log('❌ 翻訳対象チャンネルではありません');
            return;
        }

        // ロール制限チェック
        if (!this.checkRolePermissions(message.member, guildSettings)) {
            console.log('❌ ロール権限により翻訳をスキップしました');
            return;
        }

        // メッセージが空でないかのみチェック
        if (!message.content || message.content.trim() === '') {
            console.log('❌ メッセージが空です');
            return;
        }

        console.log('✅ 翻訳実行中...');

        // 翻訳を実行
        try {
            // 複数言語ルールをチェック
            const translationRules = await this.db.getTranslationRules(message.guild.id);
            console.log(`📋 利用可能な翻訳ルール: ${translationRules.length}個`);

            if (translationRules.length > 0) {
                // ルールベースの翻訳を実行
                await this.executeMultipleTranslations(message, translationRules, guildSettings);
            } else {
                // 従来の単一翻訳を実行
                await this.executeSingleTranslation(message, guildSettings);
            }
        } catch (error) {
            console.error(`翻訳処理エラー: ${error.message}`);
        }
    }

    async executeSingleTranslation(message, guildSettings) {
        const translatedText = await this.translator.translate(
            message.content,
            guildSettings.source_lang || 'auto',
            guildSettings.target_lang || 'JA'
        );

        console.log(`📝 単一翻訳結果: "${translatedText}"`);

        if (translatedText && translatedText !== message.content) {
            await this.sendTranslation(message, translatedText, guildSettings);
            await this.db.logTranslation(message.guild.id, message.author.id, 
                message.content, translatedText, guildSettings.source_lang || 'auto', guildSettings.target_lang || 'JA');
        }
    }

    async executeMultipleTranslations(message, translationRules, guildSettings) {
        const detectedLang = await this.translator.detectLanguage(message.content);
        console.log(`🔍 検出された言語: ${detectedLang}`);

        const appliedRules = [];

        // 各ルールを優先度順に適用
        for (const rule of translationRules) {
            let shouldApply = false;

            if (rule.source_lang === 'auto') {
                // auto の場合は常に適用
                shouldApply = true;
            } else if (detectedLang && detectedLang.toUpperCase() === rule.source_lang) {
                // 検出された言語と一致する場合
                shouldApply = true;
            }

            if (shouldApply) {
                try {
                    const translatedText = await this.translator.translate(
                        message.content,
                        rule.source_lang,
                        rule.target_lang
                    );

                    if (translatedText && translatedText !== message.content) {
                        console.log(`📝 ルール「${rule.rule_name}」翻訳結果: "${translatedText}"`);
                        
                        // 複数の翻訳結果を送信
                        await this.sendTranslation(message, translatedText, guildSettings, rule.rule_name);
                        await this.db.logTranslation(message.guild.id, message.author.id, 
                            message.content, translatedText, rule.source_lang, rule.target_lang, rule.rule_name);
                        
                        appliedRules.push(rule.rule_name);
                    }
                } catch (error) {
                    console.error(`ルール「${rule.rule_name}」翻訳エラー:`, error.message);
                }
            }
        }

        console.log(`✅ 適用されたルール: ${appliedRules.join(', ') || 'なし'}`);
    }

    checkRolePermissions(member, settings) {
        if (!member || !member.roles || !member.roles.cache) return true;

        const memberRoles = member.roles.cache.map(role => role.id);

        // ブラックリストチェック
        if (settings.blacklisted_roles && settings.blacklisted_roles.length > 0) {
            const hasBlacklistedRole = memberRoles.some(roleId => 
                settings.blacklisted_roles.includes(roleId)
            );
            if (hasBlacklistedRole) return false;
        }

        // ホワイトリストチェック
        if (settings.whitelisted_roles && settings.whitelisted_roles.length > 0) {
            const hasWhitelistedRole = memberRoles.some(roleId => 
                settings.whitelisted_roles.includes(roleId)
            );
            if (!hasWhitelistedRole) return false;
        }

        return true;
    }

    async sendTranslation(originalMessage, translation, settings, ruleName = null) {
        if (!originalMessage || !originalMessage.channel) {
            console.error('sendTranslation: originalMessage または channel が無効です');
            return;
        }

        try {
            const targetChannel = settings?.target_channel ? 
                originalMessage.guild.channels.cache.get(settings.target_channel) : 
                originalMessage.channel;

            if (!targetChannel) {
                console.error('翻訳結果の送信先チャンネルが見つかりません');
                return;
            }

            const ruleLabel = ruleName ? ` (${ruleName})` : '';
            const embed = {
                color: 0x00AE86,
                author: {
                    name: originalMessage.author.displayName || originalMessage.author.username,
                    icon_url: originalMessage.author.displayAvatarURL()
                },
                description: translation,
                footer: {
                    text: `翻訳Bot${ruleLabel}`,
                    icon_url: this.client.user.displayAvatarURL()
                },
                timestamp: new Date()
            };

            await targetChannel.send({ embeds: [embed] });

        } catch (error) {
            console.error('翻訳結果送信エラー:', error.message);
        }
    }

    loadCommands() {
        const commandsPath = path.join(__dirname, 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                this.client.commands.set(command.data.name, command);
                console.log(`✅ コマンド読み込み: ${command.data.name}`);
            } else {
                console.log(`⚠️ 警告: ${filePath} にdata または execute プロパティがありません。`);
            }
        }
    }

    async start() {
        try {
            await this.db.init();
            console.log('🗄️ データベース接続完了');
            
            console.log('🔗 Discord接続中...');
            await this.client.login(process.env.DISCORD_TOKEN);
            
        } catch (error) {
            console.error('\n❌ Bot起動エラー:', error.message);
            
            if (error.code === 'DISALLOWED_INTENTS') {
                console.log('\n🚨 INTENT権限エラーが発生しました');
                console.log('👉 以下の手順でDiscord Developer Portalの設定を確認してください:');
                console.log('');
                console.log('1. https://discord.com/developers/applications にアクセス');
                console.log(`2. アプリケーション "${process.env.CLIENT_ID || 'TranslaterBot'}" を選択`);
                console.log('3. 左メニューから "Bot" を選択');
                console.log('4. "Privileged Gateway Intents" セクションまでスクロール');
                console.log('5. 以下の項目にチェックを入れる:');
                console.log('   ✅ PRESENCE INTENT (必要に応じて)');
                console.log('   ✅ SERVER MEMBERS INTENT (必要に応じて)');
                console.log('   ✅ MESSAGE CONTENT INTENT (必須!)');
                console.log('6. "Save Changes" ボタンをクリック');
                console.log('7. 数分待ってからBotを再起動');
                console.log('');
            } else if (error.code === 'TOKEN_INVALID') {
                console.log('\n🚨 無効なDiscordトークンです');
                console.log('👉 .env ファイルのDISCORD_TOKENを確認してください');
            }
            
            process.exit(1);
        }
    }
}

const bot = new TranslateBot();
bot.start().catch(console.error);
