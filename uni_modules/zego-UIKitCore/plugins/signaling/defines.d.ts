export interface ZegoSignalingInRoomCommandMessage {
    messageID: string;
    timestamp: number;
    orderKey: number;
    senderUserID: string;
    text: string;
}
export interface ZegoSignalingInRoomTextMessage {
    messageID: string;
    timestamp: number;
    orderKey: number;
    senderUserID: string;
    text: string;
}
export declare enum ZegoSignalingConnectionState {
    Disconnected = 0,
    Connecting = 1,
    Connected = 2,
    Reconnecting = 3
}
export interface ZegoSignalingNotificationConfig {
    resourceID?: string;
    title?: string;
    message?: string;
}
export interface ZegoSignalingUsersInRoomAttributes {
    nextFlag: string;
    attributesMap: Record<string, Record<string, string>>;
}
export interface ZegoSignalingSetUsersInRoomAttributesResult {
    errorUserList: string[];
    attributesMap: Record<string, Record<string, string>>;
    errorKeysMap: Record<string, string[]>;
}
