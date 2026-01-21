import Platform from "./platform";
import LogCat from "./FXX-APP-LOG";
class AppLog {
    isInit = false;
    init() {
        if (this.isInit || !Platform.isAndroid)
            return;
        LogCat.init();
        this.isInit = true;
    }
    writeLog(tag, ...msg) {
        if (!this.isInit)
            return;
        LogCat.writeLog(tag, msg);
    }
}
export default new AppLog();
