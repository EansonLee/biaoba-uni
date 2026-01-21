import { ZegoPluginType } from "../ZegoPluginType";
import { ZegoSignalingPluginService } from "./ZegoSignalingPluginService";
const TAG = '[ZegoSignalingPlugin]';
const VERSION = '1.0.0';
// ZegoSignalingPlugin, 插件的实现类
export class ZegoSignalingPlugin {
    getPluginType() {
        return ZegoPluginType.Signling;
    }
    getVersion() {
        return VERSION;
    }
    service = new ZegoSignalingPluginService();
    init(appID, appSign) {
        return this.service.init(appID, appSign);
    }
    connectUser(userID, userName) {
        return this.service.connectUser(userID, userName);
    }
    disconnectUser() {
        return this.service.disconnectUser();
    }
    destroy() {
        this.service.destroy();
    }
    sendInvitation(invitees, timeout, extendedData, notificationConfig, mode) {
        return this.service.sendInvitation(invitees, timeout, extendedData, notificationConfig, mode);
    }
    callingInvitation(invitees, callID, extendedData, notificationConfig) {
        return this.service.callingInvitation(invitees, callID, extendedData, notificationConfig);
    }
    cancelInvitation(invitees, invitationID, extendedData, notificationConfig) {
        return this.service.cancelInvitation(invitees, invitationID, extendedData, notificationConfig);
    }
    refuseInvitation(invitationID, extendedData) {
        return this.service.refuseInvitation(invitationID, extendedData);
    }
    acceptInvitation(invitationID, extendedData) {
        return this.service.acceptInvitation(invitationID, extendedData);
    }
    callQuit(callID, extendedData, notificationConfig) {
        return this.service.callQuit(callID, extendedData, notificationConfig);
    }
    callEnd(callID, extendedData, notificationConfig) {
        return this.service.callEnd(callID, extendedData, notificationConfig);
    }
    joinRoom(roomID, roomName) {
        return this.service.joinRoom(roomID, roomName);
    }
    leaveRoom(roomID) {
        return this.service.leaveRoom(roomID);
    }
    setUsersInRoomAttributes(attributes, userIDs, roomID) {
        return this.service.setUsersInRoomAttributes(attributes, userIDs, roomID);
    }
    queryUsersInRoomAttributes(roomID, count, nextFlag) {
        return this.service.queryUsersInRoomAttributes(roomID, count, nextFlag);
    }
    updateRoomProperty(attributes, roomID, isForce, isDeleteAfterOwnerLeft, isUpdateOwner) {
        return this.service.updateRoomProperty(attributes, roomID, isForce, isDeleteAfterOwnerLeft, isUpdateOwner);
    }
    deleteRoomProperties(keys, roomID, isForce) {
        return this.service.deleteRoomProperties(keys, roomID, isForce);
    }
    queryRoomProperties(roomID) {
        return this.service.queryRoomProperties(roomID);
    }
    beginRoomPropertiesBatchOperation(roomID, isDeleteAfterOwnerLeft, isForce, isUpdateOwner) {
        return this.service.beginRoomPropertiesBatchOperation(roomID, isDeleteAfterOwnerLeft, isForce, isUpdateOwner);
    }
    endRoomPropertiesBatchOperation(roomID) {
        return this.service.endRoomPropertiesBatchOperation(roomID);
    }
    sendRoomMessage(text, roomID) {
        return this.service.sendRoomMessage(text, roomID);
    }
    sendInRoomCommandMessage(command, roomID) {
        return this.service.sendInRoomCommandMessage(command, roomID);
    }
    addPluginEventHandler(listenerID, handler) {
        this.service.addPluginEventHandler(listenerID, handler);
    }
    removePluginEventHandler(listenerID) {
        this.service.removePluginEventHandler(listenerID);
    }
    addZIMEventHandler(listenerID, handler) {
        this.service.addZIMEventHandler(listenerID, handler);
    }
    removeZIMEventHandler(listenerID) {
        this.service.removeZIMEventHandler(listenerID);
    }
}
