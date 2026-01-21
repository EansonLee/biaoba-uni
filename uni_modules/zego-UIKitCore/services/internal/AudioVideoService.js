import { ZegoPublishChannel } from "../express/ZegoExpressUniApp";
import { ExpressEngineProxy } from '../express/ExpressEngineProxy';
import { NotifyList } from './NotifyList';
import UIKitCore from './UIKitCore';
import { makeTag, zloginfo, zlogwarning } from '../../utils';
const TAG = makeTag('AudioVideoService');
export class AudioVideoService {
    // 然后在您的类中使用 NotifyList
    micStateListeners = new NotifyList();
    cameraStateListeners = new NotifyList();
    audioOutputListeners = new NotifyList();
    soundLevelListeners = new NotifyList();
    turnOnYourCameraRequestListeners = new NotifyList();
    turnOnYourMicrophoneRequestListeners = new NotifyList();
    addMicrophoneStateListener(listenerID, listener) {
        this.micStateListeners.addListener(listenerID, listener);
    }
    removeMicrophoneStateListener(listenerID) {
        this.micStateListeners.removeListener(listenerID);
    }
    addCameraStateListener(listenerID, listener) {
        this.cameraStateListeners.addListener(listenerID, listener);
    }
    removeCameraStateListener(listenerID) {
        this.cameraStateListeners.removeListener(listenerID);
    }
    async addAudioOutputDeviceChangedListener(listenerID, listener) {
        this.audioOutputListeners.addListener(listenerID, listener);
        const audioRouteType = await ExpressEngineProxy.getAudioRouteType();
        const audioRoute = audioRouteType;
        listener.onAudioOutputDeviceChanged?.(audioRoute);
    }
    removeAudioOutputDeviceChangedListener(listenerID) {
        this.audioOutputListeners.removeListener(listenerID);
    }
    addTurnOnYourCameraRequestListener(listenerID, listener) {
        this.turnOnYourCameraRequestListeners.addListener(listenerID, listener);
    }
    removeTurnOnYourCameraRequestListener(listenerID) {
        this.turnOnYourCameraRequestListeners.removeListener(listenerID);
    }
    addTurnOnYourMicrophoneRequestListener(listenerID, listener) {
        this.turnOnYourMicrophoneRequestListeners.addListener(listenerID, listener);
    }
    removeTurnOnYourMicrophoneRequestListener(listenerID) {
        this.turnOnYourMicrophoneRequestListeners.removeListener(listenerID);
    }
    addSoundLevelUpdatedListener(listenerID, listener) {
        this.soundLevelListeners.addListener(listenerID, listener);
        const userInfo = UIKitCore.getInstance().getLocalCoreUser();
        if (userInfo !== null) {
            listener.onSoundLevelUpdate?.(userInfo.getUIKitUser(), userInfo.soundLevel);
        }
    }
    removeSoundLevelUpdatedListener(listenerID) {
        this.soundLevelListeners.removeListener(listenerID);
    }
    clear() {
        this.micStateListeners.clear();
        this.cameraStateListeners.clear();
        this.audioOutputListeners.clear();
        this.soundLevelListeners.clear();
        this.turnOnYourCameraRequestListeners.clear();
        this.turnOnYourMicrophoneRequestListeners.clear();
    }
    notifyAudioRouteChange(zegoAudioRoute) {
        this.audioOutputListeners.notifyAllListener((audioOutputChangeListener) => {
            const audioRoute = zegoAudioRoute;
            audioOutputChangeListener.onAudioOutputDeviceChanged?.(audioRoute);
        });
    }
    notifyMicStateChange(coreUser, on) {
        this.micStateListeners.notifyAllListener((microphoneStateChangeListener) => {
            microphoneStateChangeListener.onMicrophoneOn?.(coreUser.getUIKitUser(), on);
        });
    }
    notifyCameraStateChange(coreUser, on) {
        this.cameraStateListeners.notifyAllListener((cameraStateChangeListener) => {
            cameraStateChangeListener.onCameraOn?.(coreUser.getUIKitUser(), on);
        });
    }
    notifySoundLevelUpdate(userID, soundLevel) {
        const uiKitUser = UIKitCore.getInstance().getUser(userID);
        if (uiKitUser) {
            this.soundLevelListeners.notifyAllListener((soundLevelUpdateListener) => {
                soundLevelUpdateListener.onSoundLevelUpdate?.(uiKitUser, soundLevel);
            });
        }
    }
    useFrontFacingCamera(isFrontFacing) {
        ExpressEngineProxy.useFrontCamera(isFrontFacing);
    }
    setAudioOutputToSpeaker(enable) {
        ExpressEngineProxy.setAudioRouteToSpeaker(enable);
    }
    turnMicrophoneOn(userID, on) {
        const uiKitCore = UIKitCore.getInstance();
        const coreUser = uiKitCore.getUserByUserID(userID);
        if (coreUser) {
            const stateChanged = coreUser.isMicrophoneOn !== on;
            if (uiKitCore.isLocalUser(userID)) {
                ExpressEngineProxy.muteMicrophone(!on);
                const jsonObject = {
                    "isCameraOn": uiKitCore.isCameraOn(userID),
                    "isMicrophoneOn": on
                };
                const extraInfo = JSON.stringify(jsonObject);
                ExpressEngineProxy.setStreamExtraInfo(extraInfo, ZegoPublishChannel.Main);
                if (on) {
                    zloginfo(TAG, 'turnMicrophoneOn start publish, streamID:', coreUser.mainStreamID);
                    ExpressEngineProxy.startPublishingStream(coreUser.mainStreamID, ZegoPublishChannel.Main);
                    ExpressEngineProxy.startPreview(ZegoPublishChannel.Main);
                }
                else if (!uiKitCore.isCameraOn(userID)) {
                    zloginfo(TAG, 'turnMicrophoneOn stop publish');
                    ExpressEngineProxy.stopPublishingStream(ZegoPublishChannel.Main);
                    ExpressEngineProxy.stopPreview(ZegoPublishChannel.Main);
                }
                // console.error(`openMicrophone from ${coreUser.isMicrophoneOn} to ${on}, has change=${stateChanged}`)
                coreUser.isMicrophoneOn = on;
                if (stateChanged) {
                    this.notifyMicStateChange(coreUser, on);
                }
            }
            else {
                const userIDs = [];
                if (!uiKitCore.checkIsLargeRoom()) {
                    userIDs.push(userID);
                }
                const jsonObject = {};
                if (on) {
                    jsonObject["zego_turn_microphone_on"] = userIDs;
                }
                else {
                    jsonObject["zego_turn_microphone_off"] = userIDs;
                }
                const command = JSON.stringify(jsonObject);
                UIKitCore.getInstance().sendInRoomCommand(command, userIDs, {
                    onSend(errorCode) {
                    },
                });
            }
        }
        else {
            zlogwarning(TAG, 'turnMicrophoneOn', userID, 'user not found');
        }
    }
    turnCameraOn(userID, on) {
        const uiKitCore = UIKitCore.getInstance();
        const coreUser = uiKitCore.getUserByUserID(userID);
        if (coreUser) {
            zloginfo(TAG, 'turnCameraOn', userID, on);
            // console.error("turnCameraOn: coreUser: ", JSON.stringify(coreUser), 'open', on)
            const stateChanged = coreUser.isCameraOn !== on;
            if (uiKitCore.isLocalUser(userID)) {
                ExpressEngineProxy.enableCamera(on, ZegoPublishChannel.Main);
                coreUser.isCameraOn = on;
                const jsonObject = {
                    isCameraOn: on,
                    isMicrophoneOn: uiKitCore.isMicrophoneOn(userID)
                };
                const extraInfo = JSON.stringify(jsonObject);
                ExpressEngineProxy.setStreamExtraInfo(extraInfo, ZegoPublishChannel.Main);
                if (on) {
                    zloginfo(TAG, 'turnCameraOn start publish, streamID:', coreUser.mainStreamID);
                    ExpressEngineProxy.startPublishingStream(coreUser.mainStreamID, ZegoPublishChannel.Main);
                    ExpressEngineProxy.startPreview(ZegoPublishChannel.Main);
                }
                else if (!uiKitCore.isMicrophoneOn(userID)) {
                    zloginfo(TAG, 'turnCameraOn stop publish');
                    ExpressEngineProxy.stopPublishingStream(ZegoPublishChannel.Main);
                    ExpressEngineProxy.stopPreview(ZegoPublishChannel.Main);
                }
                if (stateChanged) {
                    this.notifyCameraStateChange(coreUser, on);
                }
            }
            else {
                const userIDs = [];
                if (!uiKitCore.checkIsLargeRoom()) {
                    userIDs.push(userID);
                }
                const jsonObject = {};
                if (on) {
                    jsonObject["zego_turn_camera_on"] = userIDs;
                }
                else {
                    jsonObject["zego_turn_camera_off"] = userIDs;
                }
                const command = JSON.stringify(jsonObject);
                UIKitCore.getInstance().sendInRoomCommand(command, userIDs, {
                    onSend(errorCode) {
                    },
                });
            }
        }
        else {
            zlogwarning(TAG, 'turnCameraOn', userID, 'user is null');
        }
    }
    startPlayingAllAudioVideo() {
        ExpressEngineProxy.muteAllPlayStreamAudio(false);
        ExpressEngineProxy.muteAllPlayStreamVideo(false);
    }
    stopPlayingAllAudioVideo() {
        ExpressEngineProxy.muteAllPlayStreamAudio(true);
        ExpressEngineProxy.muteAllPlayStreamVideo(true);
    }
    notifyTurnMicrophoneCommand(uiKitUser, turnOn) {
        if (turnOn) {
            this.turnOnYourMicrophoneRequestListeners.notifyAllListener((zegoTurnOnYourMicrophoneRequestListener) => {
                zegoTurnOnYourMicrophoneRequestListener.onTurnOnYourMicrophoneRequest?.(uiKitUser);
            });
        }
    }
    notifyTurnCameraCommand(uiKitUser, turnOn) {
        if (turnOn) {
            this.turnOnYourCameraRequestListeners.notifyAllListener((zegoTurnOnYourCameraRequestListener) => {
                zegoTurnOnYourCameraRequestListener.onTurnOnYourCameraRequest?.(uiKitUser);
            });
        }
    }
    openCamera(open) {
        const localCoreUser = UIKitCore.getInstance().getLocalCoreUser();
        if (localCoreUser) {
            // console.error("openCamera: localCoreUser: ", JSON.stringify(localCoreUser), 'open', open)
            const stateChanged = localCoreUser.isCameraOn !== open;
            localCoreUser.isCameraOn = open;
            ExpressEngineProxy.enableCamera(open, ZegoPublishChannel.Main);
            if (stateChanged) {
                this.notifyCameraStateChange(localCoreUser, open);
            }
            const jsonObject = {
                "isCameraOn": open,
                "isMicrophoneOn": localCoreUser.isMicrophoneOn
            };
            const extraInfo = JSON.stringify(jsonObject);
            ExpressEngineProxy.setStreamExtraInfo(extraInfo, ZegoPublishChannel.Main);
        }
    }
    openMicrophone(open) {
        const localCoreUser = UIKitCore.getInstance().getLocalCoreUser();
        if (localCoreUser) {
            const stateChanged = localCoreUser.isMicrophoneOn !== open;
            localCoreUser.isMicrophoneOn = open;
            // console.error(`openMicrophone from ${localCoreUser.isMicrophoneOn} to ${open}, has change=${stateChanged}`)
            ExpressEngineProxy.muteMicrophone(!open);
            if (stateChanged) {
                this.notifyMicStateChange(localCoreUser, open);
            }
            const jsonObject = {
                "isCameraOn": localCoreUser.isCameraOn,
                "isMicrophoneOn": open
            };
            const extraInfo = JSON.stringify(jsonObject);
            ExpressEngineProxy.setStreamExtraInfo(extraInfo, ZegoPublishChannel.Main);
        }
    }
}
