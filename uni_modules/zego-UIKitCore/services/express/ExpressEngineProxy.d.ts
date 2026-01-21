import { ZegoAudioRoute, ZegoEngineConfig, ZegoIMSendBarrageMessageResult, ZegoIMSendBroadcastMessageResult, ZegoIMSendCustomCommandResult, ZegoMixerStartResult, ZegoMixerStopResult, ZegoMixerTask, ZegoOrientation, ZegoPlayerConfig, ZegoPublishChannel, ZegoPublisherConfig, ZegoRoomConfig, ZegoRoomLoginResult, ZegoRoomLogoutResult, ZegoRoomSetRoomExtraInfoResult, ZegoScenario, ZegoSoundLevelConfig, ZegoUser, ZegoVideoConfig, ZegoVideoConfigPreset } from "./ZegoExpressUniApp";
import { ZegoEventListener } from "./ZegoExpressUniApp";
import ZegoExpressEngine from "./ZegoExpressUniApp";
export declare class ExpressEngineProxy {
    private static expressEventHandler?;
    static createEngine(appID: number, appSign: string, scenario: ZegoScenario, config?: ZegoEngineConfig): Promise<void>;
    static startPlayingStream(streamID: string, config?: ZegoPlayerConfig): Promise<void>;
    static startPreview(channel?: ZegoPublishChannel): Promise<void>;
    static stopPreview(channel?: ZegoPublishChannel): Promise<void>;
    static setAppOrientation(orientation: ZegoOrientation, channel?: ZegoPublishChannel): Promise<void>;
    static getAudioRouteType(): Promise<ZegoAudioRoute>;
    static useFrontCamera(isFrontFacing: boolean, channel?: ZegoPublishChannel): Promise<void>;
    static setAudioRouteToSpeaker(routeToSpeaker: boolean): Promise<void>;
    static muteMicrophone(mute: boolean): Promise<void>;
    static setStreamExtraInfo(extraInfo: string, channel?: ZegoPublishChannel): Promise<import("@/uni_modules/zego-ZegoExpressUniApp-JS/components/zego-ZegoExpressUniApp-JS/lib/ZegoExpressDefines").ZegoPublisherSetStreamExtraInfoResult>;
    static startPublishingStream(streamID: string, channel?: ZegoPublishChannel, config?: ZegoPublisherConfig): Promise<void>;
    static setVideoConfig(config: ZegoVideoConfig | ZegoVideoConfigPreset, channel: ZegoPublishChannel): Promise<void>;
    static getVideoConfig(channel: ZegoPublishChannel): Promise<ZegoVideoConfig>;
    static stopPublishingStream(channel?: ZegoPublishChannel): Promise<void>;
    static enableCamera(on: boolean, channel?: ZegoPublishChannel): Promise<void>;
    static muteAllPlayStreamAudio(mute: boolean): Promise<void>;
    static muteAllPlayStreamVideo(mute: boolean): Promise<void>;
    static sendBroadcastMessage(roomID: string, message: string): Promise<ZegoIMSendBroadcastMessageResult>;
    static loginRoom(roomID: string, user: ZegoUser, config: ZegoRoomConfig): Promise<ZegoRoomLoginResult>;
    static logoutRoom(roomID?: string): Promise<ZegoRoomLogoutResult>;
    static setRoomExtraInfo(roomID: string, key: string, value: string): Promise<ZegoRoomSetRoomExtraInfoResult>;
    static sendCustomCommand(roomID: string, command: string, toUserList: ZegoUser[]): Promise<ZegoIMSendCustomCommandResult>;
    static stopPlayingStream(streamID: string): Promise<void>;
    static stopSoundLevelMonitor(): Promise<void>;
    static getEngine(): ZegoExpressEngine | null;
    static setEngineConfig(config: ZegoEngineConfig): Promise<void>;
    static renewToken(roomID: string, token: string): Promise<void>;
    static startSoundLevelMonitor(config?: ZegoSoundLevelConfig): Promise<void>;
    static addEventHandler(eventHandler: ZegoEventListener): void;
    static removeEventHandler(eventHandler: ZegoEventListener): void;
    /**
     * 移除事件处理器列表。
     *
     * @param list 要移除的事件处理器列表。
     */
    static removeEventHandlerList(list: ZegoEventListener[]): void;
    static sendBarrageMessage(roomID: string, message: string): Promise<ZegoIMSendBarrageMessageResult>;
    static mutePlayStreamAudio(streamID: string, mute: boolean): Promise<void>;
    static mutePlayStreamVideo(streamID: string, mute: boolean): Promise<void>;
    static startMixerTask(task: ZegoMixerTask): Promise<ZegoMixerStartResult>;
    static stopMixerTask(task: ZegoMixerTask): Promise<ZegoMixerStopResult>;
    static uploadLog(): Promise<void>;
    static destroyEngine(): Promise<void>;
}
