import { ExpressEngineProxy } from '../express/ExpressEngineProxy';
import { ZegoInRoomMessageState } from '../defines';
import UIKitCore from './UIKitCore';
import { NotifyList } from './NotifyList';
export class MessageService {
    messageListeners = new NotifyList();
    static messageID = 0;
    async sendInRoomMessage(message, listener) {
        const room = UIKitCore.getInstance().getRoom();
        MessageService.messageID -= 1;
        const inRoomMessage = {
            message: message,
            messageID: MessageService.messageID,
            timestamp: Date.now(),
            user: UIKitCore.getInstance().getLocalCoreUser().getUIKitUser(),
            state: ZegoInRoomMessageState.Idle
        };
        const inRoomMessages = UIKitCore.getInstance().getInRoomMessages();
        inRoomMessages.push(inRoomMessage);
        if (listener) {
            listener.onInRoomMessageSendingStateChanged?.(inRoomMessage);
        }
        this.messageListeners.notifyAllListener((listener) => {
            listener.onInRoomMessageSendingStateChanged?.(inRoomMessage);
        });
        const timer = setTimeout(() => {
            if (inRoomMessage.state === ZegoInRoomMessageState.Idle) {
                inRoomMessage.state = ZegoInRoomMessageState.Sending;
                if (listener) {
                    listener.onInRoomMessageSendingStateChanged?.(inRoomMessage);
                }
                this.messageListeners.notifyAllListener((listener) => {
                    listener.onInRoomMessageSendingStateChanged?.(inRoomMessage);
                });
            }
        }, 300);
        const result = await ExpressEngineProxy.sendBroadcastMessage(room.roomID, message);
        clearTimeout(timer);
        inRoomMessage.state = result.errorCode === 0 ? ZegoInRoomMessageState.Success : ZegoInRoomMessageState.Failed;
        if (listener) {
            listener.onInRoomMessageSendingStateChanged?.(inRoomMessage);
        }
        this.messageListeners.notifyAllListener((listener) => {
            listener.onInRoomMessageSendingStateChanged?.(inRoomMessage);
        });
    }
    resendInRoomMessage(message, listener) {
        const inRoomMessages = UIKitCore.getInstance().getInRoomMessages();
        for (const inRoomMessage of inRoomMessages) {
            if (inRoomMessage.messageID === message.messageID) {
                inRoomMessages.splice(inRoomMessages.indexOf(inRoomMessage), 1);
                break;
            }
        }
        this.sendInRoomMessage(message.message, listener);
    }
    notifyInRoomMessageReceived(roomID, messageList) {
        this.messageListeners.notifyAllListener((listener) => {
            listener.onInRoomMessageReceived?.(messageList);
        });
    }
    addInRoomMessageReceivedListener(listenerID, listener) {
        this.messageListeners.addListener(listenerID, listener);
    }
    removeInRoomMessageReceivedListener(listenerID) {
        this.messageListeners.removeListener(listenerID);
    }
    clear() {
        this.messageListeners.clear();
    }
}
