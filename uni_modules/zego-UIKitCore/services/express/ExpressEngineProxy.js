import { SimpleExpressEventHandler } from "./SimpleExpressEventHandler";
import { makeTag, zloginfo } from "../../utils";
// 指定这个 App版本方便做语法提示
// import ZegoExpressEngine from "@/uni_modules/zego-ZegoExpressUniApp-JS/lib/ZegoExpressEngineApp";
import ZegoExpressEngine from "./ZegoExpressUniApp";
const TAG = makeTag('ExpressEngineProxy');
export class ExpressEngineProxy {
    static expressEventHandler;
    static async createEngine(appID, appSign, scenario, config) {
        const profile = {
            appID,
            appSign,
            scenario,
        };
        this.expressEventHandler = new SimpleExpressEventHandler();
        if (config) {
            await ZegoExpressEngine.setEngineConfig(config);
        }
        const engine = await ZegoExpressEngine.createEngineWithProfile(profile);
        zloginfo(TAG, `createEngine engine=${!!engine}, version=${(await ZegoExpressEngine.getVersion())}`);
        for (let key of Object.keys(this.expressEventHandler)) {
            const evt = key;
            engine.on(evt, this.expressEventHandler[evt]);
        }
    }
    static startPlayingStream(streamID, config) {
        zloginfo(TAG, 'startPlayingStream', streamID);
        return ZegoExpressEngine.instance().startPlayingStream(streamID, config);
    }
    static startPreview(channel) {
        return ZegoExpressEngine.instance().startPreview(channel);
    }
    static stopPreview(channel) {
        return ZegoExpressEngine.instance().stopPreview(channel);
    }
    static setAppOrientation(orientation, channel) {
        return ZegoExpressEngine.instance().setAppOrientation(orientation, channel);
    }
    static getAudioRouteType() {
        return ZegoExpressEngine.instance().getAudioRouteType();
    }
    static useFrontCamera(isFrontFacing, channel) {
        return ZegoExpressEngine.instance().useFrontCamera(isFrontFacing, channel);
    }
    static setAudioRouteToSpeaker(routeToSpeaker) {
        return ZegoExpressEngine.instance().setAudioRouteToSpeaker(routeToSpeaker);
    }
    static muteMicrophone(mute) {
        return ZegoExpressEngine.instance().muteMicrophone(mute);
    }
    static async setStreamExtraInfo(extraInfo, channel) {
        return ZegoExpressEngine.instance().setStreamExtraInfo(extraInfo, channel);
    }
    static startPublishingStream(streamID, channel, config) {
        return ZegoExpressEngine.instance().startPublishingStream(streamID, channel, config);
    }
    static setVideoConfig(config, channel) {
        return ZegoExpressEngine.instance().setVideoConfig(config, channel);
    }
    static getVideoConfig(channel) {
        return ZegoExpressEngine.instance().getVideoConfig(channel);
    }
    static stopPublishingStream(channel) {
        return ZegoExpressEngine.instance().stopPublishingStream(channel);
    }
    static enableCamera(on, channel) {
        return ZegoExpressEngine.instance().enableCamera(on, channel);
    }
    static muteAllPlayStreamAudio(mute) {
        return ZegoExpressEngine.instance().muteAllPlayStreamAudio(mute);
    }
    static muteAllPlayStreamVideo(mute) {
        return ZegoExpressEngine.instance().muteAllPlayStreamVideo(mute);
    }
    static sendBroadcastMessage(roomID, message) {
        return ZegoExpressEngine.instance().sendBroadcastMessage(roomID, message);
    }
    static loginRoom(roomID, user, config) {
        return ZegoExpressEngine.instance().loginRoom(roomID, user, config);
    }
    static logoutRoom(roomID) {
        // const result = await ZegoExpressEngine.instance().logoutRoom(roomID)
        // console.warn('logoutRoom', result)
        return ZegoExpressEngine.instance().logoutRoom(roomID);
    }
    static setRoomExtraInfo(roomID, key, value) {
        return ZegoExpressEngine.instance().setRoomExtraInfo(roomID, key, value);
    }
    static sendCustomCommand(roomID, command, toUserList) {
        return ZegoExpressEngine.instance().sendCustomCommand(roomID, command, toUserList);
    }
    static stopPlayingStream(streamID) {
        return ZegoExpressEngine.instance().stopPlayingStream(streamID);
    }
    static stopSoundLevelMonitor() {
        return ZegoExpressEngine.instance().stopSoundLevelMonitor();
    }
    static getEngine() {
        return ZegoExpressEngine.instance();
    }
    static setEngineConfig(config) {
        return ZegoExpressEngine.setEngineConfig(config);
    }
    static renewToken(roomID, token) {
        return ZegoExpressEngine.instance().renewToken(roomID, token);
    }
    static startSoundLevelMonitor(config) {
        return ZegoExpressEngine.instance().startSoundLevelMonitor(config);
    }
    static addEventHandler(eventHandler) {
        return this.expressEventHandler?.addHandler(eventHandler);
    }
    static removeEventHandler(eventHandler) {
        return this.expressEventHandler?.removeHandler(eventHandler);
    }
    /**
     * 移除事件处理器列表。
     *
     * @param list 要移除的事件处理器列表。
     */
    static removeEventHandlerList(list) {
        if (list.length === 0) {
            return;
        }
        this.expressEventHandler?.removeEventHandlerList(list);
    }
    static sendBarrageMessage(roomID, message) {
        return ZegoExpressEngine.instance().sendBarrageMessage(roomID, message);
    }
    static mutePlayStreamAudio(streamID, mute) {
        return ZegoExpressEngine.instance().mutePlayStreamAudio(streamID, mute);
    }
    static mutePlayStreamVideo(streamID, mute) {
        return ZegoExpressEngine.instance().mutePlayStreamVideo(streamID, mute);
    }
    static startMixerTask(task) {
        return ZegoExpressEngine.instance().startMixerTask(task);
    }
    static stopMixerTask(task) {
        return ZegoExpressEngine.instance().stopMixerTask(task);
    }
    static uploadLog() {
        return ZegoExpressEngine.instance().uploadLog();
    }
    static destroyEngine() {
        zloginfo(TAG, 'destroyEngine');
        this.expressEventHandler?.removeAllEventHandlers();
        this.expressEventHandler = null;
        return ZegoExpressEngine.destroyEngine();
    }
}
