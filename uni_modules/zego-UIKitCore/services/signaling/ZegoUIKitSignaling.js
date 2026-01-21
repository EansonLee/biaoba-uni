import { ZIMCallInvitationMode } from "../../plugins/signaling/ZIMUniApp";
import { ZegoPluginAdapter, ZegoSignalingConnectionState } from "../../plugins";
import { ZegoUIKitUser } from "../../services/defines";
import { deepClone, deleteSingletonInstance, getAppState, getSingletonInstance, makeCallID, makeListenerID, makeTag, SingletonScope, UIKitReport, zlogerror, zloginfo, zlogwarning } from "../../utils";
import UIKitCore from "../internal/UIKitCore";
import { UIKitSignalingService } from "./UIKitSignalingService";
import { CallInvitationRejectReason, ZegoInvitationType, ZegoUIKitInvitationState } from "./defines";
import TextUtils from "../../utils/TextUtils";
import { isBoolean } from "../../utils/types";
const TAG = makeTag('ZegoUIKitSignaling');
// 这是对于 Signaling 插件的业务封装类
export class ZegoUIKitSignaling {
    static name = '_ZegoUIKitSignaling';
    signalingPlugin = ZegoPluginAdapter.signalingPlugin();
    signalingService = new UIKitSignalingService();
    usersInRoomAttributes = [];
    oldUsersInRoomAttributes = [];
    roomAttributes = {};
    currentSignalUser;
    isInLoginProcess = false;
    currentRoomID;
    currentInvitationID = '';
    signalConnectionState = ZegoSignalingConnectionState.Disconnected;
    listenerID = '';
    invitationMap = {};
    callingConfig = {
        canInvitingInCalling: false,
        onlyInitiatorCanInvite: false,
        endCallWhenInitiatorLeave: false,
    };
    static getInstance() {
        // ZIM 要做成全局的
        return getSingletonInstance(ZegoUIKitSignaling, SingletonScope.Global);
    }
    static destroy() {
        deleteSingletonInstance(ZegoUIKitSignaling, SingletonScope.Global);
    }
    getInvitee(invitationID, userID) {
        const invitationData = this.getInvitationByID(invitationID);
        // zloginfo(TAG, 'getInvitee', invitationData)
        if (!invitationData) {
            return null;
        }
        const invitees = invitationData.invitees.reverse();
        for (const invitee of invitees) {
            // zlogerror(TAG, 'getInvitee', invitee.user.userID, userID)
            if (invitee.user.userID === userID) {
                return invitee;
            }
        }
        return null;
    }
    addInvitationData(invitationData) {
        this.invitationMap[invitationData.invitationID] = invitationData;
    }
    getInvitationByID(invitationID) {
        return this.invitationMap[invitationID];
    }
    getInvitationByInvitee(inviteeID) {
        for (const invitationData of Object.values(this.invitationMap)) {
            const invitation = invitationData.invitees.find((invitee) => invitee.user.userID === inviteeID);
            if (invitation) {
                return invitation;
            }
        }
    }
    getInvitationByInviter(inviterID) {
        for (const invitationData of Object.values(this.invitationMap)) {
            if (invitationData.inviter.userID === inviterID) {
                return invitationData;
            }
        }
    }
    removeInvitationData(invitationID) {
        if (this.invitationMap[invitationID]) {
            const data = this.invitationMap[invitationID];
            delete this.invitationMap[invitationID];
            return data;
        }
        return null;
    }
    removeIfAllChecked(invitationID) {
        const invitationData = this.getInvitationByID(invitationID);
        if (!invitationData) {
            return;
        }
        const allChecked = invitationData.invitees.every(invitee => ![ZegoUIKitInvitationState.Waiting, ZegoUIKitInvitationState.Accept].includes(invitee.state));
        if (allChecked) {
            zlogwarning(TAG, 'removeIfAllChecked', invitationID);
            this.removeInvitationData(invitationID);
            this.currentInvitationID === invitationID && (this.currentInvitationID = '');
        }
        return invitationData;
    }
    getAllWaitingInviteesByID(invitationID) {
        const invitationData = this.getInvitationByID(invitationID);
        if (!invitationData) {
            return [];
        }
        return invitationData.invitees.filter(invitee => invitee.state === ZegoUIKitInvitationState.Waiting);
    }
    login(userID, userName, callback) {
        zloginfo(TAG, 'login', userID, userName);
        if (this.currentSignalUser && this.currentSignalUser.userID !== userID) {
            this.signalingPlugin.disconnectUser();
        }
        this.currentSignalUser = new ZegoUIKitUser(userID, userName);
        if (!this.isInLoginProcess) {
            this.isInLoginProcess = true;
            this.signalingPlugin.connectUser(userID, userName).then(() => {
                zloginfo(TAG, `login:${userID} success`);
                this.isInLoginProcess = false;
                if (callback) {
                    callback(0, '');
                }
                UIKitReport.reportEvent('zim/login', {
                    user_id: userID,
                    user_name: userName,
                    error: 0,
                    msg: '',
                });
            }).catch((error) => {
                zlogerror(TAG, `login failed: ${error.code} ${error.message}`);
                this.isInLoginProcess = false;
                this.currentSignalUser = null;
                const code = error.code ?? -1;
                const msg = error.message ?? '';
                if (callback) {
                    callback(code, msg);
                }
                UIKitReport.reportEvent('zim/login', {
                    user_id: userID,
                    user_name: userName,
                    error: code,
                    msg: msg,
                });
            });
        }
    }
    joinRoom(roomID, callback) {
        this.signalingPlugin.joinRoom(roomID, '').then(() => {
            this.currentRoomID = roomID;
            if (callback) {
                callback(0, '');
            }
            UIKitReport.reportEvent('zim/joinRoom', {
                room_id: roomID,
                room_name: '',
                error: 0,
                msg: '',
            });
        }).catch((error) => {
            const code = error.code ?? -1;
            const msg = error.message ?? '';
            if (callback) {
                callback(code, msg);
            }
            UIKitReport.reportEvent('zim/joinRoom', {
                room_id: roomID,
                room_name: '',
                error: code,
                msg: msg,
            });
        });
    }
    leaveRoom(callback) {
        const roomID = this.currentRoomID;
        if (roomID) {
            this.signalingPlugin.leaveRoom(roomID).then(() => {
                if (callback) {
                    callback(0, '');
                }
                UIKitReport.reportEvent('zim/leaveRoom', {
                    room_id: roomID,
                    error: 0,
                    msg: '',
                });
            }).catch((error) => {
                const code = error.code ?? -1;
                const msg = error.message ?? '';
                if (callback) {
                    callback(code, msg);
                }
                UIKitReport.reportEvent('zim/leaveRoom', {
                    room_id: roomID,
                    error: code,
                    msg: msg,
                });
            });
            this.removeRoomListenersAndData();
        }
    }
    unInit() {
        this.signalingPlugin.destroy();
    }
    removeRoomListenersAndData() {
        this.signalingService.removeRoomListeners();
        this.roomAttributes = {};
        this.usersInRoomAttributes = [];
    }
    setUsersInRoomAttributes(key, value, userIDs, callback) {
        const attributes = { [key]: value };
        this.signalingPlugin.setUsersInRoomAttributes(attributes, userIDs, this.currentRoomID).then(({ attributesMap }) => {
            this.oldUsersInRoomAttributes = [...this.usersInRoomAttributes];
            this.usersInRoomAttributes = this.usersInRoomAttributes.map(user => {
                const updatedAttributes = attributesMap[user.userID];
                if (updatedAttributes) {
                    return { ...user, attributes: { ...user.attributes, ...updatedAttributes } };
                }
                return user;
            });
            UIKitCore.getInstance().dispatchRoomUserCountOrPropertyChanged(UIKitCore.getInstance().getAllUsers());
            if (callback) {
                callback(0, '');
            }
        }).catch((error) => {
            if (callback) {
                callback(error.code, error.message);
            }
        });
    }
    // private removeUsersInRoomAttributesForKey(info: ZegoUserInRoomAttributesInfo, key: string) {
    //     for (let i = 0; i < this.usersInRoomAttributes.length; i++) {
    //         const userInRoomAttributesInfo = this.usersInRoomAttributes[i];
    //         if (info.userID === userInRoomAttributesInfo.userID) {
    //             delete userInRoomAttributesInfo.attributes[key]
    //             break;
    //         }
    //     }
    // }
    // private updateUsersInRoomAttributesForKey(info: ZegoUserInRoomAttributesInfo, key: string, value: string) {
    //     let needAddData = true;
    //     for (let i = 0; i < this.usersInRoomAttributes.length; i++) {
    //         const userInRoomAttributesInfo = this.usersInRoomAttributes[i];
    //         if (info.userID === userInRoomAttributesInfo.userID) {
    //             needAddData = false;
    //             userInRoomAttributesInfo.attributes[key] = value
    //         }
    //     }
    //     if (needAddData) {
    //         this.usersInRoomAttributes.push(info);
    //     }
    // }
    // private insertOrUpdateUsersInRoomAttributes(infos: ZegoUserInRoomAttributesInfo[]) {
    //     if (!infos || infos.length === 0) {
    //         return;
    //     }
    //     if (!this.usersInRoomAttributes || this.usersInRoomAttributes.length === 0) {
    //         this.usersInRoomAttributes.push(...infos);
    //         return;
    //     }
    //     for (const newUserInRoomAttributesInfo of infos) {
    //         let needAddData = true;
    //         for (let i = 0; i < this.usersInRoomAttributes.length; i++) {
    //             const oldUserInRoomAttributesInfo = this.usersInRoomAttributes[i];
    //             if (newUserInRoomAttributesInfo.userID === oldUserInRoomAttributesInfo.userID) {
    //                 this.usersInRoomAttributes[i] = newUserInRoomAttributesInfo;
    //                 needAddData = false;
    //             }
    //         }
    //         if (needAddData) {
    //             this.usersInRoomAttributes.push(newUserInRoomAttributesInfo);
    //         }
    //     }
    // }
    async queryUsersInRoomAttributes(count, nextFlag) {
        return this.signalingPlugin.queryUsersInRoomAttributes(this.currentRoomID, count, nextFlag).then(({ attributesMap, nextFlag }) => {
            // attributesMap 的 key 是 userID, value是attributes, 转成 ZegoUserInRoomAttributesInfo 数组
            const infos = Object.entries(attributesMap).map(([userID, attributes]) => {
                return { userID, attributes };
            });
            this.updateCoreUserAndNotifyChanges(infos);
            this.onUsersInRoomAttributesUpdated(attributesMap, "", this.currentRoomID);
            return Promise.resolve({ infos, nextFlag });
        }).catch((error) => {
            return Promise.reject({ code: error.code, message: error.message });
        });
    }
    async updateRoomProperty(attributes, isDeleteAfterOwnerLeft, isForce, isUpdateOwner) {
        return this.signalingPlugin.updateRoomProperty(attributes, this.currentRoomID, isForce, isDeleteAfterOwnerLeft, isUpdateOwner)
            .then(({ errorKeys }) => {
            return Promise.resolve({ errorKeys });
        }).catch((error) => {
            return Promise.reject({ code: error.code, message: error.message });
        });
    }
    async deleteRoomProperties(keys, isForce) {
        return this.signalingPlugin.deleteRoomProperties(keys, this.currentRoomID, isForce)
            .then(({ errorKeys }) => {
            return Promise.resolve({ errorKeys });
        }).catch((error) => {
            return Promise.reject({ code: error.code, message: error.message });
        });
    }
    beginRoomPropertiesBatchOperation(isDeleteAfterOwnerLeft, isForce, isUpdateOwner) {
        this.signalingPlugin.beginRoomPropertiesBatchOperation(this.currentRoomID, isDeleteAfterOwnerLeft, isForce, isUpdateOwner);
    }
    async endRoomPropertiesBatchOperation() {
        return this.signalingPlugin.endRoomPropertiesBatchOperation(this.currentRoomID)
            .then(() => {
            return Promise.resolve();
        }).catch((error) => {
            return Promise.reject({ code: error.code, message: error.message });
        });
    }
    async queryRoomProperties() {
        return this.signalingPlugin.queryRoomProperties(this.currentRoomID)
            .then(({ roomAttributes }) => {
            this.roomAttributes = { ...roomAttributes };
            return Promise.resolve({ roomAttributes });
        }).catch((error) => {
            return Promise.reject({ code: error.code, message: error.message });
        });
    }
    getRoomProperties() {
        return this.roomAttributes;
    }
    updateCoreUserAndNotifyChanges(infos) {
        if (!infos || infos.length === 0) {
            return;
        }
        let shouldNotifyChange = false;
        for (const info of infos) {
            const uiKitUser = UIKitCore.getInstance().getUserByUserID(info.userID);
            if (uiKitUser !== null) {
                const attributes = info.attributes;
                const userAttributes = uiKitUser.attributes;
                if (!userAttributes) {
                    shouldNotifyChange = true;
                    uiKitUser.attributes = attributes;
                }
                else {
                    for (const [newKey, newValue] of Object.entries(attributes)) {
                        let isUpdate = false;
                        for (const [oldKey, oldValue] of Object.entries(userAttributes)) {
                            if (oldKey === newKey) {
                                isUpdate = true;
                                shouldNotifyChange = true;
                                uiKitUser.attributes[oldKey] = newValue;
                            }
                        }
                        if (!isUpdate) {
                            shouldNotifyChange = true;
                            uiKitUser.attributes[newKey] = newValue;
                        }
                    }
                }
            }
        }
        if (shouldNotifyChange) {
            UIKitCore.getInstance().dispatchRoomUserCountOrPropertyChanged(UIKitCore.getInstance().getAllUsers());
        }
    }
    getIndexFromUsersInRoomAttributes(userID) {
        let index = -1;
        for (let i = 0; i < this.usersInRoomAttributes.length; i++) {
            const info = this.usersInRoomAttributes[i];
            if (userID === info.userID) {
                index = i;
            }
        }
        return index;
    }
    addRoomPropertyUpdateListener(listenerID, listener) {
        this.signalingService.addRoomPropertyUpdateListener(listenerID, listener);
    }
    removeRoomPropertyUpdateListener(listenerID) {
        this.signalingService.removeRoomPropertyUpdateListener(listenerID);
    }
    addUsersInRoomAttributesUpdateListener(listenerID, listener) {
        this.signalingService.addUsersInRoomAttributesUpdateListener(listenerID, listener);
    }
    removeUsersInRoomAttributesUpdateListener(listenerID) {
        this.signalingService.removeUsersInRoomAttributesUpdateListener(listenerID);
    }
    addInRoomTextMessageListener(listenerID, listener) {
        this.signalingService.addInRoomTextMessageListener(listenerID, listener);
    }
    removeInRoomTextMessageListener(listenerID) {
        this.signalingService.removeInRoomTextMessageListener(listenerID);
    }
    addInRoomCommandMessageListener(listenerID, listener) {
        this.signalingService.addInRoomCommandMessageListener(listenerID, listener);
    }
    removeInRoomCommandMessageListener(listenerID) {
        this.signalingService.removeInRoomCommandMessageListener(listenerID);
    }
    addInvitationListener(listenerID, listener) {
        zloginfo(TAG, `addInvitationListener listenerID: ${listenerID}`);
        this.signalingService.addInvitationListener(listenerID, listener);
    }
    removeInvitationListener(listenerID) {
        zloginfo(TAG, `removeInvitationListener listenerID: ${listenerID}`);
        this.signalingService.removeInvitationListener(listenerID);
    }
    async init(appID, appSign) {
        await this.signalingPlugin.init(appID, appSign);
        const version = await this.signalingPlugin.getVersion();
        UIKitReport.reportEvent('zim/init', {
            zim_version: version,
        });
        this.listenerID = makeListenerID();
        this.signalingPlugin.addPluginEventHandler(this.listenerID, this);
    }
    sendInRoomCommandMessage(command, roomID, callback) {
        this.signalingPlugin.sendInRoomCommandMessage(command, roomID).then(() => {
            if (callback) {
                callback(0, '');
            }
        }).catch((error) => {
            if (callback) {
                callback(error.code, error.message);
            }
        });
    }
    separateUsers(invitees, errorUserList) {
        const errorUsers = [];
        const successUsers = [];
        invitees.forEach((invitee) => {
            if (errorUserList.length && errorUserList.some(errorUser => errorUser.userID === invitee.userID)) {
                errorUsers.push(invitee);
            }
            else {
                successUsers.push(invitee);
            }
        });
        return { errorUsers, successUsers };
    }
    /**
     *
     * @param callID 这是由发起方来定的RTC的roomID
     * @param invitees
     * @param timeout
     * @param type
     * @param customData
     * @param notificationConfig
     * @param callback
     * @returns
     */
    async sendInvitation(invitees, type, customData, timeout = 60, callID, notificationConfig) {
        if (!this.currentSignalUser) {
            return Promise.reject({ code: -1, message: 'USER_IS_NOT_LOGGED' });
        }
        const inviter = this.currentSignalUser;
        const inviteeIDs = invitees.map((user) => user.userID);
        let expressRoomID = makeCallID(inviter.userID);
        if (callID && TextUtils.isEmpty(callID)) {
            expressRoomID = callID.trim();
        }
        // 这是这是邀请协议体
        const data = {
            call_id: expressRoomID,
            invitees: invitees.map((user) => ({ user_id: user.userID, user_name: user.userName })),
            custom_data: customData,
            inviter: { id: inviter.userID, name: inviter.userName },
        };
        UIKitReport.reportEvent('call/invite', {
            call_id: callID || '',
            room_id: expressRoomID,
            is_video_call: type,
        });
        // 这是发送给邀请者的协议外层
        const extendedData = {
            type,
            inviter_id: inviter.userID,
            inviter_name: inviter.userName,
            data: JSON.stringify(data),
        };
        const _notificationConfig = deepClone(notificationConfig || '');
        if (_notificationConfig) {
            const content = type === ZegoInvitationType.VideoCall
                ? '视频来电...'
                : '音频来电...';
            _notificationConfig.title = _notificationConfig.title || inviter.userName;
            _notificationConfig.message = _notificationConfig.message || content;
        }
        if (this.currentRoomID) {
            return this.addInvitation(invitees, _notificationConfig);
        }
        const mode = this.callingConfig.canInvitingInCalling
            ? ZIMCallInvitationMode.Advanced
            : ZIMCallInvitationMode.General;
        const extendedDataStr = JSON.stringify(extendedData);
        return this.signalingPlugin.sendInvitation(inviteeIDs, timeout, extendedDataStr, _notificationConfig, mode)
            .then(({ callID: invitationID, errorUserList }) => {
            const invitationUsers = invitees.map((user) => {
                return {
                    user,
                    state: ZegoUIKitInvitationState.Waiting,
                };
            });
            // 分离成功和失败的用户
            const { errorUsers, successUsers } = this.separateUsers(invitees, errorUserList);
            if (errorUsers.length < invitees.length) {
                this.currentInvitationID = invitationID;
                const invitationData = {
                    invitationID,
                    inviter,
                    invitees: invitationUsers,
                    type,
                    roomID: expressRoomID,
                    customData,
                    pushConfig: _notificationConfig
                };
                // 保存起来, 取消的时候用
                this.addInvitationData(invitationData);
            }
            UIKitReport.reportEvent('callInvite', {
                invitees: inviteeIDs,
                count: inviteeIDs.length,
                error_userlist: errorUserList,
                error_count: errorUserList.length,
                call_id: callID,
                error: 0,
                msg: '',
                extendedData: extendedDataStr,
            });
            return Promise.resolve({ invitationID, callID: expressRoomID, successUsers, errorUsers });
        }).catch((error) => {
            UIKitReport.reportEvent('callInvite', {
                invitees: inviteeIDs,
                count: inviteeIDs.length,
                error: error.code,
                msg: error.message
            });
            return Promise.reject({ code: error.code, message: error.message });
        });
    }
    async addInvitation(invitees, notificationConfig) {
        const inviteeIDs = invitees.map((user) => user.userID);
        const invitationData = this.getCurrentInvitationData();
        if (!invitationData) {
            zlogwarning(TAG, 'addInvitation: no invitationData', this.currentInvitationID);
            return Promise.reject({ code: -1, message: 'no invitationData' });
        }
        const { invitationID, extendedData, pushConfig } = invitationData;
        return this.signalingPlugin.callingInvitation(inviteeIDs, invitationID, JSON.stringify(extendedData), notificationConfig || pushConfig)
            .then(({ errorUserList }) => {
            // 分离成功和失败的用户
            const { errorUsers, successUsers } = this.separateUsers(invitees, errorUserList);
            const invitationUsers = successUsers.map((user) => {
                return {
                    user,
                    state: ZegoUIKitInvitationState.Waiting,
                };
            });
            invitationData.invitees.push(...invitationUsers);
            this.signalingService.notifyCallingInvitationSend(successUsers, invitationData);
            return Promise.resolve({ invitationID, callID: invitationID, successUsers, errorUsers });
        })
            .catch((error) => {
            zlogerror(TAG, 'addInvitation failed: ', error);
            return Promise.reject({ code: error.code, message: error.message });
        });
    }
    async cancelInvitation(invitationID, inviteeIDs, notificationConfig) {
        const invitationData = this.getInvitationByID(invitationID);
        if (!invitationData) {
            return Promise.resolve({ invitationID });
        }
        const extendedData = {
            inviter_id: invitationData.inviter.userID,
            inviter_name: invitationData.inviter.userName,
            type: invitationData.type,
            data: JSON.stringify({ custom_data: invitationData.customData }),
        };
        const _inviteeIDs = inviteeIDs?.length && inviteeIDs || this.getAllWaitingInviteesByID(invitationID).map((invitee) => invitee.user.userID);
        const _notificationConfig = deepClone(notificationConfig || invitationData.pushConfig || '');
        if (_notificationConfig) {
            _notificationConfig.title = _notificationConfig.title || invitationData.inviter.userName;
            _notificationConfig.message = notificationConfig?.message || '已取消邀请';
        }
        if (!inviteeIDs?.length) {
            return Promise.resolve({ invitationID });
        }
        zloginfo(TAG, 'cancelInvitation for invitationID: ', invitationID, 'inviteeIDs: ', JSON.stringify(inviteeIDs), 'notificationConfig: ', JSON.stringify(_notificationConfig));
        return this.signalingPlugin.cancelInvitation(_inviteeIDs, invitationID, JSON.stringify(extendedData), _notificationConfig)
            .then(({ errorInvitees }) => {
            const errorUsers = [];
            const successUsers = [];
            invitationData.invitees
                .filter(({ user }) => _inviteeIDs.includes(user.userID))
                .forEach((invitee) => {
                if (errorInvitees.length && errorInvitees.some(errorUser => errorUser === invitee.user.userID)) {
                    invitee.state = ZegoUIKitInvitationState.Error;
                    errorUsers.push(invitee.user);
                }
                else {
                    invitee.state = ZegoUIKitInvitationState.Cancel;
                    successUsers.push(invitee.user);
                }
            });
            this.signalingService.notifyCancelInvitaion(successUsers, invitationData);
            this.removeIfAllChecked(invitationID);
            return Promise.resolve({ invitationID, successUsers, errorUsers });
        }).catch((error) => {
            zlogerror(TAG, 'cancelInvitation error: ', JSON.stringify(error));
            return Promise.reject({ code: error.code, message: error.message });
        });
    }
    async refuseInvitation(inviterID, customData, reason) {
        const invitationData = this.getInvitationByID(inviterID);
        zloginfo(TAG, 'refuseInvitation', JSON.stringify(invitationData));
        if (!invitationData) {
            return Promise.resolve();
        }
        const invitationID = invitationData.invitationID;
        const extendedData = {
            inviter_id: inviterID,
            inviter_name: invitationData.inviter.userName,
            type: invitationData.type,
            data: JSON.stringify({ custom_data: customData }),
            reason,
        };
        return this.signalingPlugin.refuseInvitation(invitationID, JSON.stringify(extendedData))
            .then(() => {
            invitationData.invitees.forEach((invitationUser) => {
                if (invitationUser.user.userID === this.currentSignalUser.userID) {
                    invitationUser.state = ZegoUIKitInvitationState.Refuse;
                }
            });
            this.removeIfAllChecked(invitationID);
            return Promise.resolve();
        }).catch((error) => {
            return Promise.reject({ code: error.code, message: error.message });
        });
    }
    async acceptInvitation(invitationID, customData) {
        zloginfo(TAG, 'acceptInvitation', invitationID, customData);
        let invitationData = this.getInvitationByID(invitationID);
        if (!invitationData) {
            return Promise.resolve();
        }
        // const invitationID = invitationData.invitationID
        const extendedData = {
            inviter_id: invitationData.inviter.userID,
            inviter_name: invitationData.inviter.userName,
            type: invitationData.type,
            data: JSON.stringify({ custom_data: customData }),
        };
        return this.signalingPlugin.acceptInvitation(invitationID, JSON.stringify(extendedData))
            .then(() => {
            zloginfo(TAG, 'accept success');
            invitationData.invitees.forEach((invitationUser) => {
                if (invitationUser.user.userID === this.currentSignalUser?.userID) {
                    invitationUser.state = ZegoUIKitInvitationState.Accept;
                }
            });
            return Promise.resolve();
        }).catch((error) => {
            zlogerror(TAG, 'accept err');
            return Promise.reject({ code: error.code, message: error.message });
        });
    }
    callQuit() {
        const invitationData = this.getCurrentInvitationData();
        if (!invitationData) {
            zlogwarning(TAG, 'callQuit no invitation', this.currentInvitationID);
            return Promise.reject({ code: -1, message: 'no invitation' });
        }
        const { invitationID, extendedData } = invitationData;
        return this.signalingPlugin.callQuit(invitationID, JSON.stringify(extendedData));
    }
    callEnd() {
        const invitationData = this.getCurrentInvitationData();
        if (!invitationData) {
            zlogwarning(TAG, 'callEnd no invitation', this.currentInvitationID);
            return Promise.reject({ code: -1, message: 'no invitation' });
        }
        const { invitationID, extendedData } = invitationData;
        return this.signalingPlugin.callEnd(invitationID, JSON.stringify(extendedData));
    }
    logout() {
        zloginfo(TAG, 'logout');
        UIKitReport.reportEvent('zim/logout', {});
        this.signalingPlugin.disconnectUser();
        this.isInLoginProcess = false;
        this.removeRoomListenersAndData();
        this.signalingService.clear();
        this.invitationMap = {};
        this.currentInvitationID = '';
    }
    connectUser() {
        const isDisconnected = this.signalConnectionState === ZegoSignalingConnectionState.Disconnected;
        if (this.currentSignalUser && isDisconnected && !this.isInLoginProcess) {
            this.signalingPlugin.connectUser(this.currentSignalUser.userID, this.currentSignalUser.userName ?? '');
        }
    }
    isPluginExited() {
        return this.signalingPlugin !== null;
    }
    onConnectionStateChanged(state) {
        zloginfo(TAG, 'onConnectionStateChanged: ', state);
        this.signalConnectionState = state;
        this.signalingService.notifyConnectionStateChange(state);
        UIKitReport.reportEvent('zim/connectionStateChanged', {
            state,
        });
    }
    onCallInvitationReceived(invitationID, inviterID, extendedData) {
        zloginfo(TAG, 'onCallInvitationReceived: ', invitationID, inviterID, extendedData);
        if (!TextUtils.isEmpty(extendedData)) { // InvitationEnvelope
            const envelope = JSON.parse(extendedData);
            const message = JSON.parse(envelope.data || '{}');
            const userID = envelope.inviter_id || message.inviter?.id;
            let inviter = UIKitCore.getInstance().getUser(userID);
            if (!inviter) {
                inviter = new ZegoUIKitUser(userID, envelope.inviter_name);
            }
            // this.setCallingConfig(envelope)
            const invitee = {
                user: this.currentSignalUser,
                state: ZegoUIKitInvitationState.Waiting,
            };
            // 被邀请者就是自己, 不管其他人
            const invitationData = {
                invitationID,
                inviter,
                invitees: [invitee],
                type: envelope.type,
                roomID: message.call_id,
                customData: message.custom_data,
                extendedData: message,
            };
            this.addInvitationData(invitationData);
            UIKitReport.reportEvent('invitationReceived', {
                call_id: invitationID,
                inviter: inviterID,
                extended_data: extendedData,
            });
            if (this.currentInvitationID) {
                zlogwarning(TAG, 'onCallInvitationReceived refuseInvitation invitationID: ', invitationID);
                if (this.currentInvitationID === invitationID)
                    return;
                // 如果已被邀请，就拒绝其他的
                this.refuseInvitation(invitationID, message.custom_data, CallInvitationRejectReason.Busy);
                const { state } = getAppState();
                UIKitReport.reportEvent('call/respondInvitation', {
                    call_id: invitationID,
                    action: CallInvitationRejectReason.Busy,
                    app_state: state,
                });
                return;
            }
            this.currentInvitationID = invitationID;
            this.signalingService.notifyCallInvitationReceived(inviter, envelope.type, invitationData);
        }
        else {
            zlogwarning(TAG, `onCallInvitationReceived, extendedData is empty: ${extendedData}`);
        }
    }
    onCallInvitationCancelled(invitationID, inviterID, extendedData) {
        const invitationData = this.getInvitationByID(invitationID);
        zloginfo(TAG, `onCallInvitationCancelled invitationID: ${invitationID}, invitationData: ${JSON.stringify(invitationData)}`);
        if (invitationData) {
            let inviter = invitationData.inviter;
            const uiKitUser = UIKitCore.getInstance().getUser(inviterID);
            if (uiKitUser) {
                inviter = uiKitUser;
            }
            invitationData.invitees.forEach((invitationUser) => {
                if (invitationUser.user.userID === this.currentSignalUser?.userID) {
                    invitationUser.state = ZegoUIKitInvitationState.Cancel;
                }
            });
            this.removeIfAllChecked(invitationID);
            !UIKitCore.getInstance().inRoom() &&
                this.signalingService.notifyCallInvitationCancelled(inviter, invitationData);
        }
        else {
            zlogwarning(TAG, 'onCallInvitationCancelled, invitationData is null');
        }
    }
    onCallInvitationAccepted(invitationID, invitee, extendedData) {
        const invitationData = this.getInvitationByID(invitationID);
        zloginfo(TAG, `onCallInvitationAccepted invitationID: ${invitationID}, invitationData: ${JSON.stringify(invitationData)}`);
        if (invitationData) {
            const invitationUser = this.getInvitee(invitationID, invitee);
            if (invitationUser) {
                if (invitationUser.state !== ZegoUIKitInvitationState.Waiting)
                    return;
                invitationUser.state = ZegoUIKitInvitationState.Accept;
                let inviteeUser = invitationUser.user;
                const uiKitUser = UIKitCore.getInstance().getUser(invitee);
                if (uiKitUser) {
                    inviteeUser = uiKitUser;
                }
                this.signalingService.notifyCallInvitationAccepted(inviteeUser, invitationData);
            }
        }
        else {
            zlogwarning(TAG, 'onCallInvitationAccepted, invitationData is null');
        }
    }
    onCallInvitationRejected(invitationID, invitee, extendedData) {
        const invitationData = this.getInvitationByID(invitationID);
        zloginfo(TAG, `onCallInvitationRejected invitationID: ${invitationID}, invitee: ${invitee}, invitationData: ${JSON.stringify(invitationData)}`);
        if (invitationData) {
            const invitationUser = this.getInvitee(invitationID, invitee);
            if (invitationUser) {
                const envelope = JSON.parse(extendedData || '{}');
                invitationData.extendedData = envelope;
                invitationUser.state = ZegoUIKitInvitationState.Refuse;
                this.removeIfAllChecked(invitationID);
                let inviteeUser = invitationUser.user;
                const uiKitUser = UIKitCore.getInstance().getUser(invitee);
                if (uiKitUser) {
                    inviteeUser = uiKitUser;
                }
                this.signalingService.notifyCallInvitationRejected(inviteeUser, invitationData);
            }
        }
        else {
            zlogwarning(TAG, 'onCallInvitationRejected, invitationData is null');
        }
    }
    onCallInvitationTimeout(invitationID) {
        const invitationData = this.getInvitationByID(invitationID);
        zloginfo(TAG, `onCallInvitationTimeout invitationID: ${invitationID}, invitationData: ${JSON.stringify(invitationData)}`);
        if (invitationData) {
            let inviter = invitationData.inviter;
            const uiKitUser = UIKitCore.getInstance().getUser(inviter.userID);
            if (uiKitUser) {
                inviter = uiKitUser;
            }
            invitationData.invitees.forEach((invitationUser) => {
                if (invitationUser.user.userID === this.currentSignalUser.userID) {
                    invitationUser.state = ZegoUIKitInvitationState.Timeout;
                }
            });
            this.removeIfAllChecked(invitationID);
            this.signalingService.notifyCallInvitationTimeout(inviter, invitationData);
        }
        else {
            zlogwarning(TAG, 'onCallInvitationTimeout, invitationData is null');
        }
    }
    onCallInviteesAnsweredTimeout(invitationID, invitees) {
        const invitationData = this.getInvitationByID(invitationID);
        zloginfo(TAG, `onCallInviteesAnsweredTimeout invitationID: ${invitationID}, invitationData: ${JSON.stringify(invitationData)}`);
        if (invitationData) {
            const timeoutInvitees = [];
            invitationData.invitees.forEach((invitationUser) => {
                if (invitees.includes(invitationUser.user.userID)) {
                    invitationUser.state = ZegoUIKitInvitationState.Timeout;
                    let user = invitationUser.user;
                    const uiKitUser = UIKitCore.getInstance().getUser(user.userID);
                    if (uiKitUser) {
                        user = uiKitUser;
                    }
                    timeoutInvitees.push(user);
                }
            });
            this.removeIfAllChecked(invitationID);
            this.signalingService.notifyCallInviteesAnsweredTimeout(timeoutInvitees, invitationData);
        }
        else {
            zlogwarning(TAG, 'onCallInviteesAnsweredTimeout, invitationData is null');
        }
    }
    onUsersInRoomAttributesUpdated(attributesMap, editor, roomID) {
        const oldAttributes = [];
        const userLocalID = UIKitCore.getInstance().getLocalUser().userID;
        if (userLocalID === editor) {
            oldAttributes.push(...this.oldUsersInRoomAttributes);
        }
        else {
            oldAttributes.push(...this.usersInRoomAttributes);
        }
        const updateKeys = [];
        const infos = [];
        for (const [userID, attributes] of Object.entries(attributesMap)) {
            infos.push({ userID, attributes });
        }
        for (const info of infos) {
            const index = this.getIndexFromUsersInRoomAttributes(info.userID);
            for (const [key, value] of Object.entries(info.attributes)) {
                if (!updateKeys.includes(key)) {
                    updateKeys.push(key);
                }
                if (index !== -1) {
                    this.usersInRoomAttributes[index].attributes[key] = value;
                }
            }
            if (index === -1) {
                this.usersInRoomAttributes.push(info);
            }
        }
        this.updateCoreUserAndNotifyChanges(infos);
        const uiKitUser = UIKitCore.getInstance().getUser(editor);
        this.signalingService.notifyUsersInRoomAttributesUpdated(updateKeys, oldAttributes, this.usersInRoomAttributes, uiKitUser);
    }
    onRoomPropertiesUpdated(setProperties, deleteProperties, roomID) {
        const updateKeys = [];
        // 把 this.roomAttributes 深拷贝一次
        const oldRoomAttributes = deepClone(this.roomAttributes);
        for (const setProperty of setProperties) {
            for (const [key, value] of Object.entries(setProperty)) {
                if (!updateKeys.includes(key)) {
                    updateKeys.push(key);
                }
                const oldValue = this.roomAttributes[key];
                this.roomAttributes[key] = value;
                this.signalingService.notifyRoomPropertyUpdated(key, oldValue, value);
            }
        }
        for (const deleteProperty of deleteProperties) {
            for (const [key, value] of Object.entries(deleteProperty)) {
                if (!updateKeys.includes(key)) {
                    updateKeys.push(key);
                }
                const oldValue = this.roomAttributes[key];
                delete this.roomAttributes[key];
                this.signalingService.notifyRoomPropertyUpdated(key, oldValue, '');
            }
        }
        this.signalingService.notifyRoomPropertyFullUpdated(updateKeys, oldRoomAttributes, this.roomAttributes);
    }
    onRoomMemberLeft(userIDList, roomID) {
        const oldAttributes = [...this.usersInRoomAttributes];
        for (const userID of userIDList) {
            const index = this.getIndexFromUsersInRoomAttributes(userID);
            if (index !== -1) {
                this.usersInRoomAttributes.splice(index, 1);
            }
        }
        this.signalingService.notifyUsersInRoomAttributesUpdated([], oldAttributes, this.usersInRoomAttributes, null);
    }
    onRoomMemberJoined(userIDList, roomID) {
        // Implementation for onRoomMemberJoined
    }
    onInRoomTextMessageReceived(messages, roomID) {
        this.signalingService.notifyInRoomTextMessageReceived(messages, roomID);
    }
    onInRoomCommandMessageReceived(messages, roomID) {
        this.signalingService.onInRoomCommandMessageReceived(messages, roomID);
    }
    // public enableNotifyWhenAppRunningInBackgroundOrQuit(enable: boolean) {
    //     
    //     
    //         this.signalingPlugin.enableNotifyWhenAppRunningInBackgroundOrQuit(enable);
    //     }
    // }
    addConnectionStateChangeListener(listenerID, listener) {
        this.signalingService.addConnectionStateChangeListener(listenerID, listener);
    }
    removeConnectionStateChangeListener(listenerID) {
        this.signalingService.removeConnectionStateChangeListener(listenerID);
    }
    addZIMEventHandler(listenerID, handler) {
        this.signalingPlugin.addZIMEventHandler(listenerID, handler);
    }
    removeZIMEventHandler(listenerID) {
        this.signalingPlugin.removeZIMEventHandler(listenerID);
    }
    setCallingConfig({ canInvitingInCalling, onlyInitiatorCanInvite, endCallWhenInitiatorLeave }) {
        isBoolean(canInvitingInCalling) && (this.callingConfig.canInvitingInCalling = canInvitingInCalling);
        isBoolean(onlyInitiatorCanInvite) && (this.callingConfig.onlyInitiatorCanInvite = onlyInitiatorCanInvite);
        isBoolean(endCallWhenInitiatorLeave) && (this.callingConfig.endCallWhenInitiatorLeave = endCallWhenInitiatorLeave);
    }
    isInviter(userID) {
        return this.getCurrentInvitationData()?.inviter?.userID === userID;
    }
    getCallingConfig() {
        return this.callingConfig;
    }
    getCurrentInvitationData() {
        return this.getInvitationByID(this.currentInvitationID);
    }
    async endCall() {
        const { canInvitingInCalling, endCallWhenInitiatorLeave } = this.callingConfig;
        const userLocalID = UIKitCore.getInstance().getLocalUser().userID;
        const isInviter = this.isInviter(userLocalID);
        zlogwarning(TAG, `endCall canInvitingInCalling: ${canInvitingInCalling}, endCallWhenInitiatorLeave: ${endCallWhenInitiatorLeave}, isInviter: ${isInviter} invitationID: ${this.currentInvitationID}`);
        // 离开房间取消所有未接受的呼叫
        try {
            await this.cancelInvitation(this.currentInvitationID);
        }
        catch (error) {
            zlogerror(TAG, `cancelInvitation failed on endCall: ${error}`);
        }
        ;
        if (canInvitingInCalling) {
            if (endCallWhenInitiatorLeave && isInviter) {
                this.callEnd()
                    .then((res) => {
                    zlogwarning('callEnd', res);
                })
                    .catch((error) => {
                    zlogwarning('callEnd', error);
                });
            }
            else {
                this.callQuit()
                    .then((res) => {
                    zlogwarning('callQuit', res);
                })
                    .catch((error) => {
                    zlogwarning('callQuit', error);
                });
            }
        }
        this.currentInvitationID = '';
    }
}
