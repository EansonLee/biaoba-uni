import { loadEnv ,defineConfig} from 'vite';
import path from 'path';
import uni from '@dcloudio/vite-plugin-uni';
// 读取 .env 配置
import dotenv from 'dotenv';
dotenv.config();
export default (command, mode) => {
    const env = loadEnv(mode, __dirname, 'SHOPRO_');
    console.log(env);
    return {
        plugins: [uni({
            vueOptions: {
                template: {
                    compilerOptions: {
                        // 将所有 ZegoExpress- 开头的标签作为自定义元素处理  
                        isCustomElement: tag => tag.startsWith("ZegoExpress-")
                    }
                }
            }
        })],
        alias: {
            '@': '/src',  // 确保路径别名正确指向 src 目录
        },
        server: {
            port: env.SHOPRO_DEV_PORT || 3000, // 从 .env 文件中读取 VITE_PORT，默认是 3000
            open: false, // 启动时自动打开浏览器
        },
        host: true,
        hmr: {
            overlay: true,
        },
        define: {
            // 将环境变量注入到应用中
            'process.env': env,
        },
    };
}
