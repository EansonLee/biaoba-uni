export declare enum ZegoLayoutMode {
    PictureInPicture = 0,
    Gallery = 1
}
export declare enum ZegoViewPosition {
    TopLeft = 0,
    TopRight = 1,
    BottomLeft = 2,
    BottomRight = 3
}
export interface ZegoLayoutGalleryConfig {
    addBorderRadiusAndSpacingBetweenView: boolean;
    removeViewWhenAudioVideoUnavailable: boolean;
    showNewScreenSharingViewInFullscreenMode: boolean;
    showScreenSharingFullscreenModeToggleButtonRules: ZegoShowFullscreenModeToggleButtonRules;
}
export interface ZegoLayoutPictureInPictureConfig {
    smallViewBackgroundColor?: string;
    largeViewBackgroundColor?: string;
    smallViewBackgroundImage?: string;
    largeViewBackgroundImage?: string;
    smallViewPosition?: ZegoViewPosition;
    switchLargeOrSmallViewByClick?: boolean;
    smallViewSize?: {
        width: number;
        height: number;
    };
    smallViewBorderRadius?: number;
    spacingBetweenSmallViews?: number;
    removeViewWhenAudioVideoUnavailable?: boolean;
}
export type ZegoLayoutConfig = ZegoLayoutPictureInPictureConfig | ZegoLayoutGalleryConfig;
export declare enum ZegoShowFullscreenModeToggleButtonRules {
    ShowWhenScreenPressed = 0
}
export declare class ZegoLayout {
    mode?: ZegoLayoutMode;
    config?: ZegoLayoutConfig;
}
export type AvatarAlignment = 'center' | 'flex-start' | 'flex-end';
export interface AvatarSize {
    width: number;
    height: number;
}
/**
 * 音视频视图配置类
 * 用于配置音视频播放时的视图相关设置，包括声音波纹、填充模式、麦克风和摄像头状态显示等。
 */
export declare class ZegoAudioVideoViewConfig {
    /**
     * 是否在音频模式下显示声波动画
     * 默认为true，表示在仅音频模式下也显示声波动画。
     * 可以根据需求配置为false，隐藏声波动画。
     */
    showSoundWavesInAudioMode?: boolean;
    /**
     * 是否使用视频视图的填充模式
     * 默认为true，表示视频视图将按照保持宽高比的方式进行填充。
     * 可以配置为false，此时视频视图将按实际大小显示，可能会有黑边。
     */
    useVideoViewAspectFill?: boolean;
    /**
     * 是否在视图上显示麦克风状态
     * 默认为true，表示将在视图上显示麦克风的开关状态。
     * 可以配置为false，隐藏麦克风状态显示。
     */
    showMicrophoneStateOnView?: boolean;
    /**
     * 是否在视图上显示摄像头状态
     * 默认为false，表示不在视图上显示摄像头的开关状态。
     * 可以配置为true，以显示摄像头状态。
     */
    showCameraStateOnView?: boolean;
    /**
     * 是否在视图上显示用户名
     * 默认为true，表示将在视图上显示用户名。
     * 可以配置为false，隐藏用户名显示。
     */
    showUserNameOnView?: boolean;
}
export declare enum ViewType {
    BIG = 0,
    SMALL = 1
}
