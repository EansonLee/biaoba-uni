/**
 * 使用uni的api实现的本地缓存
 */
export class LocalStorage {
    static get(key) {
        return uni.getStorageSync(key);
    }
    static set(key, value) {
        return uni.setStorageSync(key, value);
    }
    static remove(key) {
        return uni.removeStorageSync(key);
    }
}
