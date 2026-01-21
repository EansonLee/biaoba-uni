/**
 * 本模块封装了Android、iOS的应用权限判断、打开应用权限设置界面、以及位置系统服务是否开启
 */
declare function requestAndroidPermission(permissionID: string): Promise<{
    code: number;
    message: string;
}>;
declare function judgeIosPermission(permissionID: string): boolean;
declare function gotoAppPermissionSetting(): void;
declare function checkSystemEnableLocation(): any;
export { judgeIosPermission, requestAndroidPermission, checkSystemEnableLocation, gotoAppPermissionSetting };
