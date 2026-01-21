const toString = Object.prototype.toString;
export function isType(type, obj) {
    var clas = toString.call(obj).slice(8, -1);
    return obj !== undefined && obj !== null && clas === type;
}
export function isString(obj) {
    return toString.call(obj) === '[object String]';
}
export function isArray(obj) {
    return toString.call(obj) === '[object Array]';
}
export function isArguments(obj) {
    return toString.call(obj) === '[object Arguments]';
}
export function isObject(obj) {
    return toString.call(obj) === '[object Object]';
}
export function isFunction(obj) {
    return toString.call(obj) === '[object Function]';
}
export function isUndefined(obj) {
    return toString.call(obj) === '[object Undefined]';
}
export function isBoolean(obj) {
    return toString.call(obj) === '[object Boolean]';
}
export function isNumber(obj) {
    return toString.call(obj) === '[object Number]';
}
