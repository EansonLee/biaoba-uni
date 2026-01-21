import { NotifyList } from './NotifyList';
export default class UserService {
    userUpdateListeners = new NotifyList();
    onlySelfListeners = new NotifyList();
    roomUserCountOrPropertyChangedListeners = new NotifyList();
    kickOutListenerNotifyList = new NotifyList();
    addUserUpdateListener(listenerID, listener) {
        this.userUpdateListeners.addListener(listenerID, listener);
    }
    removeUserUpdateListener(listenerID) {
        this.userUpdateListeners.removeListener(listenerID);
    }
    addOnOnlySelfInRoomListener(listenerID, listener) {
        this.onlySelfListeners.addListener(listenerID, listener);
    }
    removeOnOnlySelfInRoomListener(listenerID) {
        this.onlySelfListeners.removeListener(listenerID);
    }
    clear() {
        this.userUpdateListeners.clear();
        this.onlySelfListeners.clear();
        this.roomUserCountOrPropertyChangedListeners.clear();
        this.kickOutListenerNotifyList.clear();
    }
    notifyUserJoin(userInfoList) {
        const zegoUsers = userInfoList.map(user => user.getUIKitUser());
        this.userUpdateListeners.notifyAllListener(listener => listener.onUserJoined?.(zegoUsers));
    }
    notifyUserLeave(userInfoList) {
        const zegoUsers = userInfoList.map(user => user.getUIKitUser());
        this.userUpdateListeners.notifyAllListener(listener => listener.onUserLeft?.(zegoUsers));
    }
    notifyOnlySelfInRoom() {
        this.onlySelfListeners.notifyAllListener(listener => listener.onOnlySelf?.());
    }
    addUserCountOrPropertyChangedListener(listenerID, listener) {
        this.roomUserCountOrPropertyChangedListeners.addListener(listenerID, listener);
    }
    removeUserCountOrPropertyChangedListener(listenerID) {
        this.roomUserCountOrPropertyChangedListeners.removeListener(listenerID);
    }
    notifyRoomUserCountOrPropertyChanged(userList) {
        this.roomUserCountOrPropertyChangedListeners.notifyAllListener(listener => listener.onUserCountOrPropertyChanged?.(userList));
    }
    addOnMeRemovedFromRoomListener(listenerID, listener) {
        this.kickOutListenerNotifyList.addListener(listenerID, listener);
    }
    removeOnMeRemovedFromRoomListener(listenerID) {
        this.kickOutListenerNotifyList.removeListener(listenerID);
    }
    notifyRemovedFromRoomCommand() {
        this.kickOutListenerNotifyList.notifyAllListener(listener => listener.onSelfRemoved?.());
    }
}
