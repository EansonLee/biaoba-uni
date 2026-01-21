import { ZIMConnectionState, ZIMConnectionEvent, ZIMUserInfo, ZIMUserRule, ZIMUserStatus, ZIMMessage, ZIMConversationChangeInfo, ZIMRoomState, ZIMRoomEvent, ZIMRoomAttributesUpdateInfo, ZIMGroupMemberInfo, ZIMGroupOperatedInfo, ZIMGroupMemberState, ZIMGroupMemberEvent, ZIMGroupFullInfo, ZIMGroupState, ZIMGroupEvent, ZIMGroupAttributesUpdateInfo, ZIMRoomMemberAttributesUpdateInfo, ZIMRoomOperatedInfo, ZIMMessageReceiptInfo, ZIMRevokeMessage, ZIMMessageSentStatusChangeInfo, ZIMMessageRootRepliedCountInfo, ZIMMessageReceivedInfo, ZIMCallInvitationMode, ZIMCallUserInfo, ZIMMessageReaction, ZIMUserFullInfo, ZIMConversationType, ZIMGroupMuteInfo, ZIMGroupVerifyInfo, ZIMGroupApplicationInfo, ZIMGroupApplicationListChangeAction, ZIMBlacklistChangeAction, ZIMFriendListChangeAction, ZIMFriendApplicationListChangeAction, ZIMFriendInfo, ZIMFriendApplicationInfo } from './ZIMDefines';
import { ZIMError } from './ZIMErrorCode';
import ZIM from './ZIM';
export declare type ZegoAnyCallback = (...args: any[]) => any;
export interface ZIMEventHandler {
    error: (zim: ZIM, errorInfo: ZIMError) => void;
    connectionStateChanged: (zim: ZIM, data: ZIMEventOfConnectionStateChangedResult) => void;
    tokenWillExpire: (zim: ZIM, data: ZIMEventOfTokenWillExpireResult) => void;
    userInfoUpdated: (zim: ZIM, data: ZIMEventOfUserInfoUpdatedResult) => void;
    userRuleUpdated: (zim: ZIM, data: ZIMEventOfUserRuleUpdatedResult) => void;
    userStatusUpdated: (zim: ZIM, data: ZIMEventOfUserStatusUpdatedResult) => void;
    conversationsAllDeleted: (zim: ZIM, data: ZIMEventOfConversationsAllDeletedResult) => void;
    conversationChanged: (zim: ZIM, data: ZIMEventOfConversationChangedResult) => void;
    conversationTotalUnreadMessageCountUpdated: (zim: ZIM, data: ZIMEventOfConversationTotalUnreadMessageCountUpdatedResult) => void;
    broadcastMessageReceived: (zim: ZIM, data: ZIMEventOfBroadcastMessageReceivedResult) => void;
    roomMessageReceived: (zim: ZIM, data: ZIMEventOfConversationMessageReceivedResult) => void;
    peerMessageReceived: (zim: ZIM, data: ZIMEventOfConversationMessageReceivedResult) => void;
    groupMessageReceived: (zim: ZIM, data: ZIMEventOfConversationMessageReceivedResult) => void;
    conversationMessageReceiptChanged: (zim: ZIM, data: ZIMEventOfMessageReceiptChangedResult) => void;
    messageReceiptChanged: (zim: ZIM, data: ZIMEventOfMessageReceiptChangedResult) => void;
    messageRevokeReceived: (zim: ZIM, data: ZIMEventOfMessageRevokeReceivedResult) => void;
    messageSentStatusChanged: (zim: ZIM, data: ZIMEventOfMessageSentStatusChangedResult) => void;
    messageReactionsChanged: (zim: ZIM, data: ZIMEventOfMessageReactionsChangedResult) => void;
    messageDeleted: (zim: ZIM, data: ZIMEventOfMessageDeletedResult) => void;
    messageRepliedCountChanged: (zim: ZIM, data: ZIMEventOfMessageRepliedCountChangedResult) => void;
    messageRepliedInfoChanged: (zim: ZIM, data: ZIMEventOfMessageRepliedInfoChangedResult) => void;
    roomStateChanged: (zim: ZIM, data: ZIMEventOfRoomStateChangedResult) => void;
    roomMemberJoined: (zim: ZIM, data: ZIMEventOfRoomMemberChangedResult) => void;
    roomMemberLeft: (zim: ZIM, data: ZIMEventOfRoomMemberChangedResult) => void;
    roomAttributesUpdated: (zim: ZIM, data: ZIMEventOfRoomAttributesUpdatedResult) => void;
    roomAttributesBatchUpdated: (zim: ZIM, data: ZIMEventOfRoomAttributesUpdatedResult) => void;
    roomMemberAttributesUpdated: (zim: ZIM, data: ZIMEventOfRoomMembersAttributesUpdatedResult) => void;
    groupStateChanged: (zim: ZIM, data: ZIMEventOfGroupStateChangedResult) => void;
    groupNameUpdated: (zim: ZIM, data: ZIMEventOfGroupNameUpdatedResult) => void;
    groupAvatarUrlUpdated: (zim: ZIM, data: ZIMEventOfGroupAvatarUrlUpdatedResult) => void;
    groupNoticeUpdated: (zim: ZIM, data: ZIMEventOfGroupNoticeUpdatedResult) => void;
    groupAliasUpdated: (zim: ZIM, data: ZIMEventOfGroupAliasUpdatedResult) => void;
    groupAttributesUpdated: (zim: ZIM, data: ZIMEventOfGroupAttributesUpdatedResult) => void;
    groupMemberStateChanged: (zim: ZIM, data: ZIMEventOfGroupMemberStateChangedResult) => void;
    groupMemberInfoUpdated: (zim: ZIM, data: ZIMEventOfGroupMemberInfoUpdatedResult) => void;
    groupMutedInfoUpdated: (zim: ZIM, data: ZIMEventOfGroupMutedInfoUpdatedResult) => void;
    groupVerifyInfoUpdated: (zim: ZIM, data: ZIMEventOfGroupVerifyInfoUpdatedResult) => void;
    groupApplicationListChanged: (zim: ZIM, data: ZIMEventOfGroupApplicationListChangedResult) => void;
    groupApplicationUpdated: (zim: ZIM, data: ZIMEventOfGroupApplicationUpdatedResult) => void;
    callInvitationReceived: (zim: ZIM, data: ZIMEventOfCallInvitationReceivedResult) => void;
    callInvitationCancelled: (zim: ZIM, data: ZIMEventOfCallInvitationCancelledResult) => void;
    callInvitationTimeout: (zim: ZIM, data: ZIMEventOfCallInvitationTimeoutResult) => void;
    callInvitationEnded: (zim: ZIM, data: ZIMEventOfCallInvitationEndedResult) => void;
    callInvitationCreated: (zim: ZIM, data: ZIMEventOfCallInvitationCreatedResult) => void;
    callUserStateChanged: (zim: ZIM, data: ZIMEventOfCallUserStateChangedResult) => void;
    blacklistChanged: (zim: ZIM, data: ZIMEventOfBlacklistChangedResult) => void;
    friendListChanged: (zim: ZIM, data: ZIMEventOfFriendListChangedResult) => void;
    friendInfoUpdated: (zim: ZIM, data: ZIMEventOfFriendInfoUpdatedResult) => void;
    friendApplicationListChanged: (zim: ZIM, data: ZIMEventOfFriendApplicationListChangedResult) => void;
    friendApplicationUpdated: (zim: ZIM, data: ZIMEventOfFriendApplicationUpdatedResult) => void;
    /**
     * @deprecated Replaced with callUserStateChanged.
     */
    receivePeerMessage: (zim: ZIM, data: ZIMEventOfReceiveConversationMessageResult) => void;
    /**
     * @deprecated Replaced with callUserStateChanged.
     */
    receiveGroupMessage: (zim: ZIM, data: ZIMEventOfReceiveConversationMessageResult) => void;
    /**
     * @deprecated Replaced with callUserStateChanged.
     */
    receiveRoomMessage: (zim: ZIM, data: ZIMEventOfReceiveConversationMessageResult) => void;
    /**
     * @deprecated Replaced with callUserStateChanged.
     */
    callInvitationAccepted: (zim: ZIM, data: ZIMEventOfCallInvitationAcceptedResult) => void;
    /**
     * @deprecated Replaced with callUserStateChanged.
     */
    callInvitationRejected: (zim: ZIM, data: ZIMEventOfCallInvitationRejectedResult) => void;
    /**
     * @deprecated Replaced with callUserStateChanged.
     */
    callInviteesAnsweredTimeout: (zim: ZIM, data: ZIMEventOfCallInviteesAnsweredTimeoutResult) => void;
}
export interface ZIMEventOfConnectionStateChangedResult {
    state: ZIMConnectionState;
    event: ZIMConnectionEvent;
    extendedData: string;
}
export interface ZIMEventOfTokenWillExpireResult {
    second: number;
}
export interface ZIMEventOfUserInfoUpdatedResult {
    info: ZIMUserFullInfo;
}
export interface ZIMEventOfUserRuleUpdatedResult {
    userRule: ZIMUserRule;
}
export interface ZIMEventOfUserStatusUpdatedResult {
    userStatusList: ZIMUserStatus[];
}
export interface ZIMEventOfConversationsAllDeletedResult {
    count: number;
}
export interface ZIMEventOfConversationChangedResult {
    infoList: ZIMConversationChangeInfo[];
}
export interface ZIMEventOfConversationTotalUnreadMessageCountUpdatedResult {
    totalUnreadMessageCount: number;
}
export interface ZIMEventOfReceiveConversationMessageResult {
    messageList: ZIMMessage[];
    fromConversationID: string;
}
export interface ZIMEventOfConversationMessageReceivedResult {
    messageList: ZIMMessage[];
    fromConversationID: string;
    info: ZIMMessageReceivedInfo;
}
export interface ZIMEventOfBroadcastMessageReceivedResult {
    message: ZIMMessage;
}
export interface ZIMEventOfMessageReceiptChangedResult {
    infos: ZIMMessageReceiptInfo[];
}
export interface ZIMEventOfMessageRevokeReceivedResult {
    messageList: ZIMRevokeMessage[];
}
export interface ZIMEventOfMessageRepliedCountChangedResult {
    infos: ZIMMessageRootRepliedCountInfo[];
}
export interface ZIMEventOfMessageRepliedInfoChangedResult {
    messageList: ZIMMessage[];
}
export interface ZIMEventOfRoomStateChangedResult {
    roomID: string;
    state: ZIMRoomState;
    event: ZIMRoomEvent;
    extendedData: string;
}
export interface ZIMEventOfRoomStateChangedResult {
    roomID: string;
    state: ZIMRoomState;
    event: ZIMRoomEvent;
    extendedData: string;
}
export interface ZIMEventOfRoomMemberChangedResult {
    roomID: string;
    memberList: ZIMUserInfo[];
}
export interface ZIMEventOfRoomAttributesUpdatedResult {
    roomID: string;
    infos: ZIMRoomAttributesUpdateInfo[];
}
export interface ZIMEventOfGroupStateChangedResult {
    state: ZIMGroupState;
    event: ZIMGroupEvent;
    operatedInfo: ZIMGroupOperatedInfo;
    groupInfo: ZIMGroupFullInfo;
}
export interface ZIMEventOfGroupNameUpdatedResult {
    groupID: string;
    groupName: string;
    operatedInfo: ZIMGroupOperatedInfo;
}
export interface ZIMEventOfGroupAvatarUrlUpdatedResult {
    groupID: string;
    groupAvatarUrl: string;
    operatedInfo: ZIMGroupOperatedInfo;
}
export interface ZIMEventOfGroupNoticeUpdatedResult {
    groupID: string;
    groupNotice: string;
    operatedInfo: ZIMGroupOperatedInfo;
}
export interface ZIMEventOfGroupAliasUpdatedResult {
    groupID: string;
    groupAlias: string;
    operatedUserID: string;
}
export interface ZIMEventOfGroupAttributesUpdatedResult {
    groupID: string;
    infoList: ZIMGroupAttributesUpdateInfo[];
    operatedInfo: ZIMGroupOperatedInfo;
}
export interface ZIMEventOfGroupMemberStateChangedResult {
    groupID: string;
    state: ZIMGroupMemberState;
    event: ZIMGroupMemberEvent;
    userList: ZIMGroupMemberInfo[];
    operatedInfo: ZIMGroupOperatedInfo;
}
export interface ZIMEventOfGroupMemberInfoUpdatedResult {
    groupID: string;
    userList: ZIMGroupMemberInfo[];
    operatedInfo: ZIMGroupOperatedInfo;
}
export interface ZIMEventOfCallInvitationReceivedResult {
    callID: string;
    inviter: string;
    extendedData: string;
    timeout: number;
    mode: ZIMCallInvitationMode;
    caller: string;
    createTime: number;
    callUserList: ZIMCallUserInfo[];
}
export interface ZIMEventOfCallInvitationCancelledResult {
    callID: string;
    inviter: string;
    extendedData: string;
    mode: ZIMCallInvitationMode;
}
export interface ZIMEventOfCallInvitationTimeoutResult {
    callID: string;
}
export interface ZIMEventOfCallInvitationAcceptedResult {
    callID: string;
    invitee: string;
    extendedData: string;
}
export interface ZIMEventOfCallInvitationRejectedResult {
    callID: string;
    invitee: string;
    extendedData: string;
}
export interface ZIMEventOfCallInviteesAnsweredTimeoutResult {
    callID: string;
    invitees: string[];
}
export interface ZIMEventOfRoomMembersAttributesUpdatedResult {
    roomID: string;
    infos: ZIMRoomMemberAttributesUpdateInfo[];
    operatedInfo: ZIMRoomOperatedInfo;
}
export interface ZIMEventOfMessageSentStatusChangedResult {
    infos: ZIMMessageSentStatusChangeInfo[];
}
export interface ZIMEventOfCallInvitationCreatedResult {
    callID: string;
    mode: ZIMCallInvitationMode;
    caller: string;
    extendedData: string;
    timeout: number;
    createTime: number;
    callUserList: ZIMCallUserInfo[];
}
export interface ZIMEventOfCallInvitationEndedResult {
    callID: string;
    mode: ZIMCallInvitationMode;
    caller: string;
    operatedUserID: string;
    extendedData: string;
    endTime: number;
}
export interface ZIMEventOfCallUserStateChangedResult {
    callID: string;
    callUserList: ZIMCallUserInfo[];
}
export interface ZIMEventOfMessageReactionsChangedResult {
    reactions: ZIMMessageReaction[];
}
export interface ZIMEventOfMessageDeletedResult {
    conversationID: string;
    conversationType: ZIMConversationType;
    isDeleteConversationAllMessage: boolean;
    messageList: ZIMMessage[];
}
export interface ZIMEventOfGroupMutedInfoUpdatedResult {
    groupID: string;
    mutedInfo: ZIMGroupMuteInfo;
    operatedInfo: ZIMGroupOperatedInfo;
}
export interface ZIMEventOfGroupMemberStateChangedResult {
    groupID: string;
    state: ZIMGroupMemberState;
    event: ZIMGroupMemberEvent;
    userList: ZIMGroupMemberInfo[];
    operatedInfo: ZIMGroupOperatedInfo;
}
export interface ZIMEventOfGroupMemberInfoUpdatedResult {
    groupID: string;
    userList: ZIMGroupMemberInfo[];
    operatedInfo: ZIMGroupOperatedInfo;
}
export interface ZIMEventOfGroupVerifyInfoUpdatedResult {
    groupID: string;
    verifyInfo: ZIMGroupVerifyInfo;
    operatedInfo: ZIMGroupOperatedInfo;
}
export interface ZIMEventOfGroupApplicationListChangedResult {
    action: ZIMGroupApplicationListChangeAction;
    applicationList: ZIMGroupApplicationInfo[];
}
export interface ZIMEventOfGroupApplicationUpdatedResult {
    applicationList: ZIMGroupApplicationInfo[];
}
export interface ZIMEventOfBlacklistChangedResult {
    userList: ZIMUserInfo[];
    action: ZIMBlacklistChangeAction;
}
export interface ZIMEventOfFriendListChangedResult {
    action: ZIMFriendListChangeAction;
    friendList: ZIMFriendInfo[];
}
export interface ZIMEventOfFriendInfoUpdatedResult {
    friendList: ZIMFriendInfo[];
}
export interface ZIMEventOfFriendApplicationListChangedResult {
    action: ZIMFriendApplicationListChangeAction;
    applicationList: ZIMFriendApplicationInfo[];
}
export interface ZIMEventOfFriendApplicationUpdatedResult {
    applicationList: ZIMFriendApplicationInfo[];
}
