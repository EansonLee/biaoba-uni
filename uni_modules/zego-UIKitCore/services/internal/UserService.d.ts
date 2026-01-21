import { ZegoMeRemovedFromRoomListener, ZegoOnlySelfInRoomListener, ZegoUIKitUser, ZegoUserCountOrPropertyChangedListener, ZegoUserUpdateListener } from '../defines';
import { UIKitCoreUser } from './UIKitCoreUser';
export default class UserService {
    private userUpdateListeners;
    private onlySelfListeners;
    private roomUserCountOrPropertyChangedListeners;
    private kickOutListenerNotifyList;
    addUserUpdateListener(listenerID: string, listener: ZegoUserUpdateListener): void;
    removeUserUpdateListener(listenerID: string): void;
    addOnOnlySelfInRoomListener(listenerID: string, listener: ZegoOnlySelfInRoomListener): void;
    removeOnOnlySelfInRoomListener(listenerID: string): void;
    clear(): void;
    notifyUserJoin(userInfoList: UIKitCoreUser[]): void;
    notifyUserLeave(userInfoList: UIKitCoreUser[]): void;
    notifyOnlySelfInRoom(): void;
    addUserCountOrPropertyChangedListener(listenerID: string, listener: ZegoUserCountOrPropertyChangedListener): void;
    removeUserCountOrPropertyChangedListener(listenerID: string): void;
    notifyRoomUserCountOrPropertyChanged(userList: ZegoUIKitUser[]): void;
    addOnMeRemovedFromRoomListener(listenerID: string, listener: ZegoMeRemovedFromRoomListener): void;
    removeOnMeRemovedFromRoomListener(listenerID: string): void;
    notifyRemovedFromRoomCommand(): void;
}
