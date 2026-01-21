export class ZegoCallInvitationData {
    callID;
    type;
    invitees;
    inviter;
    customData;
    invitationID; // 如果invitationID可能存在也可能不存在，可以将其设置为可选属性
    constructor(callID, type, invitees, inviter, customData, invitationID) {
        this.callID = callID;
        this.type = type;
        this.invitees = invitees;
        this.inviter = inviter;
        this.customData = customData;
        if (invitationID) {
            this.invitationID = invitationID;
        }
    }
}
