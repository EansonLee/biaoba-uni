export var ZegoLayoutMode;
(function (ZegoLayoutMode) {
    ZegoLayoutMode[ZegoLayoutMode["PictureInPicture"] = 0] = "PictureInPicture";
    ZegoLayoutMode[ZegoLayoutMode["Gallery"] = 1] = "Gallery";
})(ZegoLayoutMode || (ZegoLayoutMode = {}));
export var ZegoViewPosition;
(function (ZegoViewPosition) {
    ZegoViewPosition[ZegoViewPosition["TopLeft"] = 0] = "TopLeft";
    ZegoViewPosition[ZegoViewPosition["TopRight"] = 1] = "TopRight";
    ZegoViewPosition[ZegoViewPosition["BottomLeft"] = 2] = "BottomLeft";
    ZegoViewPosition[ZegoViewPosition["BottomRight"] = 3] = "BottomRight";
})(ZegoViewPosition || (ZegoViewPosition = {}));
// 定义全屏模式切换按钮显示规则枚举
export var ZegoShowFullscreenModeToggleButtonRules;
(function (ZegoShowFullscreenModeToggleButtonRules) {
    ZegoShowFullscreenModeToggleButtonRules[ZegoShowFullscreenModeToggleButtonRules["ShowWhenScreenPressed"] = 0] = "ShowWhenScreenPressed"; // 屏幕被按下时显示
})(ZegoShowFullscreenModeToggleButtonRules || (ZegoShowFullscreenModeToggleButtonRules = {}));
// 定义布局类
export class ZegoLayout {
    // 布局模式
    mode = ZegoLayoutMode.PictureInPicture;
    // 布局配置
    config;
}
/**
 * 音视频视图配置类
 * 用于配置音视频播放时的视图相关设置，包括声音波纹、填充模式、麦克风和摄像头状态显示等。
 */
export class ZegoAudioVideoViewConfig {
    /**
     * 是否在音频模式下显示声波动画
     * 默认为true，表示在仅音频模式下也显示声波动画。
     * 可以根据需求配置为false，隐藏声波动画。
     */
    showSoundWavesInAudioMode = true;
    /**
     * 是否使用视频视图的填充模式
     * 默认为true，表示视频视图将按照保持宽高比的方式进行填充。
     * 可以配置为false，此时视频视图将按实际大小显示，可能会有黑边。
     */
    useVideoViewAspectFill = true;
    /**
     * 是否在视图上显示麦克风状态
     * 默认为true，表示将在视图上显示麦克风的开关状态。
     * 可以配置为false，隐藏麦克风状态显示。
     */
    showMicrophoneStateOnView = true;
    /**
     * 是否在视图上显示摄像头状态
     * 默认为false，表示不在视图上显示摄像头的开关状态。
     * 可以配置为true，以显示摄像头状态。
     */
    showCameraStateOnView = false;
    /**
     * 是否在视图上显示用户名
     * 默认为true，表示将在视图上显示用户名。
     * 可以配置为false，隐藏用户名显示。
     */
    showUserNameOnView = true;
}
export var ViewType;
(function (ViewType) {
    ViewType[ViewType["BIG"] = 0] = "BIG";
    ViewType[ViewType["SMALL"] = 1] = "SMALL";
})(ViewType || (ViewType = {}));
