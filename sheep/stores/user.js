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
                if (storedToken) {
                    this.token = storedToken;
                    this.isLogin = true;
                    if (storedUserInfo) {
                        this.userInfo = storedUserInfo;
                    } else {
                        this.userInfo = await this.getInfo();
                    }
                    return true;
                } else {
                    // 确保未登录状态干净
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
						hasBackup: !!uni.getStorageSync('ZEGO_TOKEN_BACKUP')
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
                uni.removeStorageSync('token');
                uni.removeStorageSync('refresh-token');
                uni.removeStorageSync('userInfo');
				uni.removeStorageSync('zeGoToken');
				uni.removeStorageSync('zeGoTokenThird'); // 同时清理 zeGoTokenThird
				// 清理所有相关token备份
				uni.removeStorageSync('ZEGO_TOKEN_BACKUP');
				uni.removeStorageSync('ZEGO_SESSION_TOKEN');
				console.log('🔄 [用户存储] 用户信息已清理，包括所有token和备份');
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