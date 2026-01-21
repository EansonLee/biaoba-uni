/**
 * 提供 ExpressEngineEventHandler 的默认实现
 */
export class DefaultExpressEventHandler {
    handler;
    constructor(handler) {
        this.handler = handler;
    }
    apiCalledResult(errorCode, funcName, info) {
        this.handler?.apiCalledResult?.(errorCode, funcName, info);
    }
    onLocalCameraStateUpdate(open) {
        this.handler?.onLocalCameraStateUpdate?.(open);
    }
    onLocalMicrophoneStateUpdate(open) {
        this.handler?.onLocalMicrophoneStateUpdate?.(open);
    }
    engineStateUpdate(state) {
        this.handler?.engineStateUpdate?.(state);
    }
    roomStateUpdate(roomID, state, errorCode, extendedData) {
        this.handler?.roomStateUpdate?.(roomID, state, errorCode, extendedData);
    }
    roomStateChanged(roomID, reason, errorCode, extendedData) {
        this.handler?.roomStateChanged?.(roomID, reason, errorCode, extendedData);
    }
    roomUserUpdate(roomID, updateType, userList) {
        this.handler?.roomUserUpdate?.(roomID, updateType, userList);
    }
    roomOnlineUserCountUpdate(roomID, count) {
        this.handler?.roomOnlineUserCountUpdate?.(roomID, count);
    }
    roomStreamUpdate(roomID, updateType, streamList, extendedData) {
        this.handler?.roomStreamUpdate?.(roomID, updateType, streamList, extendedData);
    }
    roomStreamExtraInfoUpdate(roomID, streamList) {
        this.handler?.roomStreamExtraInfoUpdate?.(roomID, streamList);
    }
    roomExtraInfoUpdate(roomID, roomExtraInfoList) {
        this.handler?.roomExtraInfoUpdate?.(roomID, roomExtraInfoList);
    }
    roomTokenWillExpire(roomID, remainTimeInSecond) {
        this.handler?.roomTokenWillExpire?.(roomID, remainTimeInSecond);
    }
    publisherStateUpdate(streamID, state, errorCode, extendedData) {
        this.handler?.publisherStateUpdate?.(streamID, state, errorCode, extendedData);
    }
    publisherQualityUpdate(streamID, quality) {
        this.handler?.publisherQualityUpdate?.(streamID, quality);
    }
    publisherCapturedAudioFirstFrame() {
        this.handler?.publisherCapturedAudioFirstFrame?.();
    }
    publisherCapturedVideoFirstFrame(channel) {
        this.handler?.publisherCapturedVideoFirstFrame?.(channel);
    }
    publisherRenderVideoFirstFrame(channel) {
        this.handler?.publisherRenderVideoFirstFrame?.(channel);
    }
    publisherVideoSizeChanged(width, height, channel) {
        this.handler?.publisherVideoSizeChanged?.(width, height, channel);
    }
    publisherRelayCDNStateUpdate(streamID, infoList) {
        this.handler?.publisherRelayCDNStateUpdate?.(streamID, infoList);
    }
    playerStateUpdate(streamID, state, errorCode, extendedData) {
        this.handler?.playerStateUpdate?.(streamID, state, errorCode, extendedData);
    }
    playerQualityUpdate(streamID, quality) {
        this.handler?.playerQualityUpdate?.(streamID, quality);
    }
    playerMediaEvent(streamID, event) {
        this.handler?.playerMediaEvent?.(streamID, event);
    }
    playerRecvAudioFirstFrame(streamID) {
        this.handler?.playerRecvAudioFirstFrame?.(streamID);
    }
    playerRecvVideoFirstFrame(streamID) {
        this.handler?.playerRecvVideoFirstFrame?.(streamID);
    }
    playerRenderVideoFirstFrame(streamID) {
        this.handler?.playerRenderVideoFirstFrame?.(streamID);
    }
    playerVideoSizeChanged(streamID, width, height) {
        this.handler?.playerVideoSizeChanged?.(streamID, width, height);
    }
    mixerRelayCDNStateUpdate(taskID, infoList) {
        this.handler?.mixerRelayCDNStateUpdate?.(taskID, infoList);
    }
    mixerSoundLevelUpdate(soundLevels) {
        this.handler?.mixerSoundLevelUpdate?.(soundLevels);
    }
    autoMixerSoundLevelUpdate(soundLevels) {
        this.handler?.autoMixerSoundLevelUpdate?.(soundLevels);
    }
    capturedSoundLevelInfoUpdate(soundLevelInfo) {
        this.handler?.capturedSoundLevelInfoUpdate?.(soundLevelInfo);
    }
    remoteSoundLevelUpdate(soundLevelInfos) {
        this.handler?.remoteSoundLevelUpdate?.(soundLevelInfos);
    }
    localDeviceExceptionOccurred(exceptionType, deviceType, deviceID) {
        this.handler?.localDeviceExceptionOccurred?.(exceptionType, deviceType, deviceID);
    }
    remoteCameraStateUpdate(streamID, state) {
        this.handler?.remoteCameraStateUpdate?.(streamID, state);
    }
    remoteMicStateUpdate(streamID, state) {
        this.handler?.remoteMicStateUpdate?.(streamID, state);
    }
    remoteSpeakerStateUpdate(streamID, state) {
        this.handler?.remoteSpeakerStateUpdate?.(streamID, state);
    }
    audioRouteChange(audioRoute) {
        this.handler?.audioRouteChange?.(audioRoute);
    }
    IMRecvBroadcastMessage(roomID, messageList) {
        this.handler?.IMRecvBroadcastMessage?.(roomID, messageList);
    }
    IMRecvBarrageMessage(roomID, messageList) {
        this.handler?.IMRecvBarrageMessage?.(roomID, messageList);
    }
    IMRecvCustomCommand(roomID, fromUser, command) {
        this.handler?.IMRecvCustomCommand?.(roomID, fromUser, command);
    }
    capturedDataRecordStateUpdate(state, errorCode, config, channel) {
        this.handler?.capturedDataRecordStateUpdate?.(state, errorCode, config, channel);
    }
    capturedDataRecordProgressUpdate(progress, config, channel) {
        this.handler?.capturedDataRecordProgressUpdate?.(progress, config, channel);
    }
}
