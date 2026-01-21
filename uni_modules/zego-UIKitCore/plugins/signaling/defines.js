// 信令插件连接状态枚举
export var ZegoSignalingConnectionState;
(function (ZegoSignalingConnectionState) {
    // 断开连接状态
    ZegoSignalingConnectionState[ZegoSignalingConnectionState["Disconnected"] = 0] = "Disconnected";
    // 连接中状态
    ZegoSignalingConnectionState[ZegoSignalingConnectionState["Connecting"] = 1] = "Connecting";
    // 已连接状态
    ZegoSignalingConnectionState[ZegoSignalingConnectionState["Connected"] = 2] = "Connected";
    // 重新连接中状态
    ZegoSignalingConnectionState[ZegoSignalingConnectionState["Reconnecting"] = 3] = "Reconnecting";
})(ZegoSignalingConnectionState || (ZegoSignalingConnectionState = {}));
