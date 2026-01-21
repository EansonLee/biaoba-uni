/**
 * 呼叫状态枚举。
 */
export var CallState;
(function (CallState) {
    /**
     * 无通话 - 未回复
     */
    CallState[CallState["NoneCallNoReply"] = -5] = "NoneCallNoReply";
    /**
     * 无通话 - 错过接听
     */
    CallState[CallState["NoneReceiveMissed"] = -4] = "NoneReceiveMissed";
    /**
     * 无通话 - 被拒绝
     */
    CallState[CallState["NoneRejected"] = -3] = "NoneRejected";
    /**
     * 无通话 - 已取消
     */
    CallState[CallState["NoneCanceled"] = -2] = "NoneCanceled";
    /**
     * 无通话 - 已挂断
     */
    CallState[CallState["NoneHangUp"] = -1] = "NoneHangUp";
    /**
     * 无通话
     */
    CallState[CallState["None"] = 0] = "None";
    /**
     * 呼出中
     */
    CallState[CallState["Outgoing"] = 1] = "Outgoing";
    /**
     * 通话中
     */
    CallState[CallState["Connected"] = 2] = "Connected";
    /**
     * 呼入中
     */
    CallState[CallState["Incoming"] = 3] = "Incoming";
})(CallState || (CallState = {}));
export var CallRespondAction;
(function (CallRespondAction) {
    /**
     * 接受
     */
    CallRespondAction["Accept"] = "accept";
    /**
     * 拒绝
     */
    CallRespondAction["Refuse"] = "refuse";
    /**
     * 对方繁忙
     */
    CallRespondAction["Busy"] = "busy";
    /**
     * 发起方取消
     */
    CallRespondAction["InviterCancel"] = "inviterCancel";
    /**
     * 被叫方未响应直到超时
     */
    CallRespondAction["Timeout"] = "timeout";
})(CallRespondAction || (CallRespondAction = {}));
