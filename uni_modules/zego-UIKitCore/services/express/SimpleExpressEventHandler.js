import { makeTag, zloginfo } from "../../utils";
const TAG = makeTag('SimpleExpressEventHandler');
export class SimpleExpressEventHandler {
    // 给个默认实现
    handlerList = [];
    constructor() {
        // 对外隐藏 handlerList
        Object.defineProperty(this, 'handlerList', {
            enumerable: false
        });
    }
    addHandler(handler) {
        if (handler) {
            this.handlerList.push(handler);
        }
    }
    removeHandler(handler) {
        if (handler) {
            const index = this.handlerList.indexOf(handler);
            if (index > -1) {
                this.handlerList.splice(index, 1);
            }
        }
    }
    removeEventHandlerList(list) {
        this.handlerList = this.handlerList.filter((handler) => !list.includes(handler));
    }
    removeAllEventHandlers() {
        this.handlerList.length = 0;
    }
    apiCalledResult = (errorCode, funcName, info) => {
        // if (errorCode === 0) {
        //     zloginfo(`${TAG} apiCalledResult: ${funcName} ${errorCode} ${info}`)
        // } else {
        //     zlogerror(`${TAG} apiCalledResult: ${funcName} ${errorCode} ${info}`)
        // }
        this.handlerList.forEach(handler => handler.apiCalledResult?.(errorCode, funcName, info));
    };
    engineStateUpdate = (state) => {
        zloginfo(`${TAG} engineStateUpdate: state=${state}`);
        this.handlerList.forEach(handler => handler.engineStateUpdate?.(state));
    };
    roomStateUpdate = (roomID, state, errorCode, extendedData) => {
        zloginfo(`${TAG} roomStateUpdate: roomID=${roomID}, state=${state}, errorCode=${errorCode}, ${JSON.stringify(extendedData)}`);
        this.handlerList.forEach(handler => handler.roomStateUpdate?.(roomID, state, errorCode, extendedData));
    };
    roomStateChanged = (roomID, reason, errorCode, extendedData) => {
        zloginfo(`${TAG} roomStateChanged: roomID=${roomID}, reason=${reason}, errorCode=${errorCode}, ${JSON.stringify(extendedData)}`);
        this.handlerList.forEach(handler => handler.roomStateChanged?.(roomID, reason, errorCode, extendedData));
    };
    roomUserUpdate = (roomID, updateType, userList) => {
        zloginfo(`${TAG} roomUserUpdate: roomID=${roomID}, updateType=${updateType}, userList=${JSON.stringify(userList)}`);
        this.handlerList.forEach(handler => handler.roomUserUpdate?.(roomID, updateType, userList));
    };
    roomOnlineUserCountUpdate = (roomID, count) => {
        zloginfo(`${TAG} roomOnlineUserCountUpdate: ${roomID} ${count}`);
        this.handlerList.forEach(handler => handler.roomOnlineUserCountUpdate?.(roomID, count));
    };
    roomStreamUpdate = (roomID, updateType, streamList, extendedData) => {
        zloginfo(`${TAG} roomStreamUpdate: roomID=${roomID}, updateType=${updateType}, streamList=${JSON.stringify(streamList)}, ${JSON.stringify(extendedData)}`);
        this.handlerList.forEach(handler => handler.roomStreamUpdate?.(roomID, updateType, streamList, extendedData));
    };
    roomStreamExtraInfoUpdate = (roomID, streamList) => {
        // zloginfo(`${TAG} roomStreamExtraInfoUpdate: ${roomID} ${JSON.stringify(streamList)}`)
        this.handlerList.forEach(handler => handler.roomStreamExtraInfoUpdate?.(roomID, streamList));
    };
    roomExtraInfoUpdate = (roomID, roomExtraInfoList) => {
        zloginfo(`${TAG} roomExtraInfoUpdate: ${roomID} ${roomExtraInfoList}`);
        this.handlerList.forEach(handler => handler.roomExtraInfoUpdate?.(roomID, roomExtraInfoList));
    };
    roomTokenWillExpire = (roomID, remainTimeInSecond) => {
        zloginfo(`${TAG} roomTokenWillExpire: ${roomID} ${remainTimeInSecond}`);
        this.handlerList.forEach(handler => handler.roomTokenWillExpire?.(roomID, remainTimeInSecond));
    };
    publisherStateUpdate = (streamID, state, errorCode, extendedData) => {
        zloginfo(`${TAG} publisherStateUpdate: streamID=${streamID}, state=${state}, errorCode=${errorCode}, extendedData=${JSON.stringify(extendedData)}`);
        this.handlerList.forEach(handler => handler.publisherStateUpdate?.(streamID, state, errorCode, extendedData));
    };
    publisherQualityUpdate = (streamID, quality) => {
        // zloginfo(`${TAG} publisherQualityUpdate: ${streamID} ${JSON.stringify(quality)}`)
        this.handlerList.forEach(handler => handler.publisherQualityUpdate?.(streamID, quality));
    };
    publisherCapturedAudioFirstFrame = () => {
        zloginfo(`${TAG} publisherCapturedAudioFirstFrame`);
        this.handlerList.forEach(handler => handler.publisherCapturedAudioFirstFrame?.());
    };
    publisherCapturedVideoFirstFrame = (channel) => {
        zloginfo(`${TAG} publisherCapturedVideoFirstFrame ${channel}`);
        this.handlerList.forEach(handler => handler.publisherCapturedVideoFirstFrame?.(channel));
    };
    publisherRenderVideoFirstFrame = (channel) => {
        zloginfo(`${TAG} publisherRenderVideoFirstFrame ${channel}`);
        this.handlerList.forEach(handler => handler.publisherRenderVideoFirstFrame?.(channel));
    };
    publisherVideoSizeChanged = (width, height, channel) => {
        zloginfo(`${TAG} publisherVideoSizeChanged ${width} ${height} ${channel}`);
        this.handlerList.forEach(handler => handler.publisherVideoSizeChanged?.(width, height, channel));
    };
    publisherRelayCDNStateUpdate = (streamID, infoList) => {
        zloginfo(`${TAG} publisherRelayCDNStateUpdate ${streamID} ${infoList}`);
        this.handlerList.forEach(handler => handler.publisherRelayCDNStateUpdate?.(streamID, infoList));
    };
    playerStateUpdate = (streamID, state, errorCode, extendedData) => {
        zloginfo(`${TAG} playerStateUpdate ${streamID} ${state} ${errorCode} ${JSON.stringify(extendedData)}`);
        this.handlerList.forEach(handler => handler.playerStateUpdate?.(streamID, state, errorCode, extendedData));
    };
    playerQualityUpdate = (streamID, quality) => {
        // zloginfo(`${TAG} playerQualityUpdate ${streamID} ${JSON.stringify(quality)}`)
        this.handlerList.forEach(handler => handler.playerQualityUpdate?.(streamID, quality));
    };
    playerMediaEvent = (streamID, event) => {
        zloginfo(`${TAG} playerMediaEvent ${streamID} ${event}`);
        this.handlerList.forEach(handler => handler.playerMediaEvent?.(streamID, event));
    };
    playerRecvAudioFirstFrame = (streamID) => {
        zloginfo(`${TAG} playerRecvAudioFirstFrame ${streamID}`);
        this.handlerList.forEach(handler => handler.playerRecvAudioFirstFrame?.(streamID));
    };
    playerRecvVideoFirstFrame = (streamID) => {
        zloginfo(`${TAG} playerRecvVideoFirstFrame ${streamID}`);
        this.handlerList.forEach(handler => handler.playerRecvVideoFirstFrame?.(streamID));
    };
    playerRenderVideoFirstFrame = (streamID) => {
        zloginfo(`${TAG} playerRenderVideoFirstFrame ${streamID}`);
        this.handlerList.forEach(handler => handler.playerRenderVideoFirstFrame?.(streamID));
    };
    playerVideoSizeChanged = (streamID, width, height) => {
        zloginfo(`${TAG} playerVideoSizeChanged ${streamID} ${width} ${height}`);
        this.handlerList.forEach(handler => handler.playerVideoSizeChanged?.(streamID, width, height));
    };
    mixerRelayCDNStateUpdate = (taskID, infoList) => {
        zloginfo(`${TAG} mixerRelayCDNStateUpdate ${taskID} ${infoList}`);
        this.handlerList.forEach(handler => handler.mixerRelayCDNStateUpdate?.(taskID, infoList));
    };
    mixerSoundLevelUpdate = (soundLevels) => {
        zloginfo(`${TAG} mixerSoundLevelUpdate ${soundLevels}`);
        this.handlerList.forEach(handler => handler.mixerSoundLevelUpdate?.(soundLevels));
    };
    autoMixerSoundLevelUpdate = (soundLevels) => {
        zloginfo(`${TAG} autoMixerSoundLevelUpdate ${soundLevels}`);
        this.handlerList.forEach(handler => handler.autoMixerSoundLevelUpdate?.(soundLevels));
    };
    capturedSoundLevelInfoUpdate = (soundLevelInfo) => {
        // zloginfo(`${TAG} capturedSoundLevelInfoUpdate ${soundLevelInfo}`)
        this.handlerList.forEach(handler => handler.capturedSoundLevelInfoUpdate?.(soundLevelInfo));
    };
    remoteSoundLevelUpdate = (soundLevelInfos) => {
        // zloginfo(`${TAG} remoteSoundLevelUpdate ${soundLevelInfos}`)
        this.handlerList.forEach(handler => handler.remoteSoundLevelUpdate?.(soundLevelInfos));
    };
    localDeviceExceptionOccurred = (exceptionType, deviceType, deviceID) => {
        zloginfo(`${TAG} localDeviceExceptionOccurred ${exceptionType} ${deviceType} ${deviceID}`);
        this.handlerList.forEach(handler => handler.localDeviceExceptionOccurred?.(exceptionType, deviceType, deviceID));
    };
    remoteCameraStateUpdate = (streamID, state) => {
        zloginfo(`${TAG} remoteCameraStateUpdate ${streamID} ${state}`);
        this.handlerList.forEach(handler => handler.remoteCameraStateUpdate?.(streamID, state));
    };
    remoteMicStateUpdate = (streamID, state) => {
        zloginfo(`${TAG} remoteMicStateUpdate ${streamID} ${state}`);
        this.handlerList.forEach(handler => handler.remoteMicStateUpdate?.(streamID, state));
    };
    remoteSpeakerStateUpdate = (streamID, state) => {
        zloginfo(`${TAG} remoteSpeakerStateUpdate ${streamID} ${state}`);
        this.handlerList.forEach(handler => handler.remoteSpeakerStateUpdate?.(streamID, state));
    };
    audioRouteChange = (audioRoute) => {
        zloginfo(`${TAG} audioRouteChange ${audioRoute}`);
        this.handlerList.forEach(handler => handler.audioRouteChange?.(audioRoute));
    };
    IMRecvBroadcastMessage = (roomID, messageList) => {
        zloginfo(`${TAG} IMRecvBroadcastMessage ${roomID} ${messageList}`);
        this.handlerList.forEach(handler => handler.IMRecvBroadcastMessage?.(roomID, messageList));
    };
    IMRecvBarrageMessage = (roomID, messageList) => {
        zloginfo(`${TAG} IMRecvBarrageMessage ${roomID} ${messageList}`);
        this.handlerList.forEach(handler => handler.IMRecvBarrageMessage?.(roomID, messageList));
    };
    IMRecvCustomCommand = (roomID, fromUser, command) => {
        zloginfo(`${TAG} IMRecvCustomCommand ${roomID} ${fromUser} ${command}`);
        this.handlerList.forEach(handler => handler.IMRecvCustomCommand?.(roomID, fromUser, command));
    };
    capturedDataRecordStateUpdate = (state, errorCode, config, channel) => {
        zloginfo(`${TAG} capturedDataRecordStateUpdate ${state} ${errorCode} ${config} ${channel}`);
        this.handlerList.forEach(handler => handler.capturedDataRecordStateUpdate?.(state, errorCode, config, channel));
    };
    capturedDataRecordProgressUpdate = (progress, config, channel) => {
        zloginfo(`${TAG} capturedDataRecordProgressUpdate ${progress} ${config} ${channel}`);
        this.handlerList.forEach(handler => handler.capturedDataRecordProgressUpdate?.(progress, config, channel));
    };
}
