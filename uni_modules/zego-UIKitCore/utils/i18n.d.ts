type Resource = Record<string, Record<string, any>>;
export declare class I18n {
    private resources;
    private locale;
    constructor(locale?: string);
    /**
     * 配置语言资源
     * @param resources - 语言资源对象
     */
    config(resources: Resource): void;
    /**
     * 设置当前的语言环境
     * @param locale - 当前的语言环境标识
     */
    setLocale(locale: string): void;
    /**
     *
     * @returns 当前的语言环境
     */
    getLocale(): string;
    /**
     * 获取翻译后的文本
     * @param key - 要翻译的键
     * @param params - 要替换的参数
     * @returns 翻译后的文本或原始键如果未找到
     * @example
     * config({zh: {"xx":{"bb": "你{msg}"}} });
     * translate("xx.bb", {msg："好”}) => 你好
     */
    translate(key: string, params?: Record<string, any>): string;
}
export {};
