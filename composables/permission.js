/// null = 未请求，1 = 已允许，0 = 拒绝|受限, 2 = 系统未开启

var isIOS

// iOS版本兼容性检查
function getIOSVersion() {
    try {
        const systemInfo = uni.getSystemInfoSync();
        if (systemInfo.platform === 'ios' && systemInfo.system) {
            const match = systemInfo.system.match(/iOS\s+([\d.]+)/);
            if (match) {
                return parseFloat(match[1]);
            }
        }
    } catch (error) {
        console.error('获取iOS版本失败:', error);
    }
    return 0;
}

// 检查是否需要使用备用权限请求方案
function shouldUseAlternativePermissionRequest() {
    const iosVersion = getIOSVersion();
    console.log('当前iOS版本:', iosVersion);

    // iOS 14+ 可能需要备用方案
    return iosVersion >= 14.0;
}

// 获取设备详细信息用于兼容性调试
function getDeviceInfo() {
    try {
        const systemInfo = uni.getSystemInfoSync();
        const deviceInfo = {
            platform: systemInfo.platform,
            system: systemInfo.system,
            version: systemInfo.version,
            model: systemInfo.model,
            brand: systemInfo.brand,
            screenWidth: systemInfo.screenWidth,
            screenHeight: systemInfo.screenHeight,
            pixelRatio: systemInfo.pixelRatio,
            statusBarHeight: systemInfo.statusBarHeight,
            safeArea: systemInfo.safeArea,
            safeAreaInsets: systemInfo.safeAreaInsets
        };
        console.log('设备详细信息:', JSON.stringify(deviceInfo, null, 2));
        return deviceInfo;
    } catch (error) {
        console.error('获取设备信息失败:', error);
        return null;
    }
}

function album() {
    var result = 0;
    var PHPhotoLibrary = plus.ios.import("PHPhotoLibrary");
    var authStatus = PHPhotoLibrary.authorizationStatus();
    if (authStatus === 0) {
        result = null;
    } else if (authStatus == 3) {
        result = 1;
    } else {
        result = 0;
    }
    plus.ios.deleteObject(PHPhotoLibrary);
    return result;
}

function camera() {
    return new Promise((resolve, reject) => {
        try {
            // 获取iOS版本信息用于兼容性判断
            const iosVersion = getIOSVersion();
            const systemInfo = uni.getSystemInfoSync();
            console.log('🎥 [权限调试] 检查摄像头权限开始');
            console.log('  - iOS版本:', iosVersion);
            console.log('  - 系统信息:', systemInfo.system);
            console.log('  - 设备型号:', systemInfo.model);

            var AVCaptureDevice = plus.ios.import("AVCaptureDevice");
            if (!AVCaptureDevice) {
                console.log('🎥 [权限调试] AVCaptureDevice导入失败，让Zego引擎处理权限');
                resolve(1);
                return;
            }

            var authStatus = AVCaptureDevice.authorizationStatusForMediaType('video');
            console.log('🎥 [权限调试] iOS摄像头权限状态:', authStatus, '(类型:', typeof authStatus, ')');

            // 获取应用当前状态
            const appAuthorizeSetting = uni.getAppAuthorizeSetting();
            console.log('🎥 [权限调试] 应用权限设置:', JSON.stringify(appAuthorizeSetting));

            // 处理权限状态 - 增强兼容性
            if (authStatus === 3 || authStatus === '3') {
                // 已授权 (AVAuthorizationStatusAuthorized)
                console.log('🎥 [权限调试] 摄像头权限已授权');
                plus.ios.deleteObject(AVCaptureDevice);
                resolve(1);
            } else if (authStatus === 2 || authStatus === '2') {
                // 明确拒绝 (AVAuthorizationStatusDenied)
                console.log('🎥 [权限调试] 摄像头权限被明确拒绝');
                plus.ios.deleteObject(AVCaptureDevice);
                resolve(0);
            } else if (authStatus === 1 || authStatus === '1') {
                // 受限制 (AVAuthorizationStatusRestricted)
                console.log('🎥 [权限调试] 摄像头权限受限制');
                plus.ios.deleteObject(AVCaptureDevice);
                resolve(0);
            } else if (authStatus === 0 || authStatus === '0' || authStatus === null || authStatus === undefined) {
                // 未请求 (AVAuthorizationStatusNotDetermined) - 主动请求权限
                console.log('🎥 [权限调试] 摄像头权限未请求，准备主动请求权限');

                // 特别处理：如果应用权限设置显示"not determined"，强制请求权限
                if (appAuthorizeSetting.cameraAuthorized === 'not determined') {
                    console.log('🎥 [权限调试] 应用权限设置显示"not determined"，强制请求权限弹窗');
                } else if (appAuthorizeSetting.cameraAuthorized === 'authorized') {
                    console.log('🎥 [权限调试] 应用权限设置显示摄像头已授权，但原生状态未确定，仍需请求权限');
                }

                console.log('🎥 [权限调试] 即将显示系统权限弹窗...');

                // 尝试主动请求摄像头权限，兼容不同iOS版本
                try {
                    if (typeof AVCaptureDevice.requestAccessForMediaType === 'function') {
                        console.log('🎥 [权限调试] 调用requestAccessForMediaType请求权限...');
                        AVCaptureDevice.requestAccessForMediaType('video', function(granted) {
                            console.log('🎥 [权限调试] 摄像头权限请求结果:', granted, '(类型:', typeof granted, ')');
                            console.log('🎥 [权限调试] 权限弹窗已处理完成');
                            
                            // 🔧 新增：权限获取完成后立即检查Token完整性
                            setTimeout(() => {
                                const app = getApp();
                                if (app && typeof app.checkTokenIntegrityOnResume === 'function') {
                                    console.log('🎥 [权限调试] 摄像头权限获取完成，检查Token完整性');
                                    app.checkTokenIntegrityOnResume();
                                }
                                
                                // 触发远程视频数据检查
                                uni.$emit('check-remote-video-data', (result) => {
                                    if (!result.isComplete) {
                                        console.warn('🎥 [权限调试] 权限获取后检测到数据不完整，尝试修复');
                                        // 触发数据恢复
                                        if (app && typeof app.restoreRemoteVideoData === 'function') {
                                            app.restoreRemoteVideoData();
                                        }
                                    }
                                });
                            }, 500); // 延迟500ms，确保权限状态已稳定
                            
                            plus.ios.deleteObject(AVCaptureDevice);
                            resolve(granted ? 1 : 0);
                        });
                    } else {
                        console.log('🎥 [权限调试] requestAccessForMediaType方法不可用，尝试其他方式');

                        // 尝试使用AVAudioVideoPermissionHelper（如果存在）
                        try {
                            const AVAudioVideoPermissionHelper = plus.ios.import("AVAudioVideoPermissionHelper");
                            if (AVAudioVideoPermissionHelper) {
                                console.log('🎥 [权限调试] 尝试使用AVAudioVideoPermissionHelper');
                                // 这里可以添加其他权限请求方式
                            }
                        } catch (helperError) {
                            console.log('🎥 [权限调试] AVAudioVideoPermissionHelper不可用');
                        }

                        console.log('🎥 [权限调试] 无可用的权限请求方法，让Zego引擎处理');
                        plus.ios.deleteObject(AVCaptureDevice);
                        resolve(1); // 让Zego引擎处理
                    }
                } catch (requestError) {
                    console.error('🎥 [权限调试] 权限请求方法调用失败:', requestError);
                    plus.ios.deleteObject(AVCaptureDevice);
                    resolve(1); // 让Zego引擎处理
                }
            } else {
                // 其他未知状态 - 可能是新iOS版本的新状态
                console.log('🎥 [权限调试] 摄像头权限未知状态:', authStatus, '默认允许继续');
                plus.ios.deleteObject(AVCaptureDevice);
                resolve(1); // 默认允许继续，让Zego引擎处理
            }
        } catch (error) {
            console.error('摄像头权限检查失败:', error);
            // 权限检查失败，允许继续初始化，让Zego引擎处理
            // 这种情况在某些iOS设备或版本上可能发生
            resolve(1);
        }
    });
}

function location() {
    var result = 0;
    var cllocationManger = plus.ios.import("CLLocationManager");
    var enable = cllocationManger.locationServicesEnabled();
    var status = cllocationManger.authorizationStatus();
    if (!enable) {
        result = 2;
    } else if (status === 0) {
        result = null;
    } else if (status === 3 || status === 4) {
        result = 1;
    } else {
        result = 0;
    }
    plus.ios.deleteObject(cllocationManger);
    return result;
}

function push() {
    var result = 0;
    var UIApplication = plus.ios.import("UIApplication");
    var app = UIApplication.sharedApplication();
    var enabledTypes = 0;
    if (app.currentUserNotificationSettings) {
        var settings = app.currentUserNotificationSettings();
        enabledTypes = settings.plusGetAttribute("types");
        if (enabledTypes == 0) {
            result = 0;
            console.log("推送权限没有开启");
        } else {
            result = 1;
            console.log("已经开启推送功能!")
        }
        plus.ios.deleteObject(settings);
    } else {
        enabledTypes = app.enabledRemoteNotificationTypes();
        if (enabledTypes == 0) {
            result = 3;
            console.log("推送权限没有开启!");
        } else {
            result = 4;
            console.log("已经开启推送功能!")
        }
    }
    plus.ios.deleteObject(app);
    plus.ios.deleteObject(UIApplication);
    return result;
}

function contact() {
    var result = 0;
    var CNContactStore = plus.ios.import("CNContactStore");
    var cnAuthStatus = CNContactStore.authorizationStatusForEntityType(0);
    if (cnAuthStatus === 0) {
        result = null;
    } else if (cnAuthStatus == 3) {
        result = 1;
    } else {
        result = 0;
    }
    plus.ios.deleteObject(CNContactStore);
    return result;
}

function record() {
    return new Promise((resolve, reject) => {
        try {
            // 获取iOS版本信息用于兼容性判断
            const iosVersion = getIOSVersion();
            const systemInfo = uni.getSystemInfoSync();
            console.log('🎤 [权限调试] 检查录音权限开始');
            console.log('  - iOS版本:', iosVersion);
            console.log('  - 系统信息:', systemInfo.system);
            console.log('  - 设备型号:', systemInfo.model);

            var avaudiosession = plus.ios.import("AVAudioSession");
            if (!avaudiosession) {
                console.log('🎤 [权限调试] AVAudioSession导入失败，让Zego引擎处理权限');
                resolve(1);
                return;
            }

            var avaudio = avaudiosession.sharedInstance();
            if (!avaudio) {
                console.log('🎤 [权限调试] AVAudioSession实例获取失败，让Zego引擎处理权限');
                plus.ios.deleteObject(avaudiosession);
                resolve(1);
                return;
            }

            var status = avaudio.recordPermission();
            console.log("🎤 [权限调试] iOS录音权限状态:", status, '(类型:', typeof status, ')');

            // 获取应用当前状态
            const appAuthorizeSetting = uni.getAppAuthorizeSetting();
            console.log('🎤 [权限调试] 应用权限设置:', JSON.stringify(appAuthorizeSetting));

            // 处理录音权限状态 - 增强兼容性
            // 这些状态码在不同iOS版本中可能略有不同，所以使用更宽松的匹配
            if (status === 1735552628 || status === 'gran') {
                // 已授权 ('gran' 的十六进制值 或 字符串)
                console.log('🎤 [权限调试] 录音权限已授权');
                plus.ios.deleteObject(avaudiosession);
                resolve(1);
            } else if (status === 1684369017 || status === 'deni') {
                // 明确拒绝 ('deni' 的十六进制值 或 字符串)
                console.log('🎤 [权限调试] 录音权限被明确拒绝');
                plus.ios.deleteObject(avaudiosession);
                resolve(0);
            } else if (status === 1970168948 || status === 'unde' || status === 0 || status === '0') {
                // 未请求 ('unde' 的十六进制值 或 字符串 或 数字0) - 主动请求权限
                console.log('🎤 [权限调试] 录音权限未请求，准备主动请求权限');
                console.log('🎤 [权限调试] 即将显示系统权限弹窗...');

                // 主动请求录音权限
                avaudio.requestRecordPermission(function(granted) {
                    console.log('🎤 [权限调试] 录音权限请求结果:', granted, '(类型:', typeof granted, ')');
                    console.log('🎤 [权限调试] 权限弹窗已处理完成');
                    
                    // 🔧 新增：权限获取完成后立即检查Token完整性
                    setTimeout(() => {
                        const app = getApp();
                        if (app && typeof app.checkTokenIntegrityOnResume === 'function') {
                            console.log('🎤 [权限调试] 录音权限获取完成，检查Token完整性');
                            app.checkTokenIntegrityOnResume();
                        }
                        
                        // 触发远程视频数据检查
                        uni.$emit('check-remote-video-data', (result) => {
                            if (!result.isComplete) {
                                console.warn('🎤 [权限调试] 权限获取后检测到数据不完整，尝试修复');
                                // 触发数据恢复
                                if (app && typeof app.restoreRemoteVideoData === 'function') {
                                    app.restoreRemoteVideoData();
                                }
                            }
                        });
                    }, 500); // 延迟500ms，确保权限状态已稳定
                    
                    plus.ios.deleteObject(avaudiosession);
                    resolve(granted ? 1 : 0);
                });
            } else if (status === null || status === undefined) {
                // 状态异常 - 也尝试主动请求权限
                console.log('🎤 [权限调试] 录音权限状态异常，尝试主动请求权限');
                console.log('🎤 [权限调试] 即将显示系统权限弹窗...');
                avaudio.requestRecordPermission(function(granted) {
                    console.log('🎤 [权限调试] 录音权限请求结果:', granted, '(类型:', typeof granted, ')');
                    console.log('🎤 [权限调试] 权限弹窗已处理完成');
                    
                    // 🔧 新增：权限获取完成后立即检查Token完整性
                    setTimeout(() => {
                        const app = getApp();
                        if (app && typeof app.checkTokenIntegrityOnResume === 'function') {
                            console.log('🎤 [权限调试] 录音权限获取完成，检查Token完整性');
                            app.checkTokenIntegrityOnResume();
                        }
                        
                        // 触发远程视频数据检查
                        uni.$emit('check-remote-video-data', (result) => {
                            if (!result.isComplete) {
                                console.warn('🎤 [权限调试] 权限获取后检测到数据不完整，尝试修复');
                                // 触发数据恢复
                                if (app && typeof app.restoreRemoteVideoData === 'function') {
                                    app.restoreRemoteVideoData();
                                }
                            }
                        });
                    }, 500); // 延迟500ms，确保权限状态已稳定
                    
                    plus.ios.deleteObject(avaudiosession);
                    resolve(granted ? 1 : 0);
                });
            } else {
                // 其他未知状态 - 可能是新iOS版本的新状态
                console.log('🎤 [权限调试] 录音权限未知状态:', status, '默认允许继续');
                plus.ios.deleteObject(avaudiosession);
                resolve(1); // 默认允许继续，让Zego引擎处理
            }
        } catch (error) {
            console.error('录音权限检查失败:', error);
            // 权限检查失败，允许继续初始化，让Zego引擎处理
            // 这种情况在某些iOS设备或版本上可能发生
            resolve(1);
        }
    });
}

function calendar() {
    var result = null;
    var EKEventStore = plus.ios.import("EKEventStore");
    var ekAuthStatus = EKEventStore.authorizationStatusForEntityType(0);
    if (ekAuthStatus == 3) {
        result = 1;
        console.log("日历权限已经开启");
    } else {
        console.log("日历权限没有开启");
    }
    plus.ios.deleteObject(EKEventStore);
    return result;
}

function memo() {
    var result = null;
    var EKEventStore = plus.ios.import("EKEventStore");
    var ekAuthStatus = EKEventStore.authorizationStatusForEntityType(1);
    if (ekAuthStatus == 3) {
        result = 1;
        console.log("备忘录权限已经开启");
    } else {
        console.log("备忘录权限没有开启");
    }
    plus.ios.deleteObject(EKEventStore);
    return result;
}


function requestIOS(permissionID) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('🔐 [权限调试] 开始请求iOS权限:', permissionID);

            // 检查应用是否在前台
            const appState = plus.runtime.state;
            console.log('🔐 [权限调试] 应用状态:', appState);

            switch (permissionID) {
                case "push":
                    resolve(push());
                    break;
                case "location":
                    resolve(location());
                    break;
                case "record":
                    console.log('🔐 [权限调试] 准备请求录音权限...');
                    const recordResult = await record();
                    console.log('🔐 [权限调试] 录音权限请求完成，结果:', recordResult);
                    resolve(recordResult);
                    break;
                case "camera":
                    console.log('🔐 [权限调试] 准备请求摄像头权限...');
                    const cameraResult = await camera();
                    console.log('🔐 [权限调试] 摄像头权限请求完成，结果:', cameraResult);
                    resolve(cameraResult);
                    break;
                case "album":
                    resolve(album());
                    break;
                case "contact":
                    resolve(contact());
                    break;
                case "calendar":
                    resolve(calendar());
                    break;
                case "memo":
                    resolve(memo());
                    break;
                default:
                    console.log('🔐 [权限调试] 未知权限类型:', permissionID);
                    resolve(0);
                    break;
            }
        } catch (error) {
            console.error('🔐 [权限调试] iOS权限请求失败:', error);
            resolve(0);
        }
    });
}

function requestAndroid(permissionID) {
    return new Promise((resolve, reject) => {
        // 获取App实例来管理授权弹窗状态
        const app = getApp();

        // 在请求权限前设置授权弹窗状态
        if (app && typeof app.setAuthDialogStatus === 'function') {
            app.setAuthDialogStatus(true);
        }

        plus.android.requestPermissions(
            [permissionID],
            function(resultObj) {
                // 权限请求完成，延迟重置授权弹窗状态，避免与onShow事件竞争
                if (app && typeof app.setAuthDialogStatus === 'function') {
                    setTimeout(() => {
                        app.setAuthDialogStatus(false);
                    }, 500); // 延迟500ms重置
                }

                var result = 0;
                for (var i = 0; i < resultObj.granted.length; i++) {
                    var grantedPermission = resultObj.granted[i];
                    console.log('已获取的权限：' + grantedPermission);
                    result = 1
                }
                for (var i = 0; i < resultObj.deniedPresent.length; i++) {
                    var deniedPresentPermission = resultObj.deniedPresent[i];
                    console.log('拒绝本次申请的权限：' + deniedPresentPermission);
                    result = 0
                }
                for (var i = 0; i < resultObj.deniedAlways.length; i++) {
                    var deniedAlwaysPermission = resultObj.deniedAlways[i];
                    console.log('永久拒绝申请的权限：' + deniedAlwaysPermission);
                    result = -1
                }
                resolve(result);
            },
            function(error) {
                // 权限请求出错，也要延迟重置授权弹窗状态
                if (app && typeof app.setAuthDialogStatus === 'function') {
                    setTimeout(() => {
                        app.setAuthDialogStatus(false);
                    }, 500); // 延迟500ms重置
                }

                console.log('result error: ' + error.message)
                resolve({
                    code: error.code,
                    message: error.message
                });
            }
        );
    });
}

function gotoAppPermissionSetting() {
    // 跳转到系统设置也可能触发App切换，设置状态避免横竖屏切换
    const app = getApp();
    if (app && typeof app.setAuthDialogStatus === 'function') {
        app.setAuthDialogStatus(true);

        // 延迟重置状态，给用户足够时间操作
        setTimeout(() => {
            app.setAuthDialogStatus(false);
        }, 5000); // 5秒后重置
    }

    if (permission.isIOS) {
        var UIApplication = plus.ios.import("UIApplication");
        var application2 = UIApplication.sharedApplication();
        var NSURL2 = plus.ios.import("NSURL");
        var setting2 = NSURL2.URLWithString("app-settings:");
        application2.openURL(setting2);
        plus.ios.deleteObject(setting2);
        plus.ios.deleteObject(NSURL2);
        plus.ios.deleteObject(application2);
    } else {
        var Intent = plus.android.importClass("android.content.Intent");
        var Settings = plus.android.importClass("android.provider.Settings");
        var Uri = plus.android.importClass("android.net.Uri");
        var mainActivity = plus.android.runtimeMainActivity();
        var intent = new Intent();
        intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        var uri = Uri.fromParts("package", mainActivity.getPackageName(), null);
        intent.setData(uri);
        mainActivity.startActivity(intent);
    }
}

// 通用的权限请求函数，自动管理授权弹窗状态
function requestPermissionWithStateManagement(permissionID) {
    return new Promise(async (resolve, reject) => {
        const app = getApp();

        try {
            // 设置授权弹窗状态
            if (app && typeof app.setAuthDialogStatus === 'function') {
                app.setAuthDialogStatus(true);
            }

            let result;
            if (permission.isIOS) {
                result = await requestIOS(permissionID);
            } else {
                result = await requestAndroid(permissionID);
            }

            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            // 无论成功失败都要延迟重置状态，避免与onShow事件竞争
            if (app && typeof app.setAuthDialogStatus === 'function') {
                setTimeout(() => {
                    app.setAuthDialogStatus(false);
                }, 500); // 延迟500ms重置
            }
        }
    });
}

// 强制请求iOS摄像头权限 - 专门处理iOS 18兼容性问题
function forceRequestCameraPermission() {
    return new Promise((resolve) => {
        try {
            console.log('🎥 [强制权限] 开始强制请求摄像头权限');

            // 方法1: 尝试使用uni-app的API
            try {
                uni.authorize({
                    scope: 'scope.camera',
                    success: () => {
                        console.log('🎥 [强制权限] uni.authorize成功');
                        resolve(1);
                    },
                    fail: (error) => {
                        console.log('🎥 [强制权限] uni.authorize失败:', error);
                        // 继续尝试其他方法
                        tryNativePermissionRequest();
                    }
                });
            } catch (uniError) {
                console.log('🎥 [强制权限] uni.authorize不可用:', uniError);
                tryNativePermissionRequest();
            }

            function tryNativePermissionRequest() {
                // 方法2: 尝试原生权限请求
                try {
                    const AVCaptureDevice = plus.ios.import("AVCaptureDevice");
                    if (AVCaptureDevice && typeof AVCaptureDevice.requestAccessForMediaType === 'function') {
                        console.log('🎥 [强制权限] 使用原生API请求权限');
                        AVCaptureDevice.requestAccessForMediaType('video', function(granted) {
                            console.log('🎥 [强制权限] 原生API结果:', granted);
                            plus.ios.deleteObject(AVCaptureDevice);
                            resolve(granted ? 1 : 0);
                        });
                    } else {
                        console.log('🎥 [强制权限] 原生API不可用，返回让Zego处理');
                        resolve(1); // 让Zego引擎处理
                    }
                } catch (nativeError) {
                    console.error('🎥 [强制权限] 原生API调用失败:', nativeError);
                    resolve(1); // 让Zego引擎处理
                }
            }

        } catch (error) {
            console.error('🎥 [强制权限] 强制请求权限失败:', error);
            resolve(1); // 让Zego引擎处理
        }
    });
}

const permission = {
    get isIOS(){
        return typeof isIOS === 'boolean' ? isIOS : (isIOS = uni.getSystemInfoSync().platform === 'ios')
    },
    requestIOS: requestIOS,
    requestAndroidPermission: requestAndroid,
    forceRequestCameraPermission: forceRequestCameraPermission,
    gotoAppSetting: gotoAppPermissionSetting,
    // 新增：带状态管理的权限请求函数
    requestPermission: requestPermissionWithStateManagement
}

export default permission
