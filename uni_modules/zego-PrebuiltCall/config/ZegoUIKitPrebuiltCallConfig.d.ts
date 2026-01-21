import { ZegoAudioVideoViewConfig, ZegoLayout } from "@/uni_modules/zego-UIKitCore";
import { ZegoHangUpConfirmInfo, ZegoHangUpConfirmListener, ZegoHangUpListener, ZegoBottomMenuBarConfig, ZegoCallDurationConfig, ZegoPrebuiltVideoConfig, NetworkStatusChangeListener } from "./defines";
export declare class ZegoUIKitPrebuiltCallConfig {
    turnOnCameraWhenJoining?: boolean;
    turnOnMicrophoneWhenJoining?: boolean;
    useSpeakerWhenJoining?: boolean;
    audioVideoViewConfig: ZegoAudioVideoViewConfig;
    layout?: ZegoLayout;
    bottomMenuBarConfig: ZegoBottomMenuBarConfig;
    videoConfig: ZegoPrebuiltVideoConfig;
    hangUpConfirmInfo?: ZegoHangUpConfirmInfo;
    onHangUpConfirmation?: ZegoHangUpConfirmListener;
    onHangUp?: ZegoHangUpListener;
    onNetworkStatusChange?: NetworkStatusChangeListener;
    durationConfig?: ZegoCallDurationConfig;
    /**
     * 通话中邀请用户，邀请用户窗口将出现在邀请方，如果您想隐藏此视图，请将其设置为false。默认展示。
     * 可以在此视图中取消对此用户的邀请。
     */
    showWaitingCallAcceptAudioVideoView?: boolean;
    static oneOnOneVideoCall(): ZegoUIKitPrebuiltCallConfig;
    static oneOnOneVoiceCall(): ZegoUIKitPrebuiltCallConfig;
}
