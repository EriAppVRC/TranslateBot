const { REST, Routes } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const commands = [];

// commandsフォルダから全コマンドを読み込み
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`[警告] ${filePath} にdata または execute プロパティがありません。`);
    }
}

// Discord APIクライアントを作成
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// コマンドをデプロイ
(async () => {
    try {
        console.log(`${commands.length}個のアプリケーション(/)コマンドをリフレッシュしています...`);

        // CLIENT_IDとGUILD_IDは環境変数または直接指定
        // グローバルコマンドの場合はGUILD_IDを削除してください
        const clientId = process.env.CLIENT_ID;
        const guildId = process.env.GUILD_ID;

        let data;
        
        if (guildId) {
            // ギルド（サーバー）固有のコマンドとして登録（開発中推奨）
            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands },
            );
            console.log(`✅ ${data.length}個のギルドコマンドを正常に登録しました。`);
        } else {
            // グローバルコマンドとして登録（本番環境）
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands },
            );
            console.log(`✅ ${data.length}個のグローバルコマンドを正常に登録しました。`);
        }

    } catch (error) {
        console.error('❌ コマンド登録エラー:', error);
    }
})();
