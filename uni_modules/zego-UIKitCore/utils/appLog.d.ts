declare class AppLog {
    private isInit;
    init(): void;
    writeLog(tag: string, ...msg: any[]): void;
}
declare const _default: AppLog;
export default _default;
