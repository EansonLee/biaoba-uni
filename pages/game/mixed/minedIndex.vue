<script setup>
import {reactive, computed, watch} from 'vue';
import {
  onLoad,
  onShow,
} from '@dcloudio/uni-app';
import GameResult from "@/sheep/components/game/gameOver/gameResult.vue";
import {useI18n} from "vue-i18n";
import {getParams} from "@/sheep/router";
import gameConfig from '@/sheep/config/gameConfig.json';
import sheep from "@/sheep";
import {useGameCommon} from "@/sheep/hooks/useGameCommon";
import {ref,onMounted} from 'vue';
import $stores from "@/sheep/stores";
import zimStore from "@/sheep/stores/zegoStore";
import { showToast } from "@/sheep/util/toast";

const gameCommon = useGameCommon();
const gameResultRef = ref(null);
const gameResultVisible = ref(false);
const players = ref([]);

const state = reactive({
 
  params: {},
  title: '混合模式',
  // 当前会话ID（用于区分不同轮次的游戏）
  sessionId: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
  // 线上混合模式：下一局准备就绪状态
  onlineReady: {
    self: false,
    peer: false,
    modeId: null, // 待开局的模式ID（用于一致性校验）
    peerSessionId: null, // 对端的会话ID
  },
  // 等待对手就绪提示
  waitingNext: false,
  // 已启动下一局（去重标志）
  hasStartedNext: false,
  // 已见过的 returnToLobby 条数（用于去重、防历史消息）
  returnToLobbySeen: 0,
 
})
const {t,locale} = useI18n();

// 获取路由传递的参数
onLoad((options) => {
  state.params = getParams(options);
  // 生成新的会话ID
  state.sessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  console.log('[混合模式-线上] 初始化会话ID:', state.sessionId);

  // 监听对端“下一局准备”消息（readyNext）
  try {
    const zimStores = zimStore();
    // 避免重复启动：进入页面后先将就绪标记清零
    state.onlineReady.self = false;
    state.onlineReady.peer = false;
    state.onlineReady.modeId = null;
    state.onlineReady.peerSessionId = null;
    state.hasStartedNext = false;
    // 清空上一局的握手消息，避免误触发
    try {
      zimStores.message.readyNext = {};
      zimStores.message.startNext = {};
    } catch (e) {}
    const handleReadyNext = (mapVal) => {
      try {
        const rivalId = getRivalId();
        let list = (mapVal && rivalId) ? mapVal[rivalId] : null;
        let last = null;
        if (Array.isArray(list) && list.length > 0) {
          last = list[list.length - 1];
        } else if (mapVal && typeof mapVal === 'object') {
          // 兜底：从所有来源里取最后一条 readyNext
          const all = Object.values(mapVal).reduce((acc, arr) => {
            if (Array.isArray(arr)) acc.push(...arr);
            return acc;
          }, []);
          if (all.length > 0) last = all[all.length - 1];
        }
        if (!last) return;
        // 检查会话ID，忽略不匹配的消息
        const peerSessionId = last?.value?.sessionId;
        if (!peerSessionId) {
          console.warn('[混合模式-线上] 对端readyNext缺失sessionId，忽略');
          return;
        }

        // 兼容两种情况：last.value?.modeId 或 采用本地下一局ID兜底
        let peerModeId = undefined;
        try { peerModeId = last?.value?.modeId; } catch (e) {}
        const next = getGameTpye(state.params.modes).value;
        const localNextId = next?.id;
        if (!peerModeId && localNextId) {
          console.warn('[混合模式-线上] 对端readyNext未携带modeId，采用本地模式ID兜底', localNextId);
          peerModeId = localNextId;
        }
        if (peerModeId && localNextId && peerModeId === localNextId) {
          state.onlineReady.peer = true;
          state.onlineReady.modeId = localNextId;
          state.onlineReady.peerSessionId = peerSessionId;
          console.log(`[混合模式-线上] 收到对端readyNext，模式ID=${peerModeId}, 对端会话ID=${peerSessionId}, self=${state.onlineReady.self}, peer=${state.onlineReady.peer}`);
          if (state.onlineReady.self && state.onlineReady.peer && !state.hasStartedNext) {
            console.log('[混合模式-线上] 双方就绪，同步开启下一局');
            doSynchronizedStart();
            // 向对端广播开始指令，确保对方也能收到显式startNext
            sendStartNext();
          } else if (!state.onlineReady.self) {
            console.log('[混合模式-线上] 对端已就绪，但本端尚未就绪，等待本端设置完成');
          }
        } else {
          console.warn('[混合模式-线上] 对端readyNext模式不一致，忽略', peerModeId, localNextId);
        }
      } catch (e) { console.warn('[混合模式-线上] 处理readyNext异常', e); }
    };

    watch(() => zimStores.message.readyNext, (NewVal) => {
      handleReadyNext(NewVal);
    }, { deep: true });

    // 监听显式 startNext 指令（对端广播）
    watch(() => zimStores.message.startNext, (NewVal) => {
      try {
        const rivalId = getRivalId();
        const list = (NewVal && rivalId) ? NewVal[rivalId] : null;
        const arr = Array.isArray(list) ? list : [];
        const last = arr[arr.length - 1];
        if (!last) return;
        // 检查会话ID
        const peerSessionId = last?.value?.sessionId;
        const matchSession = !state.onlineReady.peerSessionId || peerSessionId === state.onlineReady.peerSessionId;
        if (!matchSession) {
          console.log('[混合模式-线上] 忽略不匹配startNext', peerSessionId, state.onlineReady.peerSessionId);
          return;
        }
        const peerModeId = last?.value?.modeId || getGameTpye(state.params.modes).value?.id;
        const localNextId = getGameTpye(state.params.modes).value?.id;
        if (peerModeId && localNextId && peerModeId === localNextId) {
          console.log('[混合模式-线上] 收到对端startNext（强制启动），立即开局');
          // 收到startNext时强制启动，不再检查peer状态
          if (!state.hasStartedNext) {
            doSynchronizedStart();
          }
        }
      } catch (e) { console.warn('[混合模式-线上] 处理startNext异常', e); }
    }, { deep: true });

    // 监听对端“返回大厅”消息（对手中止下一局）
    const handlePeerReturnToLobby = () => {
      try {
        if (!state.waitingNext) return;
        console.warn('[混合模式-线上] 对手返回大厅，终止等待并退出到大厅');
        state.waitingNext = false;
        state.hasStartedNext = false;
        try { showToast({ message: locale.value === 'zh' ? '对手已返回大厅，本局终止':'The opponent has returned to the hall, and this round is over', icon: 'none' }); } catch (e) {}
        gameCommon.endGame('/pages/game/home/index');
      } catch (e) { console.warn('[混合模式-线上] 处理returnToLobby异常', e); }
    };
    watch(() => Array.isArray(zimStores.message.returnToLobby) ? zimStores.message.returnToLobby.length : 0, (len, oldLen) => {
      try {
        if (!state.waitingNext) return;
        if (typeof len !== 'number') return;
        // 新增条数才处理（避免历史消息），并更新已见计数
        if ((typeof oldLen !== 'number' || len > oldLen) && len > state.returnToLobbySeen) {
          state.returnToLobbySeen = len;
          handlePeerReturnToLobby();
        }
      } catch (e) { console.warn('[混合模式-线上] 处理returnToLobby(length)异常', e); }
    });

    // 兜底：页面显示时再检查一次（避免监听注册前就到达的消息被漏判）
    onShow(() => {
      try {
        const snap = zimStores.message?.readyNext || {};
        handleReadyNext(snap);
        const sx = zimStores.message?.startNext || {};
        // 检查是否有匹配当前会话的startNext
        const hasMatchingStart = Object.values(sx).some(arr => {
          if (!Array.isArray(arr) || arr.length === 0) return false;
          const last = arr[arr.length - 1];
          const peerSessionId = last?.value?.sessionId;
          return peerSessionId && (!state.onlineReady.peerSessionId || peerSessionId === state.onlineReady.peerSessionId);
        });
        if (hasMatchingStart) {
          console.log('[混合模式-线上] onShow检测到匹配的startNext，立即开局');
          doSynchronizedStart();
        }
        // 检查是否收到对手返回大厅（兜底，防止监听注册前的消息漏判）
        const rt = zimStores.message?.returnToLobby || [];
        if (Array.isArray(rt) && rt.length > state.returnToLobbySeen) {
          state.returnToLobbySeen = rt.length;
          handlePeerReturnToLobby();
        }
      } catch (e) {}
    });
  } catch (e) { console.warn('[混合模式-线上] 监听readyNext失败', e); }
})

onMounted(()=>{
  const onlineType = Number(state.params?.gameSettings?.type ?? state.params?.type ?? 0);
  const isOnline = onlineType === 11;
  if (isOnline) {
    // 首局自动开局；仅在已有胜负历史（或有模式被标记完成）时，才等待双方readyNext
    const hasWinHistory = Array.isArray(state.params?.tameWin?.teamIdWin) && state.params.tameWin.teamIdWin.length > 0;
    const hasFinishedMode = Array.isArray(state.params?.modes) && state.params.modes.some(m => m && m.status === true);
    if (!hasWinHistory && !hasFinishedMode) {
      console.log('[混合模式-线上] 首局自动开局');
      startGame();
    } else {
      // 线上混合模式：第二局及以后，一律等待双方readyNext，不再跳过等待（即使模式相同）
      state.waitingNext = true;
      console.log('[混合模式-线上] 等待双方readyNext，不自动开局');
      // 记录当前已存在的返回大厅消息条数，便于后续只处理新增的
      try {
        const rt = zimStore().message?.returnToLobby || [];
        state.returnToLobbySeen = Array.isArray(rt) ? rt.length : 0;
      } catch (e) { state.returnToLobbySeen = 0; }
      // 自动发送本端就绪，无需用户再次点击
      sendReadyNext();
    }
    return;
  }
  // 本地/离线：保持自动开局
  startGame()
})
const show = () => {
	state.params.players.forEach(player => {
		player.currentScore = player.numberGames
	});
	players.value = state.params.players
	gameResultRef.value.show();
	return;
}



const getTitle = computed(() => {
  if (state.params.type === 8) {
    return `${t('mixed_mode')}`
  }
  return locale.value === 'zh' ? state.params.chineseModeName : state.params.englishModeName;
})


// 跳转对应游戏类型
const getGameTpye = (modes) => {
	if (!modes || !Array.isArray(modes) || modes.length === 0) {
		console.error('混合模式：没有可用的游戏模式');
		return { value: null };
	}

	const modeInfo = {};
	for (let i = 0; i < modes.length; i++) {
		if(!modes[i].status){
			// 仅选择下一局，不要提前把 status 标为已完成
			modeInfo.value = modes[i];
			break
		}
	}

	// 如果没有找到未开始的模式，说明所有模式都已完成
	if (!modeInfo.value) {
		modeInfo.value = null;
	}
	
	return modeInfo;
}
//
const judgeGameIfEnd = () => {
	//总LEG 
	if (!state.params.modes || !Array.isArray(state.params.modes) || state.params.modes.length === 0) {
		return false;
	}
	
	let legTotal = state.params.modes.length
	const tameWin = state.params.tameWin?.teamIdWin
	if(tameWin){
		
		state.params.players.forEach(player => {
		  player.numberGames = tameWin.filter(num => num === player.team).length; //队伍胜利局数
		});
		//混合模式只有两个队伍。这里写死取值
		const teamOne = state.params.players[0].numberGames; //队伍1
		const teamTwo = state.params.players[1].numberGames; //队伍2
		
		//三局两胜 5局3胜，  7局4胜
		if( ( legTotal ===3 && (teamOne == 2 || teamTwo == 2)) || 
		    ( legTotal ===5 && (teamOne == 3 || teamTwo == 3)) || 
		    ( legTotal ===7 && (teamOne == 4 || teamTwo == 4)) 
		){
			//结束游戏
			show()
			return true;
		}
		
	}
	return false;
	//获取当前每个队伍胜利的数量
	
}

// 工具：统一设置首攻玩家（写到三个位置，供各游戏页读取）
const setFirstTurnAll = (gameData, playerOnly) => {
    if (!playerOnly) return;
    gameData.firstTurnPlayerOnly = playerOnly;
    if (!gameData.gameSettings) gameData.gameSettings = {};
    gameData.gameSettings.firstTurnPlayerOnly = playerOnly;
    if (!gameData.modeEntity) gameData.modeEntity = {};
    gameData.modeEntity.firstTurnPlayerOnly = playerOnly;
};

// 首局（无胜负历史）按邀请方固定先攻（仅线上对战）
const ensureInitiatorOrder = (gameData) => {
	// 仅在首局且线上对战(type===11)时处理：不改变UI顺序，只确保首局先手标识存在
	const isOnline = gameData?.gameSettings?.type === 11;
	const hasWinHistory = gameData.tameWin?.teamIdWin && gameData.tameWin.teamIdWin.length > 0;
	if (!isOnline || hasWinHistory) return;
const initiatorPO = gameData.modeEntity?.firstTurnPlayerOnly || gameData.gameSettings?.firstTurnPlayerOnly || gameData.firstTurnPlayerOnly;
if (!initiatorPO) return;
setFirstTurnAll(gameData, initiatorPO);
console.log('[混合模式-首局] 线上对战固定邀请方先手，不调整左右UI');
};

// 是否交换先攻
const bidSequence = (gameData) => {
	let bidSequenceType = gameData.gameSettings.bidSequence
	let shouldAdjustOrder = false;

	// 检查是否有胜利记录（是否为第一局）
	const hasWinHistory = gameData.tameWin?.teamIdWin && gameData.tameWin.teamIdWin.length > 0;

	if(!hasWinHistory){
		// 🔧 修复：第一局游戏的处理
		// 第一局保持原始顺序，不做调整
		shouldAdjustOrder = false;
	} else {
		// 🔧 修复：第二局及以后根据设置调整顺序
		const currentGameNumber = gameData.tameWin.teamIdWin.length + 1;
		console.log(`[混合模式] 第${currentGameNumber}局游戏，投标顺序设置: ${bidSequenceType === 1 ? '交换先攻' : '输者先攻'}`);

		if(bidSequenceType === 1){
			// 交换先攻：每局结束后都交换顺序
			console.log('[混合模式] 交换先攻模式：交换玩家顺序');
			shouldAdjustOrder = true;
		} else if(bidSequenceType === 2){
			// 输者先攻：让输者先攻
			let wintameId = gameData.tameWin.teamIdWin[gameData.tameWin.teamIdWin.length-1];
			console.log(`[混合模式] 输者先攻模式：上局胜利者ID=${wintameId}, 当前第一位队伍ID=${gameData.players[0].team}`);

			if (gameData?.gameSettings?.type === 11) {
				// 线上对战：不反转UI，只设置下一局先手为输方
const loserTeam = gameData.players.find(t => t.team !== wintameId);
if (loserTeam) {
	setFirstTurnAll(gameData, loserTeam.players[0].playerOnly);
	console.log('[混合模式] 线上对战-输者先攻：设定firstTurnPlayerOnly为输方');
}
			} else {
				if(gameData.players[0].team === wintameId){
					// 胜利者仍然在第一位，需要交换让输者先攻
					console.log('[混合模式] 胜利者在第一位，交换顺序让输者先攻');
					shouldAdjustOrder = true;
				} else {
					console.log('[混合模式] 输者已在第一位，无需交换');
				}
			}
		}
	}

	// 执行顺序调整
	if(shouldAdjustOrder){
		// 线上对战固定左对方右自己，不能反转UI；只调整下一局先手标识
		if (gameData?.gameSettings?.type === 11) {
			// 交换先攻：当前首局先手给另一个队伍
const currentFirst = gameData.modeEntity?.firstTurnPlayerOnly || gameData.gameSettings?.firstTurnPlayerOnly || gameData.firstTurnPlayerOnly;
if (currentFirst) {
	const otherTeam = gameData.players.find(t => t?.players?.[0]?.playerOnly !== currentFirst);
	if (otherTeam) setFirstTurnAll(gameData, otherTeam.players[0].playerOnly);
}
console.log('[混合模式] 线上对战-交换先攻：仅调整firstTurnPlayerOnly，不反转players');
		} else {
			gameData.players.reverse();
		}
	} else {
		console.log('[混合模式] 保持当前玩家顺序不变');
	}

	// 重置所有玩家的isActive状态
	gameData.players.forEach(player => {
		player.players.forEach(user => {
			user.isActive = false;
		})
	});

	// 设置第一个队伍的第一个玩家为活跃状态
	if (gameData.players.length > 0 && gameData.players[0].players.length > 0) {
		gameData.players[0].players[0].isActive = true;
	}

}
// 获取当前应该执行的游戏类型并跳转
// 获取对手玩家id（线上对战）
const getRivalId = () => {
  try {
    const players = state.params?.players || [];
    const me = $stores('user').getUserInfo()?.playerOnly;
    for (const team of players) {
      const po = team?.players?.[0]?.playerOnly;
      if (po && po !== me) return po;
    }
  } catch (e) {}
  return null;
};

// 发送“下一局就绪”握手
const doSynchronizedStart = () => {
  if (state.hasStartedNext) return;
  state.hasStartedNext = true;
  state.waitingNext = false;
  startGame();
  // 重置就绪标记，避免残留
  state.onlineReady.self = false;
  state.onlineReady.peer = false;
  state.onlineReady.modeId = null;
  state.onlineReady.peerSessionId = null;
  // 清理握手消息，避免历史消息影响后续
  try { const zs = zimStore(); zs.message.readyNext = {}; zs.message.startNext = {}; } catch (e) {}
};

const sendStartNext = () => {
  try {
    const next = getGameTpye(state.params.modes).value;
    if (!next) return;
    const rivalId = getRivalId();
    if (!rivalId) return;
    const payload = { msgType: 'startNext', value: { modeId: next.id, sessionId: state.sessionId, ts: Date.now() } };
    const messageTextObj = { type: 1, message: JSON.stringify(payload), extendedData: { msgType: 'startNext', modeId: next.id } };
    $stores('zegoStore').sendMessage(rivalId, messageTextObj);
    console.log('[混合模式-线上] 已广播startNext，modeId=', next.id, ', sessionId=', state.sessionId);
  } catch (e) { console.warn('[混合模式-线上] 发送startNext失败', e); }
};

const sendReadyNext = () => {
  try {
    const next = getGameTpye(state.params.modes).value;
    if (!next) {
      console.warn('[混合模式-线上] 未找到下一局模式');
      return false;
    }
    const rivalId = getRivalId();
    if (!rivalId) {
      console.warn('[混合模式-线上] 未找到对手ID，无法发送readyNext');
      return false;
    }
    // 关键修复：先设置本端状态，再发送消息，避免竞态
    state.onlineReady.self = true;
    state.onlineReady.modeId = next.id;
    console.log('[混合模式-线上] 设置本端就绪，准备发送readyNext，modeId=', next.id, ', sessionId=', state.sessionId);
    
    const payload = { msgType: 'readyNext', value: { modeId: next.id, sessionId: state.sessionId, ts: Date.now() } };
    const messageTextObj = { type: 1, message: JSON.stringify(payload), extendedData: { msgType: 'readyNext', modeId: next.id } };
    $stores('zegoStore').sendMessage(rivalId, messageTextObj);
    console.log('[混合模式-线上] 已发送readyNext，等待对端就绪');
    
    // 发送后立即检查是否已收到对端消息（兜底：防止消息在发送前已到达）
    setTimeout(() => {
      if (state.onlineReady.self && state.onlineReady.peer && !state.hasStartedNext) {
        console.log('[混合模式-线上] 发送后检测到双方就绪，立即开局');
        doSynchronizedStart();
        sendStartNext();
      }
    }, 100);
    
    return true;
  } catch (e) {
    console.warn('[混合模式-线上] 发送readyNext失败', e);
    return false;
  }
};

const startGame = () => {
	if(judgeGameIfEnd()){
		return;
	}
	// const valueElement = getGameTpye(state.params.modes).value;
	const gameTypeResult = getGameTpye(state.params.modes);
	const valueElement = gameTypeResult.value;
	
	// 检查是否获取到有效的游戏模式
	if (!valueElement || !valueElement.type) {
		console.error('混合模式：无法获取有效的游戏模式');
		// 显示错误提示或回到主页
		gameCommon.endGame('/pages/game/home/index');
		return;
	}
	
	// 检查游戏配置是否存在
	const gameConfigElement = gameConfig[valueElement.type];
	if (!gameConfigElement || !gameConfigElement.url) {
		console.error('混合模式：找不到游戏类型配置', valueElement.type);
		gameCommon.endGame('/pages/game/home/index');
		return;
	}
	
	// console.log(state.params.modes)
	// 准备游戏数据
	const gameSettings = {
	    teamSize: state.params.gameSettings.teamSize,
	    roundNbr: state.params.gameSettings.roundNbr,
	    handicap: state.params.gameSettings.handicap,
	    opening: state.params.gameSettings.opening,
	    finish: state.params.gameSettings.finish,
	    bullEyeFraction: state.params.gameSettings.bullEyeFraction,
	    customRound: state.params.gameSettings.customRound,
	    requiredLines: state.params.gameSettings.requiredLines,
	    duelMode: state.params.gameSettings.duelMode,
		bidSequence:state.params.gameSettings.bidSequence,
		type:state.params.gameSettings.type
	  }
	
	const gameData = {
	  players: state.params.players,
	  gameSettings: gameSettings,
	  modes: state.params.modes,
	  modeEntity: state.params,
	  gameType:8, //标记为混合类型
	  tameWin:state.params.tameWin
	};
	if(!state.params.tameWin){
		gameData.tameWin = {
		    teamIdWin:[], //胜利者id
		  	teamIdfail:[], //失败者id
		}
	}
	// gameData.modeEntity = valueElement;
	// const gameConfigElement = gameConfig[valueElement.type];
	let url = gameConfigElement.url;
	gameData.players.forEach(player => {
	  player.startingScore = valueElement.startingScore;
	  // 🔧 修复：在混合模式中，每场新的米老鼠游戏都需要重置mickeyMouseBackupScores
	  // 避免上一场游戏的让分设置影响下一场
	  if (valueElement.type === 2) { // 2是米老鼠游戏类型
	    console.log(`[混合模式-米老鼠] 清理队伍${player.team}的mickeyMouseBackupScores:`, player.mickeyMouseBackupScores);
      valueElement.englishModeName = 'CRICKET'
	    delete player.mickeyMouseBackupScores;
	  }
	});
	// gameData.modeEntity.type = valueElement.type
	// 设置当前游戏模式的信息
	gameData.modeEntity.type = valueElement.type;
	gameData.modeEntity.chineseModeName = valueElement.chineseModeName;
	gameData.modeEntity.englishModeName = valueElement.englishModeName || valueElement.chineseModeName;
	gameData.modeEntity.startingScore = valueElement.startingScore;
	// 补充：带上本局模式的唯一ID，便于各游戏页在结束时精确标记 status=true
	gameData.modeEntity.id = valueElement.id;
	
    // 首局固定邀请方先手（线上对战），然后根据设置处理“交换/输者先攻”
    ensureInitiatorOrder(gameData)
    bidSequence(gameData)
	sheep.$router.go(url, gameData, 'reLaunch');
};


// 处理菜单选项点击
const handleMenuClick = (action) => {
  // modalVisible.value = false;
  // emit(action);
  if(action == 'restart'){
	  restart()
  }
  if(action == 'endGame'){
	  gameCommon.endGame('/pages/game/home/index')
  }
  
  
};



// 重新开始游戏
const restart = () => {
  // 统一日志
  const onlineType = Number(state.params?.gameSettings?.type ?? state.params?.type ?? 0);
  const isOnline = onlineType === 11;
  const isMixed = Number(state.params?.gameType ?? 0) === 8;
  console.log(`[混合模式-重开] isMixed=${isMixed} isOnline=${isOnline} type=${onlineType}`);

  // 线上混合模式：发送“就绪”，等待对端就绪后自动开局
  if (isMixed && isOnline) {
    sendReadyNext();
    return;
  }
  // 线上混合模式：先做“双方就绪”握手，双方都点击“下一局”才启动
  if ((state.params?.gameSettings?.type || state.params?.type) === 11) {
    try {
      const next = getGameTpye(state.params.modes).value;
      if (!next) {
        console.warn('[混合模式-线上] 未找到下一局模式');
        return;
      }
      const rivalId = getRivalId();
      const payload = { msgType: 'readyNext', value: { modeId: next.id, ts: Date.now() } };
      const messageTextObj = { type: 1, message: JSON.stringify(payload), extendedData: { msgType: 'readyNext' } };
      $stores('zegoStore').sendMessage(rivalId, messageTextObj);
      state.onlineReady.self = true;
      state.onlineReady.modeId = next.id;
      console.log('[混合模式-线上] 已发送readyNext，等待对端就绪');
      // 在双方均就绪时，watch 中会自动调用 startGame()
      return;
    } catch (e) { console.warn('[混合模式-线上] 发送readyNext失败', e); return; }
  }

  // 离线/本地：原有逻辑（重置并直接开局）
  //更改模式为未开始
  if (state.params.modes && Array.isArray(state.params.modes)) {
    for (let i = 0; i < state.params.modes.length; i++) {
      state.params.modes[i].status = false
    }
  }
  
  // 🔧 修复：重新开始时清理所有玩家/队伍的mickeyMouseBackupScores
  if (state.params.players && Array.isArray(state.params.players)) {
    state.params.players.forEach(player => {
      delete player.mickeyMouseBackupScores;
    });
  }
  
  state.params.tameWin = {
	  teamIdWin:[], //胜利者id
	  teamIdfail:[], //失败者id
  }

  startGame()
};



// 添加计算方法
const calculateGameResult = (players) => {
  // 深拷贝防止影响原数据
  const sortedPlayers = JSON.parse(JSON.stringify(players.value));
  // 按分数从大到小排序 // 3局两胜，
  return sortedPlayers.sort((a, b) => {
    // 1. 首先按胜利次数排序（混合模式最终结算用）
    if (a.currentScore !== b.currentScore) {
      return b.currentScore - a.currentScore;
    }
    
    // 2. 如果胜利次数相同，判断开的分区数量（米老鼠模式）
    // 需要从 state.params 中获取 teamLocks 信息来判断开区数
    if (state.params && state.params.teamLocks) {
      const countOpenedAreas = (team) => {
        const locks = state.params.teamLocks[team.team] || {};
        // 统计 locked === false 的区域（已开的分区）
        return Object.values(locks).filter(area => area && area.locked === false).length;
      };
      
      const aOpenedAreas = countOpenedAreas(a);
      const bOpenedAreas = countOpenedAreas(b);
      
      if (aOpenedAreas !== bOpenedAreas) {
        return bOpenedAreas - aOpenedAreas; // 开区多的排前面
      }
    }
    
    // 3. 最后按队伍人数排序（多人队伍排在前面）
    return b.players.length - a.players.length;
  });
};


</script>

<template>
	<view>
<!-- 等待对手就绪提示（线上混合的非首局场景）：加载动图 + 居中文案 -->
<view v-if="state.waitingNext" style="position: fixed; left:0; right:0; top:0; bottom:0; background: rgba(0,0,0,0.72); z-index: 2147483647; display:flex; align-items:center; justify-content:center;">
  <view style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap: 20rpx;">
    <image src="/static/gif/jiaozhai.gif" style="width: 140rpx; height: 140rpx;" mode="aspectFit" />
    <text style="color:#fff; font-size: 28rpx; text-align:center;">{{locale === 'zh'? '请等待对手确认下一局...':'Wait for the opponent to confirm the next round...'}}</text>
  </view>
</view>
		<game-result
		    ref="gameResultRef"
			:players="players"
		    :calculateResult="calculateGameResult"
		    @exit="handleMenuClick('endGame')"
		    @restart="handleMenuClick('restart')"
		/>
	</view>
		
		
  
</template>

<style scoped lang="scss">

</style>
