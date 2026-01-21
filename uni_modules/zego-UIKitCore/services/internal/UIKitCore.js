import { ZegoAudioRoute, ZegoDeviceExceptionType, ZegoDeviceType, ZegoPublishChannel, ZegoPublisherState, ZegoRemoteDeviceState, ZegoRoomStateChangedReason, ZegoUpdateType, ZegoUser } from "../express/ZegoExpressUniApp";
import { zlogerror, zloginfo, zlogwarning } from '../../utils/logger';
import TextUtils from '../../utils/TextUtils';
import { ExpressEngineProxy } from '../express/ExpressEngineProxy';
import RoomService from './RoomService';
import { UIKitCoreUser } from './UIKitCoreUser';
import UserService from './UserService';
import { ZegoAudioVideoResourceMode, ZegoInRoomMessageState } from '../defines';
import { makeTag, UIKitReport, Platform } from "../../utils";
import { deleteSingletonInstance, getSingletonInstance, SingletonScope } from "../../utils/singleton";
import ZegoUIKit from '../../ZegoUIKit';
import { DefaultExpressEventHandler } from '../express/DefaultExpressEventHandler';
import { EventHandlerList } from '../express/EventHandlerList';
import { AudioVideoService } from './AudioVideoService';
import { MessageService } from './MessageService';
import packageJson from '../../config/package.json';
const TAG = makeTag('UIKitCore');
/**
 * for internal use,DO NOT call it directly.
 */
export default class UIKitCore extends DefaultExpressEventHandler {
    static name = '_UIKitCore';
    static isDelete = false;
    static getInstance() {
        if (UIKitCore.isDelete) {
            // 为了避免内部逻辑报错, 先这样看看
            zlogerror(TAG, 'deleteInstance() has called!');
        }
        return getSingletonInstance(UIKitCore, SingletonScope.Global);
    }
    static deleteInstance() {
        UIKitCore.isDelete = true;
        deleteSingletonInstance(UIKitCore, SingletonScope.Global);
    }
    roomService = new RoomService();
    userService = new UserService();
    audioVideoService = new AudioVideoService();
    messageService = new MessageService();
    localUser = null;
    zegoUIKitRoom = { roomID: "" };
    isFrontFacing = true;
    remoteUserList = [];
    inRoomMessages = [];
    roomExtraInfoMap = new Map();
    isLargeRoom = false;
    markAsLargeRoom = false;
    roomMemberCount = 0;
    lastNotifyTokenTime = 0;
    isUIKitInited = false;
    token = '';
    tokenExpireListener = null;
    resourceMode = ZegoAudioVideoResourceMode.Default;
    eventHandlerList = new EventHandlerList();
    getVersion() {
        return packageJson.version;
    }
    async init(appID, appSign, scenario) {
        if (TextUtils.isEmpty(appSign)) {
            zlogerror(TAG, 'appSign is empty');
            return false;
        }
        if (this.isUIKitInited) {
            zlogwarning(TAG, 'already init');
            return true;
        }
        this.isUIKitInited = true;
        const platform_version = Platform.getRuntimeVersion();
        const uikit_version = this.getVersion();
        await this.createExpressEngine(appID, appSign, scenario);
        zlogwarning(TAG, `Reporter Version: ${UIKitReport.getVersion()}, platform_version: ${platform_version}, uikit_version: ${uikit_version}`);
        UIKitReport.init(appID, appSign, {
            platform: 'uniapp',
            platform_version,
            uikit_version: uikit_version,
        });
        zlogwarning(TAG, `Reporter init Success`);
        if (ExpressEngineProxy.getEngine() === null) {
            zlogerror(TAG, 'createExpressEngine failed');
            return false;
        }
        // express will open camera by default
        ExpressEngineProxy.enableCamera(false);
        zloginfo(TAG, `init() called with: appID = [${appID}], isEmpty(appSign) = [${TextUtils.isEmpty(appSign)}]`);
        return true;
    }
    async unInit() {
        if (this.isUIKitInited) {
            this.isUIKitInited = false;
            UIKitReport.unInit();
            await this.destroyEngine();
        }
        else {
            zlogwarning(TAG, 'not init!');
        }
    }
    async createExpressEngine(appID, appSign, scenario) {
        const config = {
            advancedConfig: {
                // @ts-ignore
                "notify_remote_device_unknown_status": "true",
                "notify_remote_device_init_status": "true"
            }
        };
        await ExpressEngineProxy.createEngine(appID, appSign, scenario, config);
        ExpressEngineProxy.addEventHandler(this);
    }
    async destroyEngine() {
        zloginfo(TAG, 'destroyEngine');
        ExpressEngineProxy.removeEventHandler(this);
        return ExpressEngineProxy.destroyEngine();
    }
    containsUser(uiKitCoreUser) {
        return this.remoteUserList.some(user => user.userID === uiKitCoreUser.userID);
    }
    removeUser(uiKitCoreUser) {
        this.remoteUserList = this.remoteUserList.filter(user => user.userID !== uiKitCoreUser.userID);
    }
    isUserExist(userID) {
        return [...this.remoteUserList, this.localUser].some(user => user?.userID === userID);
    }
    notifyTokenWillExpire(seconds) {
        if (Date.now() - this.lastNotifyTokenTime > 5 * 60 * 1000) {
            if (this.tokenExpireListener != null) {
                this.tokenExpireListener.onTokenWillExpire?.(seconds);
            }
        }
        this.lastNotifyTokenTime = Date.now();
    }
    addEventHandler(eventHandler, autoDelete) {
        this.eventHandlerList.addEventHandler(eventHandler, autoDelete);
        ExpressEngineProxy.addEventHandler(eventHandler);
    }
    removeEventHandler(eventHandler) {
        this.eventHandlerList.removeEventHandler(eventHandler);
        ExpressEngineProxy.removeEventHandler(eventHandler);
    }
    removeAutoDeleteRoomListeners() {
        ExpressEngineProxy.removeEventHandlerList(this.eventHandlerList.getAutoDeleteHandlerList());
        this.eventHandlerList.removeAutoDeleteRoomListeners();
    }
    notifyTurnMicrophoneOffCommand(uiKitUser) {
        this.audioVideoService.notifyTurnMicrophoneCommand(uiKitUser, false);
    }
    notifyTurnCameraOffCommand(uiKitUser) {
        this.audioVideoService.notifyTurnCameraCommand(uiKitUser, false);
    }
    notifyTurnMicrophoneOnCommand(uiKitUser) {
        this.audioVideoService.notifyTurnMicrophoneCommand(uiKitUser, true);
    }
    notifyTurnCameraOnCommand(uiKitUser) {
        this.audioVideoService.notifyTurnCameraCommand(uiKitUser, true);
    }
    notifyRemovedFromRoomCommand() {
        this.userService.notifyRemovedFromRoomCommand();
    }
    renewToken(token) {
        if (token !== this.token) {
            if (!TextUtils.isEmpty(this.zegoUIKitRoom.roomID)) {
                ExpressEngineProxy.renewToken(this.zegoUIKitRoom.roomID, token);
            }
        }
        // !暂时不支持
        // getSignalingPlugin().renewToken(token);
        this.token = token;
    }
    dispatchBroadcastMessages(roomID, messageList) {
        this.messageService.notifyInRoomMessageReceived(roomID, messageList);
    }
    setPresetVideoConfig(preset) {
        ExpressEngineProxy.setVideoConfig(preset, ZegoPublishChannel.Main);
    }
    setVideoConfig(config) {
        ExpressEngineProxy.setVideoConfig(config, ZegoPublishChannel.Main);
    }
    dispatchOnlySelfInRoom() {
        this.userService.notifyOnlySelfInRoom();
    }
    dispatchSoundLevelUpdate(userID, soundLevel) {
        this.audioVideoService.notifySoundLevelUpdate(userID, soundLevel);
    }
    dispatchRemoteCameraStateUpdate(coreUser, open) {
        this.audioVideoService.notifyCameraStateChange(coreUser, open);
    }
    dispatchRemoteMicStateUpdate(coreUser, open) {
        this.audioVideoService.notifyMicStateChange(coreUser, open);
    }
    dispatchRoomStateUpdate(roomID, reason, errorCode, jsonObject) {
        this.roomService.notifyRoomStateUpdate(roomID, reason, errorCode, jsonObject);
    }
    dispatchStreamUpdate(roomID, zegoUpdateType, streamList, jsonObject) {
        this.roomService.notifyStreamUpdate(roomID, zegoUpdateType, streamList, jsonObject);
    }
    dispatchUserLeave(userInfoList) {
        this.userService.notifyUserLeave(userInfoList);
    }
    dispatchUserJoin(userInfoList) {
        this.userService.notifyUserJoin(userInfoList);
    }
    dispatchRoomUserCountOrPropertyChanged(userList) {
        this.userService.notifyRoomUserCountOrPropertyChanged(userList);
    }
    getLocalCoreUser() {
        return this.localUser;
    }
    checkIsLargeRoom() {
        return this.isLargeRoom || this.markAsLargeRoom;
    }
    isLocalUser(userID) {
        if (this.localUser == null) {
            return false;
        }
        return userID === this.localUser.userID;
    }
    getUserFromStreamID(streamID) {
        if (this.getLocalCoreUser() == null) {
            return null;
        }
        if (this.getLocalCoreUser()?.mainStreamID === streamID) {
            return this.getLocalCoreUser();
        }
        for (let uiKitUser of this.remoteUserList) {
            if (uiKitUser.mainStreamID === streamID) {
                return uiKitUser;
            }
        }
        return null;
    }
    getUserByUserID(userID) {
        // zlogerror(TAG, 'this.getLocalCoreUser()', this.getLocalCoreUser(), 'userID', userID)
        if (this.getLocalCoreUser() == null) {
            return null;
        }
        if (this.getLocalCoreUser()?.userID === userID) {
            return this.getLocalCoreUser();
        }
        for (let uiKitUser of this.remoteUserList) {
            if (uiKitUser.userID === userID) {
                return uiKitUser;
            }
        }
        return null;
    }
    useFrontFacingCamera(isFrontFacing) {
        this.isFrontFacing = isFrontFacing;
        this.audioVideoService.useFrontFacingCamera(isFrontFacing);
    }
    isUseFrontCamera() {
        return this.isFrontFacing;
    }
    isMicrophoneOn(userID) {
        if (!userID) {
            return this.localUser?.isMicrophoneOn ?? false;
        }
        const uiKitCoreUser = this.getUserByUserID(userID);
        if (uiKitCoreUser != null) {
            return uiKitCoreUser.isMicrophoneOn;
        }
        return false;
    }
    isCameraOn(userID) {
        if (!userID) {
            return this.localUser?.isCameraOn ?? false;
        }
        const uiKitCoreUser = this.getUserByUserID(userID);
        if (uiKitCoreUser != null) {
            return uiKitCoreUser.isCameraOn;
        }
        return false;
    }
    setAudioOutputToSpeaker(enable) {
        this.audioVideoService.setAudioOutputToSpeaker(enable);
    }
    /**
     * is speaker or other output:Receiver/Bluetooth/Headphone.
     *
     * @return
     */
    async isSpeakerOn() {
        return (await ExpressEngineProxy.getAudioRouteType()) == ZegoAudioRoute.Speaker;
    }
    static generateCameraStreamID(roomID, userID) {
        return roomID + "_" + userID + "_main";
    }
    static generateScreenShareStreamID(roomID, userID) {
        return roomID + "_" + userID + "_screensharing";
    }
    /**
     *
     * @param userID 传空或者不传, 表示本地用户
     * @param on
     */
    turnMicrophoneOn(userID, on) {
        zloginfo(TAG, "turnMicrophoneOn: " + userID + " " + on);
        if (TextUtils.isEmpty(userID) && this.isLocalUser(userID)) {
            // 没有传 userID, 那就是自己
            const localCoreUser = this.getLocalCoreUser();
            if (localCoreUser) {
                const stateChanged = (localCoreUser.isMicrophoneOn !== on);
                this.audioVideoService.turnMicrophoneOn(userID, on);
                if (stateChanged) {
                    this.eventHandlerList.notifyAllListener(eventHandler => {
                        eventHandler.onLocalMicrophoneStateUpdate(on);
                    });
                }
            }
            else {
                // 出错了
                zlogerror(TAG, "turnMicrophoneOn: localCoreUser is null");
            }
        }
        else {
            // 指定其他
            this.audioVideoService.turnMicrophoneOn(userID, on);
        }
    }
    /**
     * 打开/关闭指定用户的摄像头, 自己的会触发 onLocalCameraStateUpdate
     * @param userID 传空或者不传, 表示本地用户
     * @param on
     */
    turnCameraOn(userID, on) {
        zloginfo(TAG, "turnCameraOn: " + userID + " " + on);
        if (TextUtils.isEmpty(userID) && this.isLocalUser(userID)) {
            // 没有传 userID, 那就是自己
            const localCoreUser = this.getLocalCoreUser();
            if (localCoreUser) {
                const stateChanged = (localCoreUser.isCameraOn !== on);
                this.audioVideoService.turnCameraOn(userID, on);
                if (stateChanged) {
                    this.eventHandlerList.notifyAllListener(eventHandler => {
                        eventHandler.onLocalCameraStateUpdate(on);
                    });
                }
            }
            else {
                // 出错了
                zlogerror(TAG, "turnCameraOn: localCoreUser is null");
            }
        }
        else {
            // 指定其他
            this.audioVideoService.turnCameraOn(userID, on);
        }
    }
    startPlayingAllAudioVideo() {
        this.audioVideoService.startPlayingAllAudioVideo();
    }
    stopPlayingAllAudioVideo() {
        this.audioVideoService.stopPlayingAllAudioVideo();
    }
    mutePlayStreamAudio(streamID, mute) {
        return ExpressEngineProxy.mutePlayStreamAudio(streamID, mute);
    }
    mutePlayStreamVideo(streamID, mute) {
        return ExpressEngineProxy.mutePlayStreamVideo(streamID, mute);
    }
    async startMixerTask(task, callback) {
        const result = await ExpressEngineProxy.startMixerTask(task);
        if (callback) {
            callback.onMixerStartResult?.(result.errorCode, result.extendedData);
        }
    }
    async stopMixerTask(task, callback) {
        const result = await ExpressEngineProxy.stopMixerTask(task);
        if (callback) {
            callback.onMixerStopResult?.(result.errorCode);
        }
    }
    startPlayingStream(streamID, config) {
        return ExpressEngineProxy.startPlayingStream(streamID, config);
    }
    addMicrophoneStateListener(listenerID, listener) {
        this.audioVideoService.addMicrophoneStateListener(listenerID, listener);
    }
    removeMicrophoneStateListener(listenerID) {
        this.audioVideoService.removeMicrophoneStateListener(listenerID);
    }
    addCameraStateListener(listenerID, listener) {
        this.audioVideoService.addCameraStateListener(listenerID, listener);
    }
    removeCameraStateListener(listenerID) {
        this.audioVideoService.removeCameraStateListener(listenerID);
    }
    addAudioOutputDeviceChangedListener(listenerID, listener) {
        this.audioVideoService.addAudioOutputDeviceChangedListener(listenerID, listener);
    }
    removeAudioOutputDeviceChangedListener(listenerID) {
        this.audioVideoService.removeAudioOutputDeviceChangedListener(listenerID);
    }
    addSoundLevelUpdatedListener(listenerID, listener) {
        this.audioVideoService.addSoundLevelUpdatedListener(listenerID, listener);
    }
    removeSoundLevelUpdatedListener(listenerID) {
        this.audioVideoService.removeSoundLevelUpdatedListener(listenerID);
    }
    addTurnOnYourCameraRequestListener(listenerID, listener) {
        this.audioVideoService.addTurnOnYourCameraRequestListener(listenerID, listener);
    }
    removeTurnOnYourCameraRequestListener(listenerID) {
        this.audioVideoService.removeTurnOnYourCameraRequestListener(listenerID);
    }
    addTurnOnYourMicrophoneRequestListener(listenerID, listener) {
        this.audioVideoService.addTurnOnYourMicrophoneRequestListener(listenerID, listener);
    }
    removeTurnOnYourMicrophoneRequestListener(listenerID) {
        this.audioVideoService.removeTurnOnYourMicrophoneRequestListener(listenerID);
    }
    setAudioVideoResourceMode(mode) {
        this.resourceMode = mode;
    }
    getAudioVideoResourceMode() {
        return this.resourceMode;
    }
    stopPlayingStream(streamID) {
        return ExpressEngineProxy.stopPlayingStream(streamID);
    }
    startPreview(channel) {
        return ExpressEngineProxy.startPreview(channel);
    }
    stopPreview(channel) {
        ExpressEngineProxy.stopPreview(channel);
    }
    startPublishingStream(streamID, channel) {
        return ExpressEngineProxy.startPublishingStream(streamID, channel);
    }
    stopPublishingStream(channel) {
        return ExpressEngineProxy.stopPublishingStream(channel);
    }
    /**
     * 打开/关闭自己的麦克风, 会触发 onLocalMicrophoneStateUpdate
     * @param open
     */
    openMicrophone(open) {
        const localCoreUser = this.getLocalCoreUser();
        if (localCoreUser != null) {
            const stateChanged = (localCoreUser.isMicrophoneOn != open);
            // localCoreUser.isMicrophoneOn = open
            this.audioVideoService.openMicrophone(open);
            if (stateChanged) {
                this.eventHandlerList.notifyAllListener(eventHandler => {
                    eventHandler.onLocalMicrophoneStateUpdate(open);
                });
            }
        }
    }
    /**
     * 打开/关闭自己的摄像头, 会触发摄像头状态变更事件 onLocalCameraStateUpdate
     * @param open
     */
    openCamera(open) {
        const localCoreUser = this.getLocalCoreUser();
        if (localCoreUser != null) {
            const stateChanged = (localCoreUser.isCameraOn != open);
            // localCoreUser.isCameraOn = open
            this.audioVideoService.openCamera(open);
            if (stateChanged) {
                this.eventHandlerList.notifyAllListener(eventHandler => {
                    eventHandler.onLocalCameraStateUpdate(open);
                });
            }
        }
    }
    inRoom() {
        return !!this.zegoUIKitRoom.roomID;
    }
    async joinRoom(roomID, markAsLargeRoom, callback) {
        if (!ExpressEngineProxy.getEngine()) {
            zlogerror(`ExpressEngineProxy is null!`);
            return;
        }
        this.zegoUIKitRoom.roomID = roomID;
        this.markAsLargeRoom = markAsLargeRoom;
        zloginfo(`${TAG} joinRoom for '${roomID}'`);
        // 先之前的房
        await this.roomService.leaveRoom(roomID);
        await this.roomService.joinRoom(roomID, this.token, (errorCode) => {
            if (errorCode !== 0) {
                zlogerror(`${TAG} joinRoom '${roomID}' error, code=${errorCode}`);
                this.zegoUIKitRoom.roomID = "";
            }
            else {
                zlogwarning(`${TAG} joinRoom '${roomID}' error, code=${errorCode}`);
                const localUser = this.getLocalCoreUser();
                const streamID = UIKitCore.generateCameraStreamID(roomID, localUser.userID);
                localUser?.setStreamID(streamID);
                ExpressEngineProxy.startSoundLevelMonitor();
                // tryStartPublishStream
                // ExpressEngineProxy.startPublishingStream(streamID, ZegoPublishChannel.Main);
                // ExpressEngineProxy.startPreview(ZegoPublishChannel.Main)
                // this.roomService.notifyAudioVideoAvailable([localUser!.getUIKitUser()])
            }
            if (callback) {
                callback(errorCode);
            }
        });
    }
    async leaveRoom() {
        if (!ExpressEngineProxy.getEngine()) {
            return;
        }
        const roomID = this.zegoUIKitRoom.roomID;
        this.resetRoomData();
        zloginfo(`${TAG} leaveRoom roomID: "${roomID}"`);
        if (!roomID) {
            zlogwarning(`${TAG} leaveRoom roomID is null`);
            return;
        }
        this.audioVideoService.openMicrophone(false);
        this.audioVideoService.openCamera(false);
        ExpressEngineProxy.stopPreview();
        ExpressEngineProxy.stopSoundLevelMonitor();
        ExpressEngineProxy.useFrontCamera(true);
        ExpressEngineProxy.setAudioRouteToSpeaker(true);
        await this.stopPublishingStream();
        // const localCoreUser = UIKitCore.getInstance().getLocalCoreUser();
        // if(localCoreUser){
        //     zloginfo(`${TAG} leaveRoom try turnoff mic and camera, userid: `, localCoreUser.userID)
        //     this.audioVideoService.turnMicrophoneOn(localCoreUser.userID, false)
        //     this.audioVideoService.turnCameraOn(localCoreUser.userID, false)
        // }
        await this.roomService.leaveRoom(roomID);
    }
    /**
     * clear data,not device
     */
    resetRoomData() {
        this.userService.clear();
        this.audioVideoService.clear();
        this.roomService.clear();
        this.messageService.clear();
        this.remoteUserList = [];
        this.inRoomMessages = [];
        this.zegoUIKitRoom.roomID = "";
        this.roomExtraInfoMap.clear();
        this.isFrontFacing = true;
        this.markAsLargeRoom = false;
        this.isLargeRoom = false;
        this.roomMemberCount = 0;
        this.removeAutoDeleteRoomListeners();
    }
    getRoom() {
        return this.zegoUIKitRoom;
    }
    setRoomProperty(key, value) {
        const map = {};
        map[key] = value;
        this.updateRoomProperties(map);
    }
    getRoomProperties() {
        if (this.roomExtraInfoMap.has('extra_info')) {
            return this.roomExtraInfoValueToMap(this.roomExtraInfoMap.get("extra_info"));
        }
        else {
            return {};
        }
    }
    roomExtraInfoValueToMap(roomExtraInfo) {
        let map = {};
        if (!roomExtraInfo || roomExtraInfo.value === '') {
            return map;
        }
        try {
            map = JSON.parse(roomExtraInfo.value);
        }
        catch (e) {
            // 在TypeScript中，通常我们会使用console.error来处理错误打印，而不是e.printStackTrace()
            console.error('Error parsing room extra info:', e);
        }
        return map;
    }
    updateRoomProperties(map) {
        const key = 'extra_info';
        const currentProperties = this.roomExtraInfoValueToMap(this.roomExtraInfoMap.get(key));
        const tempProperties = { ...currentProperties };
        for (const key in map) {
            tempProperties[key] = map[key];
        }
        const roomID = this.zegoUIKitRoom.roomID;
        if (!roomID) {
            return;
        }
        try {
            this.roomService.setRoomProperty(roomID, key, JSON.stringify(tempProperties), (errorCode) => {
                if (errorCode === 0) {
                    const oldProperties = { ...currentProperties };
                    const updateTime = Date.now();
                    for (const [key, value] of Object.entries(map)) {
                        currentProperties[key] = value;
                    }
                    let roomExtraInfo = this.roomExtraInfoMap.get(key);
                    if (!roomExtraInfo) {
                        roomExtraInfo = {
                            key,
                            value: JSON.stringify(currentProperties),
                            updateUser: {
                                userID: this.getLocalCoreUser().userID,
                                userName: this.getLocalCoreUser().userName,
                            },
                            updateTime,
                        };
                    }
                    this.roomExtraInfoMap.set(roomExtraInfo.key, roomExtraInfo);
                    const updateKeys = Object.keys(map);
                    for (const updateKey of updateKeys) {
                        this.dispatchRoomPropertyUpdated(updateKey, oldProperties[updateKey], currentProperties[updateKey]);
                    }
                    this.dispatchRoomPropertiesFullUpdated(updateKeys, oldProperties, currentProperties);
                }
            });
        }
        catch (error) {
            console.error('Error updating room properties:', error);
        }
    }
    dispatchRoomPropertiesFullUpdated(keys, oldProperties, roomProperties) {
        this.roomService.notifyRoomPropertiesFullUpdated(keys, oldProperties, roomProperties);
    }
    dispatchRoomPropertyUpdated(key, oldValue, value) {
        this.roomService.notifyRoomPropertyUpdate(key, oldValue, value);
    }
    addRoomPropertyUpdateListener(listenerID, listener) {
        this.roomService.addRoomPropertyUpdatedListener(listenerID, listener);
    }
    removeRoomPropertyUpdateListener(listenerID) {
        this.roomService.removeRoomPropertyUpdatedListener(listenerID);
    }
    addRoomStateUpdatedListener(listenerID, listener) {
        this.roomService.addRoomStateUpdatedListener(listenerID, listener);
    }
    removeRoomStateUpdatedListener(listenerID) {
        this.roomService.removeRoomStateUpdatedListener(listenerID);
    }
    setTokenWillExpireListener(listener) {
        this.tokenExpireListener = listener;
    }
    getTokenExpireListener() {
        return this.tokenExpireListener;
    }
    addAudioVideoUpdateListener(listenerID, listener) {
        this.roomService.addAudioVideoUpdateListener(listenerID, listener);
    }
    removeAudioVideoUpdateListener(listenerID) {
        this.roomService.removeAudioVideoUpdateListener(listenerID);
    }
    sendInRoomCommand(command, toUserList, callback) {
        this.roomService.sendInRoomCommand(this.getRoom().roomID, command, toUserList, callback);
    }
    addInRoomCommandListener(listenerID, listener) {
        this.roomService.addInRoomCommandListener(listenerID, listener);
    }
    removeInRoomCommandListener(listenerID) {
        this.roomService.removeInRoomCommandListener(listenerID);
    }
    addUserUpdateListener(listenerID, listener) {
        this.userService.addUserUpdateListener(listenerID, listener);
    }
    removeUserUpdateListener(listenerID) {
        this.userService.removeUserUpdateListener(listenerID);
    }
    addUserCountOrPropertyChangedListener(listenerID, listener) {
        this.userService.addUserCountOrPropertyChangedListener(listenerID, listener);
    }
    removeUserCountOrPropertyChangedListener(listenerID) {
        this.userService.removeUserCountOrPropertyChangedListener(listenerID);
    }
    /**
     * 移除用户出房间。
     *
     * @param userIDs 要移除的用户ID列表。
     */
    removeUserFromRoom(userIDs) {
        const command = {
            'zego_remove_user': userIDs
        };
        if (this.isLargeRoom || this.markAsLargeRoom) {
            ZegoUIKit.sendInRoomCommand(JSON.stringify(command), [], {
                onSend(errorCode) {
                },
            });
        }
        else {
            ZegoUIKit.sendInRoomCommand(JSON.stringify(command), userIDs, {
                onSend(errorCode) {
                },
            });
        }
    }
    addOnMeRemovedFromRoomListener(listenerID, listener) {
        this.userService.addOnMeRemovedFromRoomListener(listenerID, listener);
    }
    removeOnMeRemovedFromRoomListener(listenerID) {
        this.userService.removeOnMeRemovedFromRoomListener(listenerID);
    }
    // public removeUserCountOrPropertyChangedListenerInternal(listenerID: string,listener: ZegoUserCountOrPropertyChangedListener) {
    //     this.userService.removeUserCountOrPropertyChangedListener(listener, true);
    // }
    // public removeUserUpdateListenerInternal(listenerID: string,listener: ZegoUserUpdateListener) {
    //     this.userService.removeUserUpdateListener(listener, true);
    // }
    login(userID, userName, callback) {
        zloginfo(TAG, 'login', userID, userName);
        UIKitReport.updateUserID(userID);
        this.localUser = new UIKitCoreUser(userID, userName);
        if (callback != null) {
            callback(0);
        }
    }
    logout() {
        this.resetRoomData();
        // this.roomService.clearRoomStateListeners();
        this.localUser = null;
        this.token = null;
    }
    getUser(userID) {
        const coreUser = this.getUserByUserID(userID);
        if (coreUser != null) {
            return coreUser.getUIKitUser();
        }
        else {
            zlogwarning(TAG, 'getUser', 'userID not found', userID);
            return null;
        }
    }
    getLocalUser() {
        const localCoreUser = this.getLocalCoreUser();
        if (localCoreUser == null) {
            return null;
        }
        return localCoreUser?.getUIKitUser();
    }
    getAllUsers() {
        // 使用Array.map来转换remoteUserList
        const uiKitUsers = this.remoteUserList.map(user => user.getUIKitUser());
        // 在数组前端添加localUser
        const localUIKitUser = this.localUser.getUIKitUser();
        return [localUIKitUser, ...uiKitUsers];
    }
    getRemoteUsers() {
        // 创建一个新数组来复制远程用户列表
        const remoteUsersCopy = [...this.remoteUserList];
        return remoteUsersCopy;
    }
    addOnOnlySelfInRoomListener(listenerID, listener) {
        this.userService.addOnOnlySelfInRoomListener(listenerID, listener);
    }
    removeOnOnlySelfInRoomListener(listenerID) {
        this.userService.removeOnOnlySelfInRoomListener(listenerID);
    }
    getInRoomMessages() {
        return this.inRoomMessages;
    }
    sendInRoomMessage(message, listener) {
        this.messageService.sendInRoomMessage(message, listener);
    }
    resendInRoomMessage(message, listener) {
        this.messageService.resendInRoomMessage(message, listener);
    }
    addInRoomMessageReceivedListener(listenerID, listener) {
        this.messageService.addInRoomMessageReceivedListener(listenerID, listener);
    }
    removeInRoomMessageReceivedListener(listenerID) {
        this.messageService.removeInRoomMessageReceivedListener(listenerID);
    }
    //**************   DefaultExpressEventHandler  的相关事件 *********************** */
    roomUserUpdate(roomID, updateType, userList) {
        zloginfo(`${TAG} roomUserUpdate: roomID=${roomID}, updateType=${updateType} userList=${JSON.stringify(userList)}`);
        const userInfoList = userList.map((user) => {
            return new UIKitCoreUser(user.userID, user.userName);
        });
        if (updateType == ZegoUpdateType.Add) {
            for (const uiKitCoreUser of userInfoList) {
                if (!this.containsUser(uiKitCoreUser)) {
                    this.remoteUserList.push(uiKitCoreUser);
                }
            }
            this.roomMemberCount += userList.length;
            if (this.roomMemberCount > 500) {
                this.isLargeRoom = true;
            }
            this.dispatchUserJoin(userInfoList);
        }
        else {
            for (const uiKitCoreUser of userInfoList) {
                this.removeUser(uiKitCoreUser);
            }
            this.roomMemberCount -= userList.length;
            this.dispatchUserLeave(userInfoList);
            if (this.remoteUserList.length === 0) {
                this.dispatchOnlySelfInRoom();
            }
        }
        this.dispatchRoomUserCountOrPropertyChanged(this.getAllUsers());
    }
    roomStreamUpdate(roomID, updateType, streamList, extendedData) {
        // 把参数都用格式化字符串来打印
        zloginfo(`${TAG} roomStreamUpdate: roomID=${roomID}, updateType=${updateType}, streamList=${JSON.stringify(streamList)}, extendedData=${JSON.stringify(extendedData)}`);
        if (updateType == ZegoUpdateType.Add) {
            for (const zegoStream of streamList) {
                const uiKitUser = this.getUserByUserID(zegoStream.user.userID);
                if (uiKitUser) {
                    uiKitUser.setStreamID(zegoStream.streamID);
                    // zlogerror(TAG, 'add user=', JSON.stringify(uiKitUser))
                }
                else {
                    const user = UIKitCoreUser.createFromStream(zegoStream);
                    this.remoteUserList.push(user);
                    // zlogerror(TAG, 'add user=', JSON.stringify(user))
                }
                if (zegoStream.streamID.includes("main")) {
                    if (!this.resourceMode) {
                        zloginfo(TAG, 'roomStreamUpdate', 'startPlayingStream', zegoStream.streamID);
                        ExpressEngineProxy.startPlayingStream(zegoStream.streamID);
                    }
                    else {
                        const config = { resourceMode: this.resourceMode };
                        ExpressEngineProxy.startPlayingStream(zegoStream.streamID, config);
                    }
                }
            }
        }
        if (updateType == ZegoUpdateType.Delete) {
            for (const zegoStream of streamList) {
                const uiKitUser = this.getUserByUserID(zegoStream.user.userID);
                if (uiKitUser) {
                    uiKitUser.deleteStream(zegoStream.streamID);
                    if (zegoStream.streamID.includes("main")) {
                        if (uiKitUser.isCameraOn || uiKitUser.isMicrophoneOn) {
                            if (uiKitUser.isCameraOn) {
                                uiKitUser.isCameraOn = false;
                                this.dispatchRemoteCameraStateUpdate(uiKitUser, false);
                            }
                            if (uiKitUser.isMicrophoneOn) {
                                uiKitUser.isMicrophoneOn = false;
                                this.dispatchRemoteMicStateUpdate(uiKitUser, false);
                            }
                        }
                        uiKitUser.soundLevel = 0;
                    }
                    this.dispatchRoomUserCountOrPropertyChanged(this.getAllUsers());
                }
                ExpressEngineProxy.stopPlayingStream(zegoStream.streamID);
            }
        }
        this.dispatchStreamUpdate(roomID, updateType, streamList, extendedData);
        if (updateType == ZegoUpdateType.Add) {
            this.roomStreamExtraInfoUpdate?.(roomID, streamList);
        }
    }
    publisherStateUpdate(streamID, state, errorCode, extendedData) {
        // 把参数都用格式化字符串来打印
        zloginfo(TAG, `publisherStateUpdate: streamID=${streamID}, state=${state}, errorCode=${errorCode}, extendedData=${JSON.stringify(extendedData)}`);
        if (state == ZegoPublisherState.Publishing) {
            const streamList = [];
            if (this.localUser != null) {
                this.localUser.setStreamID(streamID);
                const zegoStream = {
                    user: new ZegoUser(this.localUser.userID, this.localUser.userName),
                    streamID,
                    extraInfo: ""
                };
                streamList.push(zegoStream);
            }
            this.dispatchStreamUpdate(this.getRoom().roomID, ZegoUpdateType.Add, streamList, extendedData);
        }
        else if (state == ZegoPublisherState.NoPublish) {
            const streamList = [];
            if (this.localUser != null) {
                const zegoStream = {
                    user: new ZegoUser(this.localUser.userID, this.localUser.userName),
                    streamID,
                    extraInfo: ""
                };
                streamList.push(zegoStream);
                this.localUser.deleteStream(zegoStream.streamID);
            }
            this.dispatchStreamUpdate(this.getRoom().roomID, ZegoUpdateType.Delete, streamList, extendedData);
        }
    }
    publisherQualityUpdate(streamID, quality) {
        zloginfo(TAG, "publisherQualityUpdate", streamID, quality);
    }
    playerStateUpdate(streamID, state, errorCode, extendedData) {
        zloginfo(TAG, "playerStateUpdate", streamID, state, errorCode, extendedData);
    }
    playerQualityUpdate(streamID, quality) {
        zloginfo(TAG, "playerQualityUpdate", streamID, quality);
    }
    roomStateChanged(roomID, reason, errorCode, extendedData) {
        zloginfo(`${TAG} roomStateChanged: reason=${reason}`);
        this.dispatchRoomStateUpdate(roomID, reason, errorCode, extendedData);
        if (reason == ZegoRoomStateChangedReason.KickOut) {
            this.userService.notifyRemovedFromRoomCommand();
        }
    }
    localDeviceExceptionOccurred(exceptionType, deviceType, deviceID) {
        zlogerror(`${TAG} localDeviceExceptionOccurred: ${exceptionType} ${deviceType}`);
        // ios端首次授权会出现 exceptionType 1和3的报错
        if (Platform.isIos && [ZegoDeviceExceptionType.PermissionNotGranted, ZegoDeviceExceptionType.Generic])
            return;
        const localCoreUser = this.getLocalCoreUser();
        if (localCoreUser != null) {
            if (deviceType == ZegoDeviceType.Camera) {
                if (localCoreUser.isCameraOn) {
                    this.turnCameraOn(localCoreUser.userID, false);
                    this.dispatchRoomUserCountOrPropertyChanged(this.getAllUsers());
                }
            }
            else if (deviceType == ZegoDeviceType.Microphone) {
                if (localCoreUser.isMicrophoneOn) {
                    this.turnMicrophoneOn(localCoreUser.userID, false);
                    this.dispatchRoomUserCountOrPropertyChanged(this.getAllUsers());
                }
            }
        }
    }
    remoteCameraStateUpdate(streamID, state) {
        zloginfo(`${TAG} remoteCameraStateUpdate: ${state}`);
        // 若不支持获取状态，则不进行改动（采用流额外信息的状态）
        if (state === ZegoRemoteDeviceState.NotSupport)
            return;
        // 对端频繁切换摄像头会出现Interruption状态导致界面不显示画面，先忽略此状态
        if (state === ZegoRemoteDeviceState.Interruption)
            return;
        const coreUser = this.getUserFromStreamID(streamID);
        if (coreUser) {
            const open = state == ZegoRemoteDeviceState.Open;
            coreUser.isCameraOn = open;
            this.dispatchRemoteCameraStateUpdate(coreUser, open);
            this.dispatchRoomUserCountOrPropertyChanged(this.getAllUsers());
        }
    }
    remoteMicStateUpdate(streamID, state) {
        zloginfo(`${TAG} remoteMicStateUpdate: ${state}`);
        const coreUser = this.getUserFromStreamID(streamID);
        if (coreUser) {
            const open = state == ZegoRemoteDeviceState.Open;
            zloginfo(`${TAG} remoteMicStateUpdate from ${coreUser.isMicrophoneOn} to ${open}, has change=${coreUser.isMicrophoneOn !== open}`);
            coreUser.isMicrophoneOn = open;
            this.dispatchRemoteMicStateUpdate(coreUser, open);
            this.dispatchRoomUserCountOrPropertyChanged(this.getAllUsers());
        }
    }
    audioRouteChange(audioRoute) {
        zloginfo(`${TAG} audioRouteChange: ${audioRoute}`);
        this.audioVideoService.notifyAudioRouteChange(audioRoute);
    }
    remoteSoundLevelUpdate(soundLevelInfos) {
        // zloginfo(`${TAG} remoteSoundLevelUpdate: ${JSON.stringify(soundLevelInfos)}`)
        for (const [streamID, soundLevel] of Object.entries(soundLevelInfos)) {
            const coreUser = this.getUserFromStreamID(streamID);
            if (coreUser) {
                coreUser.soundLevel = soundLevel ?? 0;
                this.dispatchSoundLevelUpdate(coreUser.userID, coreUser.soundLevel);
            }
        }
    }
    capturedSoundLevelInfoUpdate(soundLevelInfo) {
        // zloginfo(`${TAG} capturedSoundLevelInfoUpdate: ${soundLevelInfo}`)
        if (this.localUser != null) {
            this.localUser.soundLevel = soundLevelInfo.soundLevel;
            this.dispatchSoundLevelUpdate(this.localUser.userID, this.localUser.soundLevel);
        }
    }
    IMRecvCustomCommand(roomID, fromUser, command) {
        zloginfo(`${TAG} IMRecvCustomCommand: ${roomID} ${fromUser} ${command}`);
        this.roomService.notifyIMRecvCustomCommand(roomID, fromUser, command);
        const localUser = this.getLocalCoreUser();
        if (!localUser) {
            zlogerror(`${TAG} [IMRecvCustomCommand] wrong! localUser is null!`);
            return;
        }
        try {
            const commandObj = JSON.parse(command);
            if ("zego_remove_user" in commandObj) {
                const userList = commandObj.zego_remove_user;
                for (const userID of userList) {
                    if (userID === localUser.userID) {
                        this.notifyRemovedFromRoomCommand();
                        this.leaveRoom();
                        break;
                    }
                }
            }
            else if ("zego_turn_camera_on" in commandObj) {
                const userList = commandObj.zego_turn_camera_on;
                for (const userID of userList) {
                    if (userID === localUser.userID && !this.isCameraOn(userID)) {
                        this.notifyTurnCameraOnCommand({ userID: fromUser.userID, userName: fromUser.userName });
                        break;
                    }
                }
            }
            else if ("zego_turn_microphone_on" in commandObj) {
                const userList = commandObj.zego_turn_microphone_on;
                for (const userID of userList) {
                    if (userID === localUser.userID && !this.isMicrophoneOn(userID)) {
                        this.notifyTurnMicrophoneOnCommand({ userID: fromUser.userID, userName: fromUser.userName });
                        break;
                    }
                }
            }
            else if ("zego_turn_camera_off" in commandObj) {
                const userList = commandObj.zego_turn_camera_off;
                for (const userID of userList) {
                    if (userID === localUser.userID) {
                        this.turnCameraOn(userID, false);
                        this.notifyTurnCameraOffCommand({ userID: fromUser.userID, userName: fromUser.userName });
                        break;
                    }
                }
            }
            else if ("zego_turn_microphone_off" in commandObj) {
                const userList = commandObj.zego_turn_microphone_off;
                for (const userID of userList) {
                    if (userID === localUser.userID) {
                        this.turnMicrophoneOn(userID, false);
                        this.notifyTurnMicrophoneOffCommand({ userID: fromUser.userID, userName: fromUser.userName });
                        break;
                    }
                }
            }
        }
        catch (e) {
            console.error('Error parsing command:', e);
        }
    }
    IMRecvBroadcastMessage(roomID, messageList) {
        zloginfo(`${TAG} IMRecvBroadcastMessage: ${roomID} ${messageList}`);
        const list = messageList.map((zegoBroadcastMessageInfo) => {
            const { userID, userName } = zegoBroadcastMessageInfo.fromUser;
            const user = { userID, userName };
            return {
                message: zegoBroadcastMessageInfo.message,
                messageID: zegoBroadcastMessageInfo.messageID,
                timestamp: zegoBroadcastMessageInfo.sendTime,
                state: ZegoInRoomMessageState.Idle,
                user,
            };
        });
        this.inRoomMessages.push(...list);
        this.dispatchBroadcastMessages(roomID, list);
    }
    roomStreamExtraInfoUpdate(roomID, streamList) {
        zloginfo(`${TAG} roomStreamExtraInfoUpdate: ${roomID} ${JSON.stringify(streamList)}`);
        for (const zegoStream of streamList) {
            let extraInfoObj = {};
            if (zegoStream.extraInfo) {
                try {
                    extraInfoObj = JSON.parse(zegoStream.extraInfo);
                }
                catch (e) {
                    zlogerror('Error parsing extraInfo or updating user state:', e);
                }
            }
            let coreUser = this.getUserByUserID(zegoStream.user.userID);
            if (!coreUser) {
                coreUser = new UIKitCoreUser(zegoStream.user.userID, zegoStream.user.userName);
            }
            if ('isCameraOn' in extraInfoObj) {
                const isCameraOn = extraInfoObj.isCameraOn;
                if (coreUser.isCameraOn !== isCameraOn) {
                    coreUser.isCameraOn = isCameraOn;
                    this.dispatchRemoteCameraStateUpdate(coreUser, coreUser.isCameraOn);
                    this.dispatchRoomUserCountOrPropertyChanged(this.getAllUsers());
                }
            }
            if ('isMicrophoneOn' in extraInfoObj) {
                const isMicrophoneOn = extraInfoObj.isMicrophoneOn;
                if (coreUser.isMicrophoneOn !== isMicrophoneOn) {
                    coreUser.isMicrophoneOn = isMicrophoneOn;
                    this.dispatchRemoteMicStateUpdate(coreUser, coreUser.isMicrophoneOn);
                    this.dispatchRoomUserCountOrPropertyChanged(this.getAllUsers());
                }
            }
        }
    }
    roomExtraInfoUpdate(roomID, roomExtraInfoList) {
        zloginfo(`${TAG} roomExtraInfoUpdate: ${roomID} ${JSON.stringify(roomExtraInfoList)}`);
        for (const roomExtraInfo of roomExtraInfoList) {
            const oldRoomExtraInfo = this.roomExtraInfoMap.get(roomExtraInfo.key);
            if (oldRoomExtraInfo != null) {
                if (roomExtraInfo.updateUser.userID === this.getLocalCoreUser().userID) {
                    continue;
                }
                if (roomExtraInfo.updateTime < oldRoomExtraInfo.updateTime) {
                    continue;
                }
            }
            this.roomExtraInfoMap.set(roomExtraInfo.key, roomExtraInfo);
            if ("extra_info" === roomExtraInfo.key) {
                const updateKeys = [];
                const oldProperties = this.roomExtraInfoValueToMap(oldRoomExtraInfo);
                const currentProperties = this.roomExtraInfoValueToMap(roomExtraInfo);
                for (const key in currentProperties) {
                    const value = currentProperties[key];
                    const oldValue = oldProperties[key];
                    if (value === oldValue) {
                        continue;
                    }
                    updateKeys.push(key);
                }
                for (const updateKey of updateKeys) {
                    this.dispatchRoomPropertyUpdated(updateKey, oldProperties[updateKey], currentProperties[updateKey]);
                }
                if (updateKeys.length > 0) {
                    this.dispatchRoomPropertiesFullUpdated(updateKeys, oldProperties, currentProperties);
                }
            }
        }
    }
    roomTokenWillExpire(roomID, remainTimeInSecond) {
        zloginfo(`${TAG} roomTokenWillExpire: ${roomID} ${remainTimeInSecond}`);
        this.notifyTokenWillExpire(remainTimeInSecond);
    }
}
