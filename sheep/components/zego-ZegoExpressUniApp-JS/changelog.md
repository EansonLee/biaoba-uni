## 3.17.4（2025-01-06）
### 新增功能
1. 添加 [setAudioDeviceMode] 接口，用于设置音频设备模式。
## 3.17.3（2024-11-26）
### 新增功能

#### 1. 新增屏幕共享功能

iOS 屏幕共享分为应用内共享与跨应用共享，分别用于当前应用分享与系统级别的应用分享。如使用跨应用共享，需要在 iOS 原生工程新建 Broadcast Upload Extension 进程用于录制屏幕。
Android 为更符合隐私规范，需开发者主动声明屏幕共享权限：
- 如果目标 Android SDK 版本低于 34.0.0 版本，需设置 `FOREGROUND_SERVICE`` 权限声明。
- 如果目标 Android SDK 版本是 34.0.0 及以后版本，需要设置 FOREGROUND_SERVICE 及 FOREGROUND_SERVICE_MEDIA_PROJECTION 权限声明。
详情请参考 屏幕共享 文档。

相关 API 请参考 startScreenCapture、stopScreenCapture、updateScreenCaptureConfig、mobileScreenCaptureExceptionOccurred，mobileScreenCaptureStart

#### 2. 媒体播放器新增设置视图模式

新增 ZegoViewMode 参数，用于设置媒体播放器的视图模式，详情请参考 媒体播放器 文档。

### 改进优化

1. 更新集成 Express Native SDK 至 3.17.3 版本
## 3.16.1（2024-08-15）
适配 uni_modules，开发者可以使用 uni_modules 依赖本插件