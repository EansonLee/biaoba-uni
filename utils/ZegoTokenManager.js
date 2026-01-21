// Zego Token 深度管理器
// 专门解决token缺失和不同步问题

const ZegoTokenManager = {
	// Token的存储键名
	KEYS: {
		zeGoToken: 'zeGoToken',
		zeGoTokenThird: 'zeGoTokenThird',
		backupToken: 'ZEGO_TOKEN_BACKUP', // 备份存储
		sessionToken: 'ZEGO_SESSION_TOKEN' // 会话级token
	},

	// 检查token完整性
	checkTokenIntegrity() {
		const zeGoToken = uni.getStorageSync(this.KEYS.zeGoToken);
		const zeGoTokenThird = uni.getStorageSync(this.KEYS.zeGoTokenThird);
		const backupToken = uni.getStorageSync(this.KEYS.backupToken);
		const sessionToken = uni.getStorageSync(this.KEYS.sessionToken);
		const userInfo = uni.getStorageSync('userInfo');
		const isLogin = !!uni.getStorageSync('token');

		const status = {
			zeGoToken: !!zeGoToken,
			zeGoTokenThird: !!zeGoTokenThird,
			backupToken: !!backupToken,
			sessionToken: !!sessionToken,
			userLoggedIn: isLogin,
			tokensMatch: zeGoToken === zeGoTokenThird,
			hasAnyToken: !!(zeGoToken || zeGoTokenThird || backupToken || sessionToken),
			values: {
				zeGoToken: zeGoToken?.substring(0, 20) + '...' || 'null',
				zeGoTokenThird: zeGoTokenThird?.substring(0, 20) + '...' || 'null',
				backupToken: backupToken?.substring(0, 20) + '...' || 'null'
			}
		};

		console.log('🔍 [TokenManager] Token完整性检查:', status);
		return status;
	},

	// 智能修复token
	repairTokens() {
		console.log('🔧 [TokenManager] 开始智能修复token...');
		const integrity = this.checkTokenIntegrity();
		let repaired = false;

		// 场景1: zeGoToken存在但zeGoTokenThird不存在
		if (integrity.zeGoToken && !integrity.zeGoTokenThird) {
			const zeGoToken = uni.getStorageSync(this.KEYS.zeGoToken);
			uni.setStorageSync(this.KEYS.zeGoTokenThird, zeGoToken);
			this.createBackup(zeGoToken);
			console.log('🔧 [TokenManager] 修复完成：zeGoToken -> zeGoTokenThird');
			repaired = true;
		}

		// 场景2: zeGoTokenThird存在但zeGoToken不存在
		if (!integrity.zeGoToken && integrity.zeGoTokenThird) {
			const zeGoTokenThird = uni.getStorageSync(this.KEYS.zeGoTokenThird);
			uni.setStorageSync(this.KEYS.zeGoToken, zeGoTokenThird);
			this.createBackup(zeGoTokenThird);
			console.log('🔧 [TokenManager] 修复完成：zeGoTokenThird -> zeGoToken');
			repaired = true;
		}

		// 场景3: 两个主要token都不存在，但有备份
		if (!integrity.zeGoToken && !integrity.zeGoTokenThird && integrity.backupToken) {
			const backupToken = uni.getStorageSync(this.KEYS.backupToken);
			uni.setStorageSync(this.KEYS.zeGoToken, backupToken);
			uni.setStorageSync(this.KEYS.zeGoTokenThird, backupToken);
			console.log('🔧 [TokenManager] 修复完成：从备份恢复所有token');
			repaired = true;
		}

		// 场景4: 所有本地token都不存在，但有会话token
		if (!integrity.hasAnyToken && integrity.sessionToken) {
			const sessionToken = uni.getStorageSync(this.KEYS.sessionToken);
			uni.setStorageSync(this.KEYS.zeGoToken, sessionToken);
			uni.setStorageSync(this.KEYS.zeGoTokenThird, sessionToken);
			this.createBackup(sessionToken);
			console.log('🔧 [TokenManager] 修复完成：从会话token恢复');
			repaired = true;
		}

		// 场景5: token不匹配，使用最新的
		if (integrity.zeGoToken && integrity.zeGoTokenThird && !integrity.tokensMatch) {
			const zeGoToken = uni.getStorageSync(this.KEYS.zeGoToken);
			const zeGoTokenThird = uni.getStorageSync(this.KEYS.zeGoTokenThird);
			
			// 使用用户最近登录时设置的token (通常是zeGoTokenThird)
			uni.setStorageSync(this.KEYS.zeGoToken, zeGoTokenThird);
			this.createBackup(zeGoTokenThird);
			console.log('🔧 [TokenManager] 修复完成：同步不匹配的token');
			repaired = true;
		}

		if (repaired) {
			console.log('✅ [TokenManager] Token修复完成');
			this.checkTokenIntegrity(); // 再次检查确认修复效果
		} else {
			console.log('⚠️ [TokenManager] 无法自动修复，可能需要重新登录');
		}

		return repaired;
	},

	// 创建token备份
	createBackup(token) {
		if (token) {
			uni.setStorageSync(this.KEYS.backupToken, token);
			uni.setStorageSync(this.KEYS.sessionToken, token);
			console.log('💾 [TokenManager] Token备份已创建');
		}
	},

	// 安全设置token (确保同步)
	setTokensSafely(token) {
		if (!token) {
			console.warn('⚠️ [TokenManager] 尝试设置空token');
			return false;
		}

		try {
			uni.setStorageSync(this.KEYS.zeGoToken, token);
			uni.setStorageSync(this.KEYS.zeGoTokenThird, token);
			this.createBackup(token);
			
			console.log('✅ [TokenManager] Token安全设置完成:', {
				token: token.substring(0, 20) + '...',
				timestamp: new Date().toISOString()
			});
			
			return true;
		} catch (error) {
			console.error('❌ [TokenManager] Token设置失败:', error);
			return false;
		}
	},

	// 清理所有token
	clearAllTokens() {
		uni.removeStorageSync(this.KEYS.zeGoToken);
		uni.removeStorageSync(this.KEYS.zeGoTokenThird);
		uni.removeStorageSync(this.KEYS.backupToken);
		uni.removeStorageSync(this.KEYS.sessionToken);
		console.log('🧹 [TokenManager] 所有token已清理');
	},

	// 获取最佳可用token
	getBestAvailableToken() {
		const integrity = this.checkTokenIntegrity();
		
		// 优先级：zeGoTokenThird > zeGoToken > backupToken > sessionToken
		if (integrity.zeGoTokenThird) {
			const token = uni.getStorageSync(this.KEYS.zeGoTokenThird);
			console.log('🎯 [TokenManager] 使用zeGoTokenThird');
			return token;
		}
		
		if (integrity.zeGoToken) {
			const token = uni.getStorageSync(this.KEYS.zeGoToken);
			console.log('🎯 [TokenManager] 使用zeGoToken');
			return token;
		}
		
		if (integrity.backupToken) {
			const token = uni.getStorageSync(this.KEYS.backupToken);
			console.log('🎯 [TokenManager] 使用备份token');
			// 恢复主要token
			this.setTokensSafely(token);
			return token;
		}
		
		if (integrity.sessionToken) {
			const token = uni.getStorageSync(this.KEYS.sessionToken);
			console.log('🎯 [TokenManager] 使用会话token');
			// 恢复主要token
			this.setTokensSafely(token);
			return token;
		}
		
		console.warn('❌ [TokenManager] 没有可用的token');
		return null;
	},

	// 诊断token问题
	diagnoseTokenIssues() {
		console.log('🏥 [TokenManager] 开始token问题诊断...');
		
		const integrity = this.checkTokenIntegrity();
		const issues = [];
		const solutions = [];

		if (!integrity.userLoggedIn) {
			issues.push('用户未登录');
			solutions.push('请重新登录获取token');
		}

		if (!integrity.zeGoToken && !integrity.zeGoTokenThird) {
			issues.push('缺少主要token');
			solutions.push('检查登录流程中token的设置');
		}

		if (integrity.zeGoToken && integrity.zeGoTokenThird && !integrity.tokensMatch) {
			issues.push('token不匹配');
			solutions.push('同步token值');
		}

		if (!integrity.hasAnyToken) {
			issues.push('所有token都缺失');
			solutions.push('重新登录或检查存储逻辑');
		}

		const diagnosis = {
			issues,
			solutions,
			canAutoRepair: integrity.hasAnyToken,
			recommendAction: issues.length === 0 ? '正常' : (integrity.hasAnyToken ? '自动修复' : '重新登录')
		};

		console.log('🏥 [TokenManager] 诊断结果:', diagnosis);
		return diagnosis;
	}
};

// 导出到全局供调试使用
if (typeof window !== 'undefined') {
	window.ZegoTokenManager = ZegoTokenManager;
}

export default ZegoTokenManager;