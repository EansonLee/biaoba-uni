import { zlogwarning } from "../../utils";
export class NotifyList {
    listeners = {};
    addListener(key, listener) {
        // 检查一下是否已经有这个key 
        if (this.listeners[key]) {
            zlogwarning(`The listener key: ${key} already exists, please check the key`);
        }
        this.listeners[key] = listener;
    }
    removeListener(key) {
        delete this.listeners[key];
    }
    notifyAllListener(notifier) {
        Object.values(this.listeners).forEach(listener => {
            notifier(listener);
        });
    }
    get length() {
        return Object.keys(this.listeners).length;
    }
    clear() {
        this.listeners = {};
    }
}
