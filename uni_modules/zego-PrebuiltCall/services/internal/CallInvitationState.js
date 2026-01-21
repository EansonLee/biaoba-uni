/**
 * 呼叫邀请状态枚举。
 */
export var CallInvitationState;
(function (CallInvitationState) {
    /**
     * 错误状态，表示邀请过程中发生了错误。
     */
    CallInvitationState[CallInvitationState["Error"] = 0] = "Error";
    /**
     * 等待状态，表示邀请已发出，正在等待对方响应。
     */
    CallInvitationState[CallInvitationState["Waiting"] = 1] = "Waiting";
    /**
     * 接受状态，表示对方接受了邀请。
     */
    CallInvitationState[CallInvitationState["Accept"] = 2] = "Accept";
    /**
     * 拒绝状态，表示对方拒绝了邀请。
     */
    CallInvitationState[CallInvitationState["Refuse"] = 3] = "Refuse";
    /**
     * 取消状态，表示邀请被发起方取消。
     */
    CallInvitationState[CallInvitationState["Cancel"] = 4] = "Cancel";
    /**
     * 超时状态，表示邀请等待响应超时。
     */
    CallInvitationState[CallInvitationState["Timeout"] = 5] = "Timeout";
})(CallInvitationState || (CallInvitationState = {}));
