export class UIKitCoreUser {
    userID;
    userName;
    isCameraOn = false;
    isMicrophoneOn = false;
    mainStreamID;
    shareStreamID;
    soundLevel = 0;
    attributes;
    constructor(userID, userName) {
        this.userID = userID;
        this.userName = userName || userID;
    }
    getUIKitUser() {
        const { userID, userName, isCameraOn, isMicrophoneOn, mainStreamID, attributes } = this;
        const user = {
            userID,
            userName,
            isCameraOn,
            isMicrophoneOn,
            streamID: mainStreamID,
            inRoomAttributes: attributes,
        };
        // 直接检查并设置avatar
        if (attributes && attributes.avatar) {
            user.avatar = attributes.avatar;
        }
        return user;
    }
    static MAIN_STREAM_ID = "main";
    setStreamID(streamID) {
        this[streamID.includes(UIKitCoreUser.MAIN_STREAM_ID) ? 'mainStreamID' : 'shareStreamID'] = streamID;
    }
    static createFromStream(stream) {
        const userName = stream.user.userName ?? "";
        const user = new UIKitCoreUser(stream.user.userID, userName);
        user.setStreamID(stream.streamID);
        return user;
    }
    deleteStream(streamID) {
        if (streamID.includes("main")) {
            this.mainStreamID = '';
        }
        else {
            this.shareStreamID = '';
        }
    }
}
