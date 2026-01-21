export class I18n {
    resources;
    locale; // 新增的属性，用于存储当前的语言环境
    constructor(locale = 'zh') {
        this.resources = {};
        this.locale = locale; // 默认语言环境
    }
    /**
     * 配置语言资源
     * @param resources - 语言资源对象
     */
    config(resources) {
        this.resources = resources;
    }
    /**
     * 设置当前的语言环境
     * @param locale - 当前的语言环境标识
     */
    setLocale(locale) {
        this.locale = locale;
    }
    /**
     *
     * @returns 当前的语言环境
     */
    getLocale() {
        return this.locale;
    }
    /**
     * 获取翻译后的文本
     * @param key - 要翻译的键
     * @param params - 要替换的参数
     * @returns 翻译后的文本或原始键如果未找到
     * @example
     * config({zh: {"xx":{"bb": "你{msg}"}} });
     * translate("xx.bb", {msg："好”}) => 你好
     */
    translate(key, params) {
        const keys = key.split('.');
        let current = this.resources[this.locale];
        for (let i = 0; i < keys.length; i++) {
            if (!current)
                break;
            current = current[keys[i]];
        }
        let translation = (current !== undefined ? current : key);
        if (params) {
            for (const param in params) {
                translation = translation.replace(`{${param}}`, params[param]);
            }
        }
        return translation;
    }
}
