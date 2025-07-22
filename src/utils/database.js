const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '..', '..', 'translate_bot.sqlite');
    }

    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log('✅ データベースに接続しました');
                this.createTables();
                resolve();
            });
        });
    }

    createTables() {
        const queries = [
            `CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id TEXT PRIMARY KEY,
                enabled INTEGER DEFAULT 1,
                source_lang TEXT DEFAULT 'auto',
                target_lang TEXT DEFAULT 'JA',
                source_channels TEXT DEFAULT '[]',
                target_channel TEXT DEFAULT NULL,
                whitelisted_roles TEXT DEFAULT '[]',
                blacklisted_roles TEXT DEFAULT '[]',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS translation_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                rule_name TEXT NOT NULL,
                source_lang TEXT NOT NULL,
                target_lang TEXT NOT NULL,
                priority INTEGER DEFAULT 1,
                enabled INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guild_id, source_lang, target_lang)
            )`,
            `CREATE TABLE IF NOT EXISTS translation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                original_text TEXT NOT NULL,
                translated_text TEXT NOT NULL,
                source_lang TEXT NOT NULL,
                target_lang TEXT NOT NULL,
                rule_name TEXT DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS translation_stats (
                guild_id TEXT PRIMARY KEY,
                total_translations INTEGER DEFAULT 0,
                daily_translations INTEGER DEFAULT 0,
                last_reset_date TEXT DEFAULT NULL,
                most_active_user TEXT DEFAULT NULL,
                most_active_count INTEGER DEFAULT 0
            )`
        ];

        queries.forEach(query => {
            this.db.run(query, (err) => {
                if (err) console.error('テーブル作成エラー:', err);
            });
        });
    }

    async getGuildSettings(guildId) {
        if (!guildId) {
            console.error('getGuildSettings: guildIdがnullまたは未定義です');
            return this.getDefaultSettings();
        }

        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM guild_settings WHERE guild_id = ?',
                [guildId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    if (!row) {
                        // デフォルト設定を作成
                        const defaultSettings = this.getDefaultSettings(guildId);
                        
                        this.createGuildSettings(guildId).then(() => {
                            resolve(defaultSettings);
                        }).catch(reject);
                        return;
                    }

                    // JSON文字列をパース
                    try {
                        row.source_channels = JSON.parse(row.source_channels || '[]');
                        row.whitelisted_roles = JSON.parse(row.whitelisted_roles || '[]');
                        row.blacklisted_roles = JSON.parse(row.blacklisted_roles || '[]');
                        row.enabled = Boolean(row.enabled);

                        resolve(row);
                    } catch (parseError) {
                        console.error('設定データのパースエラー:', parseError);
                        resolve(this.getDefaultSettings(guildId));
                    }
                }
            );
        });
    }

    getDefaultSettings(guildId = null) {
        return {
            guild_id: guildId,
            enabled: true,
            source_lang: 'auto',
            target_lang: 'JA',
            source_channels: [],
            target_channel: null,
            whitelisted_roles: [],
            blacklisted_roles: []
        };
    }

    async createGuildSettings(guildId) {
        if (!guildId) {
            return Promise.reject(new Error('createGuildSettings: guildIdが必要です'));
        }

        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)',
                [guildId],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                }
            );
        });
    }

    async updateGuildSettings(guildId, settings) {
        if (!guildId) {
            return Promise.reject(new Error('updateGuildSettings: guildIdが必要です'));
        }

        return new Promise((resolve, reject) => {
            const updates = [];
            const values = [];

            Object.keys(settings).forEach(key => {
                if (key === 'guild_id') return; // guild_idは更新しない

                updates.push(`${key} = ?`);
                
                if (Array.isArray(settings[key])) {
                    values.push(JSON.stringify(settings[key]));
                } else {
                    values.push(settings[key]);
                }
            });

            values.push(guildId);

            const query = `UPDATE guild_settings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE guild_id = ?`;

            this.db.run(query, values, function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    async logTranslation(guildId, userId, originalText, translatedText, sourceLang, targetLang) {
        if (!guildId || !userId) {
            console.error('logTranslation: guildIdとuserIdが必要です');
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO translation_logs (guild_id, user_id, original_text, translated_text, source_lang, target_lang) VALUES (?, ?, ?, ?, ?, ?)',
                [guildId, userId, originalText, translatedText, sourceLang, targetLang],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                }
            );
        });

        // 統計も更新
        this.updateTranslationStats(guildId, userId);
    }

    async updateTranslationStats(guildId, userId) {
        if (!guildId || !userId) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            // 統計を取得または作成
            this.db.get(
                'SELECT * FROM translation_stats WHERE guild_id = ?',
                [guildId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const today = new Date().toISOString().split('T')[0];
                    
                    if (!row) {
                        // 新規作成
                        this.db.run(
                            'INSERT INTO translation_stats (guild_id, total_translations, daily_translations, last_reset_date, most_active_user, most_active_count) VALUES (?, 1, 1, ?, ?, 1)',
                            [guildId, today, userId],
                            (err) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    } else {
                        // 更新
                        const dailyCount = row.last_reset_date === today ? row.daily_translations + 1 : 1;
                        
                        this.db.run(
                            'UPDATE translation_stats SET total_translations = total_translations + 1, daily_translations = ?, last_reset_date = ?, most_active_user = ?, most_active_count = most_active_count + 1 WHERE guild_id = ?',
                            [dailyCount, today, userId, guildId],
                            (err) => {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    }
                }
            );
        });
    }

    async getTranslationStats(guildId) {
        if (!guildId) {
            return { total_translations: 0, daily_translations: 0 };
        }

        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM translation_stats WHERE guild_id = ?',
                [guildId],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(row || { total_translations: 0, daily_translations: 0 });
                }
            );
        });
    }

    // 翻訳ルール管理メソッド
    async addTranslationRule(guildId, ruleName, sourceLang, targetLang, priority = 1) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR REPLACE INTO translation_rules (guild_id, rule_name, source_lang, target_lang, priority, enabled) VALUES (?, ?, ?, ?, ?, 1)',
                [guildId, ruleName, sourceLang, targetLang, priority],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(this.lastID);
                }
            );
        });
    }

    async getTranslationRules(guildId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM translation_rules WHERE guild_id = ? AND enabled = 1 ORDER BY priority DESC, id ASC',
                [guildId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(rows || []);
                }
            );
        });
    }

    async removeTranslationRule(guildId, ruleId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'DELETE FROM translation_rules WHERE guild_id = ? AND id = ?',
                [guildId, ruleId],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(this.changes);
                }
            );
        });
    }

    async toggleTranslationRule(guildId, ruleId, enabled) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE translation_rules SET enabled = ? WHERE guild_id = ? AND id = ?',
                [enabled ? 1 : 0, guildId, ruleId],
                function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(this.changes);
                }
            );
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('データベースクローズエラー:', err);
                } else {
                    console.log('✅ データベース接続を閉じました');
                }
            });
        }
    }
}

module.exports = DatabaseManager;
