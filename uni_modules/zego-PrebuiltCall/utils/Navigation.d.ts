/// <reference types="@dcloudio/types" />
/**
 * uni 不支持跳转页面时待大量数据, 封装一下
 */
export declare class Navigation {
    static navigateTo(path: string, params: Record<string, any>): Promise<UniApp.NavigateToSuccessOptions>;
    static redirectTo(path: string, params: Record<string, any>): Promise<any>;
    static getParams(query: any): any;
}
