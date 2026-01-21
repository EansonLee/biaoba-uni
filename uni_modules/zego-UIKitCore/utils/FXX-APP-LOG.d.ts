declare const LogCat: {
    init: () => void;
    writeLog: (tag: any, msg: any) => void;
    removeLogFile: (fileName: any) => void;
    getLogFileList: () => any;
    readLog: (path: any) => any[];
};
export default LogCat;
