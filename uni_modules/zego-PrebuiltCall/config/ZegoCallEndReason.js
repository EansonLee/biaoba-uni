/**
 * 定义通话结束原因的枚举类型。
 */
export var ZegoCallEndReason;
(function (ZegoCallEndReason) {
    /**
     * 本地挂断
     */
    ZegoCallEndReason[ZegoCallEndReason["LocalHangup"] = 0] = "LocalHangup";
    /**
     * 远程挂断
     */
    ZegoCallEndReason[ZegoCallEndReason["RemoteHangup"] = 1] = "RemoteHangup";
    /**
     * 被踢出通话
     */
    ZegoCallEndReason[ZegoCallEndReason["KickOut"] = 2] = "KickOut";
})(ZegoCallEndReason || (ZegoCallEndReason = {}));
