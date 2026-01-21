import { ZegoPresetResolution } from "@/uni_modules/zego-UIKitCore";
/**
 * 定义直播菜单栏按钮名称的枚举类型。
 */
export var ZegoMenuBarButtonName;
(function (ZegoMenuBarButtonName) {
    /**
     * 切换摄像头按钮
     */
    ZegoMenuBarButtonName[ZegoMenuBarButtonName["ToggleCameraButton"] = 0] = "ToggleCameraButton";
    /**
     * 切换麦克风按钮
     */
    ZegoMenuBarButtonName[ZegoMenuBarButtonName["ToggleMicrophoneButton"] = 1] = "ToggleMicrophoneButton";
    /**
     * 切换音频输出按钮
     */
    ZegoMenuBarButtonName[ZegoMenuBarButtonName["SwitchAudioOutputButton"] = 2] = "SwitchAudioOutputButton";
    /**
     * 挂断按钮
     */
    ZegoMenuBarButtonName[ZegoMenuBarButtonName["HangUpButton"] = 3] = "HangUpButton";
    /**
     * 切换前后置摄像头按钮
     */
    ZegoMenuBarButtonName[ZegoMenuBarButtonName["SwitchCameraButton"] = 4] = "SwitchCameraButton";
    /**
     * 显示成员列表按钮
     */
    // ShowMemberListButton,
    /**
     * 屏幕共享切换按钮
     */
    // ScreenSharingToggleButton,
    /**
     * 美颜按钮
     */
    // BeautyButton,
    /**
     * 聊天按钮
     */
    // ChatButton,
    /**
     * 最小化按钮
     */
    // MinimizingButton
    /**
     * 通话中邀请用户按钮
     */
    ZegoMenuBarButtonName[ZegoMenuBarButtonName["CallingInvitationButton"] = 5] = "CallingInvitationButton";
})(ZegoMenuBarButtonName || (ZegoMenuBarButtonName = {}));
export var ZegoMenuBarStyle;
(function (ZegoMenuBarStyle) {
    ZegoMenuBarStyle[ZegoMenuBarStyle["Light"] = 0] = "Light";
    ZegoMenuBarStyle[ZegoMenuBarStyle["Dark"] = 1] = "Dark";
})(ZegoMenuBarStyle || (ZegoMenuBarStyle = {}));
/**
 * 通话界面下方的 buttonbar 配置
 */
export class ZegoBottomMenuBarConfig {
    // 现在只支持配置按钮和按钮顺序, 不支持修改顺序
    buttons = [
        ZegoMenuBarButtonName.ToggleCameraButton,
        ZegoMenuBarButtonName.SwitchCameraButton,
        ZegoMenuBarButtonName.HangUpButton,
        ZegoMenuBarButtonName.ToggleMicrophoneButton,
        ZegoMenuBarButtonName.SwitchAudioOutputButton,
    ];
    // TODO 当前 maxCount 只能是 5, 后续再处理
    maxCount = 5;
    hideAutomatically = true;
    hideByClick = true;
}
export class ZegoPrebuiltVideoConfig {
    resolution = ZegoPresetResolution.Preset360p;
    config;
}
