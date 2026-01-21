import { ZegoUIKitUser } from "@/uni_modules/zego-UIKitCore";
export default class CallInvitationHelper {
    private static _instance;
    private constructor();
    static getInstance(): CallInvitationHelper;
    onInvitationSent(invitationID: string, allInvitees: ZegoUIKitUser[], successfulInvitees: ZegoUIKitUser[], roomID: string, isVideoCall: boolean, callName: string, showWaitingPageWhenGroupCall: boolean): void;
    onInvitationAccept(invitationID: string, allInvitees: ZegoUIKitUser[], roomID: string, isVideoCall: boolean, isRedirect?: boolean): void;
    onInvitationReceived(invitationID: string, inviter: ZegoUIKitUser, roomID: string, isVideoCall: boolean): void;
}
