import { ZegoSignalingPluginProtocol } from "./signaling/ZegoSignalingPluginProtocol";
import { ZegoPluginProtocol } from "./ZegoPluginProtocol";
import { ZegoPluginType } from "./ZegoPluginType";
export declare class ZegoPluginAdapter {
    private static mPlugins;
    static installPlugins(plugins: ZegoPluginProtocol[]): void;
    static getPlugin(pluginType: ZegoPluginType): ZegoPluginProtocol | null;
    static signalingPlugin(): ZegoSignalingPluginProtocol;
}
