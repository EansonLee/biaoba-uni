import { ZegoAudioVideoViewConfig, ZegoLayoutMode, ZegoViewPosition } from "@/uni_modules/zego-UIKitCore";
import { ZegoBottomMenuBarConfig, ZegoPrebuiltVideoConfig } from "./defines";
export class ZegoUIKitPrebuiltCallConfig {
    // 加入房间时是否自动开启摄像头，默认开启
    turnOnCameraWhenJoining = true;
    // 加入房间时是否自动开启麦克风，默认开启
    turnOnMicrophoneWhenJoining = true;
    // 加入房间时是否使用扬声器，默认开启
    useSpeakerWhenJoining = true;
    // 音视频视图配置
    audioVideoViewConfig = new ZegoAudioVideoViewConfig();
    // 布局配置
    layout;
    // 底部菜单栏配置
    bottomMenuBarConfig = new ZegoBottomMenuBarConfig();
    // // 顶部菜单栏配置
    // public topMenuBarConfig = new ZegoTopMenuBarConfig();
    // // 成员列表配置
    // public memberListConfig = new ZegoMemberListConfig();
    // 视频配置，预设分辨率为360p
    videoConfig = new ZegoPrebuiltVideoConfig();
    hangUpConfirmInfo;
    onHangUpConfirmation;
    onHangUp;
    onNetworkStatusChange;
    // 通话时长配置，可选
    durationConfig;
    // 头像视图提供者，可选
    // public avatarViewProvider?: ZegoAvatarViewProvider;
    // 房间内聊天配置
    // public inRoomChatConfig = new ZegoInRoomChatConfig();
    /**
     * 通话中邀请用户，邀请用户窗口将出现在邀请方，如果您想隐藏此视图，请将其设置为false。默认展示。
     * 可以在此视图中取消对此用户的邀请。
     */
    showWaitingCallAcceptAudioVideoView = true;
    static oneOnOneVideoCall() {
        const config = new ZegoUIKitPrebuiltCallConfig();
        config.turnOnCameraWhenJoining = true;
        config.turnOnMicrophoneWhenJoining = true;
        config.useSpeakerWhenJoining = true;
        const layoutConfig = {
            smallViewPosition: ZegoViewPosition.TopRight,
            switchLargeOrSmallViewByClick: true,
        };
        config.layout = {
            mode: ZegoLayoutMode.PictureInPicture,
            config: layoutConfig,
        };
        return config;
    }
    static oneOnOneVoiceCall() {
        const config = new ZegoUIKitPrebuiltCallConfig();
        config.turnOnCameraWhenJoining = false;
        config.turnOnMicrophoneWhenJoining = true;
        config.useSpeakerWhenJoining = false;
        const layoutConfig = {
            smallViewPosition: ZegoViewPosition.TopRight,
            switchLargeOrSmallViewByClick: true,
        };
        config.layout = {
            mode: ZegoLayoutMode.PictureInPicture,
            config: layoutConfig,
        };
        return config;
    }
}
