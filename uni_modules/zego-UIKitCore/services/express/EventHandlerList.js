export class EventHandlerList {
    handlerList = [];
    autoDeleteHandlerList = [];
    addEventHandler(eventHandler, autoDelete = false) {
        if (autoDelete) {
            this.autoDeleteHandlerList.push(eventHandler);
        }
        else {
            this.handlerList.push(eventHandler);
        }
    }
    removeEventHandler(eventHandler) {
        this.autoDeleteHandlerList = this.autoDeleteHandlerList.filter(handler => handler !== eventHandler);
        this.handlerList = this.handlerList.filter(handler => handler !== eventHandler);
    }
    removeAutoDeleteRoomListeners() {
        this.autoDeleteHandlerList = [];
    }
    clear() {
        this.removeAutoDeleteRoomListeners();
        this.handlerList = [];
    }
    getAutoDeleteHandlerList() {
        return this.autoDeleteHandlerList;
    }
    getHandlerList() {
        return this.handlerList;
    }
    notifyAllListener(notifier) {
        this.autoDeleteHandlerList.forEach(handler => {
            if (handler !== null) {
                notifier(handler);
            }
        });
        this.handlerList.forEach(handler => notifier(handler));
    }
}
