import { ZIMGeofencingType, ZIMLogConfig, ZIMCacheConfig, ZIMLoginConfig, ZIMMessage, ZIMMediaMessage, ZIMRoomInfo, ZIMGroupInfo, ZIMMediaFileType, ZIMMessageBase, ZIMMediaMessageBase, ZIMConversationType, ZIMConversationNotificationStatus, ZIMConversationBaseInfo, ZIMTokenRenewedResult, ZIMUsersInfoQueriedResult, ZIMUserNameUpdatedResult, ZIMUserExtendedDataUpdatedResult, ZIMRoomAdvancedConfig, ZIMRoomAttributesSetConfig, ZIMRoomAttributesDeleteConfig, ZIMRoomAttributesBatchOperationConfig, ZIMRoomMemberQueryConfig, ZIMRoomCreatedResult, ZIMRoomEnteredResult, ZIMRoomJoinedResult, ZIMRoomLeftResult, ZIMRoomAttributesBatchOperatedResult, ZIMRoomAttributesOperatedResult, ZIMRoomAttributesQueriedResult, ZIMRoomMemberQueriedResult, ZIMRoomOnlineMemberCountQueriedResult, ZIMRoomMemberAttributesSetConfig, ZIMRoomMembersAttributesOperatedResult, ZIMRoomMembersAttributesQueriedResult, ZIMRoomMemberAttributesQueryConfig, ZIMRoomMemberAttributesListQueriedResult, ZIMGroupAdvancedConfig, ZIMGroupMemberQueryConfig, ZIMGroupCreatedResult, ZIMGroupJoinedResult, ZIMGroupLeftResult, ZIMGroupDismissedResult, ZIMGroupInfoQueriedResult, ZIMGroupListQueriedResult, ZIMGroupNameUpdatedResult, ZIMGroupNoticeUpdatedResult, ZIMGroupMemberKickedResult, ZIMGroupMemberListQueriedResult, ZIMGroupMemberNicknameUpdatedResult, ZIMGroupMemberRoleUpdatedResult, ZIMGroupMemberInfoQueriedResult, ZIMGroupAttributesOperatedResult, ZIMGroupAttributesQueriedResult, ZIMGroupUsersInvitedResult, ZIMGroupOwnerTransferredResult, ZIMGroupMemberCountQueriedResult, ZIMConversationQueryConfig, ZIMConversationDeleteConfig, ZIMConversationListQueriedResult, ZIMConversationDeletedResult, ZIMConversationNotificationStatusSetResult, ZIMConversationUnreadMessageCountClearedResult, ZIMConversationMarkSetResult, ZIMMessageSendConfig, ZIMMessageDeleteConfig, ZIMMessageQueryConfig, ZIMMessageSentResult, ZIMMediaMessageSentResult, ZIMMessageQueriedResult, ZIMMessageDeletedResult, ZIMMessageInsertedResult, ZIMMessageSendNotification, ZIMMediaMessageSendNotification, ZIMMediaDownloadingProgress, ZIMMediaDownloadedResult, ZIMCallInviteConfig, ZIMCallCancelConfig, ZIMCallAcceptConfig, ZIMCallRejectConfig, ZIMAppConfig, ZIMCallCancelSentResult, ZIMCallInvitationSentResult, ZIMCallAcceptanceSentResult, ZIMCallRejectionSentResult, ZIMUserAvatarUrlUpdatedResult, ZIMUsersInfoQueryConfig, ZIMGroupAvatarUrlUpdatedResult, ZIMConversationMessageReceiptReadSentResult, ZIMMessageReceiptsReadSentResult, ZIMMessageReceiptsInfoQueriedResult, ZIMMessageRevokedResult, ZIMGroupMessageReceiptMemberQueryConfig, ZIMMessageRevokeConfig, ZIMGroupMessageReceiptMemberListQueriedResult, ZIMConversationPinnedListQueriedResult, ZIMConversationPinnedStateUpdatedResult, ZIMRoomMembersQueriedResult, ZIMConversationQueriedResult, ZIMCallQuitConfig, ZIMCallQuitSentResult, ZIMCallEndConfig, ZIMCallEndSentResult, ZIMCallingInviteConfig, ZIMCallingInvitationSentResult, ZIMCallInvitationQueryConfig, ZIMCallInvitationListQueriedResult, ZIMConversationSearchConfig, ZIMConversationsSearchedResult, ZIMMessageSearchConfig, ZIMMessagesGlobalSearchedResult, ZIMMessagesSearchedResult, ZIMGroupSearchConfig, ZIMGroupsSearchedResult, ZIMGroupMemberSearchConfig, ZIMGroupMembersSearchedResult, ZIMMessageLocalExtendedDataUpdatedResult, ZIMMessageReactionAddedResult, ZIMMessageReactionDeletedResult, ZIMMessageReactionUserListQueriedResult, ZIMMessageReactionUserQueryConfig, ZIMCallJoinConfig, ZIMCallJoinSentResult, ZIMCombineMessage, ZIMCombineMessageDetailQueriedResult, ZIMConversationDraftSetResult, ZIMGroupMuteConfig, ZIMGroupMutedResult, ZIMGroupMemberMuteConfig, ZIMGroupMembersMutedResult, ZIMFriendAddConfig, ZIMFriendAddedResult, ZIMFriendApplicationSentResult, ZIMFriendApplicationSendConfig, ZIMFriendDeleteConfig, ZIMFriendsDeletedResult, ZIMFriendRelationCheckConfig, ZIMFriendsRelationCheckedResult, ZIMFriendAliasUpdatedResult, ZIMFriendAttributesUpdatedResult, ZIMFriendApplicationAcceptedResult, ZIMFriendApplicationAcceptConfig, ZIMFriendApplicationRejectConfig, ZIMFriendApplicationRejectedResult, ZIMFriendsInfoQueriedResult, ZIMFriendListQueryConfig, ZIMFriendListQueriedResult, ZIMFriendApplicationListQueryConfig, ZIMFriendApplicationListQueriedResult, ZIMFriendSearchConfig, ZIMFriendsSearchedResult, ZIMBlacklistUsersAddedResult, ZIMBlacklistUsersRemovedResult, ZIMBlacklistCheckedResult, ZIMBlacklistQueryConfig, ZIMBlacklistQueriedResult, ZIMGroupJoinApplicationSendConfig, ZIMGroupJoinApplicationSentResult, ZIMGroupJoinApplicationAcceptConfig, ZIMGroupJoinApplicationAcceptedResult, ZIMGroupJoinApplicationRejectConfig, ZIMGroupJoinApplicationRejectedResult, ZIMGroupInviteApplicationSendConfig, ZIMGroupInviteApplicationsSentResult, ZIMGroupInviteApplicationAcceptConfig, ZIMGroupInviteApplicationAcceptedResult, ZIMGroupInviteApplicationRejectConfig, ZIMGroupInviteApplicationRejectedResult, ZIMGroupApplicationListQueryConfig, ZIMGroupApplicationListQueriedResult, ZIMGroupJoinMode, ZIMGroupJoinModeUpdatedResult, ZIMGroupBeInviteMode, ZIMGroupBeInviteModeUpdatedResult, ZIMGroupInviteMode, ZIMGroupInviteModeUpdatedResult, ZIMUserOfflinePushRule, ZIMUserOfflinePushRuleUpdatedResult, ZIMSelfUserInfoQueriedResult, ZIMRoomAllLeftResult, ZIMMessageExportConfig, ZIMMessageExportingProgress, ZIMMessageImportingProgress, ZIMMessageImportConfig, ZIMFileCacheQueryConfig, ZIMFileCacheQueriedResult, ZIMFileCacheClearConfig, ZIMConversationFilterOption, ZIMConversationTotalUnreadMessageCountQueryConfig, ZIMMessageRepliedListQueryConfig, ZIMMessageRepliedListQueriedResult, ZIMUserStatusSubscribeConfig, ZIMUsersStatusSubscribedResult, ZIMUsersStatusUnsubscribedResult, ZIMUsersStatusQueriedResult, ZIMSubscribedUserStatusQueryConfig, ZIMSubscribedUserStatusListQueriedResult, ZIMRoomSwitchedResult, ZIMGroupAliasUpdatedResult } from './ZIMDefines';
import { ZIMEventHandler } from './ZIMEventHandler';
export default class ZIM {
    private engine;
    private static _instatance;
    private constructor();
    /**
    * Gets the SDK's version number.
    *
    * When the SDK is running, the developer finds that it does not match the expected situation and submits the problem and related logs to the ZEGO technical staff for locating. The ZEGO technical staff may need the information of the engine version to assist in locating the problem.
    * Developers can also collect this information as the version information of the engine used by the app, so that the SDK corresponding to each version of the app on the line.
    * @return {string} - SDK version
    */
    static getVersion(): Promise<string>;
    static setGeofencingConfig(areaList: number[], type: ZIMGeofencingType): Promise<boolean>;
    /**
     * @deprecated
     * Deprecated since 2.3.0, please use another create API
     */
    static create(appID: number): ZIM | null;
    static create(appConfig: ZIMAppConfig): ZIM | null;
    static getInstance(): ZIM;
    destroy(): void;
    static setLogConfig(config: ZIMLogConfig): void;
    static setCacheConfig(config: ZIMCacheConfig): void;
    on<K extends keyof ZIMEventHandler>(type: K, listener: ZIMEventHandler[K]): void;
    off<K extends keyof ZIMEventHandler>(type: K): void;
    uploadLog(): Promise<void>;
    login(userID: string, config: ZIMLoginConfig): Promise<void>;
    logout(): Promise<void>;
    renewToken(token: string): Promise<ZIMTokenRenewedResult>;
    updateUserName(userName: string): Promise<ZIMUserNameUpdatedResult>;
    updateUserAvatarUrl(userAvatarUrl: string): Promise<ZIMUserAvatarUrlUpdatedResult>;
    updateUserExtendedData(extendedData: string): Promise<ZIMUserExtendedDataUpdatedResult>;
    updateUserOfflinePushRule(offlinePushRule: ZIMUserOfflinePushRule): Promise<ZIMUserOfflinePushRuleUpdatedResult>;
    querySelfUserInfo(): Promise<ZIMSelfUserInfoQueriedResult>;
    queryUsersInfo(userIDs: string[], config: ZIMUsersInfoQueryConfig): Promise<ZIMUsersInfoQueriedResult>;
    queryUsersStatus(userIDs: string[]): Promise<ZIMUsersStatusQueriedResult>;
    subscribeUsersStatus(userIDs: string[], config: ZIMUserStatusSubscribeConfig): Promise<ZIMUsersStatusSubscribedResult>;
    unsubscribeUsersStatus(userIDs: string[]): Promise<ZIMUsersStatusUnsubscribedResult>;
    querySubscribedUserStatusList(config: ZIMSubscribedUserStatusQueryConfig): Promise<ZIMSubscribedUserStatusListQueriedResult>;
    queryConversation(conversationID: string, conversationType: ZIMConversationType): Promise<ZIMConversationQueriedResult>;
    queryConversationList(config: ZIMConversationQueryConfig, option?: ZIMConversationFilterOption): Promise<ZIMConversationListQueriedResult>;
    queryConversationPinnedList(config: ZIMConversationQueryConfig): Promise<ZIMConversationPinnedListQueriedResult>;
    queryConversationTotalUnreadMessageCount(config: ZIMConversationTotalUnreadMessageCountQueryConfig): Promise<import("./ZIMDefines").ZIMConversationTotalUnreadMessageCountQueriedResult>;
    deleteConversation(conversationID: string, conversationType: ZIMConversationType, config: ZIMConversationDeleteConfig): Promise<ZIMConversationDeletedResult>;
    deleteAllConversations(config: ZIMConversationDeleteConfig): Promise<void>;
    deleteAllConversationMessages(config: ZIMMessageDeleteConfig): Promise<void>;
    setConversationNotificationStatus(status: ZIMConversationNotificationStatus, conversationID: string, conversationType: ZIMConversationType): Promise<ZIMConversationNotificationStatusSetResult>;
    updateConversationPinnedState(isPinned: boolean, conversationID: string, conversationType: ZIMConversationType): Promise<ZIMConversationPinnedStateUpdatedResult>;
    clearConversationUnreadMessageCount(conversationID: string, conversationType: ZIMConversationType): Promise<ZIMConversationUnreadMessageCountClearedResult>;
    setConversationDraft(draft: string, conversationID: string, conversationType: ZIMConversationType): Promise<ZIMConversationDraftSetResult>;
    setConversationMark(markType: number, enable: boolean, conversationInfos: ZIMConversationBaseInfo[]): Promise<ZIMConversationMarkSetResult>;
    sendMessage(message: ZIMMessageBase, toConversationID: string, conversationType: ZIMConversationType, config: ZIMMessageSendConfig, notification?: ZIMMessageSendNotification): Promise<ZIMMessageSentResult>;
    clearConversationTotalUnreadMessageCount(): Promise<void>;
    /**
     * @deprecated Replaced with sendMessage.
     */
    sendPeerMessage(message: ZIMMessageBase, toUserID: string, config: ZIMMessageSendConfig): Promise<ZIMMessageSentResult>;
    /**
     * @deprecated
     * Deprecated since 2.4.0, please use [sendMessage].
     */
    sendGroupMessage(message: ZIMMessageBase, toGroupID: string, config: ZIMMessageSendConfig): Promise<ZIMMessageSentResult>;
    /**
     * @deprecated
     * Deprecated since 2.4.0, please use [sendMessage].
     */
    sendRoomMessage(message: ZIMMessageBase, toRoomID: string, config: ZIMMessageSendConfig): Promise<ZIMMessageSentResult>;
    sendMediaMessage(message: ZIMMediaMessageBase, toConversationID: string, conversationType: ZIMConversationType, config: ZIMMessageSendConfig, notification?: ZIMMediaMessageSendNotification): Promise<ZIMMediaMessageSentResult>;
    deleteMessages(messageList: ZIMMessage[], conversationID: string, conversationType: ZIMConversationType, config: ZIMMessageDeleteConfig): Promise<ZIMMessageDeletedResult>;
    deleteAllMessage(conversationID: string, conversationType: ZIMConversationType, config: ZIMMessageDeleteConfig): Promise<ZIMMessageDeletedResult>;
    queryHistoryMessage(conversationID: string, conversationType: ZIMConversationType, config: ZIMMessageQueryConfig): Promise<ZIMMessageQueriedResult>;
    downloadMediaFile(message: ZIMMediaMessage, fileType: ZIMMediaFileType, progress: ZIMMediaDownloadingProgress): Promise<ZIMMediaDownloadedResult>;
    insertMessageToLocalDB(message: ZIMMessageBase | ZIMMediaMessageBase, conversationID: string, conversationType: ZIMConversationType, senderUserID: string): Promise<ZIMMessageInsertedResult>;
    updateMessageLocalExtendedData(localExtendedData: string, message: ZIMMessage): Promise<ZIMMessageLocalExtendedDataUpdatedResult>;
    sendConversationMessageReceiptRead(conversationID: string, conversationType: ZIMConversationType): Promise<ZIMConversationMessageReceiptReadSentResult>;
    sendMessageReceiptsRead(messageList: ZIMMessage[], conversationID: string, conversationType: ZIMConversationType): Promise<ZIMMessageReceiptsReadSentResult>;
    queryMessageReceiptsInfo(messageList: ZIMMessage[], conversationID: string, conversationType: ZIMConversationType): Promise<ZIMMessageReceiptsInfoQueriedResult>;
    queryGroupMessageReceiptReadMemberList(message: ZIMMessage, groupID: string, config: ZIMGroupMessageReceiptMemberQueryConfig): Promise<ZIMGroupMessageReceiptMemberListQueriedResult>;
    queryGroupMessageReceiptUnreadMemberList(message: ZIMMessage, groupID: string, config: ZIMGroupMessageReceiptMemberQueryConfig): Promise<ZIMGroupMessageReceiptMemberListQueriedResult>;
    revokeMessage(message: ZIMMessage, config: ZIMMessageRevokeConfig): Promise<ZIMMessageRevokedResult>;
    queryCombineMessageDetail(message: ZIMCombineMessage): Promise<ZIMCombineMessageDetailQueriedResult>;
    replyMessage(message: ZIMMessageBase | ZIMMediaMessageBase, toOriginalMessage: ZIMMessage, config: ZIMMessageSendConfig, notification?: ZIMMessageSendNotification): Promise<ZIMMessageSentResult>;
    queryMessageRepliedList(message: ZIMMessage, config: ZIMMessageRepliedListQueryConfig): Promise<ZIMMessageRepliedListQueriedResult>;
    queryMessages(messageSeqs: number[], conversationID: string, conversationType: ZIMConversationType): Promise<ZIMMessageQueriedResult>;
    addMessageReaction(reactionType: string, message: ZIMMessage): Promise<ZIMMessageReactionAddedResult>;
    deleteMessageReaction(reactionType: string, message: ZIMMessage): Promise<ZIMMessageReactionDeletedResult>;
    queryMessageReactionUserList(message: ZIMMessage, config: ZIMMessageReactionUserQueryConfig): Promise<ZIMMessageReactionUserListQueriedResult>;
    createRoom(roomInfo: ZIMRoomInfo, config?: ZIMRoomAdvancedConfig): Promise<ZIMRoomCreatedResult>;
    enterRoom(roomInfo: ZIMRoomInfo, config?: ZIMRoomAdvancedConfig): Promise<ZIMRoomEnteredResult>;
    joinRoom(roomID: string): Promise<ZIMRoomJoinedResult>;
    leaveRoom(roomID: string): Promise<ZIMRoomLeftResult>;
    switchRoom(fromRoomID: string, toRoomInfo: ZIMRoomInfo, isCreateWhenRoomNotExisted: boolean, config?: ZIMRoomAdvancedConfig): Promise<ZIMRoomSwitchedResult>;
    queryRoomMemberList(roomID: string, config: ZIMRoomMemberQueryConfig): Promise<ZIMRoomMemberQueriedResult>;
    queryRoomMembers(userIDs: string[], roomID: string): Promise<ZIMRoomMembersQueriedResult>;
    queryRoomOnlineMemberCount(roomID: string): Promise<ZIMRoomOnlineMemberCountQueriedResult>;
    queryRoomAllAttributes(roomID: string): Promise<ZIMRoomAttributesQueriedResult>;
    setRoomAttributes(roomAttributes: Record<string, string>, roomID: string, config: ZIMRoomAttributesSetConfig): Promise<ZIMRoomAttributesOperatedResult>;
    deleteRoomAttributes(keys: string[], roomID: string, config: ZIMRoomAttributesDeleteConfig): Promise<ZIMRoomAttributesOperatedResult>;
    beginRoomAttributesBatchOperation(roomID: string, config: ZIMRoomAttributesBatchOperationConfig): void;
    endRoomAttributesBatchOperation(roomID: string): Promise<ZIMRoomAttributesBatchOperatedResult>;
    setRoomMembersAttributes(attributes: Record<string, string>, userIDs: string[], roomID: string, config: ZIMRoomMemberAttributesSetConfig): Promise<ZIMRoomMembersAttributesOperatedResult>;
    queryRoomMembersAttributes(userIDs: string[], roomID: string): Promise<ZIMRoomMembersAttributesQueriedResult>;
    queryRoomMemberAttributesList(roomID: string, config: ZIMRoomMemberAttributesQueryConfig): Promise<ZIMRoomMemberAttributesListQueriedResult>;
    leaveAllRoom(): Promise<ZIMRoomAllLeftResult>;
    createGroup(groupInfo: ZIMGroupInfo, userIDs: string[], config?: ZIMGroupAdvancedConfig): Promise<ZIMGroupCreatedResult>;
    joinGroup(groupID: string): Promise<ZIMGroupJoinedResult>;
    leaveGroup(groupID: string): Promise<ZIMGroupLeftResult>;
    dismissGroup(groupID: string): Promise<ZIMGroupDismissedResult>;
    queryGroupList(): Promise<ZIMGroupListQueriedResult>;
    updateGroupNotice(groupNotice: string, groupID: string): Promise<ZIMGroupNoticeUpdatedResult>;
    updateGroupName(groupName: string, groupID: string): Promise<ZIMGroupNameUpdatedResult>;
    updateGroupAvatarUrl(groupAvatarUrl: string, groupID: string): Promise<ZIMGroupAvatarUrlUpdatedResult>;
    updateGroupAlias(groupAlias: string, groupID: string): Promise<ZIMGroupAliasUpdatedResult>;
    queryGroupInfo(groupID: string): Promise<ZIMGroupInfoQueriedResult>;
    muteGroup(isMute: boolean, groupID: string, config: ZIMGroupMuteConfig): Promise<ZIMGroupMutedResult>;
    muteGroupMembers(isMute: boolean, userIDs: string[], groupID: string, config: ZIMGroupMemberMuteConfig): Promise<ZIMGroupMembersMutedResult>;
    setGroupAttributes(groupAttributes: Record<string, string>, groupID: string): Promise<ZIMGroupAttributesOperatedResult>;
    deleteGroupAttributes(keys: string[], groupID: string): Promise<ZIMGroupAttributesOperatedResult>;
    queryGroupAttributes(keys: string[], groupID: string): Promise<ZIMGroupAttributesQueriedResult>;
    queryGroupAllAttributes(groupID: string): Promise<ZIMGroupAttributesQueriedResult>;
    setGroupMemberNickname(nickname: string, forUserID: string, groupID: string): Promise<ZIMGroupMemberNicknameUpdatedResult>;
    setGroupMemberRole(role: number, forUserID: string, groupID: string): Promise<ZIMGroupMemberRoleUpdatedResult>;
    transferGroupOwner(toUserID: string, groupID: string): Promise<ZIMGroupOwnerTransferredResult>;
    queryGroupMemberInfo(userID: string, groupID: string): Promise<ZIMGroupMemberInfoQueriedResult>;
    inviteUsersIntoGroup(userIDs: string[], groupID: string): Promise<ZIMGroupUsersInvitedResult>;
    kickGroupMembers(userIDs: string[], groupID: string): Promise<ZIMGroupMemberKickedResult>;
    queryGroupMemberList(groupID: string, config: ZIMGroupMemberQueryConfig): Promise<ZIMGroupMemberListQueriedResult>;
    queryGroupMemberCount(groupID: string): Promise<ZIMGroupMemberCountQueriedResult>;
    sendGroupJoinApplication(groupID: string, config: ZIMGroupJoinApplicationSendConfig): Promise<ZIMGroupJoinApplicationSentResult>;
    acceptGroupJoinApplication(userID: string, groupID: string, config: ZIMGroupJoinApplicationAcceptConfig): Promise<ZIMGroupJoinApplicationAcceptedResult>;
    rejectGroupJoinApplication(userID: string, groupID: string, config: ZIMGroupJoinApplicationRejectConfig): Promise<ZIMGroupJoinApplicationRejectedResult>;
    sendGroupInviteApplications(userIDs: string[], groupID: string, config: ZIMGroupInviteApplicationSendConfig): Promise<ZIMGroupInviteApplicationsSentResult>;
    acceptGroupInviteApplication(inviterUserID: string, groupID: string, config: ZIMGroupInviteApplicationAcceptConfig): Promise<ZIMGroupInviteApplicationAcceptedResult>;
    rejectGroupInviteApplication(inviterUserID: string, groupID: string, config: ZIMGroupInviteApplicationRejectConfig): Promise<ZIMGroupInviteApplicationRejectedResult>;
    queryGroupApplicationList(config: ZIMGroupApplicationListQueryConfig): Promise<ZIMGroupApplicationListQueriedResult>;
    updateGroupJoinMode(mode: ZIMGroupJoinMode, groupID: string): Promise<ZIMGroupJoinModeUpdatedResult>;
    updateGroupInviteMode(mode: ZIMGroupInviteMode, groupID: string): Promise<ZIMGroupInviteModeUpdatedResult>;
    updateGroupBeInviteMode(mode: ZIMGroupBeInviteMode, groupID: string): Promise<ZIMGroupBeInviteModeUpdatedResult>;
    callInvite(invitees: string[], config: ZIMCallInviteConfig): Promise<ZIMCallInvitationSentResult>;
    callCancel(invitees: string[], callID: string, config: ZIMCallCancelConfig): Promise<ZIMCallCancelSentResult>;
    callAccept(callID: string, config: ZIMCallAcceptConfig): Promise<ZIMCallAcceptanceSentResult>;
    callReject(callID: string, config: ZIMCallRejectConfig): Promise<ZIMCallRejectionSentResult>;
    callQuit(callID: string, config: ZIMCallQuitConfig): Promise<ZIMCallQuitSentResult>;
    callEnd(callID: string, config: ZIMCallEndConfig): Promise<ZIMCallEndSentResult>;
    callJoin(callID: string, config: ZIMCallJoinConfig): Promise<ZIMCallJoinSentResult>;
    callingInvite(invitees: string[], callID: string, config: ZIMCallingInviteConfig): Promise<ZIMCallingInvitationSentResult>;
    queryCallInvitationList(config: ZIMCallInvitationQueryConfig): Promise<ZIMCallInvitationListQueriedResult>;
    searchLocalConversations(config: ZIMConversationSearchConfig): Promise<ZIMConversationsSearchedResult>;
    searchGlobalLocalMessages(config: ZIMMessageSearchConfig): Promise<ZIMMessagesGlobalSearchedResult>;
    searchLocalMessages(conversationID: string, conversationType: ZIMConversationType, config: ZIMMessageSearchConfig): Promise<ZIMMessagesSearchedResult>;
    searchLocalGroups(config: ZIMGroupSearchConfig): Promise<ZIMGroupsSearchedResult>;
    searchLocalGroupMembers(groupID: string, config: ZIMGroupMemberSearchConfig): Promise<ZIMGroupMembersSearchedResult>;
    addFriend(userID: string, config: ZIMFriendAddConfig): Promise<ZIMFriendAddedResult>;
    sendFriendApplication(userID: string, config: ZIMFriendApplicationSendConfig): Promise<ZIMFriendApplicationSentResult>;
    deleteFriends(userIDs: string[], config: ZIMFriendDeleteConfig): Promise<ZIMFriendsDeletedResult>;
    checkFriendsRelation(userIDs: string[], config: ZIMFriendRelationCheckConfig): Promise<ZIMFriendsRelationCheckedResult>;
    updateFriendAlias(friendAlias: string, userID: string): Promise<ZIMFriendAliasUpdatedResult>;
    updateFriendAttributes(friendAttributes: Record<string, string>, userID: string): Promise<ZIMFriendAttributesUpdatedResult>;
    acceptFriendApplication(userID: string, config: ZIMFriendApplicationAcceptConfig): Promise<ZIMFriendApplicationAcceptedResult>;
    rejectFriendApplication(userID: string, config: ZIMFriendApplicationRejectConfig): Promise<ZIMFriendApplicationRejectedResult>;
    queryFriendsInfo(userIDs: string[]): Promise<ZIMFriendsInfoQueriedResult>;
    queryFriendList(config: ZIMFriendListQueryConfig): Promise<ZIMFriendListQueriedResult>;
    queryFriendApplicationList(config: ZIMFriendApplicationListQueryConfig): Promise<ZIMFriendApplicationListQueriedResult>;
    searchLocalFriends(config: ZIMFriendSearchConfig): Promise<ZIMFriendsSearchedResult>;
    addUsersToBlacklist(userIDs: string[]): Promise<ZIMBlacklistUsersAddedResult>;
    removeUsersFromBlacklist(userIDs: string[]): Promise<ZIMBlacklistUsersRemovedResult>;
    checkUserIsInBlacklist(userID: string): Promise<ZIMBlacklistCheckedResult>;
    queryBlacklist(config: ZIMBlacklistQueryConfig): Promise<ZIMBlacklistQueriedResult>;
    exportLocalMessages(folderPath: string, config: ZIMMessageExportConfig, progress: ZIMMessageExportingProgress): Promise<void>;
    importLocalMessages(folderPath: string, config: ZIMMessageImportConfig, progress: ZIMMessageImportingProgress): Promise<void>;
    queryLocalFileCache(config: ZIMFileCacheQueryConfig): Promise<ZIMFileCacheQueriedResult>;
    clearLocalFileCache(config: ZIMFileCacheClearConfig): Promise<void>;
}
