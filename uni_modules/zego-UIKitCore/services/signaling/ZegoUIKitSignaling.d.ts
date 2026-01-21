import { ZIMEventHandler } from "../../plugins/signaling/ZIMUniApp";
import { ZegoSignalingConnectionState, ZegoSignalingInRoomCommandMessage, ZegoSignalingInRoomTextMessage, ZegoSignalingNotificationConfig, ZegoSignalingPluginEventHandler } from "../../plugins";
import { ZegoUIKitUser, ZegoUserInRoomAttributesInfo } from "../../services/defines";
import { CallingConfig, CallInvitationRejectReason, ZegoInvitationType, ZegoUIKitInvitationData, ZegoUIKitSignalingCallback, ZegoUIKitSignalingConnectionStateChangeListener, ZegoUIKitSignalingInRoomCommandMessageListener, ZegoUIKitSignalingInRoomTextMessageListener, ZegoUIKitSignalingInvitationListener, ZegoUIKitSignalingRoomPropertyUpdateListener, ZegoUIKitSignalingUsersInRoomAttributesUpdateListener } from "./defines";
export declare class ZegoUIKitSignaling implements ZegoSignalingPluginEventHandler {
    private static name;
    private signalingPlugin;
    private signalingService;
    private usersInRoomAttributes;
    private oldUsersInRoomAttributes;
    private roomAttributes;
    private currentSignalUser?;
    private isInLoginProcess;
    private currentRoomID?;
    private currentInvitationID;
    private signalConnectionState;
    private listenerID;
    private invitationMap;
    private callingConfig;
    static getInstance(): ZegoUIKitSignaling;
    static destroy(): void;
    private getInvitee;
    private addInvitationData;
    private getInvitationByID;
    private getInvitationByInvitee;
    private getInvitationByInviter;
    private removeInvitationData;
    private removeIfAllChecked;
    private getAllWaitingInviteesByID;
    login(userID: string, userName: string, callback?: ZegoUIKitSignalingCallback): void;
    joinRoom(roomID: string, callback?: ZegoUIKitSignalingCallback): void;
    leaveRoom(callback?: ZegoUIKitSignalingCallback): void;
    unInit(): void;
    private removeRoomListenersAndData;
    setUsersInRoomAttributes(key: string, value: string, userIDs: string[], callback?: ZegoUIKitSignalingCallback): void;
    queryUsersInRoomAttributes(count: number, nextFlag: string): Promise<{
        infos: ZegoUserInRoomAttributesInfo[];
        nextFlag: string;
    }>;
    updateRoomProperty(attributes: Record<string, string>, isDeleteAfterOwnerLeft: boolean, isForce: boolean, isUpdateOwner: boolean): Promise<{
        errorKeys: string[];
    }>;
    deleteRoomProperties(keys: string[], isForce: boolean): Promise<{
        errorKeys: string[];
    }>;
    beginRoomPropertiesBatchOperation(isDeleteAfterOwnerLeft: boolean, isForce: boolean, isUpdateOwner: boolean): void;
    endRoomPropertiesBatchOperation(): Promise<void>;
    queryRoomProperties(): Promise<{
        roomAttributes: Record<string, string>;
    }>;
    getRoomProperties(): Record<string, string>;
    updateCoreUserAndNotifyChanges(infos: ZegoUserInRoomAttributesInfo[]): void;
    private getIndexFromUsersInRoomAttributes;
    addRoomPropertyUpdateListener(listenerID: string, listener: ZegoUIKitSignalingRoomPropertyUpdateListener): void;
    removeRoomPropertyUpdateListener(listenerID: string): void;
    addUsersInRoomAttributesUpdateListener(listenerID: string, listener: ZegoUIKitSignalingUsersInRoomAttributesUpdateListener): void;
    removeUsersInRoomAttributesUpdateListener(listenerID: string): void;
    addInRoomTextMessageListener(listenerID: string, listener: ZegoUIKitSignalingInRoomTextMessageListener): void;
    removeInRoomTextMessageListener(listenerID: string): void;
    addInRoomCommandMessageListener(listenerID: string, listener: ZegoUIKitSignalingInRoomCommandMessageListener): void;
    removeInRoomCommandMessageListener(listenerID: string): void;
    addInvitationListener(listenerID: string, listener: ZegoUIKitSignalingInvitationListener): void;
    removeInvitationListener(listenerID: string): void;
    init(appID: number, appSign: string): Promise<void>;
    sendInRoomCommandMessage(command: string, roomID: string, callback?: ZegoUIKitSignalingCallback): void;
    private separateUsers;
    /**
     *
     * @param callID 这是由发起方来定的RTC的roomID
     * @param invitees
     * @param timeout
     * @param type
     * @param customData
     * @param notificationConfig
     * @param callback
     * @returns
     */
    sendInvitation(invitees: ZegoUIKitUser[], type: ZegoInvitationType, customData: string, timeout?: number, callID?: string, notificationConfig?: ZegoSignalingNotificationConfig): Promise<{
        invitationID: string;
        callID: string;
        successUsers: ZegoUIKitUser[];
        errorUsers: ZegoUIKitUser[];
    }>;
    addInvitation(invitees: ZegoUIKitUser[], notificationConfig?: ZegoSignalingNotificationConfig): Promise<{
        invitationID: string;
        callID: string;
        successUsers: ZegoUIKitUser[];
        errorUsers: ZegoUIKitUser[];
    }>;
    cancelInvitation(invitationID: string, inviteeIDs?: string[], notificationConfig?: ZegoSignalingNotificationConfig): Promise<{
        invitationID: string;
        successUsers?: ZegoUIKitUser[];
        errorUsers?: ZegoUIKitUser[];
    }>;
    refuseInvitation(inviterID: string, customData: string, reason: CallInvitationRejectReason): Promise<void>;
    acceptInvitation(invitationID: string, customData: string): Promise<void>;
    callQuit(): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMCallQuitSentResult>;
    callEnd(): Promise<import("@/js_sdk/zego-ZIMUniplugin-JS/lib/ZIMDefines").ZIMCallEndSentResult>;
    logout(): void;
    connectUser(): void;
    isPluginExited(): boolean;
    onConnectionStateChanged(state: ZegoSignalingConnectionState): void;
    onCallInvitationReceived(invitationID: string, inviterID: string, extendedData: string): void;
    onCallInvitationCancelled(invitationID: string, inviterID: string, extendedData: string): void;
    onCallInvitationAccepted(invitationID: string, invitee: string, extendedData: string): void;
    onCallInvitationRejected(invitationID: string, invitee: string, extendedData: string): void;
    onCallInvitationTimeout(invitationID: string): void;
    onCallInviteesAnsweredTimeout(invitationID: string, invitees: string[]): void;
    onUsersInRoomAttributesUpdated(attributesMap: Record<string, Record<string, string>>, editor: string, roomID: string): void;
    onRoomPropertiesUpdated(setProperties: Record<string, string>[], deleteProperties: Record<string, string>[], roomID: string): void;
    onRoomMemberLeft(userIDList: string[], roomID: string): void;
    onRoomMemberJoined(userIDList: string[], roomID: string): void;
    onInRoomTextMessageReceived(messages: ZegoSignalingInRoomTextMessage[], roomID: string): void;
    onInRoomCommandMessageReceived(messages: ZegoSignalingInRoomCommandMessage[], roomID: string): void;
    addConnectionStateChangeListener(listenerID: string, listener: ZegoUIKitSignalingConnectionStateChangeListener): void;
    removeConnectionStateChangeListener(listenerID: string): void;
    addZIMEventHandler(listenerID: string, handler: ZIMEventHandler): void;
    removeZIMEventHandler(listenerID: string): void;
    setCallingConfig({ canInvitingInCalling, onlyInitiatorCanInvite, endCallWhenInitiatorLeave }: CallingConfig): void;
    isInviter(userID: string): boolean;
    getCallingConfig(): CallingConfig;
    getCurrentInvitationData(): ZegoUIKitInvitationData | null;
    endCall(): Promise<void>;
}
