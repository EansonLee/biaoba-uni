export declare class NotifyList<T> {
    private listeners;
    addListener(key: string, listener: T): void;
    removeListener(key: string): void;
    notifyAllListener(notifier: (listener: T) => void): void;
    get length(): number;
    clear(): void;
}
