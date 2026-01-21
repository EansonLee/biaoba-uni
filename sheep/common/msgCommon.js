import i18n from "@/sheep/i18n";

export const getMessage = (key, values) => {
    // 在 .js 文件中使用 i18n.global.t (legacy 模式)
    const t = i18n.global.t

    // 获取国际化文本
    let message = t(key)
    // 遍历传入的 values 对象，替换占位符
    for (let [placeholder, replacement] of Object.entries(values)) {
        // 创建一个正则表达式来匹配占位符
        const regex = new RegExp(`\\$\\(${placeholder}\\)`, 'g')
        message = message.replace(regex, replacement)
    }

    return message
}
