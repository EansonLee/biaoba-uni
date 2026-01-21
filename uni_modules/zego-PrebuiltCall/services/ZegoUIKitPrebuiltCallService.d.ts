import { ZegoUIKitPrebuiltCallInvitationConfig } from "src/config/ZegoUIKitPrebuiltCallInvitationConfig";
import { CallInviteConfig, CancelInviteConfig } from "../config/defines";
export default class ZegoUIKitPrebuiltCallService {
    static getVersion(): string;
    static init(appID: number, appSign: string, userID: string, userName: string, config: ZegoUIKitPrebuiltCallInvitationConfig): Promise<boolean>;
    static setCallInvitationConfig(config: ZegoUIKitPrebuiltCallInvitationConfig): void;
    static sendInvitation(config: CallInviteConfig): Promise<{
        invitationID: string;
        callID: string;
        successUsers: import("@/uni_modules/zego-UIKitCore").ZegoUIKitUser[];
        errorUsers: import("@/uni_modules/zego-UIKitCore").ZegoUIKitUser[];
    }>;
    static cancelInvitation(config: CancelInviteConfig): Promise<{
        invitationID: string;
        successUsers?: import("@/uni_modules/zego-UIKitCore").ZegoUIKitUser[] | undefined;
        errorUsers?: import("@/uni_modules/zego-UIKitCore").ZegoUIKitUser[] | undefined;
    }>;
    static unInit(): void;
}
