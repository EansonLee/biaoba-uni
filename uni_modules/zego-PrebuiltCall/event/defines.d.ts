export interface ErrorEventsListener {
    /**
     * 当发生错误时调用此方法。
     *
     * @param errorCode 错误代码，具体错误代码定义见 ErrorEventsListenerCode。
     * @param message   错误信息，对错误的详细描述。
     */
    onError(errorCode: ErrorEventsListenerCode, message: string): void;
}
export declare enum ErrorEventsListenerCode {
    SUCCESS = 0,
    INIT_PARAM_ERROR = -1,
    INIT_ALREADY = -2
}
