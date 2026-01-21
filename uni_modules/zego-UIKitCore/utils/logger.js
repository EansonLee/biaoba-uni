import appLog from "./appLog";
const TAG = 'ZEGOUIKit';
appLog.init();
export const zloginfo = (...msg) => {
    console.log(`${TAG}[INFO]: `, ...msg);
    appLog.writeLog('info', `${TAG}[INFO]: ${msg}`);
};
export const zlogwarning = (...msg) => {
    console.warn(`${TAG}[WARN]: `, ...msg);
    appLog.writeLog('warn', `${TAG}[WARN]: ${msg}`);
};
export const zlogerror = (...msg) => {
    const stack = new Error().stack;
    console.error(`${TAG}[ERROR]: `, ...msg, stack);
    appLog.writeLog('error', `${TAG}[ERROR]: ${msg}`);
};
export const zlogtrace = (msg) => {
    const stack = new Error(msg).stack;
    console.error(`${TAG}[TRACE]: `, stack);
    appLog.writeLog('error', `${TAG}[ERROR]: ${msg}`);
};
