export * from "./logger";
export * as Types from "./types";
export * from "./singleton";
export * from "./LocalStorage";
export * from "./SessionStorage";
export * from "./UIKitReport";
import { AppState } from "../services/defines";
import Platform from "./platform";
export { Platform };
export declare function generateUUID(length?: number): string;
/**
 * 生成推流ID
 * @param roomID
 * @param userID
 * @param channel
 * @returns
 */
export declare function makeStreamID(roomID: string, userID: string, channel?: string): string;
export declare function makeListenerID(): string;
export declare function makeCallID(userID: string): string;
export declare function makeTag(tag: string): string;
/**
 * 辅助函数：合并默认配置和用户配置
 * @param defaultConfig
 * @param userConfig
 * @returns
 */
export declare function mergeConfigs<T>(defaultConfig: T, userConfig: Partial<T> | null | undefined): T;
/**
 * 深拷贝一个对象
 * @param obj
 */
export declare function deepClone(obj: any): any;
/**
 * 创建一个防抖函数，确保在指定的时间间隔内只执行一次。
 *
 * @param func - 要防抖的函数。
 * @param wait - 等待时间（毫秒）。
 * @returns 防抖后的函数。
 *
 * @example
 * // 示例用法
 * const debouncedFunction = debounce(() => {
 *   console.log('Function called');
 * }, 1000);
 *
 * // 连续调用 debouncedFunction，但在 1000 毫秒内只会执行一次
 * debouncedFunction();
 * debouncedFunction();
 * debouncedFunction();
 */
export declare function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void;
export declare function getAppState(): {
    isHide: any;
    state: AppState;
};
export declare const getShotName: (name?: string) => string;
