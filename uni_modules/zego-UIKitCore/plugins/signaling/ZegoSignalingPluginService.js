import { NotifyList } from '../../services/internal/NotifyList';
import { makeTag, zloginfo, zlogwarning } from "../../utils";
import { SimpleZIMEventHandler } from "./SimpleZIMEventHandler";
import ZIM, { ZIMCallInvitationMode, ZIMConversationType, ZIMMessagePriority, ZIMMessageType } from "./ZIMUniApp";
const TAG = makeTag('ZegoSignalingPluginService');
// 这个类是对ZIM接口调用的封装
export class ZegoSignalingPluginService {
    signalingPluginEventHandlerNotifyList = new NotifyList();
    zimEventHandler = new SimpleZIMEventHandler(this.signalingPluginEventHandlerNotifyList);
    isZIMInited = false;
    // private static zim: ZIM | null = null;
    constructor() {
        zloginfo(TAG, 'new ZegoSignalingPluginService');
    }
    async getVersion() {
        return ZIM.getVersion();
    }
    async init(appID, appSign) {
        if (this.isZIMInited) {
            zlogwarning(TAG, 'ZegoSignalingPluginService has been inited');
            return false;
        }
        this.isZIMInited = true;
        const zimAppConfig = {
            appID, appSign
        };
        const zim = ZIM.create(zimAppConfig);
        const version = await this.getVersion();
        zloginfo(TAG, `init ZIM ${!!zim ? 'success' : 'failed'}, version=${version}`);
        if (!zim) {
            return false;
        }
        for (let key of Object.keys(this.zimEventHandler)) {
            const evt = key;
            // zloginfo(TAG, `add event listener ${evt}`)
            // @ts-ignore
            zim.on(evt, this.zimEventHandler[evt]);
        }
        return true;
    }
    getPushConfig(notificationConfig, extendedData) {
        const pushConfig = {
            title: notificationConfig.title || '',
            content: notificationConfig.message || '',
            resourcesID: notificationConfig.resourceID,
            payload: extendedData,
        };
        return pushConfig;
    }
    connectUser(userID, userName) {
        return ZIM.getInstance().login(userID, { userName, token: '', isOfflineLogin: false });
    }
    disconnectUser() {
        return ZIM.getInstance().logout();
    }
    destroy() {
        zloginfo(TAG, 'destroy ZIM');
        this.isZIMInited = false;
        this.signalingPluginEventHandlerNotifyList.clear();
        this.zimEventHandler.removeAllEventListeners();
        ZIM.getInstance().destroy();
    }
    sendInvitation(invitees, timeout, extendedData, notificationConfig, mode = ZIMCallInvitationMode.General) {
        const config = {
            mode,
            timeout,
            extendedData: extendedData,
            enableNotReceivedCheck: true
        };
        if (notificationConfig) {
            config.pushConfig = this.getPushConfig(notificationConfig, extendedData);
        }
        zloginfo(TAG, `sendInvitation ${invitees} ${timeout} ${extendedData} ${notificationConfig}`);
        return ZIM.getInstance().callInvite(invitees, config);
    }
    callingInvitation(invitees, callID, extendedData, notificationConfig) {
        const config = {};
        if (notificationConfig) {
            config.pushConfig = this.getPushConfig(notificationConfig, extendedData);
        }
        zloginfo(TAG, `callingInvite ${invitees} ${callID} ${extendedData} ${JSON.stringify(notificationConfig)}`);
        return ZIM.getInstance().callingInvite(invitees, callID, config);
    }
    cancelInvitation(invitees, invitationID, extendedData, notificationConfig) {
        const config = {
            extendedData: extendedData,
        };
        if (notificationConfig != null) {
            config.pushConfig = this.getPushConfig(notificationConfig, extendedData);
        }
        zloginfo(TAG, `cancelInvitation ${invitees} ${invitationID} ${extendedData} ${notificationConfig}`);
        return ZIM.getInstance().callCancel(invitees, invitationID, config);
    }
    refuseInvitation(invitationID, extendedData) {
        const config = { extendedData: extendedData };
        zloginfo(TAG, `refuseInvitation ${invitationID} ${extendedData}`);
        return ZIM.getInstance().callReject(invitationID, config);
    }
    acceptInvitation(invitationID, extendedData) {
        const config = { extendedData: extendedData };
        zloginfo(TAG, `acceptInvitation ${invitationID} ${extendedData}`);
        return ZIM.getInstance().callAccept(invitationID, config);
    }
    callQuit(callID, extendedData, notificationConfig) {
        const config = {
            extendedData: extendedData,
        };
        if (notificationConfig) {
            config.pushConfig = this.getPushConfig(notificationConfig, extendedData);
        }
        zloginfo(TAG, `callQuit ${callID} ${extendedData} ${notificationConfig}`);
        return ZIM.getInstance().callQuit(callID, config);
    }
    callEnd(callID, extendedData, notificationConfig) {
        const config = {
            extendedData: extendedData,
        };
        if (notificationConfig) {
            config.pushConfig = this.getPushConfig(notificationConfig, extendedData);
        }
        zloginfo(TAG, `callEnd ${callID} ${extendedData} ${notificationConfig}`);
        return ZIM.getInstance().callEnd(callID, config);
    }
    joinRoom(roomID, roomName) {
        const zimRoomInfo = { roomID, roomName };
        return ZIM.getInstance().enterRoom(zimRoomInfo);
    }
    leaveRoom(roomID) {
        return ZIM.getInstance().leaveRoom(roomID);
    }
    async setUsersInRoomAttributes(attributes, userIDs, roomID) {
        const config = {
            isDeleteAfterOwnerLeft: false
        };
        const { infos, errorUserList } = await ZIM.getInstance().setRoomMembersAttributes(attributes, userIDs, roomID, config);
        const attributesMap = {};
        const errorKeysMap = {};
        for (const info of infos) {
            attributesMap[info.attributesInfo.userID] = info.attributesInfo.attributes;
            errorKeysMap[info.attributesInfo.userID] = info.errorKeys;
        }
        return { errorUserList, attributesMap, errorKeysMap };
    }
    async queryUsersInRoomAttributes(roomID, count, nextFlag) {
        const config = {
            count,
            nextFlag
        };
        const { infos } = await ZIM.getInstance().queryRoomMemberAttributesList(roomID, config);
        const attributesMap = {};
        for (const info of infos) {
            attributesMap[info.userID] = info.attributes;
        }
        return { nextFlag, attributesMap };
    }
    updateRoomProperty(attributes, roomID, isForce, isDeleteAfterOwnerLeft, isUpdateOwner) {
        const config = {
            isDeleteAfterOwnerLeft,
            isForce,
            isUpdateOwner
        };
        return ZIM.getInstance().setRoomAttributes(attributes, roomID, config);
    }
    deleteRoomProperties(keys, roomID, isForce) {
        const config = {
            isForce
        };
        return ZIM.getInstance().deleteRoomAttributes(keys, roomID, config);
    }
    queryRoomProperties(roomID) {
        return ZIM.getInstance().queryRoomAllAttributes(roomID);
    }
    beginRoomPropertiesBatchOperation(roomID, isDeleteAfterOwnerLeft, isForce, isUpdateOwner) {
        const config = {
            isForce,
            isDeleteAfterOwnerLeft,
            isUpdateOwner
        };
        return ZIM.getInstance().beginRoomAttributesBatchOperation(roomID, config);
    }
    endRoomPropertiesBatchOperation(roomID) {
        return ZIM.getInstance().endRoomAttributesBatchOperation(roomID);
    }
    sendRoomMessage(text, roomID) {
        const textMessage = {
            type: ZIMMessageType.Text,
            message: text
        };
        const config = {
            priority: ZIMMessagePriority.Low
        };
        return ZIM.getInstance().sendMessage(textMessage, roomID, ZIMConversationType.Room, config);
    }
    sendInRoomCommandMessage(command, roomID) {
        // 将 string 转换为 Uint8Array
        const encoder = new TextEncoder();
        const commandMessage = {
            type: ZIMMessageType.Command,
            message: encoder.encode(command),
        };
        const config = {
            priority: ZIMMessagePriority.Low
        };
        return ZIM.getInstance().sendMessage(commandMessage, roomID, ZIMConversationType.Room, config);
    }
    addPluginEventHandler(listenerID, handler) {
        zloginfo(TAG, `addPluginEventHandler ${listenerID}`);
        this.signalingPluginEventHandlerNotifyList.addListener(listenerID, handler);
    }
    removePluginEventHandler(listenerID) {
        zloginfo(TAG, `removePluginEventHandler ${listenerID}`);
        this.signalingPluginEventHandlerNotifyList.removeListener(listenerID);
    }
    addZIMEventHandler(listenerID, handler) {
        zloginfo(TAG, `addZIMEventHandler ${listenerID}`);
        this.zimEventHandler?.addListener(listenerID, handler);
    }
    removeZIMEventHandler(listenerID) {
        zloginfo(TAG, `removeZIMEventHandler ${listenerID}`);
        this.zimEventHandler?.removeListener(listenerID);
    }
}
