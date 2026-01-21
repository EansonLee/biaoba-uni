import { ZegoUser } from "@/uni_modules/zego-UIKitCore/services/express/ZegoExpressUniApp";
import { ZegoUIKitPrebuiltCallConfig } from "../config/ZegoUIKitPrebuiltCallConfig";
import { CallingInvitationListSheetDisplayCallBack, RegisterPushConfig } from "./defines";
import { ZPNsConfig } from "@/js_sdk/zego-ZPNsUniPlugin-JS/lib";
export declare const defalutPrebuiltCallInvitationConfig: {
    showDeclineButton: boolean;
    endCallWhenInitiatorLeave: boolean;
    canInvitingInCalling: boolean;
    onlyInitiatorCanInvite: boolean;
};
export declare const defaultCallingInvitationListConfig: {
    waitingSelectUsers: never[];
    defaultChecked: boolean;
};
export declare class ZegoUIKitPrebuiltCallInvitationConfig {
    incomingCallRingtone?: string;
    outgoingCallRingtone?: string;
    incomingCallBackground?: string;
    outgoingCallBackground?: string;
    showDeclineButton?: boolean;
    callConfig?: ZegoUIKitPrebuiltCallConfig;
    endCallWhenInitiatorLeave?: boolean;
    enableNotifyWhenAppRunningInBackgroundOrQuit?: boolean;
    offlinePushConfigWhenRegister?: RegisterPushConfig;
    offlinePushConfig?: ZPNsConfig;
    canInvitingInCalling?: boolean;
    onlyInitiatorCanInvite?: boolean;
    onIncomingCallDeclineButtonPressed?: () => void;
    onIncomingCallAcceptButtonPressed?: () => void;
    onIncomingCallReceived?: (callID: string, caller: ZegoUser, callType: number, callees: ZegoUser[]) => void;
    onIncomingCallCanceled?: (callID: string, caller: ZegoUser) => void;
    onIncomingCallTimeout?: (callID: string, caller: ZegoUser) => void;
    onOutgoingCallCancelButtonPressed?: () => void;
    onOutgoingCallAccepted?: (callID: string, callee: ZegoUser) => void;
    onOutgoingCallRejectedCauseBusy?: (callID: string, callee: ZegoUser) => void;
    onOutgoingCallDeclined?: (callID: string, callee: ZegoUser) => void;
    onOutgoingCallTimeout?: (callID: string, callees: ZegoUser[]) => void;
    onCallingInvitationListSheetDisplay?: CallingInvitationListSheetDisplayCallBack;
}
