import { makeTag, zlogerror, zloginfo, zlogwarning } from "../../utils";
import { NotifyList } from "../../services/internal/NotifyList";
import { ZIMCallUserState, ZIMMessageType, ZIMRoomAttributesUpdateAction } from "./ZIMUniApp";
import UIKitCore from "../../services/internal/UIKitCore";
const TAG = makeTag('SimpleZIMEventHandler');
export class SimpleZIMEventHandler {
    handlerList = new NotifyList();
    signalingHandlerList;
    constructor(signalingHandlerList) {
        zloginfo(TAG, 'init SimpleZIMEventHandler');
        // 隐藏掉 handlerList, signalingHandlerList, 不允许枚举
        Object.defineProperties(this, {
            "handlerList": {
                enumerable: false
            },
            "signalingHandlerList": {
                enumerable: false
            }
        });
        this.signalingHandlerList = signalingHandlerList;
    }
    addListener(listenerID, handler) {
        if (handler) {
            this.handlerList.addListener(listenerID, handler);
        }
    }
    removeListener(listenerID) {
        this.handlerList.removeListener(listenerID);
    }
    removeAllEventListeners() {
        this.handlerList.clear();
    }
    error = (zim, errorInfo) => {
        zlogerror(TAG, `ZIM error: ${errorInfo.code} : ${errorInfo.message}}`);
        this.handlerList.notifyAllListener((handler) => handler.error?.(zim, errorInfo));
    };
    connectionStateChanged = (zim, data) => {
        zlogwarning(TAG, `ZIM connectionStateChanged: ${data.state} ${data.event}`);
        this.handlerList.notifyAllListener((handler) => handler.connectionStateChanged?.(zim, data));
        const state = data.state;
        this.signalingHandlerList.notifyAllListener(handler => handler.onConnectionStateChanged?.(state));
    };
    tokenWillExpire = (zim, data) => {
        zloginfo(TAG, `ZIM tokenWillExpire: ${data.second}`);
        this.handlerList.notifyAllListener((handler) => handler.tokenWillExpire?.(zim, data));
        // this.signalingHandlerList.notifyAllListener(handler => handler.onTokenWillExpire?.(data.second));
    };
    userInfoUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM userInfoUpdated: ${JSON.stringify(data.info)}`);
        this.handlerList.notifyAllListener((handler) => handler.userInfoUpdated?.(zim, data));
    };
    userRuleUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM userRuleUpdated: ${JSON.stringify(data.userRule)}`);
        this.handlerList.notifyAllListener((handler) => handler.userRuleUpdated?.(zim, data));
    };
    conversationsAllDeleted = (zim, data) => {
        zloginfo(TAG, `ZIM conversationsAllDeleted: ${data.count}`);
        this.handlerList.notifyAllListener((handler) => handler.conversationsAllDeleted?.(zim, data));
    };
    conversationChanged = (zim, data) => {
        zloginfo(TAG, `ZIM conversationChanged: ${JSON.stringify(data.infoList)}`);
        this.handlerList.notifyAllListener((handler) => handler.conversationChanged?.(zim, data));
    };
    conversationTotalUnreadMessageCountUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM conversationTotalUnreadMessageCountUpdated: ${data.totalUnreadMessageCount}`);
        this.handlerList.notifyAllListener((handler) => handler.conversationTotalUnreadMessageCountUpdated?.(zim, data));
    };
    receivePeerMessage = (zim, data) => {
        zloginfo(TAG, `ZIM receivePeerMessage: ${JSON.stringify(data.messageList)}`);
        this.handlerList.notifyAllListener((handler) => handler.receivePeerMessage?.(zim, data));
    };
    receiveGroupMessage = (zim, data) => {
        zloginfo(TAG, `ZIM receiveGroupMessage: ${JSON.stringify(data.messageList)}`);
        this.handlerList.notifyAllListener((handler) => handler.receiveGroupMessage?.(zim, data));
    };
    receiveRoomMessage = (zim, data) => {
        zloginfo(TAG, `ZIM receiveRoomMessage: ${JSON.stringify(data.messageList)}`);
        this.handlerList.notifyAllListener((handler) => handler.receiveRoomMessage?.(zim, data));
        const { fromConversationID: roomID, messageList } = data;
        // 对 messageList 做个排序, 按 timestamp 升序排列
        messageList.sort((a, b) => a.timestamp - b.timestamp);
        const textMessageList = [];
        const commandMessageList = [];
        const decoder = new TextDecoder('utf-8');
        // 遍历 messageList, 根据 type 筛选出 textMessage 和 commandMessage
        messageList.forEach(message => {
            if (message.type === ZIMMessageType.Text) {
                const msg = message;
                textMessageList.push({
                    messageID: msg.messageID,
                    orderKey: msg.orderKey,
                    senderUserID: msg.senderUserID,
                    text: msg.message,
                    timestamp: msg.timestamp
                });
            }
            else if (message.type === ZIMMessageType.Command) {
                const msg = message;
                const messageText = decoder.decode(msg.message);
                commandMessageList.push({
                    messageID: msg.messageID,
                    orderKey: msg.orderKey,
                    senderUserID: msg.senderUserID,
                    text: messageText,
                    timestamp: msg.timestamp
                });
            }
        });
        if (textMessageList.length) {
            this.signalingHandlerList.notifyAllListener(handler => handler.onInRoomTextMessageReceived?.(textMessageList, roomID));
        }
        if (commandMessageList.length) {
            this.signalingHandlerList.notifyAllListener(handler => handler.onInRoomCommandMessageReceived?.(commandMessageList, roomID));
        }
    };
    conversationMessageReceiptChanged = (zim, data) => {
        zloginfo(TAG, `ZIM conversationMessageReceiptChanged: ${JSON.stringify(data.infos)}`);
        this.handlerList.notifyAllListener((handler) => handler.conversationMessageReceiptChanged?.(zim, data));
    };
    messageReceiptChanged = (zim, data) => {
        zloginfo(TAG, `ZIM messageReceiptChanged: ${JSON.stringify(data.infos)}`);
        this.handlerList.notifyAllListener((handler) => handler.messageReceiptChanged?.(zim, data));
    };
    messageRevokeReceived = (zim, data) => {
        zloginfo(TAG, `ZIM messageRevokeReceived: ${JSON.stringify(data.messageList)}`);
        this.handlerList.notifyAllListener((handler) => handler.messageRevokeReceived?.(zim, data));
    };
    messageSentStatusChanged = (zim, data) => {
        zloginfo(TAG, `ZIM messageSentStatusChanged: ${JSON.stringify(data.infos)}`);
        this.handlerList.notifyAllListener((handler) => handler.messageSentStatusChanged?.(zim, data));
    };
    messageReactionsChanged = (zim, data) => {
        zloginfo(TAG, `ZIM messageReactionsChanged: ${JSON.stringify(data.reactions)}`);
        this.handlerList.notifyAllListener((handler) => handler.messageReactionsChanged?.(zim, data));
    };
    messageDeleted = (zim, data) => {
        zloginfo(TAG, `ZIM messageDeleted: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.messageDeleted?.(zim, data));
    };
    roomStateChanged = (zim, data) => {
        zloginfo(TAG, `ZIM roomStateChanged: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.roomStateChanged?.(zim, data));
    };
    roomMemberJoined = (zim, data) => {
        zloginfo(TAG, `ZIM roomMemberJoined: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.roomMemberJoined?.(zim, data));
        const { roomID, memberList } = data;
        const userIDList = memberList.map(zimUserInfo => zimUserInfo.userID);
        this.signalingHandlerList.notifyAllListener(handler => handler.onRoomMemberJoined?.(userIDList, roomID));
    };
    roomMemberLeft = (zim, data) => {
        zloginfo(TAG, `ZIM roomMemberLeft: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.roomMemberLeft?.(zim, data));
        const { roomID, memberList } = data;
        const userIDList = memberList.map(zimUserInfo => zimUserInfo.userID);
        this.signalingHandlerList.notifyAllListener(handler => handler.onRoomMemberLeft?.(userIDList, roomID));
    };
    roomAttributesUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM roomAttributesUpdated: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.roomAttributesUpdated?.(zim, data));
        const { roomID, infos } = data;
        const setProperties = [];
        const deleteProperties = [];
        for (const info of infos) {
            if (info.action == ZIMRoomAttributesUpdateAction.Set) {
                setProperties.push(info.roomAttributes);
            }
            else if (info.action == ZIMRoomAttributesUpdateAction.Delete) {
                deleteProperties.push(info.roomAttributes);
            }
        }
        this.signalingHandlerList.notifyAllListener(handler => handler.onRoomPropertiesUpdated?.(setProperties, deleteProperties, roomID));
    };
    roomAttributesBatchUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM roomAttributesBatchUpdated: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.roomAttributesBatchUpdated?.(zim, data));
        const { roomID, infos } = data;
        const setProperties = [];
        const deleteProperties = [];
        for (const info of infos) {
            if (info.action == ZIMRoomAttributesUpdateAction.Set) {
                setProperties.push(info.roomAttributes);
            }
            else if (info.action == ZIMRoomAttributesUpdateAction.Delete) {
                deleteProperties.push(info.roomAttributes);
            }
        }
        this.signalingHandlerList.notifyAllListener(handler => handler.onRoomPropertiesUpdated?.(setProperties, deleteProperties, roomID));
    };
    roomMemberAttributesUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM roomMemberAttributesUpdated: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.roomMemberAttributesUpdated?.(zim, data));
        const { roomID, infos, operatedInfo } = data;
        const map = {};
        // 遍历 infos 数组并填充 map
        for (const info of infos) {
            map[info.attributesInfo.userID] = info.attributesInfo.attributes;
        }
        this.signalingHandlerList.notifyAllListener(handler => handler.onUsersInRoomAttributesUpdated?.(map, operatedInfo.userID, roomID));
    };
    groupStateChanged = (zim, data) => {
        zloginfo(TAG, `ZIM groupStateChanged: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.groupStateChanged?.(zim, data));
    };
    groupNameUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM groupNameUpdated: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.groupNameUpdated?.(zim, data));
    };
    groupAvatarUrlUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM groupAvatarUrlUpdated: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.groupAvatarUrlUpdated?.(zim, data));
    };
    groupNoticeUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM groupNoticeUpdated: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.groupNoticeUpdated?.(zim, data));
    };
    groupAttributesUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM groupAttributesUpdated: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.groupAttributesUpdated?.(zim, data));
    };
    groupMemberStateChanged = (zim, data) => {
        zloginfo(TAG, `ZIM groupMemberStateChanged: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.groupMemberStateChanged?.(zim, data));
    };
    groupMemberInfoUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM groupMemberInfoUpdated: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.groupMemberInfoUpdated?.(zim, data));
    };
    groupMutedInfoUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM groupMutedInfoUpdated: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.groupMutedInfoUpdated?.(zim, data));
    };
    groupVerifyInfoUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM groupVerifyInfoUpdated: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.groupVerifyInfoUpdated?.(zim, data));
    };
    groupApplicationListChanged = (zim, data) => {
        zloginfo(TAG, `ZIM groupApplicationListChanged: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.groupApplicationListChanged?.(zim, data));
    };
    groupApplicationUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM groupApplicationUpdated: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.groupApplicationUpdated?.(zim, data));
    };
    callInvitationCreated = (zim, data) => {
        zloginfo(TAG, `ZIM callInvitationCreated: ${JSON.stringify(data)}`);
        // @ts-ignore
        this.handlerList.notifyAllListener((handler) => handler.callInvitationCreated?.(zim, data));
    };
    callInvitationReceived = (zim, data) => {
        zloginfo(TAG, `ZIM callInvitationReceived: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.callInvitationReceived?.(zim, data));
        this.signalingHandlerList.notifyAllListener(handler => handler.onCallInvitationReceived?.(data.callID, data.inviter, data.extendedData));
    };
    callInvitationCancelled = (zim, data) => {
        zloginfo(TAG, `ZIM callInvitationCancelled: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.callInvitationCancelled?.(zim, data));
        this.signalingHandlerList.notifyAllListener(handler => handler.onCallInvitationCancelled?.(data.callID, data.inviter, data.extendedData));
    };
    callInvitationTimeout = (zim, data) => {
        zloginfo(TAG, `ZIM callInvitationTimeout: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.callInvitationTimeout?.(zim, data));
        this.signalingHandlerList.notifyAllListener(handler => handler.onCallInvitationTimeout?.(data.callID));
    };
    callInvitationEnded = (zim, data) => {
        zloginfo(TAG, `ZIM callInvitationEnded: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.callInvitationEnded?.(zim, data));
    };
    callUserStateChanged = (zim, data) => {
        zlogwarning(TAG, `ZIM callUserStateChanged: ${JSON.stringify(data)}`);
        // this.handlerList.notifyAllListener((handler) => handler.callUserStateChanged?.(zim, data))
        const { callID, callUserList } = data;
        const localCoreUser = UIKitCore.getInstance().getLocalCoreUser();
        const timeoutInvitees = callUserList
            .filter(({ state, userID }) => state === ZIMCallUserState.Timeout && userID !== localCoreUser?.userID)
            .map(({ userID }) => userID);
        if (timeoutInvitees.length) {
            this.signalingHandlerList.notifyAllListener(handler => handler.onCallInviteesAnsweredTimeout?.(data.callID, timeoutInvitees));
        }
        callUserList.forEach(({ state, userID, extendedData }) => {
            if (userID === localCoreUser?.userID)
                return;
            if (state === ZIMCallUserState.Rejected) {
                this.signalingHandlerList.notifyAllListener(handler => handler.onCallInvitationRejected?.(data.callID, userID, extendedData));
            }
            if (state === ZIMCallUserState.Accepted) {
                this.signalingHandlerList.notifyAllListener(handler => handler.onCallInvitationAccepted?.(callID, userID, extendedData));
            }
            if (state === ZIMCallUserState.Ended) {
                this.signalingHandlerList.notifyAllListener(handler => handler.onCallInvitationCancelled?.(data.callID, userID, extendedData));
            }
            // // @ts-ignore
            // if (state === ZIMCallUserState.BeCancelled) {
            // }
        });
    };
    /**
     * 已废弃，改用[callUserStateChanged]
     */
    callInvitationAccepted = (zim, data) => {
        zloginfo(TAG, `ZIM callInvitationAccepted: ${JSON.stringify(data)}`);
        // this.handlerList.notifyAllListener((handler) => handler.callInvitationAccepted?.(zim, data))
        // 断线重连后callUserStateChanged不会补发，这里做下兼容
        this.signalingHandlerList.notifyAllListener(handler => handler.onCallInvitationAccepted?.(data.callID, data.invitee, data.extendedData));
    };
    /**
     * 已废弃，改用[callUserStateChanged]
     */
    callInvitationRejected = (zim, data) => {
        zloginfo(TAG, `ZIM callInvitationRejected: ${JSON.stringify(data)}`);
        // this.handlerList.notifyAllListener((handler) => handler.callInvitationRejected?.(zim, data))
        // this.signalingHandlerList.notifyAllListener(handler => handler.onCallInvitationRejected?.(data.callID, data.invitee, data.extendedData));
    };
    /**
     * 已废弃，改用[callUserStateChanged]
     */
    callInviteesAnsweredTimeout = (zim, data) => {
        zloginfo(TAG, `ZIM callInviteesAnsweredTimeout: ${JSON.stringify(data)}`);
        // this.handlerList.notifyAllListener((handler) => handler.callInviteesAnsweredTimeout?.(zim, data))
        // this.signalingHandlerList.notifyAllListener(handler => handler.onCallInviteesAnsweredTimeout?.(data.callID, data.invitees));
    };
    blacklistChanged = (zim, data) => {
        zloginfo(TAG, `ZIM blacklistChanged: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.blacklistChanged?.(zim, data));
    };
    friendListChanged = (zim, data) => {
        zloginfo(TAG, `ZIM friendListChanged: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.friendListChanged?.(zim, data));
    };
    friendInfoUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM friendInfoUpdated: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.friendInfoUpdated?.(zim, data));
    };
    friendApplicationListChanged = (zim, data) => {
        zloginfo(TAG, `ZIM friendApplicationListChanged: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.friendApplicationListChanged?.(zim, data));
    };
    friendApplicationUpdated = (zim, data) => {
        zloginfo(TAG, `ZIM friendApplicationUpdated: ${JSON.stringify(data)}`);
        this.handlerList.notifyAllListener((handler) => handler.friendApplicationUpdated?.(zim, data));
    };
}
