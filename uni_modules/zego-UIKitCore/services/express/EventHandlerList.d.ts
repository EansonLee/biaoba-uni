export declare class EventHandlerList<T> {
    private handlerList;
    private autoDeleteHandlerList;
    addEventHandler(eventHandler: T, autoDelete?: boolean): void;
    removeEventHandler(eventHandler: T): void;
    removeAutoDeleteRoomListeners(): void;
    clear(): void;
    getAutoDeleteHandlerList(): T[];
    getHandlerList(): T[];
    notifyAllListener(notifier: (handler: T) => void): void;
}
