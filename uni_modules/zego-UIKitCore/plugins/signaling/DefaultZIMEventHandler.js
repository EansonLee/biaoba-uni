// 提供 ZIMEventHandler 的默认实现
export class DefaultZIMEventHandler {
    handler;
    constructor(handler) {
        this.handler = handler;
    }
    error(zim, errorInfo) {
        this.handler?.error?.(zim, errorInfo);
    }
    connectionStateChanged(zim, data) {
        this.handler?.connectionStateChanged?.(zim, data);
    }
    tokenWillExpire(zim, data) {
        this.handler?.tokenWillExpire?.(zim, data);
        // this.signalingHandlerList.notifyAllListener(handler => handler.onTokenWillExpire?.(data.second);
    }
    userInfoUpdated(zim, data) {
        this.handler?.userInfoUpdated?.(zim, data);
    }
    userRuleUpdated(zim, data) {
        this.handler?.userRuleUpdated?.(zim, data);
    }
    conversationsAllDeleted(zim, data) {
        this.handler?.conversationsAllDeleted?.(zim, data);
    }
    conversationChanged(zim, data) {
        this.handler?.conversationChanged?.(zim, data);
    }
    conversationTotalUnreadMessageCountUpdated(zim, data) {
        this.handler?.conversationTotalUnreadMessageCountUpdated?.(zim, data);
    }
    receivePeerMessage(zim, data) {
        this.handler?.receivePeerMessage?.(zim, data);
    }
    receiveGroupMessage(zim, data) {
        this.handler?.receiveGroupMessage?.(zim, data);
    }
    receiveRoomMessage(zim, data) {
        this.handler?.receiveRoomMessage?.(zim, data);
    }
    conversationMessageReceiptChanged(zim, data) {
        this.handler?.conversationMessageReceiptChanged?.(zim, data);
    }
    messageReceiptChanged(zim, data) {
        this.handler?.messageReceiptChanged?.(zim, data);
    }
    messageRevokeReceived(zim, data) {
        this.handler?.messageRevokeReceived?.(zim, data);
    }
    messageSentStatusChanged(zim, data) {
        this.handler?.messageSentStatusChanged?.(zim, data);
    }
    messageReactionsChanged(zim, data) {
        this.handler?.messageReactionsChanged?.(zim, data);
    }
    messageDeleted(zim, data) {
        this.handler?.messageDeleted?.(zim, data);
    }
    roomStateChanged(zim, data) {
        this.handler?.roomStateChanged?.(zim, data);
    }
    roomMemberJoined(zim, data) {
        this.handler?.roomMemberJoined?.(zim, data);
    }
    roomMemberLeft(zim, data) {
        this.handler?.roomMemberLeft?.(zim, data);
    }
    roomAttributesUpdated(zim, data) {
        this.handler?.roomAttributesUpdated?.(zim, data);
    }
    roomAttributesBatchUpdated(zim, data) {
        this.handler?.roomAttributesBatchUpdated?.(zim, data);
    }
    roomMemberAttributesUpdated(zim, data) {
        this.handler?.roomMemberAttributesUpdated?.(zim, data);
    }
    groupStateChanged(zim, data) {
        this.handler?.groupStateChanged?.(zim, data);
    }
    groupNameUpdated(zim, data) {
        this.handler?.groupNameUpdated?.(zim, data);
    }
    groupAvatarUrlUpdated(zim, data) {
        this.handler?.groupAvatarUrlUpdated?.(zim, data);
    }
    groupNoticeUpdated(zim, data) {
        this.handler?.groupNoticeUpdated?.(zim, data);
    }
    groupAttributesUpdated(zim, data) {
        this.handler?.groupAttributesUpdated?.(zim, data);
    }
    groupMemberStateChanged(zim, data) {
        this.handler?.groupMemberStateChanged?.(zim, data);
    }
    groupMemberInfoUpdated(zim, data) {
        this.handler?.groupMemberInfoUpdated?.(zim, data);
    }
    groupMutedInfoUpdated(zim, data) {
        this.handler?.groupMutedInfoUpdated?.(zim, data);
    }
    groupVerifyInfoUpdated(zim, data) {
        this.handler?.groupVerifyInfoUpdated?.(zim, data);
    }
    groupApplicationListChanged(zim, data) {
        this.handler?.groupApplicationListChanged?.(zim, data);
    }
    groupApplicationUpdated(zim, data) {
        this.handler?.groupApplicationUpdated?.(zim, data);
    }
    callInvitationCreated(zim, data) {
        // @ts-ignore
        this.handler?.callInvitationCreated?.(zim, data);
    }
    callInvitationReceived(zim, data) {
        this.handler?.callInvitationReceived?.(zim, data);
    }
    callInvitationCancelled(zim, data) {
        this.handler?.callInvitationCancelled?.(zim, data);
    }
    callInvitationTimeout(zim, data) {
        this.handler?.callInvitationTimeout?.(zim, data);
    }
    callInvitationEnded(zim, data) {
        this.handler?.callInvitationEnded?.(zim, data);
    }
    callUserStateChanged(zim, data) {
        this.handler?.callUserStateChanged?.(zim, data);
    }
    callInvitationAccepted(zim, data) {
        this.handler?.callInvitationAccepted?.(zim, data);
    }
    callInvitationRejected(zim, data) {
        this.handler?.callInvitationRejected?.(zim, data);
    }
    callInviteesAnsweredTimeout(zim, data) {
        this.handler?.callInviteesAnsweredTimeout?.(zim, data);
    }
    blacklistChanged(zim, data) {
        this.handler?.blacklistChanged?.(zim, data);
    }
    friendListChanged(zim, data) {
        this.handler?.friendListChanged?.(zim, data);
    }
    friendInfoUpdated(zim, data) {
        this.handler?.friendInfoUpdated?.(zim, data);
    }
    friendApplicationListChanged(zim, data) {
        this.handler?.friendApplicationListChanged?.(zim, data);
    }
    friendApplicationUpdated(zim, data) {
        this.handler?.friendApplicationUpdated?.(zim, data);
    }
}
