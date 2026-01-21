import { ZegoEventListener } from "./ZegoExpressUniApp";
export interface ExpressEngineEventHandler extends ZegoEventListener {
    onLocalCameraStateUpdate(open: boolean): void;
    onLocalMicrophoneStateUpdate(open: boolean): void;
}
