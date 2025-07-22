const deepl = require('deepl-node');

class TranslationManager {
    constructor() {
        this.translator = new deepl.Translator(process.env.DEEPL_API_KEY);
        this.maxLength = parseInt(process.env.MAX_TRANSLATE_LENGTH) || 5000;
        this.cache = new Map(); // 簡単なキャッシュシステム
    }

    async translate(text, sourceLang = 'auto', targetLang = 'JA') {
        try {
            // テキストが長すぎる場合は切り詰める
            if (text.length > this.maxLength) {
                text = text.substring(0, this.maxLength) + '...';
            }

            // キャッシュチェック
            const cacheKey = `${text}-${sourceLang}-${targetLang}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            // DeepL APIで翻訳
            const result = await this.translator.translateText(
                text,
                sourceLang === 'auto' ? null : sourceLang,
                targetLang
            );

            const translatedText = result.text;

            // キャッシュに保存（最大1000件）
            if (this.cache.size >= 1000) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            this.cache.set(cacheKey, translatedText);

            return translatedText;

        } catch (error) {
            console.error('翻訳エラー:', error);
            
            if (error.message.includes('quota exceeded')) {
                throw new Error('❌ DeepL APIの使用量制限に達しました。しばらく待ってからお試しください。');
            } else if (error.message.includes('invalid auth key')) {
                throw new Error('❌ DeepL APIキーが無効です。設定を確認してください。');
            } else {
                throw new Error('❌ 翻訳中にエラーが発生しました。');
            }
        }
    }

    async detectLanguage(text) {
        try {
            // 短いテキストの場合は、翻訳時に自動検出に任せる
            if (text.length < 10) {
                return 'auto';
            }

            // DeepL APIで言語検出（翻訳結果から推定）
            const result = await this.translator.translateText(
                text.substring(0, 100), // 最初の100文字のみ使用
                null, // 自動検出
                'EN' // 英語に翻訳して言語を検出
            );

            return result.detectedSourceLang || 'auto';

        } catch (error) {
            console.error('言語検出エラー:', error);
            return 'auto';
        }
    }

    async getSupportedLanguages() {
        try {
            const sourceLanguages = await this.translator.getSourceLanguages();
            const targetLanguages = await this.translator.getTargetLanguages();
            
            return {
                source: sourceLanguages,
                target: targetLanguages
            };
        } catch (error) {
            console.error('言語取得エラー:', error);
            return null;
        }
    }

    async getUsageInfo() {
        try {
            const usage = await this.translator.getUsage();
            return {
                characterCount: usage.character.count,
                characterLimit: usage.character.limit,
                percentageUsed: (usage.character.count / usage.character.limit * 100).toFixed(2)
            };
        } catch (error) {
            console.error('使用量取得エラー:', error);
            return null;
        }
    }

    // よく使用される言語コードの定義
    getCommonLanguages() {
        return {
            'JA': '日本語',
            'EN': '英語',
            'EN-US': '英語（アメリカ）',
            'EN-GB': '英語（イギリス）',
            'ZH': '中国語',
            'KO': '韓国語',
            'FR': 'フランス語',
            'DE': 'ドイツ語',
            'ES': 'スペイン語',
            'IT': 'イタリア語',
            'PT': 'ポルトガル語',
            'RU': 'ロシア語',
            'auto': '自動検出'
        };
    }

    // 言語コードから言語名を取得
    getLanguageName(code) {
        const languages = this.getCommonLanguages();
        return languages[code] || code;
    }

    // テキストが翻訳可能かチェック
    isTranslatable(text) {
        if (!text || typeof text !== 'string') return false;
        if (text.length < 1 || text.length > this.maxLength) return false;
        if (/^[\s\n]*$/.test(text)) return false; // 空白のみ
        if (/^[0-9\s\p{P}]*$/u.test(text)) return false; // 数字と記号のみ
        return true;
    }
}

module.exports = TranslationManager;
