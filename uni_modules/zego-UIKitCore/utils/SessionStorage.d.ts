/**
 * 临时的会话缓存, 应用退出后就会销毁
 * 数据是挂载在 globalData 上的
 */
export declare class SessionStorage {
    static get(key: string): any;
    static set(key: string, value: any): void;
    static remove(key: string): any;
}
