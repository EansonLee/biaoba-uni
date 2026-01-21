/**
 * 用户信息接口，用于描述房间内的用户状态。
 */
export class ZegoUIKitUser {
    userID;
    userName;
    isCameraOn = false;
    isMicrophoneOn = false;
    avatar;
    inRoomAttributes;
    streamID;
    constructor(userID, userName) {
        this.userID = userID;
        this.userName = userName || userID;
    }
}
export var ZegoUIKitScenario;
(function (ZegoUIKitScenario) {
    /** 支持版本：3.0.0 及以上。详情描述：默认（通用）场景，若下列场景枚举均不符合开发者的实际应用场景，可使用此默认场景。 */
    ZegoUIKitScenario[ZegoUIKitScenario["Default"] = 3] = "Default";
    /** 支持版本：3.0.0 及以上。详情描述：标准音视频通话场景，适用于 1v1 视频通话场景。 */
    ZegoUIKitScenario[ZegoUIKitScenario["StandardVideoCall"] = 4] = "StandardVideoCall";
    /** 支持版本：3.0.0 及以上。详情描述：高品质音视频通话场景，与标准音视频通话场景类似，但该场景默认采用了更高的视频帧率、码率、分辨率 (540p)，适用于对画质要求较高的视频通话场景。 */
    ZegoUIKitScenario[ZegoUIKitScenario["HighQualityVideoCall"] = 5] = "HighQualityVideoCall";
    /** 支持版本：3.0.0 及以上。详情描述：标准语聊房场景，适用于多人纯语音通话（节省流量）。注意：在实时音视频 (ExpressVideo) SDK 上，此场景默认不开启摄像头。 */
    ZegoUIKitScenario[ZegoUIKitScenario["StandardChatroom"] = 6] = "StandardChatroom";
    /** 支持版本：3.0.0 及以上。详情描述：高品质语聊房场景，与标准语聊房场景类似，但此场景默认采用了更高的音频码率。适用于对音质要求较高的多人纯语音通话场景。注意：在实时音视频 (ExpressVideo) SDK 上，此场景默认不开启摄像头。 */
    ZegoUIKitScenario[ZegoUIKitScenario["HighQualityChatroom"] = 7] = "HighQualityChatroom";
    /** 支持版本：3.0.0 及以上。详情描述：直播场景，适用于秀场、游戏、电商、教育大班课等一对多直播的场景，对音画质量、流畅度、兼容性进行了优化。注意：即便是直播场景，SDK 也没有业务上的 “角色” 之分（例如主播、观众），房间内的所有用户均可推拉流。 */
    ZegoUIKitScenario[ZegoUIKitScenario["Broadcast"] = 8] = "Broadcast";
    /** 支持版本：3.0.0 及以上。详情描述：卡拉 OK (KTV) 场景，适用于实时合唱、在线 K 歌场景，对延迟、音质、耳返、回声消除等做了优化，同时还保障了多人合唱时精准对齐和超低时延。 */
    ZegoUIKitScenario[ZegoUIKitScenario["Karaoke"] = 9] = "Karaoke";
    /** 支持版本：3.3.0 及以上。详情描述：标准语音通话场景，适用于 1v1 纯语音通话场景。注意：在实时音视频 (ExpressVideo) SDK 上，此场景默认不开启摄像头。 */
    ZegoUIKitScenario[ZegoUIKitScenario["StandardVoiceCall"] = 10] = "StandardVoiceCall";
})(ZegoUIKitScenario || (ZegoUIKitScenario = {}));
export var ZegoVideoCodecID;
(function (ZegoVideoCodecID) {
    /** 默认编码 (H.264) */
    ZegoVideoCodecID[ZegoVideoCodecID["Default"] = 0] = "Default";
    /** 分层编码 (H.264 SVC) */
    ZegoVideoCodecID[ZegoVideoCodecID["SVC"] = 1] = "SVC";
    /** VP8 */
    ZegoVideoCodecID[ZegoVideoCodecID["VP8"] = 2] = "VP8";
    /** H.265 */
    ZegoVideoCodecID[ZegoVideoCodecID["H265"] = 3] = "H265";
    /** 视频大小流编码 */
    ZegoVideoCodecID[ZegoVideoCodecID["H264DualStream"] = 4] = "H264DualStream";
    /** 未知编码类型 */
    ZegoVideoCodecID[ZegoVideoCodecID["Unknown"] = 100] = "Unknown";
})(ZegoVideoCodecID || (ZegoVideoCodecID = {}));
/**
 * 预设分辨率枚举。
 */
export var ZegoPresetResolution;
(function (ZegoPresetResolution) {
    ZegoPresetResolution[ZegoPresetResolution["Preset180p"] = 0] = "Preset180p";
    ZegoPresetResolution[ZegoPresetResolution["Preset270p"] = 1] = "Preset270p";
    ZegoPresetResolution[ZegoPresetResolution["Preset360p"] = 2] = "Preset360p";
    ZegoPresetResolution[ZegoPresetResolution["Preset540p"] = 3] = "Preset540p";
    ZegoPresetResolution[ZegoPresetResolution["Preset720p"] = 4] = "Preset720p";
    ZegoPresetResolution[ZegoPresetResolution["Preset1080p"] = 5] = "Preset1080p";
})(ZegoPresetResolution || (ZegoPresetResolution = {}));
/**
 * 消息发送状态枚举，用于描述消息的发送状态。
 */
export var ZegoInRoomMessageState;
(function (ZegoInRoomMessageState) {
    ZegoInRoomMessageState[ZegoInRoomMessageState["Idle"] = 0] = "Idle";
    ZegoInRoomMessageState[ZegoInRoomMessageState["Sending"] = 1] = "Sending";
    ZegoInRoomMessageState[ZegoInRoomMessageState["Success"] = 2] = "Success";
    ZegoInRoomMessageState[ZegoInRoomMessageState["Failed"] = 3] = "Failed";
})(ZegoInRoomMessageState || (ZegoInRoomMessageState = {}));
/**
 * 音视频资源模式枚举，用于描述不同的音视频资源模式。
 */
export var ZegoAudioVideoResourceMode;
(function (ZegoAudioVideoResourceMode) {
    ZegoAudioVideoResourceMode[ZegoAudioVideoResourceMode["Default"] = 0] = "Default";
    ZegoAudioVideoResourceMode[ZegoAudioVideoResourceMode["CdnOnly"] = 1] = "CdnOnly";
    ZegoAudioVideoResourceMode[ZegoAudioVideoResourceMode["L3Only"] = 2] = "L3Only";
    ZegoAudioVideoResourceMode[ZegoAudioVideoResourceMode["RtcOnly"] = 3] = "RtcOnly";
    ZegoAudioVideoResourceMode[ZegoAudioVideoResourceMode["CdnPlus"] = 4] = "CdnPlus";
})(ZegoAudioVideoResourceMode || (ZegoAudioVideoResourceMode = {}));
/**
 * 音频输出设备枚举，用于描述不同的音频输出设备类型。
 */
export var ZegoAudioOutputDevice;
(function (ZegoAudioOutputDevice) {
    ZegoAudioOutputDevice[ZegoAudioOutputDevice["Speaker"] = 0] = "Speaker";
    ZegoAudioOutputDevice[ZegoAudioOutputDevice["Headphone"] = 1] = "Headphone";
    ZegoAudioOutputDevice[ZegoAudioOutputDevice["Bluetooth"] = 2] = "Bluetooth";
    ZegoAudioOutputDevice[ZegoAudioOutputDevice["EarSpeaker"] = 3] = "EarSpeaker";
    ZegoAudioOutputDevice[ZegoAudioOutputDevice["ExternalUsb"] = 4] = "ExternalUsb";
})(ZegoAudioOutputDevice || (ZegoAudioOutputDevice = {}));
/**
 * app 当前状态
 */
export var AppState;
(function (AppState) {
    AppState["Background"] = "background";
    AppState["Active"] = "active";
})(AppState || (AppState = {}));
