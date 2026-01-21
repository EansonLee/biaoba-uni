import { ZegoStream } from "../express/ZegoExpressUniApp";
import { ZegoUIKitUser } from "../defines";
export declare class UIKitCoreUser {
    userID: string;
    userName: string;
    isCameraOn: boolean;
    isMicrophoneOn: boolean;
    mainStreamID?: string;
    shareStreamID?: string;
    soundLevel: number;
    attributes?: Record<string, string>;
    constructor(userID: string, userName?: string);
    getUIKitUser(): ZegoUIKitUser;
    private static readonly MAIN_STREAM_ID;
    setStreamID(streamID: string): void;
    static createFromStream(stream: ZegoStream): UIKitCoreUser;
    deleteStream(streamID: string): void;
}
