/**
 * 使用uni的api实现的本地缓存
 */
export declare class LocalStorage {
    static get(key: string): any;
    static set(key: string, value: any): void;
    static remove(key: string): void;
}
