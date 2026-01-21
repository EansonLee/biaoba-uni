import App from './App'

import { createSSRApp } from 'vue'
import {setupPinia} from "@/sheep/stores";
import {setI18n} from "@/sheep/i18n";
import clickTouchDirective  from "@/sheep/util/click-touch";
// 导入invite.js
import gamePop from '@/sheep/components/gamePop/index'
// 安装插件
export function createApp() {
  const app = createSSRApp(App)
  // 安装多语言插件
  setI18n(app)
  // 安装 Pinia
  setupPinia(app)
  app.use(clickTouchDirective);
  return {
    app
  }
}
