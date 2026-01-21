import {defineStore} from 'pinia';
import player from "@/sheep/api/dart/player";
import router from "@/sheep/router";

const useAuthStore = defineStore('user', {
        state: () => ({
            token: uni.getStorageSync('token') || '',
            userInfo: uni.getStorageSync('userInfo') || null,
            isLogin: !!uni.getStorageSync('token'),
			zeGoToken : uni.getStorageSync('zeGoToken') || null,
            lastUpdateTime: 0, // 上次更新时间
        }),
        actions: {
            /**
             * 初始化用户数据，应用启动时调用
             */
            async initAuth() {
                const storedToken = uni.getStorageSync('token');
                const storedUserInfo = uni.getStorageSync('userInfo');
				const zeGoToken = uni.getStorageSync('zeGoToken');

                // 检查token和userInfo是否同时存在（数据完整性检查）
                if (storedToken && storedUserInfo) {
                    this.token = storedToken;
                    this.isLogin = true;
                    this.userInfo = storedUserInfo;

                    console.log('✅ [initAuth] 检测到有效登录状态，使用缓存用户信息');
                    return true;
                } else if (storedToken && !storedUserInfo) {
                    // token存在但userInfo不存在，这是异常状态
                    console.warn('⚠️ [initAuth] 检测到不完整的登录状态：token存在但userInfo缺失，需要重新获取用户信息');

                    try {
                        this.token = storedToken;
                        this.isLogin = true;
                        // 尝试重新获取用户信息
                        this.userInfo = await this.getInfo();
                        console.log('✅ [initAuth] 用户信息已重新获取');
                        return true;
                    } catch (error) {
                        console.error('❌ [initAuth] 获取用户信息失败，token可能已过期:', error);
                        // token无效，清理登录状态
                        this.clearUserInfo();
                        return false;
                    }
                } else if (!storedToken && storedUserInfo) {
                    // token不存在但userInfo存在，这是异常状态（缓存不同步）
                    console.warn('⚠️ [initAuth] 检测到不完整的登录状态：token缺失但userInfo存在，清理缓存');
                    this.clearUserInfo();
                    return false;
                } else {
                    // 都不存在，正常的未登录状态
                    console.log('✅ [initAuth] 未检测到登录状态，需要重新登录');
                    this.clearUserInfo();
                    return false;
                }
            },
            setToken(token, refreshToken,zeGoToken,zeGoTokenThird) {
                this.token = token;
                this.isLogin = !!token;
                if (token === '') {
                    this.isLogin = false;
                    uni.removeStorageSync('token');
                    uni.removeStorageSync('refresh-token');
					uni.removeStorageSync('zeGoToken');
					uni.removeStorageSync('zeGoTokenThird'); // 同时清理 zeGoTokenThird
					// 清理所有相关token备份
					uni.removeStorageSync('ZEGO_TOKEN_BACKUP');
					uni.removeStorageSync('ZEGO_SESSION_TOKEN');
					console.log('🔄 [用户存储] 登录失败，已清理所有token');
                } else {
                    this.isLogin = true;
                    // 持久化存储
                    uni.setStorageSync('token', token);

                    // 添加登录时间戳和会话ID
                    const loginTimestamp = Date.now();
                    const loginSessionId = `session_${loginTimestamp}_${Math.random().toString(36).substring(2, 15)}`;
                    uni.setStorageSync('login-timestamp', loginTimestamp);
                    uni.setStorageSync('login-session-id', loginSessionId);
                    console.log('✅ [用户存储] 登录会话ID已创建:', loginSessionId);

					// 强化token设置逻辑，确保同步
					if (zeGoToken) {
						uni.setStorageSync('zeGoToken', zeGoToken);
						uni.setStorageSync('zeGoTokenThird', zeGoTokenThird || zeGoToken); // 如果没有zeGoTokenThird，使用zeGoToken
						// 创建备份
						uni.setStorageSync('ZEGO_TOKEN_BACKUP', zeGoToken);
						uni.setStorageSync('ZEGO_SESSION_TOKEN', zeGoToken);
					} else if (zeGoTokenThird) {
						// 如果只有zeGoTokenThird，设置所有token
						uni.setStorageSync('zeGoToken', zeGoTokenThird);
						uni.setStorageSync('zeGoTokenThird', zeGoTokenThird);
						uni.setStorageSync('ZEGO_TOKEN_BACKUP', zeGoTokenThird);
						uni.setStorageSync('ZEGO_SESSION_TOKEN', zeGoTokenThird);
					}

					console.log('🔄 [用户存储] 登录成功，token已设置:', {
						zeGoToken: !!uni.getStorageSync('zeGoToken'),
						zeGoTokenThird: !!uni.getStorageSync('zeGoTokenThird'),
						hasBackup: !!uni.getStorageSync('ZEGO_TOKEN_BACKUP'),
                        loginTimestamp: loginTimestamp,
                        sessionId: loginSessionId
					});
                    uni.setStorageSync('refresh-token', refreshToken);
                    this.loginAfter();

                    // 触发登录成功事件
                    uni.$emit('user-login-success');
                }
                return this.isLogin;
            },
            getUserInfo() {
                return this.userInfo;
            },
            async logout() {
                // 先触发登出事件，再清理用户信息
                uni.$emit('user-logout');
                this.clearUserInfo();
                
                // 使用setTimeout确保状态更新后再跳转
                setTimeout(() => {
                    router.go('/pages/index/index?jumpType=no');
                }, 0);
            },
            // 清空登陆信息
            clearUserInfo() {
                this.token = '';
                this.userInfo = null;
                this.isLogin = false;

                // 同步删除所有登录相关的存储项
                const storageKeys = [
                    'token',
                    'refresh-token',
                    'userInfo',
                    'zeGoToken',
                    'zeGoTokenThird',
                    'ZEGO_TOKEN_BACKUP',
                    'ZEGO_SESSION_TOKEN',
                    'login-session-id',  // 登录会话ID
                    'login-timestamp'     // 登录时间戳
                ];

                storageKeys.forEach(key => {
                    uni.removeStorageSync(key);
                });

                // 添加登出时间戳，防止进程杀死后使用过期的缓存
                const logoutTimestamp = Date.now();
                uni.setStorageSync('logout-timestamp', logoutTimestamp);

                console.log('🔄 [用户存储] 用户信息已清理，包括所有token和备份');
                console.log('⏰ [用户存储] 登出时间戳已记录:', logoutTimestamp);
            },
            // 登录后，加载各种信息
            async loginAfter() {
                await this.updateUserData();
            },
            // 更新用户相关信息 (手动限流，5 秒之内不刷新)
            async updateUserData() {
                if (!this.isLogin) {
                    this.logout();
                    return;
                }
                // 防抖，5 秒之内不刷新
                const nowTime = new Date().getTime();
                if (this.lastUpdateTime + 5000 > nowTime) {
                    return;
                }
                this.lastUpdateTime = nowTime;

                // 获取最新信息
                await this.getInfo();
                return this.userInfo;
            },
            async getInfo() {
                this.userInfo = await player.Api.getInfo();
                uni.setStorageSync('userInfo', this.userInfo)
                return this.getUserInfo();
            },
        },
        persist: {
            enabled: true,
            strategies: [
                {
                    key: 'user-store',
                },
            ],
        },
    });

export default useAuthStore;