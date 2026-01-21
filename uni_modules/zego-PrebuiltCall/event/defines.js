// 错误代码定义类
export var ErrorEventsListenerCode;
(function (ErrorEventsListenerCode) {
    // 成功（虽然在Java中未定义，但在TS中可作为参照对比）
    ErrorEventsListenerCode[ErrorEventsListenerCode["SUCCESS"] = 0] = "SUCCESS";
    // 初始化参数错误
    ErrorEventsListenerCode[ErrorEventsListenerCode["INIT_PARAM_ERROR"] = -1] = "INIT_PARAM_ERROR";
    // 已经初始化过
    ErrorEventsListenerCode[ErrorEventsListenerCode["INIT_ALREADY"] = -2] = "INIT_ALREADY";
})(ErrorEventsListenerCode || (ErrorEventsListenerCode = {}));
