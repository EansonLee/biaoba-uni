import { ZegoSignalingNotificationConfig } from "./defines";
import { ZegoSignalingPluginEventHandler } from "./ZegoSignalingPluginEventHandler";
import { ZIMCallInvitationMode, ZIMEventHandler } from "./ZIMUniApp";
export declare class ZegoSignalingPluginService {
    private signalingPluginEventHandlerNotifyList;
    private zimEventHandler;
    private isZIMInited;
    constructor();
    getVersion(): Promise<string>;
    init(appID: number, appSign: string): Promise<boolean>;
    private getPushConfig;
    connectUser(userID: string, userName: string): Promise<void>;
    disconnectUser(): Promise<void>;
    destroy(): void;
    sendInvitation(invitees: string[], timeout: number, extendedData: string, notificationConfig?: ZegoSignalingNotificationConfig, mode?: ZIMCallInvitationMode): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMCallInvitationSentResult>;
    callingInvitation(invitees: string[], callID: string, extendedData: string, notificationConfig?: ZegoSignalingNotificationConfig): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMCallingInvitationSentResult>;
    cancelInvitation(invitees: string[], invitationID: string, extendedData: string, notificationConfig?: ZegoSignalingNotificationConfig): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMCallCancelSentResult>;
    refuseInvitation(invitationID: string, extendedData: string): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMCallRejectionSentResult>;
    acceptInvitation(invitationID: string, extendedData: string): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMCallAcceptanceSentResult>;
    callQuit(callID: string, extendedData: string, notificationConfig?: ZegoSignalingNotificationConfig): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMCallQuitSentResult>;
    callEnd(callID: string, extendedData: string, notificationConfig?: ZegoSignalingNotificationConfig): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMCallEndSentResult>;
    joinRoom(roomID: string, roomName: string): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMRoomEnteredResult>;
    leaveRoom(roomID: string): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMRoomLeftResult>;
    setUsersInRoomAttributes(attributes: Record<string, string>, userIDs: string[], roomID: string): Promise<{
        errorUserList: string[];
        attributesMap: Record<string, Record<string, string>>;
        errorKeysMap: Record<string, string[]>;
    }>;
    queryUsersInRoomAttributes(roomID: string, count: number, nextFlag: string): Promise<{
        nextFlag: string;
        attributesMap: Record<string, Record<string, string>>;
    }>;
    updateRoomProperty(attributes: Record<string, string>, roomID: string, isForce: boolean, isDeleteAfterOwnerLeft: boolean, isUpdateOwner: boolean): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMRoomAttributesOperatedResult>;
    deleteRoomProperties(keys: string[], roomID: string, isForce: boolean): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMRoomAttributesOperatedResult>;
    queryRoomProperties(roomID: string): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMRoomAttributesQueriedResult>;
    beginRoomPropertiesBatchOperation(roomID: string, isDeleteAfterOwnerLeft: boolean, isForce: boolean, isUpdateOwner: boolean): void;
    endRoomPropertiesBatchOperation(roomID: string): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMRoomAttributesBatchOperatedResult>;
    sendRoomMessage(text: string, roomID: string): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMMessageSentResult>;
    sendInRoomCommandMessage(command: string, roomID: string): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMMessageSentResult>;
    addPluginEventHandler(listenerID: string, handler: ZegoSignalingPluginEventHandler): void;
    removePluginEventHandler(listenerID: string): void;
    addZIMEventHandler(listenerID: string, handler: ZIMEventHandler): void;
    removeZIMEventHandler(listenerID: string): void;
}
