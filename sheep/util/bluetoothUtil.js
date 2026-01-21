import { ref, reactive } from 'vue';
import bluetooth from "@/sheep/stores/bluetooth";
import { showToast } from "@/sheep/util/toast";
import { getGameConfig } from '@/sheep/config/bluetoothConfig'
import emitter from '@/sheep/util/eventBus'
import i18n from '@/sheep/i18n';
import useGameContextStore from '@/sheep/stores/gameContext';

// 在 .js 文件中使用 i18n.global.locale 来访问语言 (legacy 模式)
const getLocale = () => i18n.global.locale;

// ------------------- 模块内部状态 -------------------
const state = reactive({
    deviceId: '', // 当前操作的设备ID
    serviceId: '0000FFE0-0000-1000-8000-00805F9B34FB',
    characteristicId: '0000FFE1-0000-1000-8000-00805F9B34FB',
    isSearching: false, // 是否正在搜索
});

// ------------------- 核心连接与发现逻辑 -------------------

// 【1】初始化蓝牙
const initBlue = () => {
    // #ifdef APP-PLUS
    uni.openBluetoothAdapter({
        success: () => {
            console.log('[BT] 蓝牙适配器初始化成功');
            discovery(); // 在成功回调中启动搜索
        },
        fail: (err) => {
            console.error('[BT] 蓝牙适配器初始化失败', err);
            errorHandle('蓝牙初始化失败');
        }
    });
    // #endif
}

// 【2】开始搜寻附近设备
const discovery = () => {
    // #ifdef APP-PLUS
    if (state.isSearching) return;
    state.isSearching = true;
    uni.startBluetoothDevicesDiscovery({
        success: () => {
            console.log('[BT] 开始搜索附近设备...');
            uni.onBluetoothDeviceFound(found);
        },
        fail: () => {
            errorHandle('蓝牙设备搜索失败');
            state.isSearching = false;
        }
    });
    // 10秒后自动停止搜索，防止过度耗电
    setTimeout(stopDiscovery, 10000);
    // #endif
}

// 【3】找到新设备
const found = (res) => {
    // #ifdef APP-PLUS
    // 如果已停止搜索，则忽略后续发现的设备，防止重复连接
    if (!state.isSearching) {
        return;
    }
    if (res.devices[0].name === 'EVM_GoDart' || res.devices[0].localName === 'EVM_GoDart') {
        console.log('[BT] 找到目标设备:', res.devices[0].deviceId);
        stopDiscovery();
        connect(res.devices[0].deviceId);
    }
    // #endif
}

// 【4】连接设备
const connect = (deviceId) => {
    // #ifdef APP-PLUS
    state.deviceId = deviceId;
    uni.createBLEConnection({
        deviceId: state.deviceId,
        success: () => {
            console.log(`[BT] 连接设备 ${state.deviceId} 成功`);
            // 替换旧的固定延时，改为启动服务轮询
            pollForServices();
        },
        fail: () => errorHandle('蓝牙连接失败')
    });
    // #endif
}

// 【5】停止搜索
const stopDiscovery = () => {
    // #ifdef APP-PLUS
    if (!state.isSearching) return;
    state.isSearching = false;
    uni.stopBluetoothDevicesDiscovery({
        success: () => console.log('[BT] 停止设备搜索'),
    });
    // 关键修复：移除设备发现的监听器，防止在页面跳转后触发"幽灵回调"
    // 同时增加一个判断，确保在不支持该API的旧版uni-app环境中不会报错
    if (uni.offBluetoothDeviceFound) {
        uni.offBluetoothDeviceFound(found);
    }
    // #endif
}

// 【6】服务轮询 (新函数，替代旧的 getServices)
const pollForServices = (maxAttempts = 10, attempt = 1) => {
    // #ifdef APP-PLUS
    if (attempt > maxAttempts) {
        console.error(`[BT] ${maxAttempts}次尝试后仍未发现服务，操作失败。`);
        errorHandle('查找蓝牙服务超时');
        return;
    }

    console.log(`[BT] 正在进行第 ${attempt} 次服务发现...`);

    uni.getBLEDeviceServices({
        deviceId: state.deviceId,
        success: (res) => {
            const serviceUUIDs = res.services.map(s => s.uuid.toUpperCase());
            if (serviceUUIDs.length > 0) {
                // 成功发现服务
                console.log('[BT] 成功发现服务列表:', serviceUUIDs.join(', '));
                const hasFfe0 = serviceUUIDs.some(uuid => uuid.includes('FFE0'));
                if (hasFfe0) {
                    // 找到了我们需要的服务，继续下一步
                    setTimeout(getCharacteristics, 200); // 稳定延时
                } else {
                    // 发现了服务，但没有我们需要的，这是个硬错误
                    errorHandle('未找到目标服务FFE0');
                }
            } else {
                // 服务列表为空，稍后重试
                setTimeout(() => pollForServices(maxAttempts, attempt + 1), 300);
            }
        },
        fail: (err) => {
            // getBLEDeviceServices API调用本身失败，也进行重试
            console.warn(`[BT] 第${attempt}次API调用失败，准备重试`, err);
            setTimeout(() => pollForServices(maxAttempts, attempt + 1), 300);
        }
    });
    // #endif
}

// 【7】获取特征值 (已修复函数调用错误和增加校验)
const getCharacteristics = () => {
    // #ifdef APP-PLUS
    uni.getBLEDeviceCharacteristics({
        deviceId: state.deviceId,
        serviceId: state.serviceId,
        success: (res) => {
            console.log('[BT] 获取特征值成功');
            const hasFfe1 = res.characteristics.some(c => c.uuid.toUpperCase().includes('FFE1'));
            if (hasFfe1) {
                notify();
            } else {
                errorHandle('未找到目标特征值FFE1');
            }
        },
        fail: () => errorHandle('获取蓝牙特征值失败')
    });
    // #endif
}

// 【8】开启消息监听
const notify = () => {
    // #ifdef APP-PLUS
    uni.notifyBLECharacteristicValueChange({
        deviceId: state.deviceId,
        serviceId: state.serviceId,
        characteristicId: state.characteristicId,
        success: () => {
            console.log('[BT] 开启消息监听成功');
            connected();
            listenValueChange();
        },
        fail: (err) => errorHandle('开启消息监听失败')
    });
    // #endif
}

// ArrayBuffer转16进度字符串示例
const ab2hex = (buffer) => {
    const hexArr = Array.prototype.map.call(new Uint8Array(buffer), (bit) => ('00' + bit.toString(16).toUpperCase()).slice(-2));
    return hexArr.join('');
};

/**
 * 🔥 构建增强的日志数据
 * @param {Object} cfg - 原始配置数据
 * @param {String} resHex - 蓝牙原始16进制数据
 * @returns {Object} 增强后的日志数据
 */
const buildEnhancedLogData = (cfg, resHex) => {
	try {
		// 优先从全局游戏上下文Store获取玩家与游戏状态
		const gameCtx = useGameContextStore();
		const ctx = gameCtx.getContext();
		
		// 获取当前页面路由信息，用于判断游戏模式（并同步到Store）
		let route = ctx.route || '';
		try {
			const pages = getCurrentPages();
			const currentPage = pages[pages.length - 1];
			route = currentPage ? currentPage.route : route;
			if (route && route !== ctx.route) gameCtx.setRoute(route);
		} catch(_) {}
		
		// 从路由推断游戏类型
		let gameModeName = '未知模式';
		let gameModeType = 0;
		
		if (route.includes('01')) {
			gameModeName = '301游戏';
			gameModeType = 1;
		} else if (route.includes('mickeyMouse')) {
			gameModeName = '米老鼠游戏';
			gameModeType = 2;
		} else if (route.includes('practice')) {
			gameModeName = '练习模式';
			gameModeType = 3;
		} else if (route.includes('twist')) {
			gameModeName = '扭转游戏';
			gameModeType = 4;
		} else if (route.includes('mixed')) {
			gameModeName = '上海变种';
			gameModeType = 5;
		} else if (route.includes('freeze')) {
			gameModeName = '冰冻模式';
			gameModeType = 6;
		} else if (route.includes('highMark')) {
			gameModeName = '高分模式';
			gameModeType = 7;
		} else if (route.includes('suddenDeath')) {
			gameModeName = '骤死模式';
			gameModeType = 8;
		}
		
		// 优先使用全局Store中的上下文（由各游戏页面实时维护）
		let playerInfo = ctx.players || null;
		let gameInfo = ctx.gameState || null;
		
		// 兜底：尝试从页面实例获取（可能因 <script setup> 未暴露而失败）
		let currentPage;
		try {
			const pages = getCurrentPages();
			currentPage = pages[pages.length - 1];
		} catch(_) {}
		if (currentPage && currentPage.$vm && (!playerInfo || !gameInfo)) {
			const vm = currentPage.$vm;
			
			// 🔧 修复：优先尝试从 state.teamArray 获取玩家信息（301游戏）
			if (vm.state && vm.state.teamArray && vm.state.teamArray.length > 0) {
				// 从teamArray中提取所有玩家
				const allPlayers = [];
				vm.state.teamArray.forEach((team, teamIndex) => {
					if (team.players && team.players.length > 0) {
						team.players.forEach((p, pIndex) => {
							allPlayers.push({
								teamId: team.team,
								teamIndex: teamIndex + 1,
								playerIndex: pIndex + 1,
								name: p.playerName || p.name || `玩家${allPlayers.length + 1}`,
								id: p.playerOnly || p.playerId || p.id,
								score: team.currentScore,
								isActive: vm.state.gameState && vm.state.gameState.currentTeam === team.team
							});
						});
					}
				});
				
				if (allPlayers.length > 0) {
					playerInfo = {
						playerCount: allPlayers.length,
						teamCount: vm.state.teamArray.length,
						players: allPlayers
					};
				}
			} else if (vm.players) {
				// 其他游戏的 players 数组
				playerInfo = {
					playerCount: vm.players.length,
					players: vm.players.map((p, index) => ({
						index: index + 1,
						name: p.name || p.playerName || `玩家${index + 1}`,
						id: p.id || p.playerId,
						score: p.score || p.currentScore,
						isActive: p.isActive || p.isCurrent
					}))
				};
			} else if (vm.player) {
				// 单人模式
				playerInfo = {
					playerCount: 1,
					players: [{
						index: 1,
						name: vm.player.name || vm.player.playerName || '单人玩家',
						id: vm.player.id || vm.player.playerId,
						score: vm.player.score || vm.player.currentScore,
						isActive: true
					}]
				};
			}
			
			// 🔧 修复：优先从 state.gameState 获取游戏状态
			if (vm.state && vm.state.gameState) {
				const gs = vm.state.gameState;
				gameInfo = {
					currentRound: gs.currentRound,
					currentDart: gs.currentDart,
					currentTeam: gs.currentTeam,
					currentPlayerIndex: gs.currentPlayerIndex,
					maxRounds: gs.maxRounds,
					teamSize: gs.teamSize,
					isOnline: vm.state.params?.type === 11,
					gameType: vm.state.params?.gameType,
					startingScore: vm.state.modeEntity?.startingScore
				};
			} else if (vm.gameData || vm.gameState) {
				// 兼容其他游戏模式
				const gameData = vm.gameData || vm.gameState;
				gameInfo = {
					currentRound: gameData.currentRound || gameData.round,
					currentLeg: gameData.currentLeg || gameData.leg,
					currentSet: gameData.currentSet || gameData.set,
					isOnline: gameData.isOnline || false,
					gameId: gameData.gameId || gameData.id
				};
			}
		}
		
		// 如果仍然获取不到，设置为null，避免undefined
		if (!playerInfo) playerInfo = null;
		if (!gameInfo) gameInfo = null;
		
		// 构建完整的日志数据
		const enhancedData = {
			// 原始蓝牙数据
			rawData: {
				hexCode: resHex,
				...cfg
			},
			// 游戏模式信息
			gameMode: {
				name: gameModeName,
				type: gameModeType,
				route: route
			},
			// 玩家信息
			players: playerInfo,
			// 游戏状态
			gameState: gameInfo,
			// 设备信息
			device: {
				deviceId: bluetooth().deviceId || state.deviceId,
				isConnected: bluetooth().isConnected
			},
			// 时间戳
			timestamp: Date.now(),
			dateTime: new Date().toISOString()
		};
		
		return enhancedData;
	} catch (error) {
		console.error('[BT-LOG] 构建增强日志数据失败:', error);
		// 失败时返回基础数据
		return {
			rawData: cfg,
			hexCode: resHex,
			timestamp: Date.now(),
			error: error.message
		};
	}
};

// ------------------- 新增：持久化的回调函数 (最终修复版) -------------------

// 【回调1】监听消息变化的回调
const _onCharacteristicValueChange = (res) => {
	setTimeout(() => {
		// 🔍 打印最原始的蓝牙数据（未加工）
		console.log('========== 蓝牙原始数据 START ==========');
		// 将 ArrayBuffer 转换为可读格式
		const uint8Array = new Uint8Array(res.value);
		console.log('ArrayBuffer 字节长度:', res.value.byteLength);
		console.log('Uint8Array 原始字节数组:', Array.from(uint8Array));
		console.log('十进制格式:', Array.from(uint8Array).join(', '));
		console.log('十六进制格式:', Array.from(uint8Array).map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' '));
		console.log('二进制格式:', Array.from(uint8Array).map(b => b.toString(2).padStart(8, '0')).join(' '));
		console.log('ASCII字符 (如果可读):', Array.from(uint8Array).map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join(''));
		console.log('========== 蓝牙原始数据 END ==========');
		
		let resHex = ab2hex(res.value);
		console.log('转换后的16进制字符串:', resHex);
		
		if (resHex && bluetooth().isGameStart) {
			console.log('接收到蓝牙数据:', resHex);

			try {
				const cfg = getGameConfig(resHex); // 若不存在返回 {}
				
				// 🔥 修复：也记录换手按钮和其他事件
				if (cfg && Object.keys(cfg).length > 0) {
					// 增强日志上报：添加游戏上下文信息
					const enhancedLogData = buildEnhancedLogData(cfg, resHex);
					
					uni.request({
						url: 'http://47.83.149.5:8080/log?key=yuanfeng',
						method: 'POST',
						data: JSON.stringify(enhancedLogData),
						header: { 'Content-Type': 'text/plain;charset=UTF-8' },
						success: () => {
							console.log('[BT-LOG] 日志上报成功:', enhancedLogData);
						},
						fail: (err) => {
							console.warn('[BT-LOG] 日志上报失败:', err);
						}
					});
				} else if (resHex) {
					// 🔥 即使没有配置，也记录原始16进制数据
					const unknownData = buildEnhancedLogData({
						originalScore: 0,
						score: 0,
						area: '未知代码',
						multiplier: 0,
						remarks: 'UNKNOWN',
						isUnknown: true
					}, resHex);
					
					uni.request({
						url: 'http://47.83.149.5:8080/log?key=yuanfeng',
						method: 'POST',
						data: JSON.stringify(unknownData),
						header: { 'Content-Type': 'text/plain;charset=UTF-8' },
						success: () => {
							console.log('[BT-LOG] 未知代码上报成功:', unknownData);
						},
						fail: (err) => {
							console.warn('[BT-LOG] 未知代码上报失败:', err);
						}
					});
				}
			} catch (e) {
				console.error('[BT-LOG] 日志上报异常:', e);
			}

			// 🔧 所有蓝牙数据都传递给游戏页面，由游戏页面进行回合判断
			// 优先使用handleScore调用回调函数（支持连续相同数据）
			if (bluetooth().scoreCallback && typeof bluetooth().scoreCallback === 'function') {
				bluetooth().handleScore(resHex);
			} else {
				// 兼容旧的watch监听方式（其他游戏）
				bluetooth().setScoreCallback(resHex);
			}
		}
	}, 0);
}

// 【回调2】监听连接状态变化的回调
const _onConnectionStateChange = (res) => {
	setTimeout(() => {
		console.log(`[BT] 系统连接状态改变: deviceId=${res.deviceId}, connected=${res.connected}`);
		if (!res.connected) {
			// 检查是否是当前活动设备断开
			if (state.deviceId === res.deviceId || bluetooth().deviceId === res.deviceId) {
				console.warn('[BT] 检测到活动设备意外断开！');
				state.deviceId = '';
				// 更新store状态
				bluetooth().setConnectionState(false, null);
				// 显示断开提示
				setTimeout(() => {
					showToast({ message: getLocale() === 'zh' ? '蓝牙连接意外断开' : 'Bluetooth Disconnected', icon: 'none' });
				}, 200);
			}
		} else {
			// 设备重新连接
			if (state.deviceId === res.deviceId || bluetooth().deviceId === res.deviceId) {
				console.log('[BT] 设备重新连接');
				bluetooth().setConnectionState(true, res.deviceId);
			}
		}
	}, 100);
}


// ------------------- 重构后的监听函数 -------------------

// 【9】监听消息变化
const listenValueChange = () => {
    // #ifdef APP-PLUS
    uni.onBLECharacteristicValueChange(_onCharacteristicValueChange);
    // #endif
}

// 在模块加载时就注册永久的连接状态监听器
// #ifdef APP-PLUS
uni.onBLEConnectionStateChange(_onConnectionStateChange);
// #endif

// 监听来自UI的日志事件（例如：换手、重投、结束等）
emitter.on('log:gameEvent', (event) => {
	try {
		const payload = event && typeof event === 'object' ? event : { action: String(event) };
		const baseCfg = {
			originalScore: 0,
			score: 0,
			area: 'UI事件',
			multiplier: 0,
			remarks: payload.action || 'UI_EVENT',
			isUIEvent: true,
			source: 'ui',
		};
		const logData = buildEnhancedLogData(baseCfg, null);
		logData.event = payload;
		uni.request({
			url: 'http://47.83.149.5:8080/log?key=yuanfeng',
			method: 'POST',
			data: JSON.stringify(logData),
			header: { 'Content-Type': 'text/plain;charset=UTF-8' },
			success: () => console.log('[BT-LOG] UI事件上报成功:', payload.action),
			fail: (err) => console.warn('[BT-LOG] UI事件上报失败:', err),
		});
	} catch (e) {
		console.warn('[BT-LOG] 处理UI事件日志失败:', e);
	}
});


// ------------------- 状态与错误处理 -------------------

// 通用错误处理
const errorHandle = (text = '蓝牙操作失败') => {
    // 清理本地状态
    state.deviceId = '';
    state.isSearching = false;

    // 更新store状态
    bluetooth().setConnectionState(false, null);

    setTimeout(() => {
        showToast({ message: text, icon: 'none', duration: 2000 });
    }, 100);
}

// 连接成功后的处理
const connected = () => {
    bluetooth().setConnected(state.deviceId);
    setTimeout(() => {
        showToast({ message: getLocale() === 'zh' ? '蓝牙连接成功' : 'Connected Successfully', icon: 'none' });
    }, 100);
}


// ------------------- 改造后的导出函数 -------------------

/**
 * 【核心改造】断开连接 (已修复逻辑)
 * 包含发送停止指令的健壮逻辑
 */
export const closeConnected = (zombieDeviceId = null) => {
    // #ifdef APP-PLUS
    const deviceId = zombieDeviceId || state.deviceId || bluetooth().deviceId;
    if (!deviceId) {
        console.log('[BT] 当前无连接，无需断开');
        return;
    }
    console.log(`[BT] 开始断开设备 ${deviceId}...`);

    const buffer = new ArrayBuffer(1);
    const dataView = new DataView(buffer);
    dataView.setUint8(0, 0x00);

    uni.writeBLECharacteristicValue({
        deviceId,
        serviceId: state.serviceId,
        characteristicId: state.characteristicId,
        value: buffer,
        fail: (err) => console.error('❌ [BT] 发送停止指令失败:', err),
        complete: () => {
            // 关键修复：在关闭连接前，先取消所有监听，做到有始有终
            // 修复安卓兼容性问题：检查API是否存在
            try {
                if (typeof uni.offBLECharacteristicValueChange === 'function') {
                    // 在某些平台上，可能需要不传参数来取消所有监听
                    uni.offBLECharacteristicValueChange();
                    console.log('[BT] 已取消BLE特征值变化监听');
                } else {
                    console.log('[BT] 当前平台不支持 offBLECharacteristicValueChange');
                }
            } catch (error) {
                console.warn('[BT] 取消BLE监听时出错:', error);
            }

            // 2. 无论指令是否成功，都关闭连接
            uni.closeBLEConnection({
                deviceId,
                complete: () => {
                    console.log(`[BT] 已关闭与 ${deviceId} 的连接`);
                    // 修复：同样使用本模块的state.deviceId进行判断
                    if (state.deviceId === deviceId) {
                        state.deviceId = '';
                        // 关键修复：将状态更新和UI操作延迟，避免在页面切换时崩溃
                        setTimeout(() => {
                            bluetooth().disconnect(); // 仅当断开的是当前活动设备时，才更新pinia状态
                            showToast({ message: getLocale() === 'zh' ? '蓝牙已断开' : 'Bluetooth Disconnected', icon: 'none' });
                        }, 100);
                    }
                }
            });
        }
    });
    // #endif
}

/**
 * 【核心改造】对外暴露的总入口
 * 点击连接按钮时调用此函数
 */
export const connectDevice = () => {
    // #ifdef APP-PLUS
    if (bluetooth().isConnected) {
        closeConnected();
    } else {
        // 每次都重新走一遍初始化和搜索流程，确保状态最新
        startConnectionProcess();
    }
    // #endif
};

/**
 * 启动连接总流程
 * 【新增】将initBlue和discovery包装起来，确保流程的原子性
 */
const startConnectionProcess = () => {
    // #ifdef APP-PLUS
    // 每次开始新的连接流程时，都重置内部状态
    state.deviceId = '';
    state.isSearching = false;

    // 【iOS 兼容性修复】硬重置蓝牙适配器，解决iOS重连失败问题
    uni.closeBluetoothAdapter({
        complete: () => {
            console.log('[BT] 适配器已关闭，准备重启...');
            // 在 close 的回调中继续后续流程，确保操作顺序
            // 关键修复：在开始新流程前，先检查并清理任何遗留的"僵尸连接"
            uni.getConnectedBluetoothDevices({
                success: (res) => {
                    if (res.devices.length > 0) {
                        console.log('[BT] 发现遗留连接，正在清理...');
                        res.devices.forEach(device => {
                            // 这里可以根据业务，比如通过 device.name 判断是否为我们的目标设备再断开
                            console.log(`[BT] 正在强制断开遗留设备 ${device.deviceId}`);
                            uni.closeBLEConnection({ deviceId: device.deviceId });
                        });
                        // 等待一会，让原生有时间处理断开操作
                        setTimeout(initBlue, 500);
                    } else {
                        // 没有遗留连接，直接开始初始化流程
                        initBlue();
                    }
                },
                fail: () => {
                    // 如果获取列表失败，也直接开始初始化流程，做一层兼容
                    initBlue();
                }
            });
        }
    });
    // #endif
}
