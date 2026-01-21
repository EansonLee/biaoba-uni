import { NotifyList } from '../internal/NotifyList';
const TAG = '[UIKitSignalingService]';
// 这个类主要是通知类，用于通知邀请相关的事件
export class UIKitSignalingService {
    invitationListenerList = new NotifyList();
    roomPropertyUpdateListenerList = new NotifyList();
    usersInRoomAttributesUpdateListenerList = new NotifyList();
    inRoomTextMessageListenerNotifyList = new NotifyList();
    inRoomCommandMessageListenerNotifyList = new NotifyList();
    connectionStateChangeListenerNotifyList = new NotifyList();
    notifyCallInvitationReceived(inviter, type, data) {
        this.invitationListenerList.notifyAllListener((invitationListener) => {
            invitationListener.onInvitationReceived?.(inviter, type, data);
        });
    }
    notifyCallInvitationCancelled(inviter, data) {
        this.invitationListenerList.notifyAllListener((invitationListener) => {
            invitationListener.onInvitationCanceled?.(inviter, data);
        });
    }
    notifyCallInvitationAccepted(invitee, data) {
        this.invitationListenerList.notifyAllListener((invitationListener) => {
            invitationListener.onInvitationAccepted?.(invitee, data);
        });
    }
    notifyCallInvitationRejected(invitee, data) {
        // zlogerror(TAG, `this.invitationListenerList.length: ${this.invitationListenerList.length}`)
        this.invitationListenerList.notifyAllListener((invitationListener) => {
            invitationListener.onInvitationRefused?.(invitee, data);
        });
    }
    notifyCallInvitationTimeout(inviter, data) {
        this.invitationListenerList.notifyAllListener((invitationListener) => {
            invitationListener.onInvitationTimeout?.(inviter, data);
        });
    }
    notifyCallInviteesAnsweredTimeout(users, data) {
        this.invitationListenerList.notifyAllListener((invitationListener) => {
            invitationListener.onInvitationResponseTimeout?.(users, data);
        });
    }
    notifyCallingInvitationSend(invitees, data) {
        this.invitationListenerList.notifyAllListener((invitationListener) => {
            invitationListener.onCallingInvitationSend?.(invitees, data);
        });
    }
    notifyCancelInvitaion(invitees, data) {
        this.invitationListenerList.notifyAllListener((invitationListener) => {
            invitationListener.onCancelInvitaion?.(invitees, data);
        });
    }
    notifyRoomPropertyUpdated(key, oldValue, newValue) {
        this.roomPropertyUpdateListenerList.notifyAllListener((listener) => {
            listener.onRoomPropertyUpdated(key, oldValue, newValue);
        });
    }
    notifyRoomPropertyFullUpdated(updateKeys, oldRoomAttributes, roomAttributes) {
        this.roomPropertyUpdateListenerList.notifyAllListener((listener) => {
            listener.onRoomPropertiesFullUpdated(updateKeys, oldRoomAttributes, roomAttributes);
        });
    }
    notifyUsersInRoomAttributesUpdated(updateKeys, oldAttributes, attributes, editor) {
        this.usersInRoomAttributesUpdateListenerList.notifyAllListener((listener) => {
            listener.onUsersInRoomAttributesUpdated(updateKeys, oldAttributes, attributes, editor);
        });
    }
    addRoomPropertyUpdateListener(listenerID, listener) {
        this.roomPropertyUpdateListenerList.addListener(listenerID, listener);
    }
    removeRoomPropertyUpdateListener(listenerID) {
        this.roomPropertyUpdateListenerList.removeListener(listenerID);
    }
    addUsersInRoomAttributesUpdateListener(listenerID, listener) {
        this.usersInRoomAttributesUpdateListenerList.addListener(listenerID, listener);
    }
    removeUsersInRoomAttributesUpdateListener(listenerID) {
        this.usersInRoomAttributesUpdateListenerList.removeListener(listenerID);
    }
    addInvitationListener(listenerID, listener) {
        // zlogerror(TAG, `addInvitationListener listenerID: ${listenerID}`)
        this.invitationListenerList.addListener(listenerID, listener);
    }
    removeInvitationListener(listenerID) {
        this.invitationListenerList.removeListener(listenerID);
    }
    clear() {
        this.invitationListenerList.clear();
        this.removeRoomListeners();
    }
    removeRoomListeners() {
        this.usersInRoomAttributesUpdateListenerList.clear();
        this.roomPropertyUpdateListenerList.clear();
        this.inRoomTextMessageListenerNotifyList.clear();
        this.connectionStateChangeListenerNotifyList.clear();
        this.inRoomCommandMessageListenerNotifyList.clear();
    }
    addInRoomTextMessageListener(listenerID, listener) {
        this.inRoomTextMessageListenerNotifyList.addListener(listenerID, listener);
    }
    removeInRoomTextMessageListener(listenerID) {
        this.inRoomTextMessageListenerNotifyList.removeListener(listenerID);
    }
    addInRoomCommandMessageListener(listenerID, listener) {
        this.inRoomCommandMessageListenerNotifyList.addListener(listenerID, listener);
    }
    removeInRoomCommandMessageListener(listenerID) {
        this.inRoomCommandMessageListenerNotifyList.removeListener(listenerID);
    }
    notifyInRoomTextMessageReceived(messages, roomID) {
        this.inRoomTextMessageListenerNotifyList.notifyAllListener((listener) => {
            listener.onInRoomTextMessageReceived(messages, roomID);
        });
    }
    addConnectionStateChangeListener(listenerID, listener) {
        this.connectionStateChangeListenerNotifyList.addListener(listenerID, listener);
    }
    removeConnectionStateChangeListener(listenerID) {
        this.connectionStateChangeListenerNotifyList.removeListener(listenerID);
    }
    notifyConnectionStateChange(connectionState) {
        this.connectionStateChangeListenerNotifyList.notifyAllListener((listener) => {
            listener.onConnectionStateChanged(connectionState);
        });
    }
    onInRoomCommandMessageReceived(messages, roomID) {
        this.inRoomCommandMessageListenerNotifyList.notifyAllListener((listener) => {
            listener.onInRoomCommandMessageReceived(messages, roomID);
        });
    }
}
