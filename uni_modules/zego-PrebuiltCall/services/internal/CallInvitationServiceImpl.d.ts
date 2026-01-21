import { ZegoUIKitCallback, ZegoUIKitUser } from "@/uni_modules/zego-UIKitCore";
import { ZegoUIKitPrebuiltCallInvitationConfig } from "../../config/ZegoUIKitPrebuiltCallInvitationConfig";
import { ZegoUIKitPrebuiltCallConfig } from "../../config/ZegoUIKitPrebuiltCallConfig";
import { CallInviteConfig, CancelInviteConfig } from "../../config/defines";
import { ZegoUser } from "@/uni_modules/zego-UIKitCore/services/express/ZegoExpressUniApp";
import { CallRespondAction } from "./CallState";
export declare class CallInvitationServiceImpl {
    private static name;
    getVersion(): string;
    static getInstance(): CallInvitationServiceImpl;
    static deleteInstance(): void;
    private alreadyInit;
    private alreadyLogin;
    private appInfo;
    private localUser;
    private inRoom;
    private invitationConfig;
    private listenerID;
    private expressEventHandler;
    private zimEventHandler;
    private invitationListener;
    init(appID: number, appSign: string): Promise<boolean>;
    private initZPNsEvent;
    private offZPNsEvent;
    enableOfflinePush(enable: boolean): Promise<void>;
    setCallInvitationConfig(invitationConfig: ZegoUIKitPrebuiltCallInvitationConfig): void;
    getAppInfo(): {
        appID: number;
        appSign: string;
    } | null;
    getLocalUser(): ZegoUIKitUser | null;
    getCallInvitationConfig(): ZegoUIKitPrebuiltCallInvitationConfig | null;
    getCallConfig(): ZegoUIKitPrebuiltCallConfig | null;
    /**
     * 登录用户到系统。
     *
     * @param userID 用户ID字符串。
     * @param userName 用户名字符串。
     *
     * 如果用户尚未登录（`alreadyLogin`为`false`），则尝试使用提供的用户ID和用户名登录。
     * 成功登录后，会尝试启用和注册推送通知服务。登录失败则重置登录状态。
     */
    loginUser(userID: string, userName: string): void;
    logoutUser(): void;
    /**
     * 反初始化方法，用于清理通话相关的资源与状态。
     * 包括离开房间、结束通话、移除事件处理器、注销登录等操作。
     */
    unInit(): Promise<void>;
    /** 检查是否已在房间内 */
    isInRoom(): boolean;
    /**
     * 加入房间。
     *
     * @param roomID 房间ID字符串。
     * @param callback 加入房间操作的回调函数。
     */
    joinRoom(roomID: string, callback: ZegoUIKitCallback): void;
    /**
     * 离开房间。
     */
    leaveRoom(): Promise<void>;
    private getUIKitUser;
    sendInvitation(config: CallInviteConfig): Promise<{
        invitationID: string;
        callID: string;
        successUsers: ZegoUIKitUser[];
        errorUsers: ZegoUIKitUser[];
    }>;
    addInvitation(invitees: ZegoUser[]): Promise<{
        invitationID: string;
        callID: string;
        successUsers: ZegoUIKitUser[];
        errorUsers: ZegoUIKitUser[];
    }>;
    cancelInvitation(config: CancelInviteConfig): Promise<{
        invitationID: string;
        successUsers?: ZegoUIKitUser[] | undefined;
        errorUsers?: ZegoUIKitUser[] | undefined;
    }>;
    incomingCallResponseReport(callID: string, action: CallRespondAction): void;
    outgoingCallResponseReport(callID: string, action: CallRespondAction, invitees: ZegoUser[]): void;
}
