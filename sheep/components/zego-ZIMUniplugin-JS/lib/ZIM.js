import { ZIMConversationType, ZIMGroupVerifyType, } from './ZIMDefines';
import { ZIMManager } from './impl/ZIMManager';
export default class ZIM {
    engine;
    static _instatance = null;
    constructor(engine) {
        if (!engine)
            throw new Error('Can not be use new.');
        this.engine = engine;
    }
    /**
    * Gets the SDK's version number.
    *
    * When the SDK is running, the developer finds that it does not match the expected situation and submits the problem and related logs to the ZEGO technical staff for locating. The ZEGO technical staff may need the information of the engine version to assist in locating the problem.
    * Developers can also collect this information as the version information of the engine used by the app, so that the SDK corresponding to each version of the app on the line.
    * @return {string} - SDK version
    */
    static getVersion() {
        return ZIMManager.getInstance().getVersion();
    }
    static setGeofencingConfig(areaList, type) {
        return ZIMManager.getInstance().setGeofencingConfig(areaList, type);
    }
    static create(appConfig) {
        const appID = typeof appConfig == 'object' ? appConfig.appID : appConfig;
        const appSign = typeof appConfig == 'object' ? appConfig.appSign : '';
        const engine = ZIMManager.getInstance().createEngine(appID, appSign);
        if (engine) {
            engine.create();
            ZIM._instatance = new ZIM(engine);
            return ZIM._instatance;
        }
        return null;
    }
    static getInstance() {
        return ZIM._instatance;
    }
    destroy() {
        ZIMManager.getInstance().destroyEngine(this.engine);
        // @ts-ignore
        this.engine = null;
        ZIM._instatance = null;
    }
    static setLogConfig(config) {
        ZIMManager.getInstance().setLogConfig(config);
    }
    static setCacheConfig(config) {
        ZIMManager.getInstance().setCacheConfig(config);
    }
    on(type, listener) {
        this.engine.on(type, listener);
    }
    off(type) {
        this.engine.off(type);
    }
    uploadLog() {
        return this.engine.uploadLog();
    }
    login(userID, config) {
        return this.engine.login(
        // @ts-ignore
        typeof userID == 'object' ? userID.userID : userID, typeof config == 'object'
            ? config
            : {
                // @ts-ignore
                userName: typeof userID == 'object' ? userID.userName : '',
                token: config,
                isOfflineLogin: false,
            });
    }
    logout() {
        return this.engine.logout();
    }
    renewToken(token) {
        return this.engine.renewToken(token);
    }
    updateUserName(userName) {
        return this.engine.updateUserName(userName);
    }
    updateUserAvatarUrl(userAvatarUrl) {
        return this.engine.updateUserAvatarUrl(userAvatarUrl);
    }
    updateUserExtendedData(extendedData) {
        return this.engine.updateUserExtendedData(extendedData);
    }
    updateUserOfflinePushRule(offlinePushRule) {
        return this.engine.updateUserOfflinePushRule(offlinePushRule);
    }
    querySelfUserInfo() {
        return this.engine.querySelfUserInfo();
    }
    queryUsersInfo(userIDs, config) {
        return this.engine.queryUsersInfo(userIDs, config);
    }
    queryUsersStatus(userIDs) {
        return this.engine.queryUsersStatus(userIDs);
    }
    subscribeUsersStatus(userIDs, config) {
        return this.engine.subscribeUsersStatus(userIDs, config);
    }
    unsubscribeUsersStatus(userIDs) {
        return this.engine.unsubscribeUsersStatus(userIDs);
    }
    querySubscribedUserStatusList(config) {
        return this.engine.querySubscribedUserStatusList(config);
    }
    // MARK: - Conversation
    queryConversation(conversationID, conversationType) {
        return this.engine.queryConversation(conversationID, conversationType);
    }
    queryConversationList(config, option) {
        return this.engine.queryConversationList(config, option);
    }
    queryConversationPinnedList(config) {
        return this.engine.queryConversationPinnedList(config);
    }
    queryConversationTotalUnreadMessageCount(config) {
        return this.engine.queryConversationTotalUnreadMessageCount(config);
    }
    deleteConversation(conversationID, conversationType, config) {
        return this.engine.deleteConversation(conversationID, conversationType, config);
    }
    deleteAllConversations(config) {
        return this.engine.deleteAllConversations(config);
    }
    deleteAllConversationMessages(config) {
        return this.engine.deleteAllConversationMessages(config);
    }
    setConversationNotificationStatus(status, conversationID, conversationType) {
        return this.engine.setConversationNotificationStatus(status, conversationID, conversationType);
    }
    updateConversationPinnedState(isPinned, conversationID, conversationType) {
        return this.engine.updateConversationPinnedState(isPinned, conversationID, conversationType);
    }
    clearConversationUnreadMessageCount(conversationID, conversationType) {
        return this.engine.clearConversationUnreadMessageCount(conversationID, conversationType);
    }
    setConversationDraft(draft, conversationID, conversationType) {
        return this.engine.setConversationDraft(draft, conversationID, conversationType);
    }
    setConversationMark(markType, enable, conversationInfos) {
        return this.engine.setConversationMark(markType, enable, conversationInfos);
    }
    sendMessage(message, toConversationID, conversationType, config, notification) {
        return this.engine.sendMessage(message, toConversationID, conversationType, config, notification);
    }
    clearConversationTotalUnreadMessageCount() {
        return this.engine.clearConversationTotalUnreadMessageCount();
    }
    /**
     * @deprecated Replaced with sendMessage.
     */
    sendPeerMessage(message, toUserID, config) {
        return this.engine.sendMessage(message, toUserID, ZIMConversationType.Peer, config);
    }
    /**
     * @deprecated
     * Deprecated since 2.4.0, please use [sendMessage].
     */
    sendGroupMessage(message, toGroupID, config) {
        return this.engine.sendMessage(message, toGroupID, ZIMConversationType.Group, config);
    }
    /**
     * @deprecated
     * Deprecated since 2.4.0, please use [sendMessage].
     */
    sendRoomMessage(message, toRoomID, config) {
        return this.engine.sendMessage(message, toRoomID, ZIMConversationType.Room, config);
    }
    sendMediaMessage(message, toConversationID, conversationType, config, notification) {
        return this.engine.sendMediaMessage(message, toConversationID, conversationType, config, notification);
    }
    deleteMessages(messageList, conversationID, conversationType, config) {
        return this.engine.deleteMessages(messageList, conversationID, conversationType, config);
    }
    deleteAllMessage(conversationID, conversationType, config) {
        return this.engine.deleteAllMessage(conversationID, conversationType, config);
    }
    queryHistoryMessage(conversationID, conversationType, config) {
        return this.engine.queryHistoryMessage(conversationID, conversationType, config);
    }
    downloadMediaFile(message, fileType, progress) {
        return this.engine.downloadMediaFile(message, fileType, progress);
    }
    insertMessageToLocalDB(message, conversationID, conversationType, senderUserID) {
        return this.engine.insertMessageToLocalDB(message, conversationID, conversationType, senderUserID);
    }
    updateMessageLocalExtendedData(localExtendedData, message) {
        return this.engine.updateMessageLocalExtendedData(localExtendedData, message);
    }
    sendConversationMessageReceiptRead(conversationID, conversationType) {
        return this.engine.sendConversationMessageReceiptRead(conversationID, conversationType);
    }
    sendMessageReceiptsRead(messageList, conversationID, conversationType) {
        return this.engine.sendMessageReceiptsRead(messageList, conversationID, conversationType);
    }
    queryMessageReceiptsInfo(messageList, conversationID, conversationType) {
        return this.engine.queryMessageReceiptsInfo(messageList, conversationID, conversationType);
    }
    queryGroupMessageReceiptReadMemberList(message, groupID, config) {
        return this.engine.queryGroupMessageReceiptMemberList(message, groupID, config, true);
    }
    queryGroupMessageReceiptUnreadMemberList(message, groupID, config) {
        return this.engine.queryGroupMessageReceiptMemberList(message, groupID, config, false);
    }
    revokeMessage(message, config) {
        return this.engine.revokeMessage(message, config);
    }
    queryCombineMessageDetail(message) {
        return this.engine.queryCombineMessageDetail(message);
    }
    replyMessage(message, toOriginalMessage, config, notification) {
        return this.engine.replyMessage(message, toOriginalMessage, config, notification);
    }
    queryMessageRepliedList(message, config) {
        return this.engine.queryMessageRepliedList(message, config);
    }
    queryMessages(messageSeqs, conversationID, conversationType) {
        return this.engine.queryMessages(messageSeqs, conversationID, conversationType);
    }
    // MARK: - Message reaction
    addMessageReaction(reactionType, message) {
        return this.engine.addMessageReaction(reactionType, message);
    }
    deleteMessageReaction(reactionType, message) {
        return this.engine.deleteMessageReaction(reactionType, message);
    }
    queryMessageReactionUserList(message, config) {
        return this.engine.queryMessageReactionUserList(message, config);
    }
    // MARK: - Room
    createRoom(roomInfo, config) {
        return this.engine.createRoom(roomInfo, config);
    }
    enterRoom(roomInfo, config) {
        return this.engine.enterRoom(roomInfo, config);
    }
    joinRoom(roomID) {
        return this.engine.joinRoom(roomID);
    }
    leaveRoom(roomID) {
        return this.engine.leaveRoom(roomID);
    }
    switchRoom(fromRoomID, toRoomInfo, isCreateWhenRoomNotExisted, config) {
        return this.engine.switchRoom(fromRoomID, toRoomInfo, isCreateWhenRoomNotExisted, config);
    }
    queryRoomMemberList(roomID, config) {
        return this.engine.queryRoomMemberList(roomID, config);
    }
    queryRoomMembers(userIDs, roomID) {
        return this.engine.queryRoomMembers(userIDs, roomID);
    }
    queryRoomOnlineMemberCount(roomID) {
        return this.engine.queryRoomOnlineMemberCount(roomID);
    }
    queryRoomAllAttributes(roomID) {
        return this.engine.queryRoomAllAttributes(roomID);
    }
    setRoomAttributes(roomAttributes, roomID, config) {
        return this.engine.setRoomAttributes(roomAttributes, roomID, config);
    }
    deleteRoomAttributes(keys, roomID, config) {
        return this.engine.deleteRoomAttributes(keys, roomID, config);
    }
    beginRoomAttributesBatchOperation(roomID, config) {
        this.engine.beginRoomAttributesBatchOperation(roomID, config).then(r => void 0);
    }
    endRoomAttributesBatchOperation(roomID) {
        return this.engine.endRoomAttributesBatchOperation(roomID);
    }
    setRoomMembersAttributes(attributes, userIDs, roomID, config) {
        return this.engine.setRoomMembersAttributes(attributes, userIDs, roomID, config);
    }
    queryRoomMembersAttributes(userIDs, roomID) {
        return this.engine.queryRoomMembersAttributes(userIDs, roomID);
    }
    queryRoomMemberAttributesList(roomID, config) {
        return this.engine.queryRoomMemberAttributesList(roomID, config);
    }
    leaveAllRoom() {
        return this.engine.leaveAllRoom();
    }
    // MARK: - Group
    createGroup(groupInfo, userIDs, config) {
        return this.engine.createGroup(groupInfo, userIDs, config);
    }
    joinGroup(groupID) {
        return this.engine.joinGroup(true, groupID);
    }
    leaveGroup(groupID) {
        return this.engine.leaveGroup(groupID);
    }
    dismissGroup(groupID) {
        return this.engine.dismissGroup(groupID);
    }
    queryGroupList() {
        return this.engine.queryGroupList();
    }
    updateGroupNotice(groupNotice, groupID) {
        return this.engine.updateGroupNotice(groupNotice, groupID);
    }
    updateGroupName(groupName, groupID) {
        return this.engine.updateGroupName(groupName, groupID);
    }
    updateGroupAvatarUrl(groupAvatarUrl, groupID) {
        return this.engine.updateGroupAvatarUrl(groupAvatarUrl, groupID);
    }
    updateGroupAlias(groupAlias, groupID) {
        return this.engine.updateGroupAlias(groupAlias, groupID);
    }
    queryGroupInfo(groupID) {
        return this.engine.queryGroupInfo(groupID);
    }
    muteGroup(isMute, groupID, config) {
        return this.engine.muteGroup(isMute, groupID, config);
    }
    muteGroupMembers(isMute, userIDs, groupID, config) {
        return this.engine.muteGroupMembers(isMute, userIDs, groupID, config);
    }
    setGroupAttributes(groupAttributes, groupID) {
        return this.engine.setGroupAttributes(groupAttributes, groupID);
    }
    deleteGroupAttributes(keys, groupID) {
        return this.engine.deleteGroupAttributes(keys, groupID);
    }
    queryGroupAttributes(keys, groupID) {
        return this.engine.queryGroupAttributes(keys, groupID);
    }
    queryGroupAllAttributes(groupID) {
        return this.engine.queryGroupAllAttributes(groupID);
    }
    setGroupMemberNickname(nickname, forUserID, groupID) {
        return this.engine.setGroupMemberNickname(nickname, forUserID, groupID);
    }
    setGroupMemberRole(role, forUserID, groupID) {
        return this.engine.setGroupMemberRole(role, forUserID, groupID);
    }
    transferGroupOwner(toUserID, groupID) {
        return this.engine.transferGroupOwner(toUserID, groupID);
    }
    queryGroupMemberInfo(userID, groupID) {
        return this.engine.queryGroupMemberInfo(userID, groupID);
    }
    inviteUsersIntoGroup(userIDs, groupID) {
        return this.engine.inviteUsersIntoGroup(false, userIDs, groupID);
    }
    kickGroupMembers(userIDs, groupID) {
        return this.engine.kickGroupMembers(userIDs, groupID);
    }
    queryGroupMemberList(groupID, config) {
        return this.engine.queryGroupMemberList(groupID, config);
    }
    queryGroupMemberCount(groupID) {
        return this.engine.queryGroupMemberCount(groupID);
    }
    sendGroupJoinApplication(groupID, config) {
        return this.engine.joinGroup(false, groupID, config);
    }
    acceptGroupJoinApplication(userID, groupID, config) {
        return this.engine.acceptGroupApply(true, userID, groupID, config);
    }
    rejectGroupJoinApplication(userID, groupID, config) {
        return this.engine.rejectGroupApply(true, userID, groupID, config);
    }
    sendGroupInviteApplications(userIDs, groupID, config) {
        return this.engine.inviteUsersIntoGroup(true, userIDs, groupID, config);
    }
    acceptGroupInviteApplication(inviterUserID, groupID, config) {
        return this.engine.acceptGroupApply(false, inviterUserID, groupID, config);
    }
    rejectGroupInviteApplication(inviterUserID, groupID, config) {
        return this.engine.rejectGroupApply(false, inviterUserID, groupID, config);
    }
    queryGroupApplicationList(config) {
        return this.engine.queryGroupApplyList(config);
    }
    updateGroupJoinMode(mode, groupID) {
        return this.engine.updateGroupVerifyMode(mode, groupID, ZIMGroupVerifyType.Join);
    }
    updateGroupInviteMode(mode, groupID) {
        return this.engine.updateGroupVerifyMode(mode, groupID, ZIMGroupVerifyType.Invite);
    }
    updateGroupBeInviteMode(mode, groupID) {
        return this.engine.updateGroupVerifyMode(mode, groupID, ZIMGroupVerifyType.BeInvite);
    }
    // MARK: - Call
    callInvite(invitees, config) {
        return this.engine.callInvite(invitees, config);
    }
    callCancel(invitees, callID, config) {
        return this.engine.callCancel(invitees, callID, config);
    }
    callAccept(callID, config) {
        return this.engine.callAccept(callID, config);
    }
    callReject(callID, config) {
        return this.engine.callReject(callID, config);
    }
    callQuit(callID, config) {
        return this.engine.callQuit(callID, config);
    }
    callEnd(callID, config) {
        return this.engine.callEnd(callID, config);
    }
    callJoin(callID, config) {
        return this.engine.callJoin(callID, config);
    }
    callingInvite(invitees, callID, config) {
        return this.engine.callingInvite(invitees, callID, config);
    }
    queryCallInvitationList(config) {
        return this.engine.queryCallInvitationList(config);
    }
    // MARK: - DB Search
    // 基于会话分组
    searchLocalConversations(config) {
        return this.engine.searchLocalConversations(config);
    }
    // 基于消息
    searchGlobalLocalMessages(config) {
        return this.engine.searchGlobalLocalMessages(config);
    }
    searchLocalMessages(conversationID, conversationType, config) {
        return this.engine.searchLocalMessages(conversationID, conversationType, config);
    }
    searchLocalGroups(config) {
        return this.engine.searchLocalGroups(config);
    }
    searchLocalGroupMembers(groupID, config) {
        return this.engine.searchLocalGroupMembers(groupID, config);
    }
    // MARK: - Friend
    addFriend(userID, config) {
        return this.engine.addFriend(userID, config);
    }
    sendFriendApplication(userID, config) {
        return this.engine.sendFriendApplication(userID, config);
    }
    deleteFriends(userIDs, config) {
        return this.engine.deleteFriends(userIDs, config);
    }
    checkFriendsRelation(userIDs, config) {
        return this.engine.checkFriendsRelation(userIDs, config);
    }
    updateFriendAlias(friendAlias, userID) {
        return this.engine.updateFriendAlias(friendAlias, userID);
    }
    updateFriendAttributes(friendAttributes, userID) {
        return this.engine.updateFriendAttributes(friendAttributes, userID);
    }
    acceptFriendApplication(userID, config) {
        return this.engine.acceptFriendApplication(userID, config);
    }
    rejectFriendApplication(userID, config) {
        return this.engine.rejectFriendApplication(userID, config);
    }
    queryFriendsInfo(userIDs) {
        return this.engine.queryFriendsInfo(userIDs);
    }
    queryFriendList(config) {
        return this.engine.queryFriendList(config);
    }
    queryFriendApplicationList(config) {
        return this.engine.queryFriendApplicationList(config);
    }
    searchLocalFriends(config) {
        return this.engine.searchLocalFriends(config);
    }
    // MARK: - Blacklist
    addUsersToBlacklist(userIDs) {
        return this.engine.addUsersToBlacklist(userIDs);
    }
    removeUsersFromBlacklist(userIDs) {
        return this.engine.removeUsersFromBlacklist(userIDs);
    }
    checkUserIsInBlacklist(userID) {
        return this.engine.checkUserIsInBlacklist(userID);
    }
    queryBlacklist(config) {
        return this.engine.queryBlacklist(config);
    }
    //  MARK: - Local
    exportLocalMessages(folderPath, config, progress) {
        return this.engine.exportLocalMessages(folderPath, config, progress);
    }
    importLocalMessages(folderPath, config, progress) {
        return this.engine.importLocalMessages(folderPath, config, progress);
    }
    queryLocalFileCache(config) {
        return this.engine.queryLocalFileCache(config);
    }
    clearLocalFileCache(config) {
        return this.engine.clearLocalFileCache(config);
    }
}
