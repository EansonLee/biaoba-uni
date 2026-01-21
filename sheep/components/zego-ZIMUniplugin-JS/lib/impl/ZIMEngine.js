import { ZIMGroupMuteMode, ZIMGroupVerifyType, ZIMMessageDirection, ZIMMessageType, } from '../ZIMDefines';
import { ZIMLogAction, ZIMLogTag, ZIMLogger } from './ZIMLogger';
import { ZIMManager } from './ZIMManager';
import { ZIMParamValid } from './ZIMParamValid';
const ZIMNativeModule = uni.requireNativePlugin('zego-ZIMUniPlugin_ZIMUniEngine');
const ZIMEvent = uni.requireNativePlugin('globalEvent');
const NOOP = () => { };
const Prefix = ZIMNativeModule.prefix();
const LogTagUser = ZIMLogTag.User;
const LogTagGroup = ZIMLogTag.Group;
const LogTagFriend = ZIMLogTag.Friend;
export function createSymbol() {
    return Symbol(Date.now() + Math.random().toString().slice(2)).toString();
}
export class ZIMEngine {
    handle;
    appID;
    appSign;
    logger;
    paramValid;
    loginUserID;
    uploadingMap;
    downloadingMap;
    messageAttachedMap;
    messageExportingMap;
    eventNameList;
    static _callMethod(method, args = {}) {
        return new Promise((resolve, reject) => {
            ZIMNativeModule.callMethod({ method, args }, (res) => {
                // console.log(`[ZIM][API][I] ${method}: ${JSON.stringify(res)}`);
                resolve(res);
            }, (err) => {
                // console.log(`[ZIM][API][E] ${method}: ${JSON.stringify(err)}`);
                reject(err);
            });
        });
    }
    constructor(handle, appID, appSign) {
        this.handle = handle;
        this.appID = appID;
        this.appSign = appSign;
        this.loginUserID = '';
        this.logger = new ZIMLogger();
        this.paramValid = new ZIMParamValid(this.logger);
        this.uploadingMap = new Map();
        this.downloadingMap = new Map();
        this.messageAttachedMap = new Map();
        this.messageExportingMap = new Map();
        this.eventNameList = [
            'connectionStateChanged',
            'error',
            'tokenWillExpire',
            'userInfoUpdated',
            'userRuleUpdated',
            'userStatusUpdated',
            'conversationsAllDeleted',
            'conversationChanged',
            'conversationTotalUnreadMessageCountUpdated',
            'receivePeerMessage',
            'receiveGroupMessage',
            'receiveRoomMessage',
            'roomStateChanged',
            'roomMemberJoined',
            'roomMemberLeft',
            'roomAttributesUpdated',
            'roomAttributesBatchUpdated',
            'roomMemberAttributesUpdated',
            'groupStateChanged',
            'groupNameUpdated',
            'groupAvatarUrlUpdated',
            'groupNoticeUpdated',
            'groupAliasUpdated',
            'groupAttributesUpdated',
            'groupMemberStateChanged',
            'groupMemberInfoUpdated',
            'callInvitationCreated',
            'callInvitationReceived',
            'callInvitationEnded',
            'callInvitationCancelled',
            'callInvitationTimeout',
            'callInvitationAccepted',
            'callInvitationRejected',
            'callInviteesAnsweredTimeout',
            'callUserStateChanged',
            'conversationMessageReceiptChanged',
            'messageReceiptChanged',
            'messageRevokeReceived',
            'messageSentStatusChanged',
            'messageReactionsChanged',
            'messageDeleted',
            'messageRepliedCountChanged',
            'messageRepliedInfoChanged',
            'broadcastMessageReceived',
            'roomMessageReceived',
            'peerMessageReceived',
            'groupMessageReceived',
            'blacklistChanged',
            'friendListChanged',
            'friendInfoUpdated',
            'friendApplicationListChanged',
            'friendApplicationUpdated',
            'groupMutedInfoUpdated',
            'groupVerifyInfoUpdated',
            'groupApplicationListChanged',
            'groupApplicationUpdated',
        ];
    }
    convertMapToUint8Array(type, data) {
        if (type == 'receivePeerMessage' ||
            type == 'receiveGroupMessage' ||
            type == 'receiveRoomMessage' ||
            type == 'peerMessageReceived' ||
            type == 'groupMessageReceived' ||
            type == 'roomMessageReceived') {
            const result = data[0];
            result.messageList.forEach((msg) => {
                if (msg.type == 2) {
                    msg.message = new Uint8Array(Object.values(msg.message));
                }
            });
        }
        else if (type == 'broadcastMessageReceived') {
            const result = data[0];
            if (result.message.type == 2) {
                result.message.message = new Uint8Array(Object.values(result.message.message));
            }
        }
        else if (type == 'messageAttached') {
            const message = data[0];
            if (message.type == 2) {
                message.message = new Uint8Array(Object.values(message.message));
            }
        }
        else if (type == 'sendMessage') {
            const message = data;
            if (message.type == 2) {
                message.message = new Uint8Array(Object.values(message.message));
            }
        }
    }
    create() {
        ZIMEngine._callMethod('setAdvancedConfig', {
            handle: this.handle.toString(),
            key: 'zim_cross_platform',
            value: 'uni-app',
        });
        return ZIMEngine._callMethod('createEngine', {
            handle: this.handle.toString(),
            appID: this.appID,
            appSign: this.appSign,
        });
    }
    destroy() {
        const events = ZIMManager.listeners.keys();
        for (let event of events) {
            ZIMEvent.removeEventListener(Prefix + event);
        }
        return ZIMEngine._callMethod('destroyEngine', { handle: this.handle.toString() });
    }
    uploadLog() {
        return ZIMEngine._callMethod('uploadLog', { handle: this.handle.toString() });
    }
    on(type, listener) {
        if (!listener || typeof listener != 'function')
            throw new Error('listener must be a function.');
        const native_listener = (res) => {
            const { handle, data } = res;
            this.convertMapToUint8Array(type, data);
            const engine = ZIMManager.engineMap.get(handle);
            this.logger.warn('', 'JSAPI.emit.' + type, data);
            // @ts-ignore
            listener(engine, ...data);
        };
        let map = ZIMManager.listeners.get(type);
        if (map === undefined) {
            map = new Map();
            ZIMManager.listeners.set(type, map);
        }
        map.set(listener, native_listener);
        ZIMEvent.addEventListener(Prefix + type, native_listener);
        this.logger.warn('', 'JSAPI.on.' + type);
    }
    off(type) {
        ZIMEvent.removeEventListener(Prefix + type);
        ZIMManager.listeners.delete(type);
    }
    login(userID, config) {
        const error = this.paramValid.validID('userID', userID, LogTagUser, ZIMLogAction.Login);
        if (error)
            return Promise.reject(error);
        this.loginUserID = userID;
        return ZIMEngine._callMethod('login', { handle: this.handle.toString(), userID, config });
    }
    logout() {
        return ZIMEngine._callMethod('logout', { handle: this.handle.toString() });
    }
    renewToken(token) {
        return ZIMEngine._callMethod('renewToken', { handle: this.handle.toString(), token });
    }
    updateUserName(userName) {
        const error = this.paramValid.validName('userName', userName, ZIMLogTag.User, ZIMLogAction.UpdateUserName);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('updateUserName', { handle: this.handle.toString(), userName });
    }
    updateUserAvatarUrl(userAvatarUrl) {
        const error = this.paramValid.validName('userAvatarUrl', userAvatarUrl, ZIMLogTag.User, ZIMLogAction.UpdateUserAvatarUrl);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('updateUserAvatarUrl', { handle: this.handle.toString(), userAvatarUrl });
    }
    updateUserExtendedData(extendedData) {
        const error = this.paramValid.validName('extendedData', extendedData, ZIMLogTag.User, ZIMLogAction.UpdateUserExtendedData);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('updateUserExtendedData', { handle: this.handle.toString(), extendedData });
    }
    updateUserOfflinePushRule(offlinePushRule) {
        const error = this.paramValid.updateUserOfflinePushRule(offlinePushRule);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('updateUserOfflinePushRule', { handle: this.handle.toString(), offlinePushRule });
    }
    querySelfUserInfo() {
        return ZIMEngine._callMethod('querySelfUserInfo', { handle: this.handle.toString() });
    }
    queryUsersInfo(userIDs, config) {
        const error = this.paramValid.validArray('userIDs', userIDs, ZIMLogTag.User, ZIMLogAction.QueryUsersInfo);
        if (error)
            return Promise.reject(error);
        config = Object.assign({ isQueryFromServer: false }, config);
        return ZIMEngine._callMethod('queryUsersInfo', { handle: this.handle.toString(), userIDs, config });
    }
    queryUsersStatus(userIDs) {
        const error = this.paramValid.validArray('userIDs', userIDs, ZIMLogTag.User, ZIMLogAction.QueryStatus);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryUsersStatus', { handle: this.handle.toString(), userIDs });
    }
    subscribeUsersStatus(userIDs, config) {
        let error = this.paramValid.validArray('userIDs', userIDs, ZIMLogTag.User, ZIMLogAction.SubscribeStatus);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('subscribeUsersStatus', { handle: this.handle.toString(), userIDs, config });
    }
    unsubscribeUsersStatus(userIDs) {
        let error = this.paramValid.validArray('userIDs', userIDs, ZIMLogTag.User, ZIMLogAction.SubscribeStatus);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('unsubscribeUsersStatus', { handle: this.handle.toString(), userIDs });
    }
    querySubscribedUserStatusList(config) {
        return ZIMEngine._callMethod('querySubscribedUserStatusList', { handle: this.handle.toString(), config });
    }
    // MARK: - Conversation
    queryConversation(conversationID, conversationType) {
        const error = this.paramValid.validConvIDAndType(conversationID, conversationType, ZIMLogAction.QueryConv);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryConversation', {
            handle: this.handle.toString(),
            conversationID,
            conversationType,
        });
    }
    queryConversationList(config, option) {
        const error = this.paramValid.validCount(config, ZIMLogTag.Conversation, ZIMLogAction.QueryConvList);
        if (error)
            return Promise.reject(error);
        if (config.count < 1)
            return Promise.resolve({ conversationList: [] });
        return ZIMEngine._callMethod('queryConversationList', { handle: this.handle.toString(), config, option });
    }
    queryConversationPinnedList(config) {
        const error = this.paramValid.validCount(config, ZIMLogTag.Conversation, ZIMLogAction.QueryPinnedList);
        if (error)
            return Promise.reject(error);
        if (config.count < 1)
            return Promise.resolve({ conversationList: [] });
        return ZIMEngine._callMethod('queryConversationPinnedList', { handle: this.handle.toString(), config });
    }
    queryConversationTotalUnreadMessageCount(config) {
        return ZIMEngine._callMethod('queryConversationTotalUnreadMessageCount', { handle: this.handle.toString(), config });
    }
    deleteConversation(conversationID, conversationType, config) {
        const error = this.paramValid.validConvIDAndType(conversationID, conversationType, ZIMLogAction.DeleteConv);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('deleteConversation', {
            handle: this.handle.toString(),
            conversationID,
            conversationType,
            config,
        });
    }
    deleteAllConversations(config) {
        config = Object.assign({ isAlsoDeleteServerConversation: true }, config);
        return ZIMEngine._callMethod('deleteAllConversations', { handle: this.handle.toString(), config });
    }
    deleteAllConversationMessages(config) {
        config = Object.assign({ isAlsoDeleteServerMessage: true }, config);
        return ZIMEngine._callMethod('deleteAllConversationMessages', { handle: this.handle.toString(), config })
            .then(() => Promise.resolve())
            .catch(() => Promise.reject());
    }
    setConversationNotificationStatus(status, conversationID, conversationType) {
        const error = this.paramValid.setNotificationStatus(status, conversationID, conversationType);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('setConversationNotificationStatus', {
            handle: this.handle.toString(),
            status,
            conversationID,
            conversationType,
        });
    }
    updateConversationPinnedState(isPinned, conversationID, conversationType) {
        const error = this.paramValid.validConvIDAndType(conversationID, conversationType, ZIMLogAction.UpdatePinnedState);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('updateConversationPinnedState', {
            handle: this.handle.toString(),
            isPinned,
            conversationID,
            conversationType,
        });
    }
    clearConversationUnreadMessageCount(conversationID, conversationType) {
        const error = this.paramValid.validConvIDAndType(conversationID, conversationType, ZIMLogAction.ClearUnreadCount);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('clearConversationUnreadMessageCount', {
            handle: this.handle.toString(),
            conversationID,
            conversationType,
        });
    }
    clearConversationTotalUnreadMessageCount() {
        return ZIMEngine._callMethod('clearConversationTotalUnreadMessageCount', { handle: this.handle.toString() });
    }
    setConversationDraft(draft, conversationID, conversationType) {
        const error = this.paramValid.setConversationDraft(conversationID, conversationType, draft);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('setConversationDraft', {
            handle: this.handle.toString(),
            draft,
            conversationID,
            conversationType,
        });
    }
    setConversationMark(markType, enable, conversationInfos) {
        const error = this.paramValid.setConvMark(markType, conversationInfos);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('setConversationMark', {
            handle: this.handle.toString(),
            markType,
            enable,
            conversationInfos,
        });
    }
    sendMessage(message, toConversationID, conversationType, config, notification) {
        const error = this.paramValid.sendMessage(message, toConversationID, conversationType, config) ||
            this.paramValid.sendCombineMessage(message, 100, 500);
        if (error)
            return Promise.reject(error);
        const _handle = createSymbol();
        const messageAttachedCallBack = (notification && notification.onMessageAttached) || NOOP;
        const native_messageAttached_listener = (res) => {
            const { messageAttachedHandle, data } = res;
            console.log('JSAPI.onMessageAttached', _handle, messageAttachedHandle, !!this.messageAttachedMap.get(messageAttachedHandle));
            if (_handle == messageAttachedHandle) {
                this.convertMapToUint8Array('messageAttached', data);
                const listener = this.messageAttachedMap.get(messageAttachedHandle);
                // @ts-ignore
                listener && listener(...data);
            }
        };
        const type = Prefix + 'messageAttached';
        ZIMEvent.addEventListener(type, native_messageAttached_listener);
        this.messageAttachedMap.set(_handle, messageAttachedCallBack);
        const methodName = 'sendMessage';
        return new Promise((resolve, reject) => {
            ZIMNativeModule.callMethod({
                method: methodName,
                args: {
                    handle: this.handle.toString(),
                    message,
                    conversationID: toConversationID,
                    conversationType,
                    config,
                    messageAttachedHandle: _handle,
                },
            }, (res) => {
                ZIMEvent.removeEventListener(type, native_messageAttached_listener);
                this.messageAttachedMap.delete(_handle);
                this.convertMapToUint8Array('sendMessage', res.message);
                resolve(res);
            }, (err) => {
                ZIMEvent.removeEventListener(type, native_messageAttached_listener);
                this.messageAttachedMap.delete(_handle);
                reject(err);
            });
        });
    }
    sendMediaMessage(message, toConversationID, conversationType, config, notification) {
        const error = this.paramValid.sendMediaMessage(message, toConversationID, conversationType, config);
        if (error)
            return Promise.reject(error);
        const _handle = createSymbol();
        const progressCallBack = (notification && notification.onMediaUploadingProgress) || NOOP;
        const messageAttachedCallBack = (notification && notification.onMessageAttached) || NOOP;
        const native_progress_listener = (res) => {
            const { progressHandle, data } = res;
            console.log('JSAPI.onMediaUploadingProgress', _handle, progressHandle, !!this.uploadingMap.get(progressHandle));
            if (_handle == progressHandle) {
                const listener = this.uploadingMap.get(progressHandle);
                // @ts-ignore
                listener && listener(...data);
            }
        };
        const native_messageAttached_listener = (res) => {
            const { messageAttachedHandle, data } = res;
            console.log('JSAPI.onMessageAttached', _handle, messageAttachedHandle, !!this.messageAttachedMap.get(messageAttachedHandle));
            if (_handle == messageAttachedHandle) {
                const listener = this.messageAttachedMap.get(messageAttachedHandle);
                // @ts-ignore
                listener && listener(...data);
            }
        };
        const progressType = Prefix + 'mediaUploadingProgress';
        const messageAttchedType = Prefix + 'messageAttached';
        ZIMEvent.addEventListener(progressType, native_progress_listener);
        ZIMEvent.addEventListener(messageAttchedType, native_messageAttached_listener);
        this.uploadingMap.set(_handle, progressCallBack);
        this.messageAttachedMap.set(_handle, messageAttachedCallBack);
        const methodName = 'sendMediaMessage';
        return new Promise((resolve, reject) => {
            const removeSendNotification = () => {
                ZIMEvent.removeEventListener(progressType, native_progress_listener);
                ZIMEvent.removeEventListener(messageAttchedType, native_messageAttached_listener);
                this.uploadingMap.delete(_handle);
                this.messageAttachedMap.delete(_handle);
            };
            ZIMNativeModule.callMethod({
                method: methodName,
                args: {
                    handle: this.handle.toString(),
                    message,
                    toConversationID,
                    conversationType,
                    config,
                    progressHandle: _handle,
                    messageAttachedHandle: _handle,
                },
            }, (res) => {
                removeSendNotification();
                resolve(res);
            }, (err) => {
                removeSendNotification();
                reject(err);
            });
        });
    }
    deleteMessages(messageList, conversationID, conversationType, config) {
        config = Object.assign({ isAlsoDeleteServerMessage: true }, config);
        const error = this.paramValid.deleteMessages(messageList, conversationID, conversationType, config);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('deleteMessages', {
            handle: this.handle.toString(),
            messageList,
            conversationID,
            conversationType,
            config,
        });
    }
    deleteAllMessage(conversationID, conversationType, config) {
        const error = this.paramValid.validConvIDAndType(conversationID, conversationType, ZIMLogAction.DeleteAllMessage);
        if (error)
            return Promise.reject(error);
        config = Object.assign({ isAlsoDeleteServerMessage: true }, config);
        return ZIMEngine._callMethod('deleteAllMessage', {
            handle: this.handle.toString(),
            conversationID,
            conversationType,
            config,
        });
    }
    insertMessageToLocalDB(message, conversationID, conversationType, senderUserID) {
        const error = this.paramValid.insertMessageToLocalDB(message, conversationID, conversationType, senderUserID);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('insertMessageToLocalDB', {
            handle: this.handle.toString(),
            message,
            conversationID,
            conversationType,
            senderUserID,
        });
    }
    updateMessageLocalExtendedData(localExtendedData, message) {
        const error = this.paramValid.updateMessageLocalExtendedData(localExtendedData, message);
        if (error)
            return Promise.reject(error);
        // @ts-ignore
        return ZIMEngine._callMethod('updateMessageLocalExtendedData', {
            handle: this.handle.toString(),
            localExtendedData,
            message,
        }).then((result) => {
            return { message: Object.assign(message, result.message) };
        });
    }
    sendConversationMessageReceiptRead(conversationID, conversationType) {
        const error = this.paramValid.sendReceiptRead(conversationID, conversationType);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('sendConversationMessageReceiptRead', {
            handle: this.handle.toString(),
            conversationID,
            conversationType,
        });
    }
    sendMessageReceiptsRead(messageList, conversationID, conversationType) {
        const error = this.paramValid.sendMessageReceiptsRead(messageList, conversationID, conversationType);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('sendMessageReceiptsRead', {
            handle: this.handle.toString(),
            messageList,
            conversationID,
            conversationType,
        });
    }
    queryMessageReceiptsInfo(messageList, conversationID, conversationType) {
        const error = this.paramValid.queryReceiptsInfo(messageList, conversationID, conversationType);
        if (error)
            return Promise.reject(error);
        // Filter online message
        messageList = messageList.filter((msg) => msg.type != ZIMMessageType.Command && msg.type != ZIMMessageType.Barrage);
        return ZIMEngine._callMethod('queryMessageReceiptsInfo', {
            handle: this.handle.toString(),
            messageList,
            conversationID,
            conversationType,
        });
    }
    queryGroupMessageReceiptMemberList(message, groupID, config, read) {
        const error = this.paramValid.queryReceiptMemberList(message, groupID, config, read, this.loginUserID);
        if (error)
            return Promise.reject(error);
        if (config.count < 1 || message.direction == ZIMMessageDirection.Receive) {
            return Promise.resolve({ groupID, nextFlag: 0, userList: [] });
        }
        return ZIMEngine._callMethod('queryGroupMessageReceiptMemberList', {
            handle: this.handle.toString(),
            message,
            groupID,
            config,
            read,
        });
    }
    revokeMessage(message, config) {
        const error = this.paramValid.validSDKMessage(message, ZIMLogAction.RevokeMessage);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('revokeMessage', { handle: this.handle.toString(), message, config });
    }
    queryCombineMessageDetail(message) {
        const error = this.paramValid.queryCombineMessageDetail(message);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryCombineMessageDetail', { handle: this.handle.toString(), message });
    }
    queryHistoryMessage(conversationID, conversationType, config) {
        const error = this.paramValid.queryHistoryMessage(conversationID, conversationType, config);
        if (error)
            return Promise.reject(error);
        if (config.count < 1)
            return Promise.resolve({ conversationID, conversationType, messageList: [] });
        return ZIMEngine._callMethod('queryHistoryMessage', {
            handle: this.handle.toString(),
            conversationID,
            conversationType,
            config,
        });
    }
    downloadMediaFile(message, fileType, progress) {
        const error = this.paramValid.downloadMediaFile(message, fileType);
        if (error)
            return Promise.reject(error);
        const _handle = createSymbol();
        const native_progress_listener = (res) => {
            const { progressHandle, data } = res;
            console.log('JSAPI.onMediaDownloadingProgress', _handle, progressHandle, !!this.downloadingMap.get(progressHandle));
            if (_handle == progressHandle) {
                const listener = this.downloadingMap.get(progressHandle);
                // @ts-ignore
                listener && listener(...data);
            }
        };
        const type = Prefix + 'mediaDownloadingProgress';
        ZIMEvent.addEventListener(type, native_progress_listener);
        this.downloadingMap.set(_handle, progress);
        const methodName = 'downloadMediaFile';
        return new Promise((resolve, reject) => {
            ZIMNativeModule.callMethod({
                method: methodName,
                args: {
                    handle: this.handle.toString(),
                    message,
                    fileType,
                    progressHandle: _handle,
                },
            }, (res) => {
                ZIMEvent.removeEventListener(type, native_progress_listener);
                this.downloadingMap.delete(_handle);
                resolve(res);
            }, (err) => {
                ZIMEvent.removeEventListener(type, native_progress_listener);
                this.downloadingMap.delete(_handle);
                reject(err);
            });
        });
    }
    replyMessage(message, toOriginalMessage, config, notification) {
        const error = this.paramValid.replyMsg(message, toOriginalMessage, config, 100, 500);
        if (error)
            return Promise.reject(error);
        config = Object.assign({ hasReceipt: false }, config);
        const _handle = createSymbol();
        const messageAttachedCallBack = (notification && notification.onMessageAttached) || NOOP;
        const native_messageAttached_listener = (res) => {
            const { messageAttachedHandle, data } = res;
            console.log('JSAPI.onMessageAttached', _handle, messageAttachedHandle, !!this.messageAttachedMap.get(messageAttachedHandle));
            if (_handle == messageAttachedHandle) {
                const listener = this.messageAttachedMap.get(messageAttachedHandle);
                // @ts-ignore
                listener && listener(...data);
            }
        };
        const messageAttchedType = Prefix + 'messageAttached';
        ZIMEvent.addEventListener(messageAttchedType, native_messageAttached_listener);
        this.messageAttachedMap.set(_handle, messageAttachedCallBack);
        const mediaUploadingProgressCallBack = (notification && notification.onMediaUploadingProgress) || NOOP;
        const native_progress_listener = (res) => {
            const { progressHandle, data } = res;
            console.log('JSAPI.onMediaUploadingProgress', _handle, progressHandle, !!this.uploadingMap.get(progressHandle));
            if (_handle == progressHandle) {
                const listener = this.uploadingMap.get(progressHandle);
                // @ts-ignore
                listener && listener(...data);
            }
        };
        const progressType = Prefix + 'mediaUploadingProgress';
        ZIMEvent.addEventListener(progressType, native_progress_listener);
        this.uploadingMap.set(_handle, mediaUploadingProgressCallBack);
        const methodName = 'replyMessage';
        return new Promise((resolve, reject) => {
            const removeSendNotification = () => {
                ZIMEvent.removeEventListener(progressType, native_progress_listener);
                ZIMEvent.removeEventListener(messageAttchedType, native_messageAttached_listener);
                this.uploadingMap.delete(_handle);
                this.messageAttachedMap.delete(_handle);
            };
            ZIMNativeModule.callMethod({
                method: methodName,
                args: {
                    handle: this.handle.toString(),
                    message,
                    toOriginalMessage,
                    config,
                    messageAttachedHandle: _handle,
                    mediaUploadingProgressHandle: _handle,
                },
            }, (res) => {
                removeSendNotification();
                resolve(res);
            }, (err) => {
                removeSendNotification();
                reject(err);
            });
        });
    }
    queryMessageRepliedList(message, config) {
        const error = this.paramValid.queryMessageBase(message, config, ZIMLogAction.QueryReplyMsg);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryMessageRepliedList', { handle: this.handle.toString(), message, config });
    }
    queryMessages(messageSeqs, conversationID, conversationType) {
        const error = this.paramValid.validConvIDAndType(conversationID, conversationType, ZIMLogAction.QueryMsgs);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryMessages', { handle: this.handle.toString(), messageSeqs, conversationID, conversationType });
    }
    // MARK: - Message reaction
    addMessageReaction(reactionType, message) {
        const error = this.paramValid.messageReaction(reactionType, message, true);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('addMessageReaction', { handle: this.handle.toString(), reactionType, message });
    }
    deleteMessageReaction(reactionType, message) {
        const error = this.paramValid.messageReaction(reactionType, message);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('deleteMessageReaction', {
            handle: this.handle.toString(),
            reactionType,
            message,
        });
    }
    queryMessageReactionUserList(message, config) {
        const error = this.paramValid.queryMessageBase(message, config, ZIMLogAction.QueryReaction);
        if (error)
            return Promise.reject(error);
        if (config.count < 1 || config.nextFlag < 0) {
            const res = { totalCount: 0, nextFlag: 0, reactionType: config.reactionType, userList: [], message };
            return Promise.resolve(res);
        }
        config = Object.assign({ nextFlag: 0 }, config);
        return ZIMEngine._callMethod('queryMessageReactionUserList', {
            handle: this.handle.toString(),
            message,
            config,
        });
    }
    // MARK: - Room
    createRoom(roomInfo, config) {
        const error = this.paramValid.createRoom(ZIMLogAction.CreateRoom, roomInfo, config);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('createRoom', { handle: this.handle.toString(), roomInfo, config });
    }
    enterRoom(roomInfo, config) {
        const error = this.paramValid.createRoom(ZIMLogAction.EnterRoom, roomInfo, config);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('enterRoom', { handle: this.handle.toString(), roomInfo, config });
    }
    joinRoom(roomID) {
        const error = this.paramValid.validID('roomID', roomID, ZIMLogTag.Room, ZIMLogAction.JoinRoom);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('joinRoom', { handle: this.handle.toString(), roomID });
    }
    switchRoom(fromRoomID, toRoomInfo, isCreateWhenRoomNotExisted, config) {
        let error = this.paramValid.validID('fromRoomID', fromRoomID, ZIMLogTag.Room, ZIMLogAction.SwitchRoom) ||
            this.paramValid.createRoom(ZIMLogAction.SwitchRoom, toRoomInfo, config);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('switchRoom', { handle: this.handle.toString(), fromRoomID, toRoomInfo, isCreateWhenRoomNotExisted, config });
    }
    leaveRoom(roomID) {
        const error = this.paramValid.validID('roomID', roomID, ZIMLogTag.Room, ZIMLogAction.LeaveRoom);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('leaveRoom', { handle: this.handle.toString(), roomID });
    }
    queryRoomMemberList(roomID, config) {
        const error = this.paramValid.validCount(config, ZIMLogTag.Room, ZIMLogAction.QueryRoomMemberList, 'roomID', roomID);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryRoomMemberList', { handle: this.handle.toString(), roomID, config });
    }
    queryRoomMembers(userIDs, roomID) {
        const error = this.paramValid.validIDAndArray('roomID', roomID, 'userIDs', userIDs, ZIMLogTag.Room, ZIMLogAction.QueryRoomMembers);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryRoomMembers', { handle: this.handle.toString(), userIDs, roomID });
    }
    queryRoomOnlineMemberCount(roomID) {
        const error = this.paramValid.validID('roomID', roomID, ZIMLogTag.Room, ZIMLogAction.QueryRoomOnlineMemberCount);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryRoomOnlineMemberCount', { handle: this.handle.toString(), roomID });
    }
    queryRoomAllAttributes(roomID) {
        const error = this.paramValid.validID('roomID', roomID, ZIMLogTag.Room, ZIMLogAction.QueryRoomAllAttributes);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryRoomAllAttributes', { handle: this.handle.toString(), roomID });
    }
    setRoomAttributes(roomAttributes, roomID, config) {
        const error = this.paramValid.setRoomAttributes(roomAttributes, roomID);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('setRoomAttributes', {
            handle: this.handle.toString(),
            roomAttributes,
            roomID,
            config,
        });
    }
    deleteRoomAttributes(keys, roomID, config) {
        const error = this.paramValid.validIDAndArray('roomID', roomID, 'keys', keys, ZIMLogTag.Room, ZIMLogAction.DeleteRoomAttributes);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('deleteRoomAttributes', { handle: this.handle.toString(), keys, roomID, config });
    }
    beginRoomAttributesBatchOperation(roomID, config) {
        return ZIMEngine._callMethod('beginRoomAttributesBatchOperation', {
            handle: this.handle.toString(),
            roomID,
            config,
        });
    }
    endRoomAttributesBatchOperation(roomID) {
        const error = this.paramValid.validID('roomID', roomID, ZIMLogTag.Room, ZIMLogAction.EndRoomAttributesBatchOperation);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('endRoomAttributesBatchOperation', { handle: this.handle.toString(), roomID });
    }
    setRoomMembersAttributes(attributes, userIDs, roomID, config) {
        const error = this.paramValid.setRoomMembersAttributes(attributes, userIDs, roomID);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('setRoomMembersAttributes', {
            handle: this.handle.toString(),
            attributes,
            userIDs,
            roomID,
            config,
        });
    }
    queryRoomMembersAttributes(userIDs, roomID) {
        const error = this.paramValid.validIDAndArray('roomID', roomID, 'userIDs', userIDs, ZIMLogTag.Room, ZIMLogAction.QueryRoomMembersAttributes);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryRoomMembersAttributes', { handle: this.handle.toString(), userIDs, roomID });
    }
    queryRoomMemberAttributesList(roomID, config) {
        const error = this.paramValid.validID('roomID', roomID, ZIMLogTag.Room, ZIMLogAction.QueryRoomMemberAttributesList);
        if (error)
            return Promise.reject(error);
        if (config && config.count < 1)
            return Promise.resolve({ roomID, nextFlag: '', infos: [] });
        return ZIMEngine._callMethod('queryRoomMemberAttributesList', {
            handle: this.handle.toString(),
            roomID,
            config,
        });
    }
    leaveAllRoom() {
        return ZIMEngine._callMethod('leaveAllRoom', { handle: this.handle.toString() });
    }
    // MARK: - Group
    createGroup(groupInfo, userIDs, config) {
        groupInfo = Object.assign({ groupID: '', groupName: '', groupAvatarUrl: '' }, groupInfo);
        config = Object.assign({ groupAttributes: {}, groupNotice: '' }, config);
        const error = this.paramValid.createGroup(groupInfo, userIDs, config);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('createGroup', { handle: this.handle.toString(), groupInfo, userIDs, config });
    }
    joinGroup(isJoin, groupID, config) {
        const error = this.paramValid.validID('groupID', groupID, ZIMLogTag.Group, ZIMLogAction.JoinGroup);
        if (error)
            return Promise.reject(error);
        if (!isJoin)
            return ZIMEngine._callMethod('sendGroupJoinApplication', {
                handle: this.handle.toString(),
                groupID,
                config,
            });
        return ZIMEngine._callMethod('joinGroup', { handle: this.handle.toString(), groupID });
    }
    leaveGroup(groupID) {
        const error = this.paramValid.validID('groupID', groupID, ZIMLogTag.Group, ZIMLogAction.LeaveGroup);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('leaveGroup', { handle: this.handle.toString(), groupID });
    }
    dismissGroup(groupID) {
        const error = this.paramValid.validID('groupID', groupID, ZIMLogTag.Group, ZIMLogAction.DismissGroup);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('dismissGroup', { handle: this.handle.toString(), groupID });
    }
    queryGroupList() {
        return ZIMEngine._callMethod('queryGroupList', { handle: this.handle.toString() });
    }
    updateGroupNotice(groupNotice, groupID) {
        const error = this.paramValid.validIDAndName('groupID', groupID, 'groupNotice', groupNotice, ZIMLogTag.Group, ZIMLogAction.UpdateGroupInfo);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('updateGroupNotice', { handle: this.handle.toString(), groupNotice, groupID });
    }
    updateGroupName(groupName, groupID) {
        const error = this.paramValid.validIDAndName('groupID', groupID, 'groupName', groupName, ZIMLogTag.Group, ZIMLogAction.UpdateGroupInfo);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('updateGroupName', { handle: this.handle.toString(), groupName, groupID });
    }
    updateGroupAvatarUrl(groupAvatarUrl, groupID) {
        const error = this.paramValid.validIDAndName('groupID', groupID, 'groupAvatarUrl', groupAvatarUrl, ZIMLogTag.Group, ZIMLogAction.UpdateGroupInfo);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('updateGroupAvatarUrl', {
            handle: this.handle.toString(),
            groupAvatarUrl,
            groupID,
        });
    }
    updateGroupAlias(groupAlias, groupID) {
        const error = this.paramValid.validIDAndName('groupID', groupID, 'groupAlias', groupAlias, ZIMLogTag.Group, ZIMLogAction.UpdateGroupAlias);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('updateGroupAlias', {
            handle: this.handle.toString(),
            groupAlias,
            groupID,
        });
    }
    muteGroup(isMute, groupID, config) {
        config = Object.assign({ mode: ZIMGroupMuteMode.All, duration: -1, roles: [] }, config);
        if (!isMute) {
            config.mode = ZIMGroupMuteMode.None;
            config.duration = 0;
            config.roles = [];
        }
        const error = this.paramValid.muteGroup(groupID, config, isMute);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('muteGroup', { handle: this.handle.toString(), isMute, groupID, config });
    }
    muteGroupMembers(isMute, userIDs, groupID, config) {
        const error = this.paramValid.validIDAndArray('groupID', groupID, 'userIDs', userIDs, LogTagGroup, ZIMLogAction.MuteGroupMembers);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('muteGroupMembers', {
            handle: this.handle.toString(),
            isMute,
            userIDs,
            groupID,
            config,
        });
    }
    queryGroupInfo(groupID) {
        const error = this.paramValid.validID('groupID', groupID, ZIMLogTag.Group, ZIMLogAction.QueryGroupInfo);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryGroupInfo', { handle: this.handle.toString(), groupID });
    }
    setGroupAttributes(groupAttributes, groupID) {
        const error = this.paramValid.setGroupAttributes(groupAttributes, groupID);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('setGroupAttributes', {
            handle: this.handle.toString(),
            groupAttributes,
            groupID,
        });
    }
    deleteGroupAttributes(keys, groupID) {
        const error = this.paramValid.validIDAndArray('groupID', groupID, 'keys', keys, ZIMLogTag.Group, ZIMLogAction.DeleteGroupAttributes);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('deleteGroupAttributes', { handle: this.handle.toString(), keys, groupID });
    }
    queryGroupAttributes(keys, groupID) {
        const error = this.paramValid.queryGroupAttributes(groupID, keys);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryGroupAttributes', { handle: this.handle.toString(), keys, groupID });
    }
    queryGroupAllAttributes(groupID) {
        const error = this.paramValid.queryGroupAttributes(groupID);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryGroupAllAttributes', { handle: this.handle.toString(), groupID });
    }
    setGroupMemberNickname(nickname, forUserID, groupID) {
        const error = this.paramValid.setGroupMemberNickname(nickname, forUserID, groupID);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('setGroupMemberNickname', {
            handle: this.handle.toString(),
            nickname,
            forUserID,
            groupID,
        });
    }
    setGroupMemberRole(role, forUserID, groupID) {
        const error = this.paramValid.setGroupMemberRole(role, forUserID, groupID);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('setGroupMemberRole', {
            handle: this.handle.toString(),
            role,
            forUserID,
            groupID,
        });
    }
    transferGroupOwner(toUserID, groupID) {
        const error = this.paramValid.validTwoID('toUserID', toUserID, 'groupID', groupID, ZIMLogTag.Group, ZIMLogAction.TransferGroupOwner);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('transferGroupOwner', { handle: this.handle.toString(), toUserID, groupID });
    }
    queryGroupMemberInfo(userID, groupID) {
        const error = this.paramValid.validTwoID('userID', userID, 'groupID', groupID, ZIMLogTag.Group, ZIMLogAction.QueryGroupMemberInfo);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryGroupMemberInfo', { handle: this.handle.toString(), userID, groupID });
    }
    inviteUsersIntoGroup(isApply, userIDs, groupID, config) {
        const error = this.paramValid.validIDAndArray('groupID', groupID, 'userIDs', userIDs, ZIMLogTag.Group, isApply ? ZIMLogAction.SendGroupInviteApp : ZIMLogAction.InviteUsersIntoGroup);
        if (error)
            return Promise.reject(error);
        if (isApply)
            return ZIMEngine._callMethod('sendGroupInviteApplications', {
                handle: this.handle.toString(),
                userIDs,
                groupID,
                config,
            });
        return ZIMEngine._callMethod('inviteUsersIntoGroup', { handle: this.handle.toString(), userIDs, groupID });
    }
    kickGroupMembers(userIDs, groupID) {
        const error = this.paramValid.validIDAndArray('groupID', groupID, 'userIDs', userIDs, ZIMLogTag.Group, ZIMLogAction.KickGroupMembers);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('kickGroupMembers', { handle: this.handle.toString(), userIDs, groupID });
    }
    queryGroupMemberList(groupID, config) {
        config = Object.assign({ count: 100, nextFlag: 0 }, config);
        const error = this.paramValid.validID('groupID', groupID, ZIMLogTag.Group, ZIMLogAction.QueryGroupMemberList);
        if (error)
            return Promise.reject(error);
        if (config.count < 1)
            return Promise.resolve({ groupID, userList: [], nextFlag: config.nextFlag });
        return ZIMEngine._callMethod('queryGroupMemberList', { handle: this.handle.toString(), groupID, config });
    }
    queryGroupMemberCount(groupID) {
        const error = this.paramValid.validID('groupID', groupID, ZIMLogTag.Group, ZIMLogAction.QueryGroupMemberCount);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryGroupMemberCount', { handle: this.handle.toString(), groupID });
    }
    acceptGroupApply(isJoin, userID, groupID, config) {
        const error = this.paramValid.validTwoID('userID', userID, 'groupID', groupID, LogTagGroup, 'API.acceptGroupApplication');
        if (error)
            return Promise.reject(error);
        if (isJoin)
            return ZIMEngine._callMethod('acceptGroupJoinApplication', {
                handle: this.handle.toString(),
                userID,
                groupID,
                config,
            });
        return ZIMEngine._callMethod('acceptGroupInviteApplication', {
            handle: this.handle.toString(),
            userID,
            groupID,
            config,
        });
    }
    rejectGroupApply(isJoin, userID, groupID, config) {
        const error = this.paramValid.validTwoID('userID', userID, 'groupID', groupID, LogTagGroup, 'API.rejectGroupApplication');
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('rejectGroupJoinApplication', {
            handle: this.handle.toString(),
            isJoin,
            userID,
            groupID,
            config,
        });
    }
    queryGroupApplyList(config) {
        config = Object.assign({ count: 100, nextFlag: 0 }, config);
        const error = this.paramValid.validCount(config, LogTagGroup, ZIMLogAction.QueryGroupApp);
        if (error)
            return Promise.reject(error);
        if (config.count < 1)
            return Promise.resolve({ applicationList: [], nextFlag: config.nextFlag });
        return ZIMEngine._callMethod('queryGroupApplicationList', { handle: this.handle.toString(), config });
    }
    updateGroupVerifyMode(mode, groupID, type) {
        const error = this.paramValid.updateGroupVerifyMode(mode, groupID, type);
        if (error)
            return Promise.reject(error);
        if (type == ZIMGroupVerifyType.Join) {
            return ZIMEngine._callMethod('updateGroupJoinMode', { handle: this.handle.toString(), mode, groupID });
        }
        else if (type == ZIMGroupVerifyType.BeInvite) {
            return ZIMEngine._callMethod('updateGroupInviteMode', { handle: this.handle.toString(), mode, groupID });
        }
        else {
            return ZIMEngine._callMethod('updateGroupBeInviteMode', { handle: this.handle.toString(), mode, groupID });
        }
    }
    // MARK: - Call
    callInvite(invitees, config) {
        const error = this.paramValid.callInvite(invitees, config);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('callInvite', { handle: this.handle.toString(), invitees, config });
    }
    callCancel(invitees, callID, config) {
        const error = this.paramValid.validCallID(callID, ZIMLogAction.CallCancel);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('callCancel', { handle: this.handle.toString(), invitees, callID, config });
    }
    callAccept(callID, config) {
        const error = this.paramValid.validID('callID', callID, ZIMLogTag.Call, ZIMLogAction.CallAccept);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('callAccept', { handle: this.handle.toString(), callID, config });
    }
    callReject(callID, config) {
        const error = this.paramValid.validID('callID', callID, ZIMLogTag.Call, ZIMLogAction.CallReject);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('callReject', { handle: this.handle.toString(), callID, config });
    }
    callQuit(callID, config) {
        const error = this.paramValid.validID('callID', callID, ZIMLogTag.Call, ZIMLogAction.CallQuit);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('callQuit', { handle: this.handle.toString(), callID, config });
    }
    callEnd(callID, config) {
        const error = this.paramValid.validID('callID', callID, ZIMLogTag.Call, ZIMLogAction.CallEnd);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('callEnd', { handle: this.handle.toString(), callID, config });
    }
    callJoin(callID, config) {
        const error = this.paramValid.validID('callID', callID, ZIMLogTag.Call, ZIMLogAction.CallJoin);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('callJoin', { handle: this.handle.toString(), callID, config });
    }
    callingInvite(invitees, callID, config) {
        const error = this.paramValid.validIDAndArray('callID', callID, 'invitees', invitees, ZIMLogTag.Call, ZIMLogAction.CallingInvite);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('callingInvite', { handle: this.handle.toString(), invitees, callID, config });
    }
    queryCallInvitationList(config) {
        return ZIMEngine._callMethod('queryCallInvitationList', { handle: this.handle.toString(), config });
    }
    // MARK: - DB Search
    searchLocalConversations(config) {
        const error = this.paramValid.searchConversations(config);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('searchLocalConversations', { handle: this.handle.toString(), config });
    }
    searchGlobalLocalMessages(config) {
        const error = this.paramValid.searchMessages(config, ZIMLogAction.SearchGlobalMessages);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('searchGlobalLocalMessages', { handle: this.handle.toString(), config });
    }
    searchLocalMessages(conversationID, conversationType, config) {
        const error = this.paramValid.validConvIDAndType(conversationID, conversationType, ZIMLogAction.SearchMessages) ||
            this.paramValid.searchMessages(config, ZIMLogAction.SearchMessages);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('searchLocalMessages', {
            handle: this.handle.toString(),
            conversationID,
            conversationType,
            config,
        });
    }
    searchLocalGroups(config) {
        const error = this.paramValid.searchBase(config, ZIMLogAction.SearchGroups);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('searchLocalGroups', { handle: this.handle.toString(), config });
    }
    searchLocalGroupMembers(groupID, config) {
        const error = this.paramValid.validID('groupID', groupID, ZIMLogTag.Database, ZIMLogAction.SearchGroupMembers) ||
            this.paramValid.searchBase(config, ZIMLogAction.SearchGroupMembers);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('searchLocalGroupMembers', { handle: this.handle.toString(), groupID, config });
    }
    // MARK: - Friend
    addFriend(userID, config) {
        const error = this.paramValid.addFriend(userID, config);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('addFriend', { handle: this.handle.toString(), userID, config });
    }
    sendFriendApplication(userID, config) {
        const error = this.paramValid.addFriend(userID, config);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('sendFriendApplication', { handle: this.handle.toString(), userID, config });
    }
    deleteFriends(userIDs, config) {
        const error = this.paramValid.validArray('userIDs', userIDs, LogTagFriend, ZIMLogAction.DeleteFriends);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('deleteFriends', { handle: this.handle.toString(), userIDs, config });
    }
    checkFriendsRelation(userIDs, config) {
        const error = this.paramValid.validArray('userIDs', userIDs, LogTagFriend, ZIMLogAction.CheckFriends);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('checkFriendsRelation', { handle: this.handle.toString(), userIDs, config });
    }
    updateFriendAlias(friendAlias, userID) {
        const error = this.paramValid.updateFriendAlias(friendAlias, userID);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('updateFriendAlias', { handle: this.handle.toString(), friendAlias, userID });
    }
    updateFriendAttributes(friendAttributes, userID) {
        const error = this.paramValid.updateFriendAttributes(friendAttributes, userID);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('updateFriendAttributes', {
            handle: this.handle.toString(),
            friendAttributes,
            userID,
        });
    }
    acceptFriendApplication(userID, config) {
        const error = this.paramValid.acceptFriendApplication(userID, config);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('acceptFriendApplication', { handle: this.handle.toString(), userID, config });
    }
    rejectFriendApplication(userID, config) {
        return ZIMEngine._callMethod('rejectFriendApplication', { handle: this.handle.toString(), userID, config });
    }
    queryFriendsInfo(userIDs) {
        const error = this.paramValid.validArray('userIDs', userIDs, LogTagFriend, ZIMLogAction.QueryFriendsInfo, 20);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryFriendsInfo', { handle: this.handle.toString(), userIDs });
    }
    queryFriendList(config) {
        const error = this.paramValid.validCount(config, LogTagFriend, ZIMLogAction.QueryFriendList);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryFriendList', { handle: this.handle.toString(), config });
    }
    queryFriendApplicationList(config) {
        const error = this.paramValid.validCount(config, LogTagFriend, ZIMLogAction.QueryFriendAppList);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryFriendApplicationList', { handle: this.handle.toString(), config });
    }
    searchLocalFriends(config) {
        return ZIMEngine._callMethod('searchLocalFriends', { handle: this.handle.toString(), config });
    }
    // MARK: - Blacklist
    addUsersToBlacklist(userIDs) {
        const error = this.paramValid.validArray('userIDs', userIDs, LogTagFriend, ZIMLogAction.AddUserToBlacklist);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('addUsersToBlacklist', { handle: this.handle.toString(), userIDs });
    }
    removeUsersFromBlacklist(userIDs) {
        const error = this.paramValid.validArray('userIDs', userIDs, LogTagFriend, ZIMLogAction.RemoveUsersFromBlacklist);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('removeUsersFromBlacklist', { handle: this.handle.toString(), userIDs });
    }
    checkUserIsInBlacklist(userID) {
        const error = this.paramValid.validID('userID', userID, LogTagFriend, ZIMLogAction.CheckUserIsInBlacklist);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('checkUserIsInBlacklist', { handle: this.handle.toString(), userID });
    }
    queryBlacklist(config) {
        const error = this.paramValid.validCount(config, LogTagFriend, ZIMLogAction.QueryBlacklist);
        if (error)
            return Promise.reject(error);
        return ZIMEngine._callMethod('queryBlacklist', { handle: this.handle.toString(), config });
    }
    // Mark - local
    exportLocalMessages(folderPath, config, progress) {
        const _handle = createSymbol();
        const progressCallBack = progress || NOOP;
        const native_progress_listener = (res) => {
            const { progressHandle, data } = res;
            console.log('JSAPI.onMessageExportingProgress', _handle, progressHandle, !!this.messageExportingMap.get(progressHandle));
            if (_handle == progressHandle) {
                const listener = this.messageExportingMap.get(progressHandle);
                // @ts-ignore
                listener && listener(...data);
            }
        };
        const type = Prefix + 'messageExportingProgress';
        ZIMEvent.addEventListener(type, native_progress_listener);
        this.messageExportingMap.set(_handle, progressCallBack);
        return new Promise((resolve, reject) => {
            const removeZIMEventListener = () => {
                ZIMEvent.removeEventListener(type, native_progress_listener);
                this.messageExportingMap.delete(_handle);
            };
            ZIMNativeModule.callMethod({
                method: 'exportLocalMessages',
                args: {
                    handle: this.handle.toString(),
                    folderPath,
                    config,
                    progressHandle: _handle,
                },
            }, (res) => {
                removeZIMEventListener();
                resolve(res);
            }, (err) => {
                removeZIMEventListener();
                reject(err);
            });
        });
    }
    importLocalMessages(folderPath, config, progress) {
        const _handle = createSymbol();
        const progressCallBack = progress || NOOP;
        const native_progress_listener = (res) => {
            const { progressHandle, data } = res;
            console.log('JSAPI.onMessageImportingProgress', _handle, progressHandle, !!this.messageExportingMap.get(progressHandle));
            if (_handle == progressHandle) {
                const listener = this.messageExportingMap.get(progressHandle);
                // @ts-ignore
                listener && listener(...data);
            }
        };
        const type = Prefix + 'messageImportingProgress';
        ZIMEvent.addEventListener(type, native_progress_listener);
        this.messageExportingMap.set(_handle, progressCallBack);
        return new Promise((resolve, reject) => {
            const removeZIMEventListener = () => {
                ZIMEvent.removeEventListener(type, native_progress_listener);
                this.messageExportingMap.delete(_handle);
            };
            ZIMNativeModule.callMethod({
                method: 'importLocalMessages',
                args: {
                    handle: this.handle.toString(),
                    folderPath,
                    config,
                    progressHandle: _handle,
                },
            }, (res) => {
                removeZIMEventListener();
                resolve(res);
            }, (err) => {
                removeZIMEventListener();
                reject(err);
            });
        });
    }
    queryLocalFileCache(config) {
        return ZIMEngine._callMethod('queryLocalFileCache', { handle: this.handle.toString(), config });
    }
    clearLocalFileCache(config) {
        return ZIMEngine._callMethod('clearLocalFileCache', { handle: this.handle.toString(), config });
    }
}
