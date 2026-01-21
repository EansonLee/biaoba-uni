<script>
	import $stores from "@/sheep/stores";
	import sheep from "@/sheep";
	import zimStore from '@/sheep/stores/zegoStore'
	import player from "@/sheep/api/dart/player";
	import {
		mapState,
		mapActions
	} from 'pinia'
	export default {
		components: {
		},
		data() {
		  return {
			modalVisible:false,
		    isShowing: true,
		    heartbeatTimer: null,
		    enterBackgroundTime: null,
		    // 横竖屏管理相关状态
		    lastOrientationChangeTime: 0, // 上次横竖屏切换时间
		    currentOrientation: '', // 当前屏幕方向状态
		    isFromBackground: false, // 是否从后台返回
		    orientationChangeDebounceTimer: null, // 防抖定时器
		    isAuthDialogShowing: false, // 是否正在显示授权弹窗
		  };
		},

		onLaunch() {
			// #ifdef APP-PLUS
			plus.navigator.setFullscreen(true);
			plus.navigator.hideSystemNavigation();
			// #endif
			// 初始化在线状态监听
			this.initOnlineStatusMonitor();
			
			// 获取设备语言并设置应用语言
			const systemInfo = uni.getSystemInfoSync();
			const deviceLanguage = systemInfo.language;

			let appLocale = 'en'; // 默认语言为英文

			if (deviceLanguage.startsWith('zh')) {
				appLocale = 'zh';
			}

			// 更新 vue-i18n 的 locale (legacy 模式使用 this.$i18n.locale)
			this.$i18n.locale = appLocale;
			// 更新本地存储
			uni.setStorageSync("locale", appLocale);

			console.log(`[语言适配] 设备语言: ${deviceLanguage}, 应用语言设置为: ${appLocale}`);
		},
		onHide() {
			// 应用进入后台，清理心跳定时器
			if (this.heartbeatTimer) {
				clearInterval(this.heartbeatTimer);
				this.heartbeatTimer = null;
			}
			
			// 记录进入后台的时间
			this.enterBackgroundTime = Date.now();
			this.isFromBackground = true; // 标记从后台返回
			
			// 立即设置为离线状态
			const authStore = $stores('user');
			if (authStore.isLogin) {
				player.Api.updateOnLine(0);
			}


			// #ifdef APP-PLUS
			// 熄屏设置
			plus.device.setWakelock(true);
			// #endif
			
			$stores('zegoStore').initEvent();
		},
		onShow(options) {
			this.init(options);

			// 智能横竖屏切换逻辑
			this.handleOrientationChange();
			
			// 应用回到前台，检查是否超过5分钟
			const authStore = $stores('user');
			if (authStore.isLogin && this.enterBackgroundTime) {
				const backgroundDuration = Date.now() - (this.enterBackgroundTime || 0);
				console.error('后台运时间',backgroundDuration/(1000*60),'分钟=================超过5分钟就登出');
				if (backgroundDuration < 5 * 60 * 1000) { // 小于5分钟
					// 恢复在线状态
					player.Api.updateOnLine(1);
					this.startHeartbeat();
					
					// 应用恢复时主动检查token完整性
					setTimeout(() => {
						this.checkTokenIntegrityOnResume();
					}, 1000);
				} else {
					// 超过5分钟，保持离线状态，需要用户重新登录
					authStore.clearUserInfo();
					uni.$emit('user-logout');
					// 跳转到登录页，显示动画和音效（不传递jumpType=no）					// 跳转到登录页
					// sheep.$router.go('/pages/index/index?jumpType=no');
					sheep.$router.go('/pages/index/index');
				}
			}
		},
		onUnload(){
			//页面卸载时切换为竖屏配置
			// #ifdef APP-PLUS
			plus.screen.lockOrientation('portrait-primary'); //锁死屏幕方向为竖屏
			// #endif
		},
		watch: {
		 
		},
		methods: {
			init(options) {
				// 初始化用户数据
				const authStore = $stores('user');

				// 检查是否刚刚登出（防止进程杀死后的状态错误）
				const logoutTimestamp = uni.getStorageSync('logout-timestamp');
				const currentTime = Date.now();
				const timeSinceLogout = logoutTimestamp ? currentTime - logoutTimestamp : Infinity;

				console.log('⏰ [App初始化] 上次登出时间:', logoutTimestamp);
				console.log('⏰ [App初始化] 当前时间:', currentTime);
				console.log('⏰ [App初始化] 登出后经过时间:', timeSinceLogout, '毫秒');

				// 如果登出时间戳是最近（30秒内），强制清理任何残留数据
				if (timeSinceLogout < 30 * 1000) {
					console.warn('⚠️ [App初始化] 检测到最近登出，清理残留数据');
					authStore.clearUserInfo();
				}

				const initAuth = authStore.initAuth();
				const zegoStore = $stores('zegoStore').initEvent();
				const currentPage = getCurrentPages().pop();
				const route = currentPage?.route || options.path || '';
				if (!initAuth) {
					sheep.$router.routerBeforeEach(route);
				} else {
					// 如果路径等于登录页，则跳转回首页
					// if (route === 'pages/index/index' || route === '/') {
					//   sheep.$router.go('/pages/game/home/index');
					// }
				}

				// 横屏设置代码已移至 onLaunch
				// const systemInfo = uni.getSystemInfoSync()
				// // 判断是不是安卓跟ios(是不是手机)
				// if (systemInfo.platform === 'android' || systemInfo.platform === 'ios') {
				// 	// 隐藏顶部电池,时间等信息
				// 	plus.navigator.setFullscreen(true);
				// 	//隐藏虚拟按键
				// 	plus.navigator.hideSystemNavigation()
				// } else {
				// 	// 不是手机端的处理逻辑
				// }
				// #ifdef APP-PLUS
				// 熄屏设置
				plus.device.setWakelock(true);
				// #endif
				
				$stores('zegoStore').initEvent();
				
				// 初始化远程视频数据检查
				this.initRemoteVideoDataCheck();
			},

			// 远程视频数据完整性检查
			initRemoteVideoDataCheck() {
				uni.$on('check-remote-video-data', (callback) => {
					const roomId = uni.getStorageSync('roomID');
					const remoteUserId = uni.getStorageSync('remoteUserId');
					let zeGoTokenThird = uni.getStorageSync('zeGoTokenThird');
					
					console.log('🔍 [数据检查] 初始token状态:', {
						zeGoTokenThird: !!zeGoTokenThird,
						zeGoToken: !!uni.getStorageSync('zeGoToken')
					});
					
					// 如果没有zeGoTokenThird，使用强化的token管理器修复
					if (!zeGoTokenThird) {
						console.log('🔍 [数据检查] zeGoTokenThird缺失，启动智能修复...');
						
						// 创建强化版token管理器
						const tokenManager = {
							repairTokens: () => {
								const zeGoToken = uni.getStorageSync('zeGoToken');
								const backupToken = uni.getStorageSync('ZEGO_TOKEN_BACKUP');
								const sessionToken = uni.getStorageSync('ZEGO_SESSION_TOKEN');
								const userInfo = uni.getStorageSync('userInfo');
								
								// 尝试1: 从主token修复
								if (zeGoToken) {
									uni.setStorageSync('zeGoTokenThird', zeGoToken);
									uni.setStorageSync('ZEGO_TOKEN_BACKUP', zeGoToken); // 同时创建备份
									console.log('🔧 [数据检查] 从zeGoToken修复zeGoTokenThird');
									return zeGoToken;
								}
								
								// 尝试2: 从备份token修复
								if (backupToken) {
									uni.setStorageSync('zeGoToken', backupToken);
									uni.setStorageSync('zeGoTokenThird', backupToken);
									console.log('🔧 [数据检查] 从备份token修复');
									return backupToken;
								}
								
								// 尝试3: 从会话token修复
								if (sessionToken) {
									uni.setStorageSync('zeGoToken', sessionToken);
									uni.setStorageSync('zeGoTokenThird', sessionToken);
									uni.setStorageSync('ZEGO_TOKEN_BACKUP', sessionToken);
									console.log('🔧 [数据检查] 从会话token修复');
									return sessionToken;
								}
								
								// 尝试4: 检查用户信息中是否有token
								if (userInfo && userInfo.zeGoToken) {
									const userToken = userInfo.zeGoToken;
									uni.setStorageSync('zeGoToken', userToken);
									uni.setStorageSync('zeGoTokenThird', userToken);
									uni.setStorageSync('ZEGO_TOKEN_BACKUP', userToken);
									console.log('🔧 [数据检查] 从用户信息修复token');
									return userToken;
								}
								
								console.error('🔧 [数据检查] 所有token修复方案都失败');
								return null;
							}
						};
						
						zeGoTokenThird = tokenManager.repairTokens();
					}
					
					// 如果修复后还是没有token，检查用户登录状态
					if (!zeGoTokenThird) {
						const isLogin = !!uni.getStorageSync('token');
						if (isLogin) {
							console.warn('🔍 [数据检查] 用户已登录但zeGoToken缺失，可能需要重新登录');
							uni.showModal({
								title: '提示',
								content: 'Token已过期，请重新登录',
								showCancel: false,
								success: () => {
									// 触发重新登录
									uni.$emit('user-logout');
								}
							});
						}
					}
					
					console.log('🔍 [数据检查] 远程视频初始化数据检查:', {
						roomId: roomId ? '✅已获取' : '❌未获取',
						remoteUserId: remoteUserId ? '✅已获取' : '❌未获取',
						zeGoTokenThird: zeGoTokenThird ? '✅已获取' : '❌未获取',
						roomIdValue: roomId,
						remoteUserIdValue: remoteUserId,
						tokenSource: zeGoTokenThird ? (uni.getStorageSync('zeGoTokenThird') ? 'zeGoTokenThird' : 'zeGoToken(自动修复)') : '无',
						tokenPreview: zeGoTokenThird ? zeGoTokenThird.substring(0, 20) + '...' : '无'
					});
					
					const isComplete = !!(roomId && remoteUserId && zeGoTokenThird);
					
					if (callback && typeof callback === 'function') {
						callback({
							isComplete,
							missingData: {
								roomId: !roomId,
								remoteUserId: !remoteUserId,
								zeGoTokenThird: !zeGoTokenThird
							},
							data: {
								roomId,
								remoteUserId,
								zeGoTokenThird
							}
						});
					}
					
					return isComplete;
				});
			},

			// 设置远程视频数据的统一方法
			setRemoteVideoData(data) {
				console.log('📝 [数据设置] 设置远程视频数据:', data);
				
				// 使用数据管理器保存数据，确保持久化
				const persistentData = {
					roomId: data.roomId,
					remoteUserId: data.remoteUserId,
					zeGoTokenThird: data.zeGoTokenThird
				};
				
				// 同时设置到持久化存储和单独存储
				uni.setStorageSync('REMOTE_VIDEO_PERSISTENT_DATA', {
					...persistentData,
					timestamp: Date.now(),
					version: '1.0'
				});
				
				if (data.roomId) {
					uni.setStorageSync('roomID', data.roomId);
					console.log('📝 [数据设置] roomID已设置:', data.roomId);
				}
				
				if (data.remoteUserId) {
					uni.setStorageSync('remoteUserId', data.remoteUserId);
					console.log('📝 [数据设置] remoteUserId已设置:', data.remoteUserId);
				}
				
				if (data.zeGoTokenThird) {
					uni.setStorageSync('zeGoTokenThird', data.zeGoTokenThird);
					console.log('📝 [数据设置] zeGoTokenThird已设置');
				}
				
				// 设置完成后触发数据检查
				setTimeout(() => {
					uni.$emit('check-remote-video-data', (result) => {
						console.log('📝 [数据设置] 设置后数据检查结果:', result);
					});
				}, 100);
			},

			// 恢复远程视频数据
			restoreRemoteVideoData() {
				console.log('🔄 [数据恢复] 开始恢复远程视频数据...');
				
				// 从持久化存储恢复
				const persistentData = uni.getStorageSync('REMOTE_VIDEO_PERSISTENT_DATA');
				const roomID = uni.getStorageSync('roomID');
				const remoteUserId = uni.getStorageSync('remoteUserId');
				const zeGoTokenThird = uni.getStorageSync('zeGoTokenThird');
				
				console.log('🔄 [数据恢复] 当前存储状态:', {
					persistentData: !!persistentData,
					roomID: !!roomID,
					remoteUserId: !!remoteUserId,
					zeGoTokenThird: !!zeGoTokenThird
				});
				
				// 如果持久化数据完整，优先使用并修复单独存储
				if (persistentData && persistentData.roomId && persistentData.remoteUserId && persistentData.zeGoTokenThird) {
					this.setRemoteVideoData(persistentData);
					console.log('🔄 [数据恢复] 从持久化数据成功恢复');
					return true;
				}
				
				// 如果单独存储完整，修复持久化数据
				if (roomID && remoteUserId && zeGoTokenThird) {
					this.setRemoteVideoData({
						roomId: roomID,
						remoteUserId: remoteUserId,
						zeGoTokenThird: zeGoTokenThird
					});
					console.log('🔄 [数据恢复] 从单独存储成功恢复');
					return true;
				}
				
				console.warn('🔄 [数据恢复] 无法恢复数据，所有存储都不完整');
				return false;
			},
			
			// 初始化在线状态监听
			initOnlineStatusMonitor() {
				// 如果用户已登录，设置在线状态并启动心跳
				const authStore = $stores('user');
				if (authStore.isLogin) {
					player.Api.updateOnLine(1);
					this.startHeartbeat();
				}
				
				// 监听登录事件，登录成功后启动心跳
				uni.$on('user-login-success', () => {
					this.startHeartbeat();
				});
				
				// 监听登出事件，登出后停止心跳
				uni.$on('user-logout', () => {
					// 立即停止心跳，防止后续请求
					if (this.heartbeatTimer) {
						clearInterval(this.heartbeatTimer);
						this.heartbeatTimer = null;
						console.log('登出,心跳停止');
					}
				});
			},

			// 智能横竖屏切换处理
			handleOrientationChange() {
				const now = Date.now();
				// 所有页面都需要横竖屏切换，但仍然保留智能检查
				// 防抖机制：如果距离上次切换时间太短，则跳过
				const MIN_CHANGE_INTERVAL = 3000; // 3秒内不重复切换
				if (now - this.lastOrientationChangeTime < MIN_CHANGE_INTERVAL) {
					return;
				}
				// 如果是从后台返回且时间间隔较短，则跳过
				if (this.isFromBackground && this.enterBackgroundTime) {
					const backgroundDuration = now - this.enterBackgroundTime;
					if (backgroundDuration < 2000) { // 2秒内的后台返回不触发切换
						this.isFromBackground = false;
						return;
					}
				}
				// 如果正在显示授权弹窗，则跳过
				if (this.isAuthDialogShowing) {
					return;
				}
				// 执行横竖屏切换
				this.performOrientationChange();
				this.lastOrientationChangeTime = now;
				this.isFromBackground = false; // 重置后台返回标记
			},

			// 执行实际的横竖屏切换
			performOrientationChange() {
				// 清除之前的防抖定时器
				if (this.orientationChangeDebounceTimer) {
					clearTimeout(this.orientationChangeDebounceTimer);
				}

				//页面显示时切换为横屏配置
				plus.screen.lockOrientation('portrait-primary');
				// #ifdef APP-PLUS
				uni.showLoading({
					title: "加载中..."
				})
				
				// 短暂延迟后发送事件,确保屏幕方向已稳定
				setTimeout(() => {
					plus.screen.unlockOrientation();
					plus.screen.lockOrientation('landscape-primary');
					uni.hideLoading();
					// 发送屏幕方向准备就绪的事件
					uni.$emit('orientationReady');
					console.log('📱 屏幕方向已切换为横屏');
				}, 1200)
				//#endif
			},

			// 监听授权弹窗状态（可以在需要的地方调用）
			setAuthDialogStatus(isShowing) {
				this.isAuthDialogShowing = isShowing;
				console.log('📱 [授权状态] 授权弹窗状态变更:', isShowing ? '显示中' : '已关闭');
				
				// 如果授权弹窗关闭，延迟一段时间后重新检查远程视频数据并尝试初始化
				if (!isShowing) {
					setTimeout(() => {
						console.log('📱 [授权状态] 授权完成，检查远程视频数据状态');
						uni.$emit('check-remote-video-data', (result) => {
							console.log('📱 [授权状态] 授权后数据检查结果:', result);
							if (result.isComplete) {
								console.log('📱 [授权状态] 数据完整，可以安全进行视频初始化');
								uni.$emit('auth-completed-restart-video');
							}
						});
					}, 1000); // 等待1秒让授权状态稳定
				}
			},

			// 应用恢复时检查token完整性
		checkTokenIntegrityOnResume() {
			console.log('📱 [App恢复] 检查token完整性...');
			
			const authStore = $stores('user');
			if (!authStore.isLogin) {
				return; // 未登录用户不需要检查
			}
			
			const zeGoToken = uni.getStorageSync('zeGoToken');
			const zeGoTokenThird = uni.getStorageSync('zeGoTokenThird');
			const backupToken = uni.getStorageSync('ZEGO_TOKEN_BACKUP');
			
			// 如果主要token都缺失，尝试自动修复
			if (!zeGoToken && !zeGoTokenThird) {
				console.warn('📱 [App恢复] 检测到token丢失，尝试自动修复...');
				
				if (backupToken) {
					uni.setStorageSync('zeGoToken', backupToken);
					uni.setStorageSync('zeGoTokenThird', backupToken);
					console.log('📱 [App恢复] 从备份token成功修复');
				} else {
					// 如果连备份都没有，可能需要重新登录
					console.error('📱 [App恢复] 无法修复token，可能需要重新登录');
					uni.showModal({
						title: '提示',
						content: 'Token已失效，请重新登录',
						showCancel: false,
						success: () => {
							authStore.clearUserInfo();
							uni.$emit('user-logout');
						}
					});
				}
			} else if (zeGoToken && !zeGoTokenThird) {
				// 修复zeGoTokenThird缺失
				uni.setStorageSync('zeGoTokenThird', zeGoToken);
				console.log('📱 [App恢复] 修复zeGoTokenThird缺失');
			} else if (!zeGoToken && zeGoTokenThird) {
				// 修复zeGoToken缺失
				uni.setStorageSync('zeGoToken', zeGoTokenThird);
				console.log('📱 [App恢复] 修复zeGoToken缺失');
			}
		},

		// 启动心跳机制
			startHeartbeat() {
				if (this.heartbeatTimer) {
					clearInterval(this.heartbeatTimer);
				}
				
				this.heartbeatTimer = setInterval(async () => {
					const authStore = $stores('user');
					if (!authStore.isLogin) {
						// 如果未登录，清理心跳定时器
						if (this.heartbeatTimer) {
							clearInterval(this.heartbeatTimer);
							this.heartbeatTimer = null;
						}
						return;
					}
					
					try {
						await player.Api.updateOnLine(1);
					} catch (error) {
						// 如果返回401错误，说明token已失效，清理登录状态
						if (error.code === 401) {
							authStore.clearUserInfo();
							if (this.heartbeatTimer) {
								clearInterval(this.heartbeatTimer);
								this.heartbeatTimer = null;
							}
						}
						console.error('心跳发送失败', error);
					}
				}, 3 * 60 * 1000); // 每3分钟发送一次心跳
			}
		},
	};
</script>

<template>
</template>

<style>
	/*每个页面公共css */
	@import '@/sheep/scss/index.scss';

	/* #ifndef APP-NVUE */
	@media (prefers-color-scheme: dark) {
		html {
			background: #170746;
		}
	}

	page {
		background-image: url('/static/images/backdrop.png');
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		background-color: #170746;
	}
	/* #endif */
</style>