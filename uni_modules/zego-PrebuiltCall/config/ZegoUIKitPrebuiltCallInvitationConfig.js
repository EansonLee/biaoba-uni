// TypeScript Version
export const defalutPrebuiltCallInvitationConfig = {
    showDeclineButton: true,
    endCallWhenInitiatorLeave: false,
    canInvitingInCalling: false,
    onlyInitiatorCanInvite: false,
};
export const defaultCallingInvitationListConfig = {
    waitingSelectUsers: [],
    defaultChecked: true,
};
export class ZegoUIKitPrebuiltCallInvitationConfig {
    // 呼叫邀请的来电铃声。
    incomingCallRingtone;
    // 呼叫邀请的去电铃声。
    outgoingCallRingtone;
    incomingCallBackground;
    outgoingCallBackground;
    // 显示拒绝邀请按钮。默认为true。
    showDeclineButton;
    callConfig;
    // 当呼叫发起者离开通话时，整个通话是否应该结束（导致其他参与者一起离开）。
    // 默认值为false。
    // 如果设置为false，则即使发起者离开，通话仍然可以继续。
    endCallWhenInitiatorLeave;
    // 当应用程序在后台运行或退出时是否启用消息推送
    enableNotifyWhenAppRunningInBackgroundOrQuit;
    // 离线推送注册配置 IOS端使用
    offlinePushConfigWhenRegister;
    // 各家厂商的离线推送设置项
    offlinePushConfig;
    // 是否允许在通话中发送邀请
    // 默认值为false。
    canInvitingInCalling;
    // 是否只有呼叫发起者有权限邀请其他人加入通话。
    // 默认值为false。
    // 如果设置为false，则通话中的所有参与者都可以邀请其他人。
    onlyInitiatorCanInvite;
    // 当拒绝按钮被按下时（被叫用户拒绝呼叫邀请），将触发此回调。
    onIncomingCallDeclineButtonPressed;
    // 当接受按钮被按下时（被叫用户接受呼叫邀请），将触发此回调。
    onIncomingCallAcceptButtonPressed;
    // 当接收到呼叫邀请时，将触发此回调。
    onIncomingCallReceived;
    // 当主叫用户取消呼叫邀请时，将触发此回调
    onIncomingCallCanceled;
    // 被叫用户在超时时间内未响应呼叫邀请时，将通过此回调接收到通知。
    onIncomingCallTimeout;
    // 当取消按钮被按下时（主叫用户取消呼叫邀请），将触发此回调。
    onOutgoingCallCancelButtonPressed;
    // 当被叫用户接受呼叫邀请时，主叫用户将通过此回调接收到通知。
    onOutgoingCallAccepted;
    // 当被叫用户拒绝呼叫邀请时（被呼叫者忙碌），主叫用户将通过此回调接收到通知。
    onOutgoingCallRejectedCauseBusy;
    // 当被叫用户主动拒绝呼叫邀请时，主叫用户将通过此回调接收到通知。
    onOutgoingCallDeclined;
    // 当呼叫邀请在超时时间内未收到响应时，主叫用户将通过此回调接收到通知。
    onOutgoingCallTimeout;
    // 用户点击邀请列表回调
    // 通过回调自定义邀请用户列表
    onCallingInvitationListSheetDisplay;
}
