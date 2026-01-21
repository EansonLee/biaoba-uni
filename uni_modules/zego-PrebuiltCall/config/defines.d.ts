/// <reference types="@dcloudio/types" />
import { ZegoInvitationType, ZegoPresetResolution, ZegoSignalingNotificationConfig, ZegoVideoConfig } from "@/uni_modules/zego-UIKitCore";
import { ZegoUser } from "@/uni_modules/zego-UIKitCore/services/express/ZegoExpressUniApp";
import { ZPNsIOSEnvironment, ZPNsIOSNotificationArrivedConfig } from "@/js_sdk/zego-ZPNsUniPlugin-JS/lib";
/**
 * 定义直播菜单栏按钮名称的枚举类型。
 */
export declare enum ZegoMenuBarButtonName {
    /**
     * 切换摄像头按钮
     */
    ToggleCameraButton = 0,
    /**
     * 切换麦克风按钮
     */
    ToggleMicrophoneButton = 1,
    /**
     * 切换音频输出按钮
     */
    SwitchAudioOutputButton = 2,
    /**
     * 挂断按钮
     */
    HangUpButton = 3,
    /**
     * 切换前后置摄像头按钮
     */
    SwitchCameraButton = 4,
    /**
     * 显示成员列表按钮
     */
    /**
     * 屏幕共享切换按钮
     */
    /**
     * 美颜按钮
     */
    /**
     * 聊天按钮
     */
    /**
     * 最小化按钮
     */
    /**
     * 通话中邀请用户按钮
     */
    CallingInvitationButton = 5
}
export declare enum ZegoMenuBarStyle {
    Light = 0,
    Dark = 1
}
/**
 * 通话界面下方的 buttonbar 配置
 */
export declare class ZegoBottomMenuBarConfig {
    buttons: ZegoMenuBarButtonName[];
    maxCount?: number;
    hideAutomatically?: boolean;
    hideByClick?: boolean;
}
/**
 * 各种按钮的图片自定义, 不传就用默认的
 */
export interface ZegoMenuBarButtonConfig {
    toggleCameraOnImage: string;
    toggleCameraOffImage: string;
    toggleMicrophoneOnImage: string;
    toggleMicrophoneOffImage: string;
    hangUpButtonImage: string;
    switchCameraFrontImage: string;
    switchCameraBackImage: string;
    showMemberListButtonImage: string;
    audioOutputSpeakerImage: string;
    audioOutputHeadphoneImage: string;
    audioOutputBluetoothImage: string;
}
export declare class ZegoPrebuiltVideoConfig {
    resolution: ZegoPresetResolution;
    config?: ZegoVideoConfig;
}
/**
 * 挂点电话的弹框配置
 */
export interface ZegoHangUpConfirmInfo {
    title?: string;
    message?: string;
    cancelButtonName?: string;
    confirmButtonName?: string;
}
export type ZegoHangUpListener = (seconds: number) => void;
export type NetworkType = 'wifi' | '2g' | '3g' | '4g' | '5g' | 'ethernet' | 'unknown' | 'none';
export type NetworkStatusChangeListener = (res: UniNamespace.OnNetworkStatusChangeSuccess) => void;
export type ZegoHangUpConfirmListener = () => Promise<boolean>;
export type ZegoDurationUpdateListener = (seconds: number) => void;
export interface ZegoCallDurationConfig {
    showDuration?: boolean;
    onDurationUpdate?: ZegoDurationUpdateListener;
}
export interface RegisterPushConfig {
    iOSEnvironment: ZPNsIOSEnvironment;
    iOSNotificationArrivedConfig: ZPNsIOSNotificationArrivedConfig;
}
export interface CallingInvitationListConfig {
    waitingSelectUsers: ZegoUser[];
    defaultChecked?: boolean;
}
export type CallingInvitationListSheetDisplayCallBack = () => CallingInvitationListConfig;
export interface CallInviteConfig {
    type: ZegoInvitationType;
    invitees: ZegoUser[];
    timeout?: number;
    callID?: string;
    customData?: string;
    notificationConfig?: ZegoSignalingNotificationConfig;
}
export interface CancelInviteConfig {
    callID: string;
    invitees?: string[];
    notificationConfig?: ZegoSignalingNotificationConfig;
}
