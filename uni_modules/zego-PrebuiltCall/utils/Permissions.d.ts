/// <reference types="@dcloudio/types" />
type PermissionConfig = {
    authorizedKey: keyof UniApp.GetAppAuthorizeSettingResult;
    permissionName: string;
    settings?: boolean;
    modalTitle?: string;
    modalContent?: string;
};
type Permission = 'None' | 'Camera' | 'Microphone' | 'Notifications';
declare function ensureAndroidPermission(config: PermissionConfig): Promise<boolean>;
declare function ensureAllPermissions(psermissionList: PermissionConfig[]): Promise<boolean>;
declare const _default: {
    AuthInfo: Record<Permission, PermissionConfig>;
    ensureAndroidPermission: typeof ensureAndroidPermission;
    ensureAllPermissions: typeof ensureAllPermissions;
    setPushPermissions: () => void;
};
export default _default;
