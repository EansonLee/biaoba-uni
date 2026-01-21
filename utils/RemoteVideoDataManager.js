// 远程视频数据持久化管理器
// 用于解决页面切换时数据丢失的问题

const REMOTE_VIDEO_DATA_KEY = 'REMOTE_VIDEO_PERSISTENT_DATA';

const RemoteVideoDataManager = {
	// 保存数据到持久化存储
	saveData(data) {
		const persistentData = {
			...data,
			timestamp: Date.now(),
			version: '1.0'
		};
		
		// 同时保存到多个位置确保不丢失
		uni.setStorageSync(REMOTE_VIDEO_DATA_KEY, persistentData);
		uni.setStorageSync('roomID', data.roomId);
		uni.setStorageSync('remoteUserId', data.remoteUserId);
		uni.setStorageSync('zeGoTokenThird', data.zeGoTokenThird);
		
		console.log('💾 [数据管理器] 数据已保存:', persistentData);
		return persistentData;
	},

	// 从持久化存储恢复数据
	restoreData() {
		const persistentData = uni.getStorageSync(REMOTE_VIDEO_DATA_KEY);
		const roomID = uni.getStorageSync('roomID');
		const remoteUserId = uni.getStorageSync('remoteUserId');
		const zeGoTokenThird = uni.getStorageSync('zeGoTokenThird');
		
		// 如果持久化数据存在且完整，优先使用
		if (persistentData && persistentData.roomId && persistentData.remoteUserId && persistentData.zeGoTokenThird) {
			// 确保单独的存储也是最新的
			if (roomID !== persistentData.roomId) {
				uni.setStorageSync('roomID', persistentData.roomId);
			}
			if (remoteUserId !== persistentData.remoteUserId) {
				uni.setStorageSync('remoteUserId', persistentData.remoteUserId);
			}
			if (zeGoTokenThird !== persistentData.zeGoTokenThird) {
				uni.setStorageSync('zeGoTokenThird', persistentData.zeGoTokenThird);
			}
			
			console.log('💾 [数据管理器] 从持久化数据恢复:', persistentData);
			return persistentData;
		}
		
		// 否则尝试从单独存储恢复
		if (roomID && remoteUserId && zeGoTokenThird) {
			const restoredData = {
				roomId: roomID,
				remoteUserId: remoteUserId,
				zeGoTokenThird: zeGoTokenThird,
				timestamp: Date.now(),
				version: '1.0'
			};
			
			// 回写到持久化存储
			uni.setStorageSync(REMOTE_VIDEO_DATA_KEY, restoredData);
			console.log('💾 [数据管理器] 从单独存储恢复并同步:', restoredData);
			return restoredData;
		}
		
		console.warn('💾 [数据管理器] 无法恢复数据，所有存储都不完整');
		return null;
	},

	// 检查数据完整性
	checkDataIntegrity() {
		const persistentData = uni.getStorageSync(REMOTE_VIDEO_DATA_KEY);
		const roomID = uni.getStorageSync('roomID');
		const remoteUserId = uni.getStorageSync('remoteUserId');
		const zeGoTokenThird = uni.getStorageSync('zeGoTokenThird');
		
		const integrity = {
			persistent: {
				exists: !!persistentData,
				complete: !!(persistentData && persistentData.roomId && persistentData.remoteUserId && persistentData.zeGoTokenThird)
			},
			individual: {
				roomID: !!roomID,
				remoteUserId: !!remoteUserId,
				zeGoTokenThird: !!zeGoTokenThird,
				complete: !!(roomID && remoteUserId && zeGoTokenThird)
			}
		};
		
		console.log('💾 [数据管理器] 数据完整性检查:', integrity);
		return integrity;
	},

	// 清理所有相关数据
	clearAllData() {
		uni.removeStorageSync(REMOTE_VIDEO_DATA_KEY);
		uni.removeStorageSync('roomID');
		uni.removeStorageSync('remoteUserId');
		// 注意：不清理 zeGoTokenThird，因为它可能在其他地方需要
		
		console.log('💾 [数据管理器] 所有远程视频数据已清理');
	},

	// 自动修复数据
	autoRepairData() {
		const integrity = this.checkDataIntegrity();
		
		// 如果持久化数据完整但单独存储不完整，修复单独存储
		if (integrity.persistent.complete && !integrity.individual.complete) {
			const persistentData = uni.getStorageSync(REMOTE_VIDEO_DATA_KEY);
			uni.setStorageSync('roomID', persistentData.roomId);
			uni.setStorageSync('remoteUserId', persistentData.remoteUserId);
			uni.setStorageSync('zeGoTokenThird', persistentData.zeGoTokenThird);
			console.log('💾 [数据管理器] 自动修复：从持久化数据恢复单独存储');
			return true;
		}
		
		// 如果单独存储完整但持久化数据不完整，修复持久化数据
		if (!integrity.persistent.complete && integrity.individual.complete) {
			const repairData = {
				roomId: uni.getStorageSync('roomID'),
				remoteUserId: uni.getStorageSync('remoteUserId'),
				zeGoTokenThird: uni.getStorageSync('zeGoTokenThird'),
				timestamp: Date.now(),
				version: '1.0'
			};
			uni.setStorageSync(REMOTE_VIDEO_DATA_KEY, repairData);
			console.log('💾 [数据管理器] 自动修复：从单独存储恢复持久化数据');
			return true;
		}
		
		return false;
	}
};

// 导出到全局供调试使用
if (typeof window !== 'undefined') {
	window.RemoteVideoDataManager = RemoteVideoDataManager;
}

export default RemoteVideoDataManager;