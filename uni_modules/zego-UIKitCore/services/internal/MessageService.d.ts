import { ZegoInRoomMessage, ZegoInRoomMessageListener, ZegoInRoomMessageSendStateListener } from '../defines';
export declare class MessageService {
    private messageListeners;
    static messageID: number;
    sendInRoomMessage(message: string, listener?: ZegoInRoomMessageSendStateListener): Promise<void>;
    resendInRoomMessage(message: ZegoInRoomMessage, listener: ZegoInRoomMessageSendStateListener): void;
    notifyInRoomMessageReceived(roomID: string, messageList: ZegoInRoomMessage[]): void;
    addInRoomMessageReceivedListener(listenerID: string, listener: ZegoInRoomMessageListener): void;
    removeInRoomMessageReceivedListener(listenerID: string): void;
    clear(): void;
}
