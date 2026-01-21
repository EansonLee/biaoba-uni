import { CallInvitationServiceImpl } from "./internal/CallInvitationServiceImpl";
export default class ZegoUIKitPrebuiltCallService {
    static getVersion() {
        return CallInvitationServiceImpl.getInstance().getVersion();
    }
    static async init(appID, appSign, userID, userName, config) {
        const result = await CallInvitationServiceImpl.getInstance().init(appID, appSign);
        if (!result) {
            return result;
        }
        CallInvitationServiceImpl.getInstance().loginUser(userID, userName);
        CallInvitationServiceImpl.getInstance().setCallInvitationConfig(config);
        // 离线推送配置
        const enable = config.enableNotifyWhenAppRunningInBackgroundOrQuit;
        CallInvitationServiceImpl.getInstance().enableOfflinePush(enable);
        return true;
    }
    static setCallInvitationConfig(config) {
        CallInvitationServiceImpl.getInstance().setCallInvitationConfig(config);
    }
    // public static async reInit() {
    //     const { appID, appSign } = SessionStorage.get(StoreKeys.APP_INFO)
    //     const { userID, userName } = SessionStorage.get(StoreKeys.USER_INFO)
    //     const invitationConfig = SessionStorage.get(StoreKeys.CALL_INVITATION_CONFIG)
    //     return await ZegoUIKitPrebuiltCallService.init(appID, appSign, userID, userName, invitationConfig)
    // }
    static sendInvitation(config) {
        return CallInvitationServiceImpl.getInstance().sendInvitation(config);
    }
    static cancelInvitation(config) {
        return CallInvitationServiceImpl.getInstance().cancelInvitation(config);
    }
    static unInit() {
        CallInvitationServiceImpl.getInstance().logoutUser();
        CallInvitationServiceImpl.getInstance().unInit();
        // 销毁
        CallInvitationServiceImpl.deleteInstance();
    }
}
