import { zlogwarning } from "./logger";
const TAG = 'ZEGOUIKit';
function getTypeName(T) {
    return T.name;
}
function getGlobalContext() {
    const app = getApp({ allowDefault: true });
    if (!app.globalData) {
        app.globalData = {};
    }
    if (!app.globalData[TAG]) {
        app.globalData[TAG] = {};
    }
    return app.globalData[TAG];
}
const sessionContext = {};
function getSessionContext() {
    return sessionContext;
}
export var SingletonScope;
(function (SingletonScope) {
    SingletonScope[SingletonScope["Session"] = 0] = "Session";
    SingletonScope[SingletonScope["Global"] = 1] = "Global";
})(SingletonScope || (SingletonScope = {}));
export function getSingletonInstance(constructor, scope = SingletonScope.Session) {
    const name = getTypeName(constructor);
    const context = scope === SingletonScope.Global ? getGlobalContext() : getSessionContext();
    if (!context[name]) {
        zlogwarning(TAG, `Make new singleton instance of ${name}, scope=${scope}`);
        context[name] = new constructor();
    }
    return context[name];
}
export function deleteSingletonInstance(constructor, scope = SingletonScope.Session) {
    const name = getTypeName(constructor);
    const context = scope === SingletonScope.Global ? getGlobalContext() : getSessionContext();
    zlogwarning(TAG, `Delete singleton instance of ${name}, scope=${scope}`);
    delete context[name];
}
