import { ZegoSignalingPlugin } from "./signaling/ZegoSignalingPlugin";
import { ZegoPluginType } from "./ZegoPluginType";
export class ZegoPluginAdapter {
    static mPlugins = new Map();
    // TypeScript 方法没有返回类型时可省略，静态方法不需要实例化
    static installPlugins(plugins) {
        if (plugins) {
            plugins.forEach(plugin => {
                this.mPlugins.set(plugin.getPluginType(), plugin);
                // SessionStorage.set('ZegoPluginAdapter.mPlugins.' + plugin.getPluginType(), plugin)
            });
        }
    }
    // 返回值类型为可能的 undefined，表示可能没有找到插件
    static getPlugin(pluginType) {
        return this.mPlugins.get(pluginType) || null; // || SessionStorage.get('ZegoPluginAdapter.mPlugins.' + pluginType) || null;
    }
    static signalingPlugin() {
        let plugin = this.getPlugin(ZegoPluginType.Signling);
        if (!plugin) {
            plugin = new ZegoSignalingPlugin();
            this.installPlugins([plugin]);
        }
        return plugin;
    }
}
