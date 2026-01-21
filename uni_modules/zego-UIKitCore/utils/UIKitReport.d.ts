/**
 * UIKitReport 类，用于与 Zego UIKit 数据上报功能进行交互。
 */
export declare class UIKitReport {
    /**
     * 获取当前版本号。
     * @returns {string} 当前版本号。
     */
    static getVersion(): string;
    /**
     * 初始化数据上报器。
     * @param appID - 应用程序的 ID。
     * @param signOrToken - 签名或令牌。
     * @param userID - 用户的 ID。
     * @param commonParams - 通用参数。
     */
    static init(appID: number, signOrToken: string, commonParams: object): void;
    /**
     * 注销数据上报器。
     * 该方法用于注销之前初始化的数据上报器，释放相关资源。
     */
    static unInit(): void;
    /**
     * 更新用户ID。
     * @param userID - 要更新的用户ID。
     * @remarks
     * 这个方法用于更新数据上报器中的用户ID。
     * 如果传入的用户ID为空，则不会进行任何操作。
     */
    static updateUserID(userID: string): void;
    /**
     * 更新公共参数.
     * @param commonParams - 通用参数。
     * @remarks
     * 这个方法用于更新数据上报器中的用户ID。
     * 如果传入的用户ID为空，则不会进行任何操作。
     */
    static updateCommonParams(commonParams: object): void;
    /**
     * 上报自定义事件。
     * @param event - 要上报的事件名称。
     * @param paramsMap - 与事件相关的参数映射。
     * @remarks
     * 这个方法用于向服务器发送一个自定义事件上报，其中包含了事件名称和相关的参数。
     * 如果参数映射为空，则会发送一个空的参数对象。
     */
    static reportEvent(event: string, paramsMap: object): void;
}
