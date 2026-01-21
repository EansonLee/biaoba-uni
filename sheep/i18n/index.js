// 引入 vue-i18n
import {createI18n} from 'vue-i18n'

// 引入语言文件
import zh from '@/lang/zh.json'
import en from '@/lang/en.json'
// 初始化 i18n
const i18n = createI18n({
    legacy: true, // 使用 legacy 模式支持 $t 语法
    locale: 'zh', // 初始默认语言，将在 App.vue 中根据设备语言进行适配
    fallbackLocale: 'en', // 备用语言
    globalInjection: true, // 全局注入 $t 函数
    messages: {
        zh,
        en
    }
})

// 导出 i18n 实例，供 .js 文件使用
export default i18n

export const setI18n=(app)=>{
    app.use(i18n)
}
