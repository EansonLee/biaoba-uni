declare function isEmpty(str: string | null | undefined): boolean;
/**
 * @description: JSON格式字符串转换为json对象
 * @param
 * @return {*}
 */
declare function parseJson(jsonStr: string): Record<string, any>;
declare const _default: {
    isEmpty: typeof isEmpty;
    parseJson: typeof parseJson;
};
export default _default;
