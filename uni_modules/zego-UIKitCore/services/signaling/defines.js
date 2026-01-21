export var ZegoInvitationType;
(function (ZegoInvitationType) {
    ZegoInvitationType[ZegoInvitationType["VoiceCall"] = 0] = "VoiceCall";
    ZegoInvitationType[ZegoInvitationType["VideoCall"] = 1] = "VideoCall";
})(ZegoInvitationType || (ZegoInvitationType = {}));
// 定义 InvitationState 枚举类型
export var ZegoUIKitInvitationState;
(function (ZegoUIKitInvitationState) {
    ZegoUIKitInvitationState[ZegoUIKitInvitationState["Error"] = 0] = "Error";
    ZegoUIKitInvitationState[ZegoUIKitInvitationState["Waiting"] = 1] = "Waiting";
    ZegoUIKitInvitationState[ZegoUIKitInvitationState["Accept"] = 2] = "Accept";
    ZegoUIKitInvitationState[ZegoUIKitInvitationState["Refuse"] = 3] = "Refuse";
    ZegoUIKitInvitationState[ZegoUIKitInvitationState["Cancel"] = 4] = "Cancel";
    ZegoUIKitInvitationState[ZegoUIKitInvitationState["Timeout"] = 5] = "Timeout"; // 超时状态
})(ZegoUIKitInvitationState || (ZegoUIKitInvitationState = {}));
/**
 * 拒绝呼叫邀请原因
 */
export var CallInvitationRejectReason;
(function (CallInvitationRejectReason) {
    CallInvitationRejectReason["Declined"] = "declined";
    CallInvitationRejectReason["Busy"] = "busy";
})(CallInvitationRejectReason || (CallInvitationRejectReason = {}));
