function isEmpty(str) {
    return !str || /^\s*$/.test(str.trim());
}
/**
 * @description: JSON格式字符串转换为json对象
 * @param
 * @return {*}
 */
function parseJson(jsonStr) {
    try {
        if (!jsonStr)
            return {};
        const jsonRes = JSON.parse(jsonStr);
        return jsonRes;
    }
    catch (err) {
        console.error('parseJson error ' + 'jsonStr: ' + jsonStr + ' error: ' + JSON.stringify(err));
    }
    return {};
}
export default {
    isEmpty,
    parseJson,
};
