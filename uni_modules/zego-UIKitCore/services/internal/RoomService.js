import { NotifyList } from './NotifyList';
import { ZegoUpdateType } from "../express/ZegoExpressUniApp";
import { ExpressEngineProxy } from '../express/ExpressEngineProxy';
import UIKitCore from './UIKitCore';
import { makeTag, UIKitReport, zlogerror, zloginfo, zlogwarning } from '../../utils';
const TAG = makeTag('RoomService');
export default class RoomService {
    mainStreamUpdateListeners = new NotifyList();
    shareStreamUpdateListeners = new NotifyList();
    roomStateChangedListeners = new NotifyList();
    roomPropertyUpdateListeners = new NotifyList();
    inRoomCommandListenerNotifyList = new NotifyList();
    constructor() {
        zloginfo(TAG, 'new RoomService');
    }
    addRoomStateUpdatedListener(listenerID, listener) {
        this.roomStateChangedListeners.addListener(listenerID, listener);
    }
    removeRoomStateUpdatedListener(listenerID) {
        this.roomStateChangedListeners.removeListener(listenerID);
    }
    addRoomPropertyUpdatedListener(listenerID, listener) {
        this.roomPropertyUpdateListeners.addListener(listenerID, listener);
    }
    removeRoomPropertyUpdatedListener(listenerID) {
        this.roomPropertyUpdateListeners.removeListener(listenerID);
    }
    addInRoomCommandListener(listenerID, listener) {
        this.inRoomCommandListenerNotifyList.addListener(listenerID, listener);
    }
    removeInRoomCommandListener(listenerID) {
        this.inRoomCommandListenerNotifyList.removeListener(listenerID);
    }
    addScreenSharingUpdateListener(listenerID, listener) {
        this.shareStreamUpdateListeners.addListener(listenerID, listener);
    }
    removeScreenSharingUpdateListener(listenerID) {
        this.shareStreamUpdateListeners.removeListener(listenerID);
    }
    clear() {
        this.clearOtherListeners();
        this.clearRoomStateListeners();
    }
    clearOtherListeners() {
        this.mainStreamUpdateListeners.clear();
        this.roomPropertyUpdateListeners.clear();
        this.inRoomCommandListenerNotifyList.clear();
        this.shareStreamUpdateListeners.clear();
    }
    clearRoomStateListeners() {
        this.roomStateChangedListeners.clear();
    }
    notifyStreamUpdate(roomID, zegoUpdateType, streamList, jsonObject) {
        zloginfo(TAG, `notifyStreamUpdate roomID=${roomID}, zegoUpdateType=${zegoUpdateType}, streamList=${JSON.stringify(streamList)}, jsonObject=${JSON.stringify(jsonObject)}`);
        const mainStreamList = streamList.filter(stream => stream.streamID.includes("main"));
        const shareStreamList = streamList.filter(stream => !stream.streamID.includes("main"));
        const mainUserList = mainStreamList.map(stream => ({
            userID: stream.user.userID,
            userName: stream.user.userName,
            streamID: stream.streamID,
        }));
        const shareUserList = shareStreamList.map(stream => ({
            userID: stream.user.userID,
            userName: stream.user.userName,
            streamID: stream.streamID,
        }));
        if (zegoUpdateType === ZegoUpdateType.Add) {
            zlogwarning(TAG, `notifyStreamUpdate add stream, mainUserList=${JSON.stringify(mainUserList)}, mainStreamUpdateListeners=${this.mainStreamUpdateListeners.length}`);
            if (mainUserList.length > 0) {
                this.mainStreamUpdateListeners.notifyAllListener(audioVideoUpdateListener => {
                    audioVideoUpdateListener.onAudioVideoAvailable?.(mainUserList);
                });
            }
            if (shareUserList.length > 0) {
                this.shareStreamUpdateListeners.notifyAllListener(screenSharingUpdateListener => {
                    screenSharingUpdateListener.onScreenSharingAvailable?.(shareUserList);
                });
            }
        }
        else {
            if (mainUserList.length > 0) {
                this.mainStreamUpdateListeners.notifyAllListener(audioVideoUpdateListener => {
                    audioVideoUpdateListener.onAudioVideoUnAvailable?.(mainUserList);
                });
            }
            if (shareUserList.length > 0) {
                this.shareStreamUpdateListeners.notifyAllListener(screenSharingUpdateListener => {
                    screenSharingUpdateListener.onScreenSharingUnAvailable?.(shareUserList);
                });
            }
        }
    }
    notifyRoomStateUpdate(roomID, reason, errorCode, jsonObject) {
        this.roomStateChangedListeners.notifyAllListener(roomStateChangedListener => {
            roomStateChangedListener.onRoomStateChanged?.(roomID, reason, errorCode, jsonObject);
        });
    }
    addAudioVideoUpdateListener(listenerID, listener) {
        this.mainStreamUpdateListeners.addListener(listenerID, listener);
        zloginfo(TAG, `addAudioVideoUpdateListener listenerID=${listenerID}, this.mainStreamUpdateListeners=${this.mainStreamUpdateListeners.length}`);
    }
    removeAudioVideoUpdateListener(listenerID) {
        zloginfo(TAG, `removeAudioVideoUpdateListener listenerID=${listenerID}`);
        this.mainStreamUpdateListeners.removeListener(listenerID);
    }
    // public notifyAudioVideoAvailable(mainUserList: ZegoUIKitUser[]) {
    //     if (mainUserList.length > 0) {
    //         this.mainStreamUpdateListeners.notifyAllListener(audioVideoUpdateListener => {
    //             audioVideoUpdateListener.onAudioVideoAvailable?.(mainUserList);
    //         });
    //     }
    // }
    async joinRoom(roomID, token, callback) {
        const localUser = UIKitCore.getInstance().getLocalCoreUser();
        zloginfo(`${TAG} joinRoom for ${roomID}, localUser=${JSON.stringify(localUser)}`);
        if (localUser) {
            const user = {
                userID: localUser.userID,
                userName: localUser.userName
            };
            const config = {
                maxMemberCount: 0,
                isUserStatusNotify: true,
                token: ''
            };
            if (token) {
                config.token = token;
            }
            const startTime = Date.now();
            const result = await ExpressEngineProxy.loginRoom(roomID, user, config);
            if (!result) {
                zlogerror(`${TAG} loginRoom fail! ${JSON.stringify(result)}`);
            }
            else {
                zloginfo(`${TAG} loginRoom success`);
            }
            const errorCode = result?.errorCode ?? 0;
            const errorMsg = result?.extendedData ?? '';
            if (callback) {
                callback(errorCode);
            }
            UIKitReport.reportEvent('loginRoom', {
                room_id: roomID,
                error: errorCode,
                msg: errorMsg,
                start_time: startTime,
            });
        }
    }
    async leaveRoom(roomID, callback) {
        const result = await ExpressEngineProxy.logoutRoom(roomID);
        zloginfo(`${TAG} leaveRoom for ${roomID}, result: ${JSON.stringify(result)}`);
        const errorCode = result?.errorCode ?? 0;
        const errorMsg = result?.extendedData ?? '';
        if (callback) {
            callback.onRoomLogoutResult?.(errorCode, errorMsg);
        }
        UIKitReport.reportEvent('logoutRoom', {
            room_id: roomID,
            error: errorCode,
            msg: errorMsg,
        });
    }
    async setRoomProperty(roomID, key, value, callback) {
        const result = await ExpressEngineProxy.setRoomExtraInfo(roomID, key, value);
        if (callback) {
            callback(result?.errorCode ?? 0);
        }
    }
    notifyRoomPropertyUpdate(key, oldValue, value) {
        this.roomPropertyUpdateListeners.notifyAllListener(roomPropertyUpdateListener => {
            roomPropertyUpdateListener.onRoomPropertyUpdated?.(key, oldValue, value);
        });
    }
    notifyRoomPropertiesFullUpdated(keys, oldProperties, roomProperties) {
        this.roomPropertyUpdateListeners.notifyAllListener(roomPropertyUpdateListener => {
            roomPropertyUpdateListener.onRoomPropertiesFullUpdated?.(keys, oldProperties, roomProperties);
        });
    }
    async sendInRoomCommand(roomID, command, toUserList, callback) {
        const zegoUserList = toUserList
            .map(userID => UIKitCore.getInstance().getUser(userID))
            .filter(user => !!user)
            .map(uiKitUser => ({
            userID: uiKitUser.userID,
            userName: uiKitUser.userName
        }));
        const result = await ExpressEngineProxy.sendCustomCommand(roomID, command, zegoUserList);
        if (callback) {
            callback.onSend?.(result.errorCode);
        }
    }
    notifyIMRecvCustomCommand(roomID, fromUser, command) {
        this.inRoomCommandListenerNotifyList.notifyAllListener(zegoInRoomCommandListener => {
            const uiKitUser = {
                userID: fromUser.userID,
                userName: fromUser.userName
            };
            zegoInRoomCommandListener.onInRoomCommandReceived?.(uiKitUser, command);
        });
    }
}
