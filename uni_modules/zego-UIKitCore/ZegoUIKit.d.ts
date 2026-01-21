import { ZegoMixerTask, ZegoOrientation, ZegoPlayerConfig, ZegoPublishChannel } from "./services/express/ZegoExpressUniApp";
import { RoomStateChangedListener, ZegoAudioOutputDeviceChangedListener, ZegoAudioVideoResourceMode, ZegoAudioVideoUpdateListener, ZegoCameraStateChangeListener, ZegoInRoomCommandListener, ZegoInRoomMessage, ZegoInRoomMessageListener, ZegoInRoomMessageSendStateListener, ZegoMeRemovedFromRoomListener, ZegoMicrophoneStateChangeListener, ZegoOnlySelfInRoomListener, ZegoPresetResolution, ZegoRoomPropertyUpdateListener, ZegoSendInRoomCommandCallback, ZegoSoundLevelUpdateListener, ZegoTurnOnYourCameraRequestListener, ZegoTurnOnYourMicrophoneRequestListener, ZegoUIKitCallback, ZegoUIKitRoom, ZegoUIKitScenario, ZegoUIKitTokenExpireListener, ZegoUIKitUser, ZegoUserCountOrPropertyChangedListener, ZegoUserUpdateListener } from "./services/defines";
import { ZegoMixerStartCallback, ZegoMixerStopCallback } from "./services/defines";
import { ExpressEngineEventHandler } from "./services/express/ExpressEngineEventHandler";
export default class ZegoUIKit {
    static init(appID: number, appSign: string, scenario: ZegoUIKitScenario): Promise<boolean>;
    static unInit(): Promise<void>;
    static destroy(): void;
    static useFrontFacingCamera(isFrontFacing: boolean): void;
    static isMicrophoneOn(userID?: string): boolean;
    static isCameraOn(userID?: string): boolean;
    static setAudioOutputToSpeaker(enable: boolean): void;
    /**
     * 打开或关闭指定用户的麦克风, 如果是自己的, 会触发推流或停流
     * @param userID
     * @param on
     */
    static turnMicrophoneOn(userID: string, on: boolean): void;
    /**
     * 打开或关闭指定用户的摄像头, 如果是自己的, 会触发推流或停流
     * @param userID
     * @param on
     */
    static turnCameraOn(userID: string, on: boolean): void;
    static addMicrophoneStateListener(listenerID: string, listener: ZegoMicrophoneStateChangeListener): void;
    static removeMicrophoneStateListener(listenerID: string): void;
    static addCameraStateListener(listenerID: string, listener: ZegoCameraStateChangeListener): void;
    static removeCameraStateListener(listenerID: string): void;
    static addAudioOutputDeviceChangedListener(listenerID: string, listener: ZegoAudioOutputDeviceChangedListener): void;
    static removeAudioOutputDeviceChangedListener(listenerID: string): void;
    static setAppOrientation(orientation: ZegoOrientation): void;
    static addSoundLevelUpdatedListener(listenerID: string, listener: ZegoSoundLevelUpdateListener): void;
    static removeSoundLevelUpdatedListener(listenerID: string): void;
    static joinRoom(roomID: string, markAsLargeRoom?: boolean, callback?: ZegoUIKitCallback): void;
    static leaveRoom(): Promise<void>;
    static getRoom(): ZegoUIKitRoom;
    static setRoomProperty(key: string, value: string): void;
    static updateRoomProperties(newProperties: {
        [key: string]: string;
    }): void;
    static getRoomProperties(): {
        [key: string]: string;
    };
    static addRoomPropertyUpdateListener(listenerID: string, listener: ZegoRoomPropertyUpdateListener): void;
    static removeRoomPropertyUpdateListener(listenerID: string): void;
    static login(userID: string, userName: string, callback?: ZegoUIKitCallback): void;
    static logout(): void;
    static getUser(userID: string): ZegoUIKitUser | null;
    static getAllUsers(): ZegoUIKitUser[];
    static isLocalUser(userID: string): boolean;
    static isUserExist(userID: string): boolean;
    static isInviter(userID: string): boolean;
    static addUserUpdateListener(listenerID: string, listener: ZegoUserUpdateListener): void;
    static removeUserUpdateListener(listenerID: string): void;
    static addOnOnlySelfInRoomListener(listenerID: string, listener: ZegoOnlySelfInRoomListener): void;
    static removeOnOnlySelfInRoomListener(listenerID: string): void;
    static addAudioVideoUpdateListener(listenerID: string, listener: ZegoAudioVideoUpdateListener): void;
    static removeAudioVideoUpdateListener(listenerID: string): void;
    static getVersion(): string;
    static getInRoomMessages(): ZegoInRoomMessage[];
    static sendInRoomMessage(message: string, listener?: ZegoInRoomMessageSendStateListener): void;
    static addInRoomMessageReceivedListener(listenerID: string, listener: ZegoInRoomMessageListener): void;
    static removeInRoomMessageReceivedListener(listenerID: string): void;
    static getLocalUser(): ZegoUIKitUser | null;
    static startPlayingAllAudioVideo(): void;
    static stopPlayingAllAudioVideo(): void;
    static sendInRoomCommand(command: string, toUserList: string[], callback: ZegoSendInRoomCommandCallback): void;
    static addInRoomCommandListener(listenerID: string, listener: ZegoInRoomCommandListener): void;
    static removeInRoomCommandListener(listenerID: string): void;
    static removeUserFromRoom(userIDs: string[]): void;
    static addOnMeRemovedFromRoomListener(listenerID: string, listener: ZegoMeRemovedFromRoomListener): void;
    static removeOnMeRemovedFromRoomListener(listenerID: string): void;
    static addRoomStateChangedListener(listenerID: string, listener: RoomStateChangedListener): void;
    static removeRoomStateChangedListener(listenerID: string): void;
    static addUserCountOrPropertyChangedListener(listenerID: string, listener: ZegoUserCountOrPropertyChangedListener): void;
    static removeUserCountOrPropertyChangedListener(listenerID: string): void;
    static addTurnOnYourCameraRequestListener(listenerID: string, listener: ZegoTurnOnYourCameraRequestListener): void;
    static removeTurnOnYourCameraRequestListener(listenerID: string): void;
    static addTurnOnYourMicrophoneRequestListener(listenerID: string, listener: ZegoTurnOnYourMicrophoneRequestListener): void;
    static removeTurnOnYourMicrophoneRequestListener(listenerID: string): void;
    static setAudioVideoResourceMode(mode: ZegoAudioVideoResourceMode): void;
    static setPresetVideoConfig(preset: ZegoPresetResolution): void;
    static mutePlayStreamAudio(streamID: string, mute: boolean): void;
    static mutePlayStreamVideo(streamID: string, mute: boolean): void;
    static startMixerTask(task: ZegoMixerTask, callback: ZegoMixerStartCallback): void;
    static stopMixerTask(task: ZegoMixerTask, callback: ZegoMixerStopCallback): void;
    static addEventHandler(eventHandler: ExpressEngineEventHandler, autoDelete?: boolean): void;
    static removeEventHandler(eventHandler: ExpressEngineEventHandler): void;
    static startPlayingStream(streamID: string, config?: ZegoPlayerConfig): void;
    static stopPlayingStream(streamID: string): void;
    static startPublishingStream(streamID: string): void;
    static stopPublishingStream(): void;
    static startPreview(channel?: ZegoPublishChannel): void;
    static stopPreview(): void;
    /**
     * 打开或关闭自己的麦克风, 不会推流
     * @param open
     */
    static openMicrophone(open: boolean): void;
    /**
     * 打开或关闭自己的摄像头, 不会推流
     * @param open
     */
    static openCamera(open: boolean): void;
    static renewToken(token: string): void;
    static setTokenWillExpireListener(listener: ZegoUIKitTokenExpireListener): void;
}
