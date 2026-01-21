/**
 * 定义通话结束原因的枚举类型。
 */
export declare enum ZegoCallEndReason {
    /**
     * 本地挂断
     */
    LocalHangup = 0,
    /**
     * 远程挂断
     */
    RemoteHangup = 1,
    /**
     * 被踢出通话
     */
    KickOut = 2
}
