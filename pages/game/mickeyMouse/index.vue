<script setup>
import { computed, reactive, ref, watch, nextTick } from "vue";
import PlayerContent from "@/sheep/components/game/01/playerContent.vue";
import { onLoad, onReady, onUnload } from "@dcloudio/uni-app";
import { getParams } from "@/sheep/router";
import { useI18n } from "vue-i18n";
import TeamDisplay from "@/sheep/components/game/01/teamDisplay.vue";
import TransitionScreen from "@/sheep/components/common/transitionScreen.vue";
import TransitionScreenText from "@/sheep/components/common/transitionScreenText.vue";
import { useGameCommon } from "@/sheep/hooks/useGameCommon";
import bluetooth from "@/sheep/stores/bluetooth";
import { showToast } from "@/sheep/util/toast";
import DebugPanel from "@/sheep/components/debug/debugPanel.vue";
import { useAudioPlayer } from "@/sheep/util/useAudioPlayer";

import playerInfo from "@/sheep/api/dart/playerInfo";
import { getHitRate, getMickeyMouseHit } from "@/sheep/config/hitAlgorithm";
import { ZegoOrientation } from "@/uni_modules/zego-ZegoExpressUniApp-JS/components/zego-ZegoExpressUniApp-JS/lib/ZegoExpressEngine";
import { useVideoWindow } from "@/sheep/composables/useVideoWindow";
import emitter from "@/sheep/util/eventBus";
import {
  getGameConfig,
  useAudioPlayerFunIf,
  playAudioPlayerFunIf,
  getScoreConfig,
  getGameConfigGrouping,
  getRegionCode,
  SCORING_AREAS,
  init,
  scoreConfig,
  getGifTimeLength,
} from "@/sheep/config/bluetoothConfig";
import zimStore from "@/sheep/stores/zegoStore";
import $stores from "@/sheep/stores";
import gameInvitation from "@/sheep/api/dart/gameInvitation";
import agreement from "@/sheep/api/dart/agreement";
const userInfo = $stores("user").getUserInfo();
const zimStores = zimStore();
const { locale } = useI18n();
// 防重复处理的标志 - 使用 ref 确保响应式和正确的生命周期管理
const isProcessingDart = ref(false);
const isProcessingHandChange = ref(false);
// 🤖 AI换手保护：仅用于允许AI在自身回合结束时触发一次换手
const aiHandingOver = ref(false);

// 定时器引用，用于清理
let dartProcessingTimer = null;
let handChangeProcessingTimer = null;

// 🔧 添加消息ID追踪，防止重复处理同一条消息
let lastProcessedMessageId = null;

//监听对战内的投标
const tobiaoWatcher = watch(
  zimStores.message.tobiao,
  (New, Old) => {
    const rival = getRivalId();
    const value = New[rival];
    if (!value || value.length === 0) return;

    const newValue = value[value.length - 1];

    // 🔧 防止重复处理同一条消息
    if (newValue.messageID === lastProcessedMessageId) {
      console.log("🎯 [消息防重复] 跳过重复的投镖消息:", newValue.messageID);
      return;
    }
    lastProcessedMessageId = newValue.messageID;

    // 🔧 修复：对手投镖标记为远程投镖，绕过重复处理检查
    blurScore(newValue.value, true);
  },
  { deep: true }
);
$stores("zegoStore").initLogin();

const changeHandsWatcher = watch(
  zimStores.message.changeHands,
  (New, Old) => {
    if (isProcessingHandChange.value) {
      return;
    }

    const rival = getRivalId();
    const value = New[rival];
    if (!value || value.length === 0) return;

    isProcessingHandChange.value = true;
    try {
      gameCommon.moveToNextPlayer(state, playerContentRef, null);
    } finally {
      // 清理之前的定时器
      if (handChangeProcessingTimer) {
        clearTimeout(handChangeProcessingTimer);
      }
      // 延迟重置标志，防止快速重复触发
      handChangeProcessingTimer = setTimeout(() => {
        isProcessingHandChange.value = false;
        handChangeProcessingTimer = null;
      }, 1000);
    }
  },
  { deep: true }
);

watch(
  zimStores.message.endGame,
  (New, Old) => {
    const rival = getRivalId();
    const value = New[rival];
    // 对端结束游戏：本端也视为强制结束（用于隐藏“下一局”）
    state.forceEndGame = true;
    if (!state.params) state.params = {};
    state.params.forceEndGame = true;
    closeVideo();
    cleanupGameStorage();
    gameCommon.handleGameEnd("opponentEndGame", null, playerContentRef);
  },
  { deep: true }
);

watch(
  zimStores.message.rethrow,
  (New, Old) => {
    const rival = getRivalId();
    const value = New[rival];
    gameCommon.rethrowCurrentRound(state.gameState, state.teamArray);
  },
  { deep: true }
);

// 🔥 修复：监听回合变化，确保在非2v2模式下也正确保存MPR统计
watch(
  () => state.gameState.currentRound,
  (newRound, oldRound) => {
    // 当回合增加时（不是初始化），为所有玩家保存上一回合的MPR统计
    // if (oldRound && newRound > oldRound) {
    //   console.log(
    //     `🎯 [MPR监听] 回合从${oldRound}变为${newRound}，保存所有玩家的MPR统计`
    //   );
    //   state.teamArray.forEach((team) => {
    //     team.players.forEach((player) => {
    //       if (player.mprStats) {
    //         console.log(`🎯 [MPR监听-保存前] 玩家${player.playerName}的currentRoundExpected: [${player.mprStats.currentRoundExpected.join(',')}]`);
    //         // 🔧 修复：所有回合都要保存，包括跳过的回合（倍数为0）
    //         finishCurrentRound(player);
    //         console.log(
    //           `🎯 [MPR统计] 为玩家${player.playerName}保存回合${oldRound}的MPR数据: [${player.mprStats.currentRoundExpected.join(',')}]`
    //         );
    //       }
    //     });
    //   });
    // } else {
    //   console.log(`🎯 [MPR监听跳过] oldRound=${oldRound}, newRound=${newRound}，不满足保存条件`);
    // }
  }
);

const state = reactive({
  threeSituationDisplay: false,
  threeSituation: [],
  isWaitingForAnimation: false, // 🔧 添加：标记是否正在等待特殊动画结束
  settlementFired: false, // 新增：结算已触发标记，避免重复结算
  // 结束动画覆盖层
  finishOverlayVisible: false,
  finishOverlayTs: 0,
  aiAutomaticBid: false,
  // 记录结算音频（finish.mp3）的时长（ms）
  finishAudioMs: 0,
  teamArray: [], // 队伍数组
  gameSettings: {},
  gameState: {
    currentRound: 1, // 当前回合
    currentTeam: 1, // 当前投掷的队伍
    currentPlayerIndex: 0, // 当前队伍中的玩家索引
    currentDart: 0, // 当前投掷的镖数(1-3)
    maxRounds: 20, // 最大回合数
    roundScores: {}, // 每回合的得分记录 {roundId: {teamId: {playerId: [得分数组]}}}
    averageScores: {}, // 每个玩家的平均分记录 {playerId: averageScore}
    // 修改回合结束的判断逻辑
    isRoundEnd: computed(() => {
      //不是自己的回合不弹跳过
      if (
        state.gameSettings.type &&
        state.gameSettings.type === 11 &&
        userInfo.playerOnly !== getCurrentId()
      ) {
        return false;
      }
      // 当前镖数为3且已经投掷完成时才算回合结束
      return state.gameState.currentDart === 3;
    }),
    teamSize: 1,
    // 禁止的区域
    forbiddenAreas: [],
    // 🔥 2v2换手计数器
    turnCounter: 0,
  },
  params: {},
  modeEntity: {},
  teamLocks: {}, // 记录每个团队的区域锁定状态 {teamId: {area: {count: number, locked: boolean}}}
});
// 当前是否轮到AI（AI对战模式且当前队伍为2）
const isAiTurn = computed(() => state.params?.type === 10 && state.gameState.currentTeam === 2);

const gameCommon = useGameCommon();
const modeName = ref();
const modeEnd = ref(true);
// 计算混合模式下的团队胜场映射（teamId -> winCount），用于底部星标累计
const teamWinsMap = computed(() => {
  const map = {};
  try {
    const wins = state.params?.tameWin?.teamIdWin || [];
    console.log(`[teamWinsMap计算] tameWin.teamIdWin: [${wins.join(', ')}]`);
    wins.forEach(id => { map[id] = (map[id] || 0) + 1; });
    console.log(`[teamWinsMap计算] 结果:`, JSON.stringify(map));
  } catch(e) {
    console.error('[teamWinsMap计算] 错误:', e);
  }
  return map;
});
const playerContentRef = ref(null);
const platform = uni.getSystemInfoSync().platform; // 'ios' 或 'android'
const watchOrientation = ref(null);

const localVideo =
  platform === "ios" || platform === "android"
    ? uni.getSubNVueById("localVideo")
    : ref(null);
const remoteVideo =
  platform === "ios" || platform === "android"
    ? uni.getSubNVueById("remoteVideo")
    : ref(null);

// 视频窗口管理
const videoWindow = useVideoWindow();

// 蓝牙状态检查定时器
let bluetoothStatusTimer = null;

// 启动蓝牙状态定期检查
const startBluetoothStatusCheck = () => {
  // 清理之前的定时器
  if (bluetoothStatusTimer) {
    clearInterval(bluetoothStatusTimer);
  }

  // 每5秒检查一次蓝牙状态
  bluetoothStatusTimer = setInterval(async () => {
    try {
      await bluetooth().checkRealConnectionStatus();
    } catch (error) {
      console.error("蓝牙状态检查失败:", error);
    }
  }, 5000);

  console.log("蓝牙状态定期检查已启动");
};

// 停止蓝牙状态检查
const stopBluetoothStatusCheck = () => {
  if (bluetoothStatusTimer) {
    clearInterval(bluetoothStatusTimer);
    bluetoothStatusTimer = null;
    console.log("蓝牙状态定期检查已停止");
  }
};

// 获取路由传递的参数并初始化游戏
onLoad((options) => {
  const params = getParams(options);
  state.params = params;

  // 保存游戏设置供视频组件使用
  uni.setStorageSync("currentGameSettings", params.gameSettings);

  // 监听视频拖拽事件
  uni.$on("localVideoMove", (data) => {
    handleVideoMove("local", data);
  });
  uni.$on("remoteVideoMove", (data) => {
    handleVideoMove("remote", data);
  });

  // 监听视频缩放事件
  uni.$on("localVideoScale", (data) => {
    handleVideoScale("local", data);
  });
  uni.$on("remoteVideoScale", (data) => {
    handleVideoScale("remote", data);
  });

  // 监听视频非等比缩放事件
  uni.$on("localVideoResize", (data) => {
    handleVideoResize("local", data);
  });
  uni.$on("remoteVideoResize", (data) => {
    handleVideoResize("remote", data);
  });

  // 监听视频重置事件
  uni.$on("localVideoReset", () => {
    handleVideoReset("local");
  });

  uni.$on("remoteVideoReset", () => {
    handleVideoReset("remote");
  });

  // #ifdef APP-PLUS
  if (params.gameSettings.type === 11) {
    // 确保远程视频数据在游戏开始时是完整的
    setTimeout(() => {
      const app = getApp();
      if (app && app.setRemoteVideoData) {
        // 重新确认和设置远程视频数据
        const roomID = uni.getStorageSync("roomID");
        const remoteUserId = uni.getStorageSync("remoteUserId");
        const zeGoTokenThird = uni.getStorageSync("zeGoTokenThird");

        console.log("🎮 [Mickey游戏页面] 检查远程视频数据完整性:", {
          roomID: roomID ? "✅已存在" : "❌缺失",
          remoteUserId: remoteUserId ? "✅已存在" : "❌缺失",
          zeGoTokenThird: zeGoTokenThird ? "✅已存在" : "❌缺失",
        });

        // 如果数据不完整，尝试从gameData重新构造
        if (!roomID || !remoteUserId || !zeGoTokenThird) {
          console.log("🎮 [Mickey游戏页面] 数据不完整，尝试重新设置...");

          // 从params重新获取数据
          const gameSettings = params.gameSettings;
          if (gameSettings && gameSettings.type === 11) {
            const playerArray = params.players || [];
            if (playerArray.length >= 2) {
              const player1 = playerArray[0].players[0];
              const player2 = playerArray[1].players[0];
              const newRoomId = player1.id + "" + player2.id;
              const currentUserId = uni.getStorageSync("userInfo")?.playerOnly;
              const newRemoteUserId =
                player1.playerOnly !== currentUserId
                  ? player1.playerOnly
                  : player2.playerOnly;
              let newZeGoTokenThird = zeGoTokenThird;

              if (!newZeGoTokenThird) {
                const zeGoToken = uni.getStorageSync("zeGoToken");
                if (zeGoToken) {
                  newZeGoTokenThird = zeGoToken;
                }
              }

              console.log("🎮 [Mickey游戏页面] 重新设置数据:", {
                newRoomId,
                newRemoteUserId,
                hasNewZeGoTokenThird: !!newZeGoTokenThird,
              });

              if (newRoomId && newRemoteUserId && newZeGoTokenThird) {
                app.setRemoteVideoData({
                  roomId: newRoomId,
                  remoteUserId: newRemoteUserId,
                  zeGoTokenThird: newZeGoTokenThird,
                });
              }
            }
          }
        }
      }
    }, 500); // 延迟0.5秒，比视频窗口初始化稍早

    // 视频窗口位置将在initGameState之后设置，确保与玩家位置匹配

    // 延迟应用初始样式，确保 subNVue 完全初始化
    setTimeout(() => {
      try {
        if (localVideo && typeof localVideo.setStyle === "function") {
          videoWindow.applyStyleToSubNVue(localVideo, "local");
          localVideo.show();
        }
        if (remoteVideo && typeof remoteVideo.setStyle === "function") {
          videoWindow.applyStyleToSubNVue(remoteVideo, "remote");
          remoteVideo.show();
        }
      } catch (error) {
        console.error("subNVue 初始化错误:", error);
      }
    }, 100);

    watchOrientation.value = plus.orientation.watchOrientation(
      (o) => {
        uni.$emit(
          "resize",
          parseInt(o.gamma) < 0
            ? ZegoOrientation.LandscapeLeft
            : ZegoOrientation.LandscapeRight
        );
      },
      (e) => {}
    );
  } else {
    closeVideo();
  }
  // #endif

  // 初始化游戏状态
  initGameState(params);
  
  // 在initGameState之后设置视频位置
  // #ifdef APP-PLUS
  if (params.gameSettings.type === 11) {
    // 简化视频窗口位置逻辑：
    // 邀请方（先手）：本地视频在右边，远程视频在左边
    // 被邀请方（后手）：本地视频在左边，远程视频在右边
    const firstTurnPlayerOnly = params.firstTurnPlayerOnly || params.gameSettings?.firstTurnPlayerOnly;
    const isUserFirstTurn = firstTurnPlayerOnly === userInfo.playerOnly;
    
    if (isUserFirstTurn) {
      // 当前用户是邀请方（先手），本地视频在右边，远程视频在左边
      videoWindow.windowStates.local.position = {
        left: "",
        right: "8%",
        top: "",
        bottom: "3%",
        transform: "",
      };
      videoWindow.windowStates.remote.position = {
        left: "4%",
        right: "",
        top: "",
        bottom: "3%",
        transform: "",
      };
      console.log('[米老鼠视频位置] 当前用户是邀请方（先手），本地视频在右，远程视频在左');
    } else {
      // 当前用户是被邀请方（后手），本地视频在左边，远程视频在右边
      videoWindow.windowStates.remote.position = {
        left: "4%",
        right: "",
        top: "",
        bottom: "3%",
        transform: "",
      };
      videoWindow.windowStates.local.position = {
        left: "",
        right: "8%",
        top: "",
        bottom: "3%",
        transform: "",
      };
      console.log('[米老鼠视频位置] 当前用户是被邀请方（后手），本地视频在左，远程视频在右');
    }
  }
  // #endif

  // 启动蓝牙状态定期检查
  startBluetoothStatusCheck();
});

onReady(() => {
  gameCommon.handleGameStart(
    modeName.value,
    state.gameState.currentRound,
    state.teamArray[0].players[0].playerName,
    playerContentRef
  );

  // 🔧 修复：检查游戏开始时是否AI是第一个玩家
  setTimeout(() => {
    checkAndTriggerAIOnStart();
  }, 3000); // 等待游戏开始动画完成后检查
});

// 结束动画覆盖层：显示并在播放完成后触发结算弹窗
let finishOverlayLoadTimer = null;
let finishOverlayHideTimer = null;
let finishPendingReason = 'score';
let finishPendingName = '';
let finishCanplayHandler = null;
let finishEndedHandler = null;

const endWithFinishAnimation = (reason, name) => {
  try {
    // 播放结算音效
    useAudioPlayer().playAudio('/static/mp3/finish.mp3');
  } catch (e) {}

  // 绑定一次性的音频事件，用于动态匹配音效时长
  try {
    if (finishCanplayHandler) { emitter.off('audio:canplay', finishCanplayHandler); }
    if (finishEndedHandler) { emitter.off('audio:ended', finishEndedHandler); }

    finishCanplayHandler = (info) => {
      try {
        if (!info || !info.src) return;
        if (String(info.src).includes('finish.mp3')) {
          const durMs = Math.max(0, Number(info.duration) * 1000 || 0);
          state.finishAudioMs = durMs;
          // 根据音频时长重置隐藏定时器（保证动画至少与音效一致+缓冲）
          if (finishOverlayHideTimer) { clearTimeout(finishOverlayHideTimer); finishOverlayHideTimer = null; }
          scheduleFinishHideAndResult(finishPendingReason, finishPendingName);
          // 只使用一次
          emitter.off('audio:canplay', finishCanplayHandler);
          finishCanplayHandler = null;
        }
      } catch (e) {}
    };
    finishEndedHandler = (info) => {
      try {
        if (!info || !info.src) return;
        if (String(info.src).includes('finish.mp3')) {
          // 若已超过最小展示时间，收到音频结束可立即进入结算
          // 为简化：让 scheduleFinishHideAndResult 决定最终时机，这里不强制关闭，但可作为优化点
        }
      } catch (e) {}
    };
    emitter.on('audio:canplay', finishCanplayHandler);
    emitter.on('audio:ended', finishEndedHandler);
  } catch (e) {}

  // 记录待结算参数
  finishPendingReason = reason || 'score';
  finishPendingName = name || '';

  // 显示覆盖层前先清理任何遗留的隐藏定时器，避免上一局的定时器提前关闭新动画
  if (finishOverlayHideTimer) { clearTimeout(finishOverlayHideTimer); finishOverlayHideTimer = null; }

  // 显示覆盖层并刷新GIF（防缓存）
  state.finishOverlayTs = Date.now();
  state.finishOverlayVisible = true;

  // 若GIF onLoad未触发，500ms后也安排隐藏与结算
  if (finishOverlayLoadTimer) { clearTimeout(finishOverlayLoadTimer); }
  finishOverlayLoadTimer = setTimeout(() => {
    scheduleFinishHideAndResult(reason, name);
  }, 500);
};

const onFinishGifLoad = () => {
  // GIF成功加载：按GIF时长安排隐藏与结算
  if (finishOverlayLoadTimer) { clearTimeout(finishOverlayLoadTimer); finishOverlayLoadTimer = null; }
  scheduleFinishHideAndResult(finishPendingReason, finishPendingName);
};

const scheduleFinishHideAndResult = (reasonParam, nameParam) => {
  const reason = reasonParam || 'score';
  const name = nameParam || '';
  // 展示时长：若已拿到音频时长，则= max(音频时长+300, 3000)；否则默认3000
  const audioMs = Number(state.finishAudioMs) || 0;
  const displayMs = Math.max(audioMs - 200, 3000);

  if (finishOverlayHideTimer) { clearTimeout(finishOverlayHideTimer); }
  finishOverlayHideTimer = setTimeout(() => {
    state.finishOverlayVisible = false;
    // 解绑音频事件
    try {
      if (finishCanplayHandler) { emitter.off('audio:canplay', finishCanplayHandler); finishCanplayHandler = null; }
      if (finishEndedHandler) { emitter.off('audio:ended', finishEndedHandler); finishEndedHandler = null; }
    } catch (e) {}
    gameCommon.handleGameEnd(reason, name, playerContentRef, false); // 无动画，由我们控制动画
  }, displayMs);
};

onUnload(() => {
  if (watchOrientation.value) {
    plus.orientation.clearWatch(watchOrientation.value);
  }

  // 停止蓝牙状态检查
  stopBluetoothStatusCheck();

  // 清理 uni.$on 事件监听器
  uni.$off("localVideoMove");
  uni.$off("remoteVideoMove");
  uni.$off("localVideoScale");
  uni.$off("remoteVideoScale");
  uni.$off("localVideoResize");
  uni.$off("remoteVideoResize");
  uni.$off("localVideoSizeChange");
  uni.$off("remoteVideoSizeChange");
  uni.$off("localVideoReset");
  uni.$off("remoteVideoReset");

  // 清理 watch 监听器
  if (tobiaoWatcher) {
    tobiaoWatcher();
  }
  if (changeHandsWatcher) {
    changeHandsWatcher();
  }

  // 清理定时器
  if (dartProcessingTimer) {
    clearTimeout(dartProcessingTimer);
    dartProcessingTimer = null;
  }
  if (handChangeProcessingTimer) {
    clearTimeout(handChangeProcessingTimer);
    handChangeProcessingTimer = null;
  }

  // 重置处理标志
  isProcessingDart.value = false;
  isProcessingHandChange.value = false;

  closeVideo();
  // 清理游戏设置存储
  uni.removeStorageSync("currentGameSettings");
  uni.removeStorageSync("roomID");
  uni.removeStorageSync("remoteUserId");

  console.log("Mickey Mouse游戏页面已卸载，所有资源已清理");
});

// 设置蓝牙数据回调函数 - 每次接收数据都会触发
bluetooth().setScoreCallback((newVal) => {
  if (newVal) {
    // 处理换手按钮（在所有模式下都有效）
    if (newVal === "65" || newVal === 65) {
      // 🔧 防止重复处理换手按钮
      if (isProcessingHandChange.value) {
        return;
      }

      // 🤖 AI回合期间（或AI正在投镖）禁止人工换手
      if (state.params?.type === 10 && (state.aiAutomaticBid || isAiTurn.value)) {
        console.log("🤖 [Mickey AI保护] AI回合中，忽略设备换手按钮");
        return;
      }
      moveToNextPlayer();
      return;
    }

    // 🔧 修复在线对战模式下的投镖处理
    // 🤖 AI回合期间（或AI正在投镖）禁止处理本地蓝牙投镖
    if (!state.aiAutomaticBid && !isAiTurn.value) {
      //倘若ai在进行投标则禁止 蓝牙投标
      // 🔧 防止重复处理本地蓝牙投镖
      if (isProcessingDart.value) {
        return;
      }

      // 🔧 在线对战模式下，只有轮到当前用户时才处理本地蓝牙投镖
      if (state.gameSettings.type === 11) {
        const currentPlayerId = getCurrentId();
        if (currentPlayerId !== userInfo.playerOnly) {
          return;
        }
      }

      if (!state.gameState.isRoundEnd) {
        blurScore(newVal);
      }
    }
  }
});

//获取对手玩家id
const getRivalId = () => {
  let userId;
  state.teamArray.forEach((item) => {
    if (item.players[0].playerOnly !== userInfo.playerOnly) {
      userId = item.players[0].playerOnly;
    }
  });
  return userId;
};

//获取获取当前回合玩家id
const getCurrentId = () => {
  let userId;
  state.teamArray.forEach((item) => {
    if (item.team === state.gameState.currentTeam) {
      userId = item.players[0].playerOnly;
    }
  });
  return userId;
};

// 初始化游戏状态
const initGameState = async (params) => {
  // 重置结算标记，防止上一局的状态影响本局动画
  state.settlementFired = false;
  
  // 🔧 修复：在混合模式中，重置区域状态和作废区域列表
  // 确保每场新游戏都从干净的状态开始
  state.teamLocks = {};
  state.gameState.forbiddenAreas = [];
  
  if (params.gameSettings.customRound) {
    params.gameSettings.roundNbr = params.gameSettings.customRound;
  }
  // 根据team分组玩家
  state.teamArray = params.players;

  // 线上对战模式：根据先手玩家决定位置（先手在左，后手在右）
  if (params.gameSettings?.type === 11 && state.teamArray.length >= 2) {
    const firstTurnPlayerOnly = params.firstTurnPlayerOnly || params.gameSettings?.firstTurnPlayerOnly;
    
    if (firstTurnPlayerOnly) {
      // 找到先手玩家的队伍索引
      const firstTurnIdx = state.teamArray.findIndex(t => t.players?.[0]?.playerOnly === firstTurnPlayerOnly);
      
      if (firstTurnIdx === 1) {
        // 如果先手玩家在第二位（索引1），需要交换位置，让先手在左边（索引0）
        const tmp = state.teamArray[0];
        state.teamArray[0] = state.teamArray[1];
        state.teamArray[1] = tmp;
        console.log(`[米老鼠线上对战] 调整位置：先手玩家 ${firstTurnPlayerOnly} 移到左边`);
      } else if (firstTurnIdx === 0) {
        console.log(`[米老鼠线上对战] 位置正确：先手玩家 ${firstTurnPlayerOnly} 已在左边`);
      }
    } else {
      // 如果没有指定先手，保持原有逻辑（兼容旧版本）
      const selfIdx = state.teamArray.findIndex(t => t.players?.[0]?.playerOnly === userInfo.playerOnly);
      if (selfIdx === 0) {
        const tmp = state.teamArray[0];
        state.teamArray[0] = state.teamArray[1];
        state.teamArray[1] = tmp;
      }
    }
  }

  // 获取最大的玩家团队
  state.gameState.teamSize = params.gameSettings.teamSize;
  state.modeEntity = params.modeEntity;

  // 设置游戏设置
  state.gameState.maxRounds = params.gameSettings?.roundNbr || 20;

  // 获取配置
  state.gameSettings = params.gameSettings;

  // 在线对战模式下设置远程用户ID
  if (state.gameSettings.type === 11) {
    const remoteUserId = getRivalId();
    if (remoteUserId) {
      uni.setStorageSync("remoteUserId", remoteUserId);
      console.log("🎬 [gameInit] 在线对战模式：设置远程用户ID:", remoteUserId);
    } else {
      console.error("🎬 [gameInit] 在线对战模式：无法获取远程用户ID");
    }
  }
  // 先手方：谁发起邀请谁先手（仅线上对战）
  const initiatorPO = params.firstTurnPlayerOnly || params.gameSettings?.firstTurnPlayerOnly;
  let starterTeamObj = null;
  if (initiatorPO) {
    for (const team of state.teamArray) {
      const p = team.players[0];
      if (p && p.playerOnly === initiatorPO) {
        starterTeamObj = team;
        break;
      }
    }
  }
  // 初始化活动玩家
  if (state.teamArray.length > 0 && state.teamArray[0].players.length > 0) {
    // 清空原有活动标记
    state.teamArray.forEach(t => t.players.forEach(pl => pl.isActive = false));
    const starter = starterTeamObj || state.teamArray[0];
    starter.players[0].isActive = true;
    state.gameState.currentTeam = starter.team;
  }

  // 初始化回合分数记录
  state.gameState.roundScores = {
    1: {}, // 初始化第一回合
  };

  // 初始化每个玩家的平均分记录
  state.teamArray.forEach((team) => {
    team.teamRoundNbr = 0;
    // 🔧 修复：米老鼠模式的startingScore可能是null，需要初始化为0
    team.currentScore = team.startingScore !== null && team.startingScore !== undefined ? team.startingScore : 0;
    team.players.forEach((player) => {
      // 🔥 修复：为米老鼠模式添加镖数统计，与01游戏保持一致
      state.gameState.averageScores[player.id] = {
        average: 0, // 平均分
        scoreAverage: 0, // 总分数（在米老鼠模式中用于存储总倍数）
        currentDartAverage: 0, // 总镖数
        currentRound: 0, // 当前回合数
      };
      // 初始化MPR相关统计
      player.mprStats = {
        totalMultiplier: 0, // 历史回合总倍数
        // totalRounds: 0, // 总回合数
        currentRoundExpected: [0, 0, 0], // 当前回合预期倍数[第1镖,第2镖,第3镖]
        completedRounds: [], // 已完成回合的倍数记录
      };
      // 初始化团队锁定记录
      // 🔧 修复：在混合模式中，每场新游戏都需要重置区域状态，而不是保留上一场的状态
      // 混合模式（gameType===8）下忽略 mickeyMouseBackupScores，强制从全关区开始
      console.log(`[米老鼠初始化] 队伍${team.team}的mickeyMouseBackupScores:`, team?.mickeyMouseBackupScores);
      const useBackup = !(state.params?.gameType === 8);
      const mm = useBackup ? (team?.mickeyMouseBackupScores || {}) : {};
      state.teamLocks[team.team] = {
        averageColor: player.averageColor,
        15: { locked: mm?.[15] !== 3, count: mm?.[15] || 0 },
        16: { locked: mm?.[16] !== 3, count: mm?.[16] || 0 },
        17: { locked: mm?.[17] !== 3, count: mm?.[17] || 0 },
        18: { locked: mm?.[18] !== 3, count: mm?.[18] || 0 },
        19: { locked: mm?.[19] !== 3, count: mm?.[19] || 0 },
        20: { locked: mm?.[20] !== 3, count: mm?.[20] || 0 },
        21: { locked: mm?.["B"] !== 3, count: mm?.["B"] || 0 },
      };

      if (params.gameSettings.type === 11) {
        playerInfo.Api.getPlayerInfo(player.id).then((res) => {
          player.offlineScore = res.offlineScore;
          player.offlineTotal = res.offlineTotal;
          console.log("获取线上对战数据" + JSON.stringify(res));
        });
      }
    });
  });
  modeName.value =
    locale.value === "zh"
      ? state.modeEntity.chineseModeName
      : state.modeEntity.englishModeName;
  SCORING_AREAS.forEach((item) => {
    checkAreaStatus(item.score);
  });
};

const blurScore = (data, isRemoteDart = false) => {
  // 若游戏已结束（结算流程进行中或已完成），忽略后续蓝牙投镖，避免重复触发结算/动画
  try {
    if (bluetooth && typeof bluetooth === 'function') {
      const bt = bluetooth();
      if (bt && bt.isGameStart === false) {
        console.log('🎯 [忽略投镖] 游戏已结束，丢弃本次投镖消息:', data);
        return;
      }
    }
  } catch(e) { }
  // 🔧 修复：只对本地投镖进行重复处理检查，对手投镖直接处理
  if (!isRemoteDart && isProcessingDart.value) {
    console.log("正在处理投镖，跳过重复调用");
    return;
  }

  // 🔧 对本地投镖设置处理标志
  if (!isRemoteDart) {
    isProcessingDart.value = true;
  }

  try {
    //线上模式并且轮到登录用户投标时，发送投标消息给对手
    let rivalId = getRivalId();
    if (
      state.gameSettings.type &&
      state.gameSettings.type === 11 &&
      getCurrentId() === userInfo.playerOnly &&
      !isRemoteDart
    ) {
      //发送投标消息
      let msg = {
        msgType: "tobiao",
        value: data,
      };
      var messageTextObj = {
        type: 1,
        message: JSON.stringify(msg),
        extendedData: { msgType: "tobiao" },
      };
      $stores("zegoStore").sendMessage(rivalId, messageTextObj);
    }
    const gameConfig = getGameConfig(data);
    gameConfig.gameType = state.modeEntity.type;
    if (gameConfig.originalScore >= 15) {
      handleScore(gameConfig.score, gameConfig, isRemoteDart);
    } else {
      handleScore(0, gameConfig, isRemoteDart);
    }
  } finally {
    // 🔧 重置处理标志
    if (!isRemoteDart) {
      setTimeout(() => {
        isProcessingDart.value = false;
      }, 100);
    }
  }
};

// 更新MPR统计的函数
const updateMPRStats = (player, dartMultiplier) => {
  if (!player.mprStats) {
    console.log(`[MPR ERROR] 玩家${player.playerName} 没有mprStats数据`);
    return;
  }

  // 修正：currentDart在投镖时是0，需要+1才是实际的镖数
  const actualDartNumber = state.gameState.currentDart + 1;
  const currentRound = state.gameState.currentRound;

  // 🔧 修复：只记录实际投出的镖，不预设未投的镖
  if (actualDartNumber === 1) {
    // 第1镖时，重置当前回合数组为[0,0,0]，然后设置第1镖的值
    player.mprStats.currentRoundExpected = [0, 0, 0];
    player.mprStats.currentRoundExpected[0] = dartMultiplier;
    console.log(
      `[MPR DEBUG] 第1镖设置实际值: [${player.mprStats.currentRoundExpected.join(
        ","
      )}]`
    );
  } else {
    // 第2、3镖，更新对应位置的实际值
    player.mprStats.currentRoundExpected[actualDartNumber - 1] = dartMultiplier;
    console.log(
      `[MPR DEBUG] 第${actualDartNumber}镖更新实际值: [${player.mprStats.currentRoundExpected.join(
        ","
      )}]`
    );
  }

  // 计算当前显示的MPR值
  const completedRoundsTotal = player.mprStats.completedRounds.reduce(
    (sum, total) => sum + total,
    0
  );
  const currentRoundTotal = player.mprStats.currentRoundExpected.reduce(
    (sum, mult) => sum + mult,
    0
  );
  const totalMultiplier = completedRoundsTotal + currentRoundTotal;
  
  // 🔧 修复：使用实际完成的回合数计算MPR，而不是totalRounds
  const actualCompletedRounds = player.mprStats.completedRounds.length;
  const hasCurrentRoundData = currentRoundTotal > 0;
  const totalRoundsForCalculation = actualCompletedRounds + (hasCurrentRoundData ? 1 : 0);
  
  const displayMPR = totalRoundsForCalculation > 0 ? totalMultiplier / totalRoundsForCalculation : 0;
  
  console.log(`[MPR DEBUG] 玩家${player.playerName} - 已完成回合:${actualCompletedRounds}, 当前回合倍数:${currentRoundTotal}, 总倍数:${totalMultiplier}, MPR:${displayMPR}`);
};

// 换手跳过时处理剩余镖数
const handleSkipRemainingDarts = (player) => {
  if (!player.mprStats) {
    return;
  }

  // 将剩余未投的镖设为0（从当前镖数+1开始）
  const actualDartNumber = state.gameState.currentDart + 1;
  for (let i = actualDartNumber; i <= 3; i++) {
    player.mprStats.currentRoundExpected[i - 1] = 0;
  }
};

// 回合结束时保存当前回合数据
const finishCurrentRound = (player) => {
  if (!player.mprStats) {
    console.log(
      `[MPR ERROR] 玩家${player.playerName} 没有mprStats数据，无法完成回合`
    );
    return;
  }

  const roundTotal = player.mprStats.currentRoundExpected.reduce(
    (sum, mult) => sum + mult,
    0
  );
  
  // 🔧 修复：所有回合都要保存，包括倍数为0的跳过回合
  player.mprStats.completedRounds.push(roundTotal);
  player.mprStats.totalMultiplier = player.mprStats.completedRounds.reduce(
    (sum, total) => sum + total,
    0
  );

  // 重置当前回合预期
  player.mprStats.currentRoundExpected = [0, 0, 0];
};

function calculateTotalMultiplier(currentRoundScores) {
  let total = 0; // 初始化总倍数为0
  // 遍历 currentRoundScores 数组中的每一个元素
  for (let i = 0; i < currentRoundScores.length; i++) {
    const item = currentRoundScores[i]; // 当前元素
    console.log("当前元素为：" + JSON.stringify(item));
    // 检查当前区域是否已经关闭
    total += item.multiplier; // 将倍数加到总倍数上
  }
  console.log("总分为：" + total);
  return total; // 返回计算得到的总倍数
}

// 状态检查和修复函数
const checkAndFixGameState = () => {
  // 检查镖数是否异常
  if (state.gameState.currentDart < 0) {
    console.warn("🚨 [Mickey状态修复] 镖数异常(小于0)，重置为0");
    state.gameState.currentDart = 0;
  }
  if (state.gameState.currentDart > 3) {
    console.warn("🚨 [Mickey状态修复] 镖数异常(大于3)，重置为0");
    state.gameState.currentDart = 0;
  }

  // 检查当前队伍和玩家索引
  const activeTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );
  if (!activeTeam) {
    console.warn("🚨 [Mickey状态修复] 找不到当前队伍，重置为第一队");
    state.gameState.currentTeam = 1;
    state.gameState.currentPlayerIndex = 0;
  }
};

// 投镖得分处理
const handleScore = (score, gameConfig, isRemoteDart = false) => {
  // 状态检查和修复
  checkAndFixGameState();

  // 检查镖数是否已达到上限
  if (state.gameState.currentDart >= 3) {
    console.log("当前回合已投完3镖，跳过处理");
    return;
  }

  // 判断是否换手
  if (state.gameState.isRoundEnd) return;
  // useAudioPlayer().playAudio('/static/mp3/dart.mp3');

  const activeTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );
  const activePlayer = activeTeam?.players[state.gameState.currentPlayerIndex];
  let isFirstClose = false;
  if (!activePlayer) return;
  // 获取实际分区和倍数
  const scoringArea = gameConfig.originalScore;
  const actualScore = gameConfig.score;
  const multiplier = gameConfig.multiplier || 1; // 获取倍数，默认为1

  // 计算当前镖的有效倍数（用于MPR计算）
  let currentDartMultiplier = 0;
  const isMickeyValidArea = scoringArea >= 15;

  if (isMickeyValidArea) {
    // 判断是否为有效投镖
    let isValidDart = false;
    const isAreaOpen =
      state.teamLocks[activeTeam.team][scoringArea] &&
      !state.teamLocks[activeTeam.team][scoringArea].locked;
    const isForbidden = state.gameState.forbiddenAreas.includes(scoringArea);

    if (!isAreaOpen) {
      // 区域未开启：算有效（为了开区而投的镖）
      isValidDart = true;
    } else if (isAreaOpen && !isForbidden) {
      // 区域已开启且未作废：算有效（正常得分镖）
      isValidDart = true;
    } else if (isAreaOpen && isForbidden && isFirstClose) {
      // 区域已开启且作废，但是首次关闭：算有效（关区的那一镖）
      isValidDart = true;
    }

    if (isValidDart) {
      // 根据倍数类型计算有效倍数
      if (multiplier >= 1 && multiplier <= 3) {
        currentDartMultiplier = multiplier;
      } else if (multiplier === 4) {
        // 内牛眼(DBULL)，算2倍
        currentDartMultiplier = 2;
      } else if (multiplier === 5) {
        // 外牛眼(BULL)，算1倍
        currentDartMultiplier = 1;
      }
    }
  }

  // 更新MPR统计
  console.log(
    `🎯 [MPR调试] 更新玩家${activePlayer.playerName}的MPR统计，倍数:${currentDartMultiplier}`
  );
  updateMPRStats(activePlayer, currentDartMultiplier);

  // 🔥 修复：更新镖数统计（与01游戏保持一致）
  if (state.gameState.averageScores[activePlayer.id]) {
    // 增加总镖数
    state.gameState.averageScores[activePlayer.id].currentDartAverage += 1;
    // 增加总倍数（在米老鼠模式中，scoreAverage用于存储总倍数而不是总分数）
    state.gameState.averageScores[activePlayer.id].scoreAverage +=
      currentDartMultiplier;
    // 更新当前回合数
    state.gameState.averageScores[activePlayer.id].currentRound =
      state.gameState.currentRound;

    console.log(
      `🎯 [米老鼠统计] 玩家${activePlayer.playerName}: 镖数+1=${
        state.gameState.averageScores[activePlayer.id].currentDartAverage
      }, 倍数+${currentDartMultiplier}=${
        state.gameState.averageScores[activePlayer.id].scoreAverage
      }`
    );
  }

  // 初始化该区域的记录
  if (!state.teamLocks[activeTeam.team][scoringArea]) {
    state.teamLocks[activeTeam.team][scoringArea] = {
      count: 0,
      locked: true,
    };
  }
  if (state.gameState.forbiddenAreas.includes(scoringArea)) {
    // 区域已被关区后再次命中：应视为“非目标区域”音效
    gameConfig.mickeyMouseIsTouch = true;
  }
  let newScore = 0; // 用于最后加分
  let areaLocked = state.teamLocks[activeTeam.team][scoringArea].locked;

  // 特殊处理牛眼区域
  if (scoringArea === 21) {
    // 牛眼区域
    const currentCount = state.teamLocks[activeTeam.team][scoringArea].count;

    // 计算本次命中后的有效计数
    let effectiveCount = currentCount;
    if (multiplier === 4) {
      // 内眼
      effectiveCount += 2; // 内眼算两下
    } else if (multiplier === 5) {
      // 外眼
      effectiveCount += 1; // 外眼算一下
    }

    // 更新命中次数
    state.teamLocks[activeTeam.team][scoringArea].count = effectiveCount;

    // 检查是否解锁（达到三标）
    if (currentCount < 3 && effectiveCount >= 3) {
      state.teamLocks[activeTeam.team][scoringArea].locked = false;
      isFirstClose = checkAreaStatus(scoringArea);

      // 计算溢出的次数并计分
      const extraHits = effectiveCount - 3;
      if (extraHits > 0) {
        // 无论是内眼还是外眼溢出，溢出部分都只按外牛眼计分(25分)
        newScore += 25 * extraHits;
      }
    } else if (
      !state.teamLocks[activeTeam.team][scoringArea].locked &&
      !state.gameState.forbiddenAreas.includes(scoringArea)
    ) {
      // 区域已开启且未作废，正常计分
      newScore += actualScore;
    }
  } else {
    // 普通区域的处理
    const currentCount = state.teamLocks[activeTeam.team][scoringArea].count;
    const remainingToUnlock = 3 - currentCount; // 还需要多少次才能开区
    if (currentCount < 3) {
      // 还未开区的情况
      if (multiplier <= remainingToUnlock) {
        // 倍数小于等于剩余需要的次数，全部计入开区
        state.teamLocks[activeTeam.team][scoringArea].count += multiplier;

        // 检查是否刚好开区
        if (state.teamLocks[activeTeam.team][scoringArea].count >= 3) {
          state.teamLocks[activeTeam.team][scoringArea].locked = false;
          isFirstClose = checkAreaStatus(scoringArea);
        }
      } else {
        // 倍数大于剩余需要的次数，部分计入开区，部分计分
        state.teamLocks[activeTeam.team][scoringArea].count = 3; // 设为开区
        state.teamLocks[activeTeam.team][scoringArea].locked = false;
        isFirstClose = checkAreaStatus(scoringArea);

        // 计算多余的次数并计分
        const extraHits = multiplier - remainingToUnlock;
        if (score !== 0) {
          newScore += scoringArea * extraHits;
        }
      }
    } else {
      // 已经开区的情况，直接计分
      if (
        !state.gameState.forbiddenAreas.includes(scoringArea) &&
        score !== 0
      ) {
        newScore += scoringArea * multiplier;
      }
    }
  }

  const allTeamsUnlocked = state.teamArray.every(
    (team) => state.teamLocks[team.team]?.[scoringArea]?.locked === false
  );

  if (scoringArea >= 15) {
    if (state.teamLocks[activeTeam.team][scoringArea].count === 1) {
      gameConfig.count = 1;
    }
    if (state.teamLocks[activeTeam.team][scoringArea].count === 2) {
      gameConfig.count = 2;
    }
    if (state.teamLocks[activeTeam.team][scoringArea].count >= 3) {
      gameConfig.count = 3;
    }
  }

  //  新增判断：如果是单人模式，则跳过关区逻辑
  if (state.teamArray.length > 1) {
    // 只有多人模式才执行关区逻辑
    if (allTeamsUnlocked) {
      // 🔧 修复：allTeamsUnlocked表示所有队伍都已解锁，现在要关区
      // 不应该设置mickeyMouseIsTouch，这是给非目标区域用的
      gameConfig.mickeyMouse = 1; // 设置为关区状态
    }
  }

  // 记录本次投镖分数和区域
  if (
    !state.gameState.roundScores[state.gameState.currentRound][activeTeam.team]
  ) {
    state.gameState.roundScores[state.gameState.currentRound][activeTeam.team] =
      {};
  }
  if (
    !state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][
      activePlayer.id
    ]
  ) {
    state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][
      activePlayer.id
    ] = [];
  }

  // 确保玩家有得分记录结构
  if (!activePlayer.scoreHistory) {
    activePlayer.scoreHistory = {
      recentRounds: [],
      currentRound: [],
    };
  }

  // 记录本次投镖的完整信息
  const throwRecord = {
    area: scoringArea === 21 ? "B" : scoringArea,
    multiplier: multiplier,
    score: scoringArea === 21 ? "B" : scoringArea,
    isLocked: state.teamLocks[activeTeam.team][scoringArea].locked,
    count: state.teamLocks[activeTeam.team][scoringArea].count,
    originalScore: gameConfig.originalScore,
    // 该区域是否作废
    isForbidden: state.gameState.forbiddenAreas?.includes(scoringArea),
    //判断是否是第一次关区
    isFirstClose: isFirstClose,
    // 添加区域开区状态
    isAreaOpen: !state.teamLocks[activeTeam.team][scoringArea].locked,
    // 添加开区进度
    openProgress: state.teamLocks[activeTeam.team][scoringArea].count,
  };

  // 添加到回合记录
  state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][
    activePlayer.id
  ].push(throwRecord);

  // 更新历史记录
  const currentRoundScores =
    state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][
      activePlayer.id
    ];

  // 创建回合记录
  const roundRecord = {
    roundNumber: state.gameState.currentRound,
    scores: [...currentRoundScores],
    teamScore: activeTeam.currentScore,
    areaStates: {
      ...state.teamLocks[activeTeam.team],
    }, // 记录区域状态的快照
  };

  // 更新或添加到历史记录
  const existingRecordIndex = activePlayer.scoreHistory.recentRounds.findIndex(
    (record) => record.roundNumber === state.gameState.currentRound
  );

  if (existingRecordIndex !== -1) {
    activePlayer.scoreHistory.recentRounds[existingRecordIndex] = roundRecord;
  } else {
    activePlayer.scoreHistory.recentRounds.push(roundRecord);
  }

  // 只保留最近4回合的记录
  if (activePlayer.scoreHistory.recentRounds.length > 4) {
    activePlayer.scoreHistory.recentRounds.shift();
  }

  // 统一加分
  if (newScore > 0 && !state.gameState.forbiddenAreas.includes(scoringArea)) {
    if (state.teamArray.length === 2) {
      // 判断分数是否大于另一个团队两百，如果超出两百不在加分
      if (
        !(
          activeTeam.currentScore >
          state.teamArray.find((team) => team.team !== activeTeam.team)
            .currentScore +
            200
        )
      ) {
        activeTeam.currentScore += newScore;
      }
    } else {
      activeTeam.currentScore += newScore;
    }
  }

  // 更新当前镖数
  state.gameState.currentDart++;

  // 判断是否提前获胜 (所有分区解锁 && 分数最高)
  const allAreasUnlockedForTeam = Object.values(
    state.teamLocks[activeTeam.team]
  ).every((area) => !area?.locked);
  const isHighestScore = state.teamArray.every((otherTeam) => {
    if (otherTeam.team === activeTeam.team) return true; // 排除自己
    return activeTeam.currentScore > otherTeam.currentScore;
  });

  if (allAreasUnlockedForTeam && isHighestScore) {
    // 🔧 停止AI投镖
    if (state.aiAutomaticBid) {
      console.log("🤖 [AI停止] 游戏结束，停止AI投镖");
      state.aiAutomaticBid = false;
    }

    // 获取胜利团队的玩家名字
    const playerNames = activeTeam.players
      .map((player) => player.playerName)
      .join("、");

    // 🔧 修复：在所有区域解锁的胜利条件下，activeTeam就是胜利者
    console.log(
      `[米老鼠游戏] 所有区域解锁胜利条件：队伍${activeTeam.team}(${activeTeam.players[0].playerName}) 获胜`
    );
    state.settlementFired = true;
    MixedSettlement(activeTeam);
    // 播放覆盖层动画后再结算
    endWithFinishAnimation('allAreasUnlocked', playerNames);
    return; // 提前结束函数
  }
  console.log(
    currentRoundScores.reduce((sum, item) => {
      // 如果分区已关闭或被禁用，则 multiplier 视为 0
      let isLocked =
        state.teamLocks[activeTeam.team][item.area]?.locked ||
        state.gameState.forbiddenAreas?.includes(item.area);
      let inScore = item.originalScore < 15;
      let isOpenArea = item.isAreaOpen;
      if (isLocked || inScore || !isOpenArea) {
        return sum + 0;
      } else {
        if (item.openProgress === 4) {
          return sum + 2;
        } else if (item.openProgress === 5) {
          return sum + 1;
        }
        return sum + item.multiplier;
      }
    }, 0)
  );

  // 如果投完三镖
  if (state.gameState.currentDart === 3) {
    // 🔧 修复：确保currentRoundScores有完整的3镖数据
    console.log(`🎯 [特殊动画检查] 玩家${activePlayer.playerName}投完3镖，检查动画触发条件`);
    console.log(`🎯 [特殊动画检查] currentRoundScores长度: ${currentRoundScores.length}`);
    console.log(`🎯 [特殊动画检查] gameConfig.gameType: ${gameConfig.gameType}`);
    
    // 记录特殊动画的延迟时长（若触发则用于延迟结算）
    let specialAnimationDelay = 0;
    // 🔧 修复：只有当前回合有完整的3镖记录时才检查动画
    if (currentRoundScores.length === 3) {
      let displayMultiplierSumForTrigger = 0; // 用于判断是否触发动画的总和（基于有效倍数）
      const situationForActualDisplay = []; // 用于动画实际显示的每镖倍数，会考虑区域状态
      let hasValidDart = false; // 检查是否至少有一镖是有效的

      currentRoundScores.forEach((item, dartIndex) => {
        let displayedMultiplierValue = 0; // 动画中这一镖实际显示的倍数 (mls_0 到 mls_3)

        // 检查是否为米老鼠有效区域 (15-20, B/21)
        // 注意：B(牛眼)也是有效区域，牛眼外围(BULL)是'/'，牛眼内环(DBULL)是'X'
        const isMickeyValidArea = item.originalScore >= 15;

        if (isMickeyValidArea) {
          // 米老鼠游戏的特殊动画逻辑：
          // 1. 在有效区域(15-20, B)的投镖
          // 2. 需要兼容关区后的判断：已关闭区域不计入
          // 3. 需要兼容关区当前镖：正在关闭区域的那一镖要计入

          // 米老鼠动画的判断逻辑：
          // 1. 区域未开启：算有效（为了开区）
          // 2. 区域已开启且未作废：算有效（正常得分）
          // 3. 区域已开启且作废，但是首次开启：算有效（关区的那一镖）
          // 4. 区域已开启且作废，且不是首次开启：不算有效（关区后的镖）

          let isValidDart = false;

          if (!item.isAreaOpen) {
            // 区域未开启：算有效（为了开区而投的镖）
            isValidDart = true;
          } else if (item.isAreaOpen && !item.isForbidden) {
            // 区域已开启且未作废：算有效（正常得分镖）
            isValidDart = true;
          } else if (item.isAreaOpen && item.isForbidden && item.isFirstClose) {
            // 区域已开启且作废，但是首次开启：算有效（关区的那一镖）
            isValidDart = true;
          } else if (item.isAreaOpen && item.isForbidden && !item.isFirstClose) {
            // 区域已开启且作废，且不是首次开启：不算有效（关区后的镖）
            isValidDart = false;
          }

          if (isValidDart) {
            hasValidDart = true;

            // 计入触发判断的倍数总和
            if (item.multiplier >= 1 && item.multiplier <= 3) {
              // 普通1/2/3倍区直接使用原始multiplier
              displayMultiplierSumForTrigger += item.multiplier;
              displayedMultiplierValue = item.multiplier;
            } else if (item.multiplier === 4) {
              // 内牛眼(DBULL)，符号是'X'，算2倍
              displayMultiplierSumForTrigger += 2;
              displayedMultiplierValue = 2;
            } else if (item.multiplier === 5) {
              // 外牛眼(BULL)，符号是'/'，算1倍
              displayMultiplierSumForTrigger += 1;
              displayedMultiplierValue = 1;
            } else {
            }
          } else {
            // 区域无效，不计入倍数总和，显示0
            displayedMultiplierValue = 0;
          }
        } else {
        }

        situationForActualDisplay.push(displayedMultiplierValue);
      });

      // 触发条件：
      // 1. 有效倍数总和≥5（只计算投镖时有效区域的倍数）
      // 2. 至少有一镖命中投镖时有效的区域
      // 注意：使用投镖时的区域状态，避免"刚好被关区"的问题
      const shouldTriggerAnimation =
        displayMultiplierSumForTrigger >= 5 &&
        hasValidDart &&
        gameConfig.gameType === 2;

      if (shouldTriggerAnimation) {
        state.threeSituation = [...situationForActualDisplay];

        let lingShi = [...state.threeSituation];
      let flagDuration = findMp4(gameConfig, currentRoundScores);
      // 记录需要延迟结算的时长
      specialAnimationDelay = (Number(flagDuration) || 0) + 2000;

      setTimeout(() => {
        useAudioPlayer().playAudio("/static/mp3/xxx.mp3");
      }, flagDuration + 500);

      setTimeout(() => {
        state.threeSituation = [lingShi[0]];
        state.threeSituationDisplay = true;
      }, flagDuration + 500);
      setTimeout(() => {
        state.threeSituation = [lingShi[0], lingShi[1]];
      }, flagDuration + 1000);
      setTimeout(() => {
        state.threeSituation = [...lingShi];
      }, flagDuration + 1500);
      setTimeout(() => {
        state.threeSituationDisplay = false;
        state.threeSituation = [];
      }, flagDuration + 2000);
      }
    }

    activeTeam.teamRoundNbr++;

    // 计算本回合的有效倍数总和并更新MPR统计
    const roundEffectiveMultiplier = currentRoundScores.reduce((sum, item) => {
      // 检查是否为米老鼠有效区域 (15-20, B/21)
      const isMickeyValidArea = item.originalScore >= 15;

      if (isMickeyValidArea) {
        // 判断是否为有效投镖
        let isValidDart = false;

        if (!item.isAreaOpen) {
          // 区域未开启：算有效（为了开区而投的镖）
          isValidDart = true;
        } else if (item.isAreaOpen && !item.isForbidden) {
          // 区域已开启且未作废：算有效（正常得分镖）
          isValidDart = true;
        } else if (item.isAreaOpen && item.isForbidden && item.isFirstClose) {
          // 区域已开启且作废，但是首次开启：算有效（关区的那一镖）
          isValidDart = true;
        }

        if (isValidDart) {
          // 根据倍数类型计算有效倍数
          if (item.multiplier >= 1 && item.multiplier <= 3) {
            // 普通1/2/3倍区直接使用原始multiplier
            return sum + item.multiplier;
          } else if (item.multiplier === 4) {
            // 内牛眼(DBULL)，算2倍
            return sum + 2;
          } else if (item.multiplier === 5) {
            // 外牛眼(BULL)，算1倍
            return sum + 1;
          }
        }
      }
      return sum;
    }, 0);

    // 回合结束时保存当前回合数据到MPR统计
    if (activePlayer.mprStats) {
      finishCurrentRound(activePlayer);
    }

    // 检查是否是最后一回合的最后一个玩家的最后一镖
    const isLastRound =
      state.gameState.currentRound === state.gameState.maxRounds;
    // 更稳健：根据本局的先攻标识推导“本回合最后出手队伍”
    let lastTeamId = state.teamArray[state.teamArray.length - 1]?.team; // 兜底
    try {
      const firstTurnPO = state.modeEntity?.firstTurnPlayerOnly
        || state.gameSettings?.firstTurnPlayerOnly
        || state.params?.firstTurnPlayerOnly;
      if (firstTurnPO) {
        const firstTeam = state.teamArray.find(t => t?.players?.[0]?.playerOnly === firstTurnPO);
        const otherTeam = state.teamArray.find(t => t && (!firstTeam || t.team !== firstTeam.team));
        if (otherTeam) lastTeamId = otherTeam.team;
      }
    } catch (e) {}
    const isLastTeam = state.gameState.currentTeam === lastTeamId;
    const isLastPlayer =
      state.gameState.currentPlayerIndex === activeTeam.players.length - 1;

    if (isLastRound && isLastTeam && isLastPlayer) {
      // 🔧 停止AI投镖
      if (state.aiAutomaticBid) {
        console.log("🤖 [AI停止] 游戏正常结束，停止AI投镖");
        state.aiAutomaticBid = false;
      }

      // 游戏结束，计算胜利者（先比分，再比关区数，最后比发起方）
      console.log('===== 米老鼠1v1结算开始 =====');
      let winningTeam = state.teamArray[0];
      let maxScore = winningTeam.currentScore;

      // 遍历所有团队找出分数最高的
      state.teamArray.forEach((team) => {
        console.log(`队伍${team.team}: 分数=${team.currentScore}`);
        if (team.currentScore > maxScore) {
          maxScore = team.currentScore;
          winningTeam = team;
        }
      });

      console.log(`最高分数: ${maxScore}`);
      
      // 找出所有并列最高分的队伍
      const topTeams = state.teamArray.filter(team => team.currentScore === maxScore);
      console.log(`并列最高分队伍数量: ${topTeams.length}`);

      const countOpened = (team) => {
        const locks = state.teamLocks[team.team] || {};
        // 🔧 修复：只统计真正的分区（15-21），排除averageColor等非区域属性
        const validAreas = [15, 16, 17, 18, 19, 20, 21];
        return validAreas.filter(areaNum => {
          const area = locks[areaNum];
          return area && typeof area === 'object' && area.locked === false;
        }).length;
      };

      if (topTeams.length > 1) {
        console.log('分数相同，开始比较开区数量');
        // 按开区数量进行比较
        let bestTeams = [];
        let maxOpened = -1;
        topTeams.forEach(team => {
          const opened = countOpened(team);
          console.log(`队伍${team.team}: 开区数=${opened}`);
          if (opened > maxOpened) {
            maxOpened = opened;
            bestTeams = [team];
          } else if (opened === maxOpened) {
            bestTeams.push(team);
          }
        });
        console.log(`最多开区数: ${maxOpened}, 并列队伍数: ${bestTeams.length}`);

        if (bestTeams.length === 1) {
          winningTeam = bestTeams[0];
          console.log(`根据开区数确定胜利者: 队伍${winningTeam.team}`);
        } else {
          // 开区数量仍相同，按邀请方胜出
          console.log('开区数相同，根据邀请方判断');
          const initiatorPO = state.params.firstTurnPlayerOnly || state.params.gameSettings?.firstTurnPlayerOnly;
          const initiatorTeam = state.teamArray.find(t => t.players[0]?.playerOnly === initiatorPO);
          if (initiatorTeam && bestTeams.some(t => t.team === initiatorTeam.team)) {
            winningTeam = initiatorTeam;
            console.log(`邀请方胜出: 队伍${winningTeam.team}`);
          } else {
            // 兜底：保持现有 winningTeam
            console.log('⚠️ [米老鼠平分裁决] 未找到发起方队伍或不在并列队伍中，使用默认裀决');
          }
        }
      }
      
      console.log(`最终胜利者: 队伍${winningTeam.team}`);
      console.log('===========================');

      // 获取胜利团队的玩家名字
      const playerNames = winningTeam.players
        .map((player) => player.playerName)
        .join("、");
      //判断是否混合模式，并且还有游戏未完成

      // 🔧 修复：传递正确的胜利者队伍，而不是当前投镖队伍
      const doSettlement = () => {
        state.settlementFired = true;
        MixedSettlement(winningTeam);
        // 覆盖层动画后再结算
        endWithFinishAnimation('score', playerNames);
      };

      // 🔧 修复：若触发了特殊动画，则在动画结束后结算；否则立即结算
      // 防止结算重复执行
      if (typeof specialAnimationDelay === 'number' && specialAnimationDelay > 0) {
        console.log(`[米老鼠游戏] 触发特殊动画，延迟${specialAnimationDelay}ms后结算`);
        // 设置标志防止兔底逻辑重复结算
        state.isWaitingForAnimation = true;
        setTimeout(() => {
          state.isWaitingForAnimation = false;
          doSettlement();
        }, specialAnimationDelay);
      } else {
        doSettlement();
      }
    }
  }

  if (!state.settlementFired) {
    useAudioPlayerFun(gameConfig, currentRoundScores);
  }

  // 兜底：最后一回合最后一位玩家的最后一镖（如空镖且未触发动画）确保结算
  try {
    if (state.gameState.currentDart === 3) {
      const isLastRound = state.gameState.currentRound === state.gameState.maxRounds;
      let lastTeamId = state.teamArray[state.teamArray.length - 1]?.team;
      try {
        const firstTurnPO = state.modeEntity?.firstTurnPlayerOnly || state.gameSettings?.firstTurnPlayerOnly || state.params?.firstTurnPlayerOnly;
        if (firstTurnPO) {
          const firstTeam = state.teamArray.find(t => t?.players?.[0]?.playerOnly === firstTurnPO);
          const otherTeam = state.teamArray.find(t => t && (!firstTeam || t.team !== firstTeam.team));
          if (otherTeam) lastTeamId = otherTeam.team;
        }
      } catch(e){}
      const isLastTeam = state.gameState.currentTeam === lastTeamId;
      const isLastPlayer = state.gameState.currentPlayerIndex === activeTeam.players.length - 1;

      if (isLastRound && isLastTeam && isLastPlayer) {
        // 🔧 修复：若没有正在展示的三镖特殊动画，且不在等待动画结束，则立即结算
        if (!state.threeSituationDisplay && !state.isWaitingForAnimation && !state.settlementFired) {
          // 计算胜者（分数→开区数→邀请方）
          let winningTeam = state.teamArray[0];
          let maxScore = winningTeam.currentScore;
          state.teamArray.forEach((team) => { if (team.currentScore > maxScore) { maxScore = team.currentScore; winningTeam = team; } });
          const topTeams = state.teamArray.filter(team => team.currentScore === maxScore);
          if (topTeams.length > 1) {
            const countOpened = (team) => { 
              const locks = state.teamLocks[team.team] || {}; 
              const validAreas = [15, 16, 17, 18, 19, 20, 21];
              return validAreas.filter(areaNum => {
                const area = locks[areaNum];
                return area && typeof area === 'object' && area.locked === false;
              }).length;
            };
            let bestTeams = [];
            let maxOpened = -1;
            topTeams.forEach(team => { const opened = countOpened(team); if (opened > maxOpened) { maxOpened = opened; bestTeams = [team]; } else if (opened === maxOpened) { bestTeams.push(team); } });
            if (bestTeams.length === 1) {
              winningTeam = bestTeams[0];
            } else {
              const initiatorPO = state.params.firstTurnPlayerOnly || state.params.gameSettings?.firstTurnPlayerOnly;
              const initiatorTeam = state.teamArray.find(t => t.players[0]?.playerOnly === initiatorPO);
              if (initiatorTeam && bestTeams.some(t => t.team === initiatorTeam.team)) winningTeam = initiatorTeam;
            }
          }
          const playerNames = winningTeam.players.map((player) => player.playerName).join("、");
          state.settlementFired = true;
          MixedSettlement(winningTeam);
          endWithFinishAnimation('score', playerNames);
        }
      }
    }
  } catch (e) {
    console.warn('[Mickey兜底结算] 异常', e);
  }

  // 🔚 终极兜底：线上/离线均适用
  // 场景：最后一回合最后一名玩家三镖均未命中有效区，导致前置判定未触发
  try {
    const isLastRound = state.gameState.currentRound === state.gameState.maxRounds;
    if (!isLastRound) return;

    // 优先：2v2/离线补强判定——最后一队最后一位玩家第三镖后强制结算（避免因无效区导致漏结算）
    try {
      // 推导最后出手队伍（沿用前文逻辑）
      let lastTeamId = state.teamArray[state.teamArray.length - 1]?.team;
      try {
        const firstTurnPO = state.modeEntity?.firstTurnPlayerOnly || state.gameSettings?.firstTurnPlayerOnly || state.params?.firstTurnPlayerOnly;
        if (firstTurnPO) {
          const firstTeam = state.teamArray.find(t => t?.players?.[0]?.playerOnly === firstTurnPO);
          const otherTeam = state.teamArray.find(t => t && (!firstTeam || t.team !== firstTeam.team));
          if (otherTeam) lastTeamId = otherTeam.team;
        }
      } catch (e) {}
      const isLastTeam = state.gameState.currentTeam === lastTeamId;
      const isLastPlayer = state.gameState.currentPlayerIndex === (state.teamArray.find(t => t.team === state.gameState.currentTeam)?.players?.length - 1);

      if (isLastTeam && isLastPlayer && state.gameState.currentDart === 3 && !state.threeSituationDisplay && !state.isWaitingForAnimation && !state.settlementFired) {
        console.log('[Mickey终极兜底] 最后一队最后一人完成第三镖（可能全无效），强制结算');
        // 计算胜者（分数→开区数→邀请方）
        let winningTeam = state.teamArray[0];
        let maxScore = winningTeam.currentScore || 0;
        state.teamArray.forEach((team) => {
          if ((team.currentScore || 0) > maxScore) { maxScore = team.currentScore; winningTeam = team; }
        });
        const topTeams = state.teamArray.filter(team => (team.currentScore || 0) === maxScore);
        if (topTeams.length > 1) {
          const countOpened = (team) => {
            const locks = state.teamLocks[team.team] || {};
            const validAreas = [15,16,17,18,19,20,21];
            return validAreas.filter(a => { const it = locks[a]; return it && typeof it==='object' && it.locked===false; }).length;
          };
          let bestTeams = [];
          let maxOpened = -1;
          topTeams.forEach(team => { const opened = countOpened(team); if (opened > maxOpened) { maxOpened=opened; bestTeams=[team]; } else if (opened === maxOpened) { bestTeams.push(team); } });
          if (bestTeams.length === 1) {
            winningTeam = bestTeams[0];
          } else {
            const initiatorPO = state.params.firstTurnPlayerOnly || state.params.gameSettings?.firstTurnPlayerOnly;
            const initiatorTeam = state.teamArray.find(t => t.players?.[0]?.playerOnly === initiatorPO);
            if (initiatorTeam && bestTeams.some(t => t.team === initiatorTeam.team)) winningTeam = initiatorTeam;
          }
        }
        const playerNames = winningTeam.players.map(p => p.playerName).join('、');
        state.settlementFired = true;
        MixedSettlement(winningTeam);
        endWithFinishAnimation('score', playerNames);
        return; // 已结算
      }
    } catch (e) { console.warn('[Mickey终极兜底-最后一人分支] 异常', e); }

    // 其次：全员三镖完成的结算
    // 检查本回合所有队伍的所有玩家是否都已投满3镖
    const roundId = state.gameState.currentRound;
    const allPlayersCompleted = state.teamArray.every(team =>
      (team.players || []).every(p => {
        const arr = (state.gameState.roundScores?.[roundId]?.[team.team]?.[p.id]) || [];
        return Array.isArray(arr) && arr.length === 3;
      })
    );

    if (allPlayersCompleted && !state.threeSituationDisplay && !state.isWaitingForAnimation && !state.settlementFired) {
      // 计算胜者（分数→开区数→邀请方），与主逻辑一致
      let winningTeam = state.teamArray[0];
      let maxScore = winningTeam.currentScore || 0;
      state.teamArray.forEach((team) => {
        if ((team.currentScore || 0) > maxScore) {
          maxScore = team.currentScore;
          winningTeam = team;
        }
      });
      const topTeams = state.teamArray.filter(team => (team.currentScore || 0) === maxScore);
      if (topTeams.length > 1) {
        const countOpened = (team) => {
          const locks = state.teamLocks[team.team] || {};
          const validAreas = [15, 16, 17, 18, 19, 20, 21];
          return validAreas.filter(a => {
            const it = locks[a];
            return it && typeof it === 'object' && it.locked === false;
          }).length;
        };
        let bestTeams = [];
        let maxOpened = -1;
        topTeams.forEach(team => {
          const opened = countOpened(team);
          if (opened > maxOpened) {
            maxOpened = opened;
            bestTeams = [team];
          } else if (opened === maxOpened) {
            bestTeams.push(team);
          }
        });
        if (bestTeams.length === 1) {
          winningTeam = bestTeams[0];
        } else {
          const initiatorPO = state.params.firstTurnPlayerOnly || state.params.gameSettings?.firstTurnPlayerOnly;
          const initiatorTeam = state.teamArray.find(t => t.players?.[0]?.playerOnly === initiatorPO);
          if (initiatorTeam && bestTeams.some(t => t.team === initiatorTeam.team)) {
            winningTeam = initiatorTeam;
          }
        }
      }
      const playerNames = winningTeam.players.map(p => p.playerName).join('、');
      console.log('[Mickey终极兜底] 所有人已投满3镖，触发结算，胜者队伍=', winningTeam.team);
      state.settlementFired = true;
      MixedSettlement(winningTeam);
      endWithFinishAnimation('score', playerNames);
    }
  } catch (e) {
    console.warn('[Mickey终极兜底] 异常', e);
  }
  // 最后再做一次自动结算兜底，避免极端情况下未触发
  ensureAutoSettleIfEndOfGame();
};

//混合模式结算
const MixedSettlement = (winningTeam) => {
  console.log('[米老鼠混合模式] MixedSettlement 被调用，胜利者:', winningTeam.team);
  if (state.params.gameType === 8) {
    // 🔧 修复：首先标记当前游戏为已完成
    const currentGameId = state.modeEntity.id;
    const currentStartingScore = state.modeEntity.startingScore;

    console.log(`[米老鼠混合模式] 开始标记当前游戏为已完成`);
    console.log(`[米老鼠混合模式] 当前游戏ID: ${currentGameId}`);
    console.log(`[米老鼠混合模式] 起始分数: ${currentStartingScore}`);
    
    let foundAndMarked = false;
    state.params.modes.forEach((item, index) => {
      console.log(`[米老鼠混合模式] 检查模式${index}: ID=${item.id}, startingScore=${item.startingScore}, status=${item.status}`);
      
      // 🔧 修复：使用ID来精确匹配当前游戏（因为每个模式现在都有唯一ID）
      if (item.id === currentGameId && !item.status) {
        item.status = true;
        foundAndMarked = true;
        console.log(`[米老鼠混合模式] ✅ 标记模式${index}为已完成`);
      }
    });
    
    if (!foundAndMarked) {
      console.error(`[米老鼠混合模式] ⚠️ 未找到匹配的模式！该模式可能已经被标记过，仅跳过再次标记，但仍会记录胜负与决定是否还有下一局。`);
      // 不 return：继续执行胜负记录与下一局判断，避免因为前置已标记导致本局胜负丢失
    }

    // 🔧 修复：直接使用传入的胜利者队伍，不再重新计算
    // 调用方已经正确计算了胜利者，这里直接使用
    console.log(
      `[米老鼠混合模式] 接收到胜利者: 队伍${winningTeam.team}(${winningTeam.players[0].playerName}), 分数: ${winningTeam.currentScore}`
    );

    // 验证胜利者是否正确（仅用于调试）
    if (state.modeEntity.type === 2) {
      // 米老鼠游戏：验证是否为分数最高的队伍
      let maxScore = 0;
      state.teamArray.forEach((team) => {
        console.log(
          `[米老鼠混合模式] 队伍${team.team}(${team.players[0].playerName}) 分数: ${team.currentScore}`
        );
        if ((team.currentScore || 0) > maxScore) {
          maxScore = team.currentScore;
        }
      });

      if (winningTeam.currentScore !== maxScore) {
        console.warn(
          `[米老鼠混合模式] 警告：传入的胜利者分数(${winningTeam.currentScore})不是最高分(${maxScore})`
        );
      }
    }
    // 其他游戏类型的验证可以在这里添加

    // 先定位获胜队伍在teamArray中的下标，供后续使用
    let teamIndex = state.teamArray.findIndex(t => t?.players?.[0]?.id === winningTeam.players[0].id);
    if (teamIndex < 0) teamIndex = 0;

    // 防重复保护：若已记录的胜场数 >= 已完成的模式数，则不再重复写入胜负
    try {
      const finishedCount = Array.isArray(state.params.modes) ? state.params.modes.filter(m => m && m.status).length : 0;
      const recordedWins = Array.isArray(state.params.tameWin?.teamIdWin) ? state.params.tameWin.teamIdWin.length : 0;
      if (finishedCount > 0 && recordedWins >= finishedCount) {
        console.log('[米老鼠混合模式] 胜负记录已与已完成局数对齐，跳过重复写入');
      } else {
        // 写入胜场到 tameWin（去重保护由上层判断控制）
        if (!state.params.tameWin) state.params.tameWin = { teamIdWin: [], teamIdfail: [] };
        state.params.tameWin.teamIdWin.push(winningTeam.team);
        state.teamArray.forEach(t => { if (t.team !== winningTeam.team) state.params.tameWin.teamIdfail.push(t.team); });

        const teamWinsCountNow = (state.params.tameWin.teamIdWin || []).filter(id => id === winningTeam.team).length;
        if (state.teamArray?.[teamIndex]?.players?.[0]) {
          state.teamArray[teamIndex].players[0].win = teamWinsCountNow;
        }
        console.log(
          `[米老鼠混合模式] 胜利者: ${winningTeam.players[0].playerName}, 胜利次数(按tameWin统计): ${teamWinsCountNow}`
        );

    // 🔧 修复：直接记录本局胜利者信息，供mixedModeGameEnd使用
    state.params.currentGameWinner = {
      team: winningTeam.team,
      playerName: winningTeam.players[0].playerName,
    };
    console.log(
      `[米老鼠混合模式] 记录本局胜利者信息: 队伍${winningTeam.team}(${winningTeam.players[0].playerName})`
    );
      }
    } catch (e) { console.warn('[米老鼠混合模式] 胜负防重复判断异常，继续记录', e); }

    // 检查是否是混合模式的最后一局
    let isLast = false;

    // 胜场一律以 tameWin 为准，避免重复调用造成 players[0].win 与 tameWin 不一致
    const winsArr = state.params?.tameWin?.teamIdWin || [];
    const teamWinsCount = winsArr.filter(id => id === winningTeam.team).length;

    // 将队伍对象的 win 与 tameWin 同步，确保结算页显示一致（去重后的真实胜场）
    if (state.teamArray?.[teamIndex]?.players?.[0]) {
      state.teamArray[teamIndex].players[0].win = teamWinsCount;
    }

    // 胜负判定使用 teamWinsCount
    let winNumber = teamWinsCount;
    let bureau = Math.floor(state.params.modes.length / 2 + 1); // 需要胜利的局数

    if (winNumber >= bureau) {
      // 某队伍已达到胜利条件，游戏结束
      isLast = true;
    } else {
      // 检查是否还有未完成的游戏（排除当前已完成的游戏）
      let hasUnfinishedGames = false;

      state.params.modes.forEach((item) => {
        if (!item.status) {
          hasUnfinishedGames = true;
        }
      });

      if (!hasUnfinishedGames) {
        // 所有游戏都已完成，但没有队伍达到胜利条件
        isLast = true;
      } else {
        // 还有游戏未完成，继续下一局
        isLast = false;
      }
    }

    // 检查是否有来自useGameCommon的混合模式结束标志
    if (state.mixedModeEnd !== undefined) {
      modeEnd.value = state.mixedModeEnd;
      // 清除标志
      delete state.mixedModeEnd;
    } else {
      modeEnd.value = isLast;
    }
  }
};

// 音频动画播放
const useAudioPlayerFun = (gameConfig, currentRoundScores) => {
  let urlMp4 = useAudioPlayerFunIf(gameConfig, currentRoundScores);
  console.log("mp4-->" + urlMp4);
  let urlMp3 = playAudioPlayerFunIf(gameConfig, currentRoundScores);
  console.log("urlMp3-->" + urlMp3);
  if (urlMp4 || urlMp3) {
    urlMp4 ? playerContentRef.value.playVideo(urlMp4, true, () => {}) : "";
    urlMp3 ? useAudioPlayer().playAudio(urlMp3) : "";
  } else {
    useAudioPlayer().playAudio("/static/mp3/jzbk.mp3");
    // useAudioPlayer().playAudio('/static/mp3/dart.wav');
  }
};

// 音频动画播放
const findMp4 = (gameConfig, currentRoundScores) => {
  let urlMp4 = useAudioPlayerFunIf(gameConfig, currentRoundScores);
  if (urlMp4 === null || urlMp4 === undefined) {
    return 0;
  } else {
    return getGifTimeLength(urlMp4, gameConfig.gameType);
  }
};

// 追加：最后一回合自动结算兜底（全员三镖完成即结算）
const ensureAutoSettleIfEndOfGame = () => {
  try {
    // 已结算或游戏已结束，直接返回
    if (state.settlementFired) return;
    try { if (!bluetooth().isGameStart) return; } catch (e) {}

    const isLastRound = state.gameState.currentRound === state.gameState.maxRounds;
    if (!isLastRound) return;

    // 当前回合ID
    const roundId = state.gameState.currentRound;

    // 判定1：每位玩家的回合数组长度是否都已达到3
    const allPlayersCompleted = state.teamArray.every(team =>
      (team.players || []).every(p => {
        const arr = (state.gameState.roundScores?.[roundId]?.[team.team]?.[p.id]) || [];
        return Array.isArray(arr) && arr.length === 3;
      })
    );

    // 判定2：以投掷总数衡量（更稳健，兼容未补齐占位的逻辑）
    const expectedTotalThrows = state.teamArray.reduce((acc, team) => acc + ((team.players || []).length * 3), 0);
    const actualTotalThrows = state.teamArray.reduce((acc, team) => {
      const teamScores = state.gameState.roundScores?.[roundId]?.[team.team] || {};
      const teamThrown = (team.players || []).reduce((sum, p) => {
        const arr = teamScores[p.id] || [];
        return sum + (Array.isArray(arr) ? arr.length : 0);
      }, 0);
      return acc + teamThrown;
    }, 0);
    const allThrowsCompleted = actualTotalThrows >= expectedTotalThrows;

    // 若未达到“每位玩家3镖”且总投掷数不足，则暂不结算（移除基于teamRoundNbr的易误判逻辑）
    if (!(allPlayersCompleted || allThrowsCompleted)) return;

    // 若有三镖动画正在播放或等待结束，延后结算
    if (state.threeSituationDisplay || state.isWaitingForAnimation) return;

    // 计算胜者：优先分数，其次开区数量，最后邀请方（先手）
    let winningTeam = state.teamArray[0];
    let maxScore = winningTeam.currentScore || 0;
    state.teamArray.forEach((team) => {
      if ((team.currentScore || 0) > maxScore) {
        maxScore = team.currentScore;
        winningTeam = team;
      }
    });

    const topTeams = state.teamArray.filter(team => (team.currentScore || 0) === maxScore);
    if (topTeams.length > 1) {
      const countOpened = (team) => {
        const locks = state.teamLocks[team.team] || {};
        const validAreas = [15, 16, 17, 18, 19, 20, 21];
        return validAreas.filter(a => {
          const it = locks[a];
          return it && typeof it === 'object' && it.locked === false;
        }).length;
      };
      let bestTeams = [];
      let maxOpened = -1;
      topTeams.forEach(team => {
        const opened = countOpened(team);
        if (opened > maxOpened) {
          maxOpened = opened;
          bestTeams = [team];
        } else if (opened === maxOpened) {
          bestTeams.push(team);
        }
      });
      if (bestTeams.length === 1) {
        winningTeam = bestTeams[0];
      } else {
        const initiatorPO = state.params.firstTurnPlayerOnly || state.params.gameSettings?.firstTurnPlayerOnly;
        const initiatorTeam = state.teamArray.find(t => t.players?.[0]?.playerOnly === initiatorPO);
        if (initiatorTeam && bestTeams.some(t => t.team === initiatorTeam.team)) winningTeam = initiatorTeam;
      }
    }

    const playerNames = winningTeam.players.map(p => p.playerName).join('、');
    state.settlementFired = true; // 标记已结算，避免重复
    MixedSettlement(winningTeam);
    gameCommon.handleGameEnd('score', playerNames, playerContentRef);
  } catch (e) {
    console.warn('[Mickey自动结算兜底] 异常', e);
  }
};

// 检查区域状态
const checkAreaStatus = (scoringArea) => {
  if (scoringArea < 15 || state.teamArray.length < 2) {
    return;
  }
  if (scoringArea === "B") {
    scoringArea = 21;
  }
  // 检查是否所有团队都已解锁该区域
  const allTeamsUnlocked = state.teamArray.every(
    (team) => state.teamLocks[team.team]?.[scoringArea]?.locked === false
  );
  if (allTeamsUnlocked) {
    // 将区域标记为作废
    state.gameState.forbiddenAreas.push(scoringArea);

    // 如果是牛眼区域，同时将内牛眼和外牛眼都标记为作废
    if (scoringArea === 21) {
      showToast({
        message: locale.value === 'zh' ?`牛眼区域已被所有团队解锁，区域作废！` : 'The bullseye area has been unlocked by all teams and is now void.',
        icon: "none",
      });
    } else {
      showToast({
        message:locale.value === 'zh' ? `${scoringArea}区域已被所有团队解锁，区域作废！` :`${scoringArea}area has been unlocked by all teams and is now decommissioned.`,
        icon: "none",
      });
    }

    // 判断封锁区域是否大于等于7
    if (state.gameState.forbiddenAreas.length >= 7) {
      // 在混合模式中，需要先处理胜负结算
      if (state.params.gameType === 8) {
        // 计算获胜队伍（分数最高的队伍）
        let winningTeam = state.teamArray[0];
        let maxScore = winningTeam.currentScore || 0;

        state.teamArray.forEach((team) => {
          if ((team.currentScore || 0) > maxScore) {
            maxScore = team.currentScore;
            winningTeam = team;
          }
        });

        // 调用混合模式结算
        MixedSettlement(winningTeam);
      }

      // 7个分区都作废时，游戏结束
      endWithFinishAnimation('blockade', null);
    }
    return true;
  }
};

// 修改获取活动玩家的计算属性
const getActivePlayer = computed(() => {
  const activeTeam = state.teamArray.find((team) =>
    team.players.find((player) => player.isActive)
  );

  if (!activeTeam) return null;

  const activePlayer = activeTeam.players.find((player) => player.isActive);
  if (!activePlayer) return null;

  // 确保得分记录结构存在
  if (!activePlayer.scoreHistory) {
    activePlayer.scoreHistory = {
      recentRounds: [],
      currentRound: [],
    };
  }

  // 获取当前回合的三镖得分
  const currentRoundScores =
    state.gameState.roundScores[state.gameState.currentRound]?.[
      activeTeam.team
    ]?.[activePlayer.id] || [];

  // 创建一个新的对象以触发响应性更新
  return {
    ...activePlayer,
    recentRounds: activePlayer.scoreHistory.recentRounds,
    currentRoundScores,
    currentScore: activeTeam.currentScore,
    _updateTrigger: Date.now(), // 添加一个更新触发器
  };
});

// 重新开始游戏
const restart = () => {
  // 重置结算标记
  state.settlementFired = false;
  state.teamArray.forEach((team) => {
    team.currentScore = team.startingScore;
    team.teamRoundNbr = 0;
    team.players.forEach((player) => {
      // 清空玩家的得分记录
      if (player.scoreHistory) {
        player.scoreHistory.recentRounds = [];
        player.scoreHistory.currentRound = [];
      }
      // 重置MPR统计
      if (player.mprStats) {
        player.mprStats.totalMultiplier = 0;
        player.mprStats.totalRounds = 0;
        player.mprStats.currentRoundExpected = [0, 0, 0];
        player.mprStats.completedRounds = [];
      }
      // 重置本场 AVE 统计（与01模式一致的数据结构）
      if (!state.gameState.averageScores) {
        state.gameState.averageScores = {};
      }
      state.gameState.averageScores[player.id] = {
        average: 0,
        scoreAverage: 0, // 在米老鼠中用于存储总倍数
        currentDartAverage: 0,
        currentRound: 0,
      };
    });
  });

  // 重置游戏状态
  state.gameState.currentRound = 1;
  state.gameState.currentDart = 0;
  state.gameState.roundScores = {
    1: {},
  };
  // 🔥 重置2v2换手计数器
  state.gameState.turnCounter = 0;

  // 重置第一个玩家为活动状态
  state.teamArray.forEach((team) => {
    team.players.forEach((player) => {
      // 重置团队锁定状态
      // 🔧 修复：混合模式下忽略 mickeyMouseBackupScores，确保每一局从全关区开始
      const useBackupRestart = !(state.params?.gameType === 8);
      const mmr = useBackupRestart ? (team?.mickeyMouseBackupScores || {}) : {};
      state.teamLocks[team.team] = {
        averageColor: player.averageColor,
        15: { locked: mmr?.[15] !== 3, count: mmr?.[15] || 0 },
        16: { locked: mmr?.[16] !== 3, count: mmr?.[16] || 0 },
        17: { locked: mmr?.[17] !== 3, count: mmr?.[17] || 0 },
        18: { locked: mmr?.[18] !== 3, count: mmr?.[18] || 0 },
        19: { locked: mmr?.[19] !== 3, count: mmr?.[19] || 0 },
        20: { locked: mmr?.[20] !== 3, count: mmr?.[20] || 0 },
        21: { locked: mmr?.["B"] !== 3, count: mmr?.["B"] || 0 },
      };
      player.isActive = false;
    });
  });
  state.teamArray[0].players[0].isActive = true;
  state.gameState.currentTeam = state.teamArray[0].team;
  state.gameState.currentPlayerIndex = 0;
  // 重置团队锁定状态
  // state.teamLocks = {};
  // 重置作废区域
  state.gameState.forbiddenAreas = [];

  init();

  gameCommon.handleGameStart(
    modeName.value,
    state.gameState.currentRound,
    state.teamArray[0].players[0].playerName,
    playerContentRef
  );

  // 🔧 修复：重新开始游戏时也检查AI
  setTimeout(() => {
    checkAndTriggerAIOnStart();
  }, 3000);
};

// 添加更新分数的方法
const updateTeamScore = ({ teamId, newScore }) => {
  const team = state.teamArray.find((t) => t.team === teamId);
  if (team && newScore >= 1) {
    team.currentScore = newScore;
  }
};

// 添加计算方法
const calculateGameResult = (players) => {
  // 深拷贝防止影响原数据
  const sortedPlayers = JSON.parse(JSON.stringify(players));

  // 计算每个队伍打开的分区数量（15~20 和 牛眼，count>=3 或 locked===false 视为已开）
  const openedCountOf = (team) => {
    try {
      const locks = state.teamLocks?.[team.team] || {};
      const areas = [15,16,17,18,19,20,21];
      let opened = 0;
      areas.forEach(k => {
        const info = locks[k];
        if (info && (info.locked === false || Number(info.count) >= 3)) opened++;
      });
      return opened;
    } catch (e) {
      return 0;
    }
  };

  // 按照规则排序：
  // 1) 分数高的排前；
  // 2) 分数相同时，已开的分区数量多者在前；
  // 3) 若仍相同，多人队伍排在前
  return sortedPlayers.sort((a, b) => {
    if (a.currentScore !== b.currentScore) {
      return b.currentScore - a.currentScore; // 高分在前
    }
    const openA = openedCountOf(a);
    const openB = openedCountOf(b);
    if (openA !== openB) {
      return openB - openA; // 已开分区多者在前
    }
    // 兜底：按队伍人数
    return b.players.length - a.players.length;
  });
};

// 检查游戏开始时是否需要触发AI
const checkAndTriggerAIOnStart = () => {
  // 检查是否AI对战模式且当前是AI队伍
  if (
    state.params?.type === 10 &&
    state.gameState.currentTeam === 2 &&
    bluetooth().isGameStart
  ) {
    automaticBid();
  } else {
    console.log("🤖 [Mickey AI调试] 游戏开始时不需要触发AI");
  }
};

// 🔥 米老鼠模式专用AI目标选择函数（严格按后台配置概率引擎执行）
const getMickeyMouseAITarget = (aiDifficulty) => {
  // 记录调试信息，确认后台下发参数是否齐全
  console.log("🤖 [Mickey AI Debug] 后台难度对象:", JSON.stringify(aiDifficulty));

  // 规范化并限幅参数（不写死命中率，完全使用后台配置）
  const options = {
    // 是否允许空镖：命中前置判定。后端约定 airTarget: 0=允许空镖，1=不允许空镖（与 hitAlgorithm.js 一致）
    airTarget: Number(aiDifficulty?.airTarget ?? 0),
    // 命中率：0~100，空镖概率 = 100%-命中率（当允许空镖时生效）
    hittingAccuracy: Math.max(0, Math.min(100, Number(aiDifficulty?.hittingAccuracy ?? 50))),
    // 分区难度：1=简单, 2=中等, 3=困难, 4=地狱（映射到 lowOrhighConfig）
    partitionDiff: Number(aiDifficulty?.partitionDiff ?? 2),
    // 倍区难度：1=简单, 2=中等, 3=困难（映射到 multipleConfig/centerConfig）
    multiple: Number(aiDifficulty?.multiple ?? 2),
  };

  try {
    // 🔧 使用米老鼠专用算法，只命中15-20分区和牛眼
    const key = getMickeyMouseHit(options); // 可能返回 0（空镖）或有效键（'50'、'51'、'52'等）
    console.log("🤖 [Mickey AI Debug] 米老鼠专用引擎返回:", key);
    return key;
  } catch (e) {
    console.error("🤖 [Mickey AI Error] getMickeyMouseHit 执行失败，使用兔底T20:", e);
    return "50"; // 兔底返回 T20
  }
};

// Ai自动投标方法
const automaticBid = () => {
  let number = 3; //3次投标
  state.aiAutomaticBid = true;
  const activeTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );
  const selectAiDifficulty = state.params.selectAiDifficulty;
  let throwCount = 0;

  const throwDart = () => {
    // 检查AI是否被暂停或游戏是否结束
    if (
      !state.aiAutomaticBid ||
      !bluetooth().isGameStart ||
      throwCount >= number
    ) {
      state.aiAutomaticBid = false;

      // 🔧 无论游戏是否结束，都自动换手进入结算流程
      if (throwCount >= number) {
        setTimeout(() => {
          // 允许AI在自身回合结束时触发一次换手
          aiHandingOver.value = true;
          moveToNextPlayer();
          setTimeout(() => { aiHandingOver.value = false; }, 0);
        }, 1000);
      } else if (!bluetooth().isGameStart) {
        console.log("🤖 [AI投镖] 游戏结束，1秒后自动换手进入结算");
        setTimeout(() => {
          aiHandingOver.value = true;
          moveToNextPlayer();
          setTimeout(() => { aiHandingOver.value = false; }, 0);
        }, 1000);
      }
      return;
    }

    // 米老鼠模式：始终按有效区域策略投掷（不使用01游戏的一镖清零逻辑）
    console.log(
      "🤖 [Mickey AI] 调用AI目标选择，难度参数:",
      selectAiDifficulty
    );
    const mickeyMouseTarget = getMickeyMouseAITarget(selectAiDifficulty);
    console.log("🤖 [Mickey AI] AI选择结果:", mickeyMouseTarget);

    if (mickeyMouseTarget === 0) {
      // 0 = 空镖
      console.log("🤖 [Mickey AI] AI投空镖");
      handleScore(0, getGameConfig(0));
    } else {
      console.log("🤖 [Mickey AI] AI投掷区域:", mickeyMouseTarget);
      blurScore(mickeyMouseTarget);
    }

    throwCount++;
    // 安排下一次投掷，但要检查AI是否仍在运行
    setTimeout(() => {
      // 🔧 额外检查：如果游戏已经结束，停止AI并自动换手
      if (!bluetooth().isGameStart) {
        console.log("🤖 [AI安全检查] 游戏已结束，停止AI投镖并自动换手");
        state.aiAutomaticBid = false;
        // 🔧 自动触发换手，进入结算流程
        setTimeout(() => {
          aiHandingOver.value = true;
          moveToNextPlayer();
          setTimeout(() => { aiHandingOver.value = false; }, 0);
        }, 1000);
        return;
      }

      if (state.aiAutomaticBid) {
        console.log("🤖 [AI继续] 准备投下一镖，当前投镖数:", throwCount);
        throwDart();
      } else {
        console.log("🤖 [AI停止] AI已被停止，不再投镖");
      }
    }, 3000);
  };

  // 开始第一次投掷
  throwDart();
};

//请求接口
const postStatistics = async (postData) => {
  try {
    // 验证数据完整性，避免传递无效数据导致后端报错
    if (
      !postData.playerId ||
      postData.total === undefined ||
      postData.total === null ||
      postData.score === undefined ||
      postData.score === null ||
      postData.gameRound === undefined ||
      postData.gameRound === null
    ) {
      console.log("数据不完整，跳过统计接口调用:", postData);
      return;
    }

    // 确保数值类型正确，并验证数值范围
    const validatedData = {
      playerId: postData.playerId,
      total: Math.max(0, Number(postData.total) || 0),
      score: Math.max(0, Number(postData.score) || 0),
      gameRound: Math.max(0, Number(postData.gameRound) || 0),
      emptyDart: Math.max(0, Number(postData.emptyDart) || 0),
    };

    // 添加额外的数据合理性检查
    if (
      validatedData.total > 1000 ||
      validatedData.score > 10000 ||
      validatedData.gameRound > 100
    ) {
      console.log("数据异常，跳过统计接口调用:", validatedData);
      return;
    }

    console.log("发送统计数据:", validatedData);
    // 调用接口时禁用自动错误提示，避免显示"系统异常"
    const result = await playerInfo.Api.updatePlayer(validatedData, false);
    console.log("统计接口调用成功:", result);
  } catch (error) {
    console.error("统计接口调用失败:", error);
    // 不显示错误提示，避免影响用户体验
  }
};

// 游戏结束后上报数据到接口做统计 比如PPR ,PPD的统计 本地游戏不做统计，线上做统计 playerId = 玩家id
const gameEndPostStatistics = () => {
  // 检查是否有来自useGameCommon的混合模式结束标志
  if (state.mixedModeEnd !== undefined) {
    modeEnd.value = state.mixedModeEnd;
    // 清除标志
    delete state.mixedModeEnd;
  }

  state.teamArray.forEach((item, index) => {
    item.players.forEach((player, i) => {
      if (player.playerId && state.gameState.averageScores[player.id]) {
        const averageData = state.gameState.averageScores[player.id];
        const postData = {
          playerId: player.playerId, //玩家id
          total: averageData.currentDartAverage || 0, //当场游戏总镖数
          score: averageData.scoreAverage || 0, //当场游戏总获得分数
          gameRound: state.gameState.currentRound || 0, //当场游戏总回合数
          emptyDart: 0, //当前场次空镖次数
        };
        postStatistics(postData);
      }
    });
  });
};

// 🔥 米老鼠模式2v2专用换手逻辑
const handleMickey2v2MoveToNextPlayer = () => {
  console.log("🔄 [Mickey2v2换手] 开始处理2v2换手逻辑");

  // 获取当前活动团队
  const activeTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );
  if (!activeTeam) return;

  // 获取当前玩家
  const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];
  if (!activePlayer) return;

  console.log(
    "🔄 [Mickey2v2换手] 当前状态 - 队伍:",
    activeTeam.team,
    "玩家:",
    activePlayer.playerName,
    "镖数:",
    state.gameState.currentDart
  );

  // 🔥 修复：补充缺失的镖数到统计中（使用期望值方式避免重复计算）
  if (state.gameState.averageScores[activePlayer.id]) {
    const expectedTotalDarts = state.gameState.currentRound * 3;
    const currentTotalDarts =
      state.gameState.averageScores[activePlayer.id].currentDartAverage;
    console.log(
      `🎯 [米老鼠AVE修复] 玩家${activePlayer.playerName}换手，当前镖数:${state.gameState.currentDart}，当前总镖数:${currentTotalDarts}，期望总镖数:${expectedTotalDarts}`
    );

    if (currentTotalDarts < expectedTotalDarts) {
      state.gameState.averageScores[activePlayer.id].currentDartAverage =
        expectedTotalDarts;
      console.log(
        `🎯 [米老鼠AVE修复] 玩家${activePlayer.playerName}镖数补充到期望值:${expectedTotalDarts}`
      );
    } else {
      console.log(
        `🎯 [米老鼠AVE修复] 玩家${activePlayer.playerName}镖数已足够，无需补充`
      );
    }
    // 不更新总倍数，因为空镖不产生倍数
  }

  // 🔥 修复：无论投了几镖，换手都算完成一轮
  activeTeam.teamRoundNbr++;
  console.log(
    "🔄 [Mickey2v2换手] 队伍",
    activeTeam.team,
    "完成一轮(投了",
    state.gameState.currentDart,
    "镖)，轮数+1，现在为:",
    activeTeam.teamRoundNbr
  );

  // 🔥 修复：确保为当前玩家创建正确的回合记录（与01游戏保持一致）
  // 初始化当前玩家的 roundScore
  gameCommon.initializeRoundScore(
    state,
    state.gameState.currentRound,
    activeTeam,
    activePlayer
  );

  // 创建回合记录
  const currentRoundScores =
    state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][
      activePlayer.id
    ];
  const roundTotal = currentRoundScores.reduce(
    (sum, item) => sum + item.score,
    0
  );

  const roundRecord = {
    roundNumber: state.gameState.currentRound,
    scores: [...currentRoundScores],
    total: roundTotal,
    exceedFlay: false,
  };

  // 确保scoreHistory结构存在
  if (!activePlayer.scoreHistory) {
    activePlayer.scoreHistory = {
      recentRounds: [],
      currentRound: [],
    };
  }

  // 更新或添加回合记录
  const existingRecordIndex = activePlayer.scoreHistory.recentRounds.findIndex(
    (record) => record.roundNumber === state.gameState.currentRound
  );
  if (existingRecordIndex !== -1) {
    activePlayer.scoreHistory.recentRounds[existingRecordIndex] = roundRecord;
  } else {
    activePlayer.scoreHistory.recentRounds.push(roundRecord);
  }

  console.log(
    `🔄 [Mickey2v2换手] 为玩家${activePlayer.playerName}创建回合${state.gameState.currentRound}记录，总分:${roundTotal}`
  );

  // 🔥 使用全局换手计数器，不依赖teamRoundNbr
  if (!state.gameState.turnCounter) {
    state.gameState.turnCounter = 0;
  }
  state.gameState.turnCounter++;

  // 动态计算队伍数量和每队玩家数
  const totalTeams = state.teamArray.length;
  const playersPerTeam = 2;

  // 🔥 检查是否所有队伍都完成了当前回合（基于换手计数器）
  // 在2v2模式中，每个回合需要 totalTeams * playersPerTeam 次换手
  const totalTurnsPerRound = totalTeams * playersPerTeam;
  const allTeamsCompleted =
    state.gameState.turnCounter > 0 &&
    state.gameState.turnCounter % totalTurnsPerRound === 0;

  console.log(
    "🔄 [Mickey2v2换手] 换手计数器:",
    state.gameState.turnCounter,
    "每回合总换手数:",
    totalTurnsPerRound,
    "是否完成回合:",
    allTeamsCompleted
  );

  let nextTeam, nextPlayerIndex;

  if (allTeamsCompleted) {
    // 所有队伍都完成了当前回合
    console.log(
      "🔄 [Mickey2v2换手] 所有队伍完成当前回合，当前回合:",
      state.gameState.currentRound,
      "最大回合:",
      state.gameState.maxRounds
    );

    // 🔥 检查是否已经是最后一轮，如果是则结束游戏
    if (state.gameState.currentRound >= state.gameState.maxRounds) {
      console.log("🔄 [Mickey2v2换手] 已达到最大回合数，游戏结束");

      // 🔧 修复：米老鼠游戏胜负判断（分数→开区数→邀请方）
      let winningTeam = state.teamArray[0];
      let maxScore = winningTeam.currentScore || 0;

      // 1. 找出分数最高的队伍
      state.teamArray.forEach((team) => {
        if ((team.currentScore || 0) > maxScore) {
          maxScore = team.currentScore;
          winningTeam = team;
        }
      });

      // 2. 找出所有并列最高分的队伍
      const topTeams = state.teamArray.filter(team => (team.currentScore || 0) === maxScore);

      // 3. 如果有多个队伍并列，按开区数量判断
      if (topTeams.length > 1) {
        const countOpened = (team) => {
          const locks = state.teamLocks[team.team] || {};
          // 🔧 修复：只统计真正的分区（15-21），排除averageColor等非区域属性
          const validAreas = [15, 16, 17, 18, 19, 20, 21];
          return validAreas.filter(areaNum => {
            const area = locks[areaNum];
            return area && typeof area === 'object' && area.locked === false;
          }).length;
        };

        let bestTeams = [];
        let maxOpened = -1;
        topTeams.forEach(team => {
          const opened = countOpened(team);
          console.log(`[米老鼠2v2结算] 队伍${team.team} 开区数: ${opened}`);
          if (opened > maxOpened) {
            maxOpened = opened;
            bestTeams = [team];
          } else if (opened === maxOpened) {
            bestTeams.push(team);
          }
        });

        // 4. 如果开区数也相同，按邀请方胜出
        if (bestTeams.length === 1) {
          winningTeam = bestTeams[0];
        } else {
          const initiatorPO = state.params.firstTurnPlayerOnly || state.params.gameSettings?.firstTurnPlayerOnly;
          const initiatorTeam = state.teamArray.find(t => t.players[0]?.playerOnly === initiatorPO);
          if (initiatorTeam && bestTeams.some(t => t.team === initiatorTeam.team)) {
            winningTeam = initiatorTeam;
            console.log(`[米老鼠2v2结算] 开区数相同，邀请方胜出: 队伍${initiatorTeam.team}`);
          } else {
            console.log('⚠️ [米老鼠2v2平分裁决] 未找到发起方队伍或不在并列队伍中，使用默认裁决');
          }
        }
      }

      // 构造胜利者名称
      const playerNames = winningTeam.players
        .map((player) => player.playerName)
        .join("、");

      console.log(
        "🔄 [Mickey2v2换手] 游戏结束，获胜队伍:",
        winningTeam.team,
        "获胜玩家:",
        playerNames,
        "最高分:",
        maxScore
      );

      // 🔧 调试：打印所有队伍的分数和开区数
      console.log("===== 米老鼠2v2结算详情 =====");
      state.teamArray.forEach(team => {
        const locks = state.teamLocks[team.team] || {};
        // 🔧 修复：只统计真正的分区
        const validAreas = [15, 16, 17, 18, 19, 20, 21];
        const openedAreas = validAreas.filter(areaNum => {
          const area = locks[areaNum];
          return area && typeof area === 'object' && area.locked === false;
        }).length;
        console.log(`队伍${team.team}: 分数=${team.currentScore}, 开区数=${openedAreas}, 玩家=${team.players.map(p => p.playerName).join('、')}`);
      });
      console.log(`最终胜利者: 队伍${winningTeam.team}`);
      console.log("=============================");

      // 混合模式：记录胜负与模式完成，并决定是否还有下一局
      if (state.params?.gameType === 8) {
        // 🔧 修复：记录本局胜利者信息，供 mixedModeGameEnd 使用
        state.params.currentGameWinner = {
          team: winningTeam.team,
          playerName: winningTeam.players[0].playerName,
        };
        console.log(
          `[米老鼠2v2混合模式] 记录本局胜利者信息: 队伍${winningTeam.team}(${winningTeam.players[0].playerName})`
        );
        
        // 累计胜场
        console.log(`[米老鼠2v2混合] 胜利者队伍${winningTeam.team} 当前win值: ${winningTeam.players[0].win}`);
        
        if (winningTeam.players[0].win === null || winningTeam.players[0].win === undefined) {
          winningTeam.players[0].win = 1;
          console.log(`[米老鼠2v2混合] 队伍${winningTeam.team} 首次胜利，设置win=1`);
        } else {
          winningTeam.players[0].win++;
          console.log(`[米老鼠2v2混合] 队伍${winningTeam.team} 增加胜场，win=${winningTeam.players[0].win}`);
        }
        // tameWin 记录
        if (!state.params.tameWin) {
          state.params.tameWin = { teamIdWin: [], teamIdfail: [] };
        }
        
        // 🔧 调试：记录前打印状态
        console.log(`[米老鼠2v2混合] 记录前 tameWin.teamIdWin: [${state.params.tameWin.teamIdWin.join(', ')}]`);
        console.log(`[米老鼠2v2混合] 将要添加的胜利者: 队伍${winningTeam.team}`);
        
        state.params.tameWin.teamIdWin.push(winningTeam.team);
        state.teamArray.forEach(t => { if (t.team !== winningTeam.team) state.params.tameWin.teamIdfail.push(t.team); });
        
        // 🔧 调试：记录后打印状态
        console.log(`[米老鼠2v2混合] 记录后 tameWin.teamIdWin: [${state.params.tameWin.teamIdWin.join(', ')}]`);
        // 🔧 修复：标记当前模式完成（使用唯一ID）
        const currentGameId = state.modeEntity.id;
        const currentStartingScore = state.modeEntity.startingScore;
        if (Array.isArray(state.params.modes)) {
          console.log(`[米老鼠2v2混合模式] 开始标记当前游戏为已完成`);
          console.log(`[米老鼠2v2混合模式] 当前游戏ID: ${currentGameId}`);
          
          let foundAndMarked = false;
          state.params.modes.forEach((item, index) => {
            console.log(`[米老鼠2v2混合模式] 检查模式${index}: ID=${item.id}, status=${item.status}`);
            
            // 使用ID来精确匹配当前游戏
            if (item.id === currentGameId && !item.status) {
              item.status = true;
              foundAndMarked = true;
              console.log(`[米老鼠2v2混合模式] ✅ 标记模式${index}为已完成`);
            }
          });
          
          if (!foundAndMarked) {
            console.error(`[米老鼠2v2混合模式] ⚠️ 未找到匹配的模式！`);
          }
        }
        // 计算是否还有下一局
        let isLast = false;
        const winNumber = winningTeam.players[0].win;
        const bureau = Math.floor(state.params.modes.length / 2 + 1);
        if (winNumber >= bureau) {
          isLast = true;
        } else {
          let hasUnfinishedGames = false;
          (state.params.modes || []).forEach(item => { if (!item.status) hasUnfinishedGames = true; });
          isLast = !hasUnfinishedGames;
        }
        state.mixedModeEnd = isLast;
      }

      // 覆盖层动画后再结算
      state.settlementFired = true;
      endWithFinishAnimation('rounds', playerNames);
      return;
    }

    // 进入下一回合
    console.log("🔄 [Mickey2v2换手] 进入下一回合");

    // 注释掉重复的MPR统计保存，因为回合变化监听器会自动处理
    // state.teamArray.forEach((team) => {
    //   team.players.forEach((player) => {
    //     if (player.mprStats) {
    //       finishCurrentRound(player);
    //       console.log(
    //         `🎯 [MPR统计] 为玩家${player.playerName}保存回合${state.gameState.currentRound}的MPR数据`
    //       );
    //     }
    //   });
    // });

    state.gameState.currentRound++;
    state.gameState.roundScores[state.gameState.currentRound] = {};

    // 注释掉自动更新totalRounds的逻辑，应该只在玩家投第1镖时更新
    // state.teamArray.forEach((team) => {
    //   team.players.forEach((player) => {
    //     if (player.mprStats) {
    //       player.mprStats.totalRounds = state.gameState.currentRound;
    //       console.log(`🎯 [MPR修复] 为玩家${player.playerName}更新totalRounds为:${state.gameState.currentRound}`);
    //     }
    //   });
    // });

    // 重置换手计数器，并重置各队本回合轮次计数，防止下一回合被误判已完成
    state.gameState.turnCounter = 0;
    state.teamArray.forEach(item => item.teamRoundNbr = 0);

    // 从第一个队伍的第一个玩家开始新回合
    nextTeam = state.teamArray[0];
    nextPlayerIndex = 0;

    // 🔥 修复：显示回合动画而不是换手动画
    let roundType = "";
    if (state.gameState.currentRound === state.gameState.maxRounds) {
      roundType = "Final Round";
    }

    // 重置当前玩家状态
    state.teamArray.forEach((team) => {
      team.players.forEach((player) => {
        player.isActive = false;
      });
    });

    // 设置新回合的第一个玩家
    state.gameState.currentTeam = nextTeam.team;
    state.gameState.currentPlayerIndex = nextPlayerIndex;
    state.gameState.currentDart = 0;
    nextTeam.players[nextPlayerIndex].isActive = true;

    // 播放回合音效和动画
    useAudioPlayer().playAudio("/static/mp3/round1.mp3");
    gameCommon.handleNextRound(state.gameState.currentRound, roundType);

    console.log(
      "🔄 [Mickey2v2换手] 显示回合动画，当前回合:",
      state.gameState.currentRound,
      "当前玩家:",
      nextTeam.players[nextPlayerIndex].playerName
    );
    return; // 直接返回，不执行后续的换手动画
  } else {
    // 🔥 使用换手计数器计算下一个玩家
    // 期望顺序：队伍1A → 队伍2A → 队伍3A → ... → 队伍1B → 队伍2B → 队伍3B → ...
    const currentPositionInSequence =
      state.gameState.turnCounter % (totalTeams * playersPerTeam);

    // 计算应该是哪个队伍和哪个玩家
    const targetTeamIndex = currentPositionInSequence % totalTeams;
    const targetPlayerIndex = Math.floor(
      currentPositionInSequence / totalTeams
    );

    nextTeam = state.teamArray[targetTeamIndex];
    nextPlayerIndex = targetPlayerIndex;

    console.log(
      "🔄 [Mickey2v2换手] 换手计数器:",
      state.gameState.turnCounter,
      "序列位置:",
      currentPositionInSequence
    );
    console.log(
      "🔄 [Mickey2v2换手] 计算结果 - targetTeamIndex:",
      targetTeamIndex,
      "targetPlayerIndex:",
      targetPlayerIndex
    );
  }

  console.log(
    "🔄 [Mickey2v2换手] 队伍结构:",
    state.teamArray.map(
      (t) => `队伍${t.team}:${t.players.map((p) => p.playerName).join(",")}`
    )
  );
  console.log(
    "🔄 [Mickey2v2换手] 目标队伍:",
    nextTeam?.team,
    "目标玩家:",
    nextTeam?.players[nextPlayerIndex]?.playerName
  );

  // 验证计算结果的合理性
  if (!nextTeam || !nextTeam.players[nextPlayerIndex]) {
    console.error("🔄 [Mickey2v2换手] 计算错误，回退到通用逻辑");
    gameCommon.moveToNextPlayer(state, playerContentRef);
    return;
  }

  // 重置当前玩家状态
  state.teamArray.forEach((team) => {
    team.players.forEach((player) => {
      player.isActive = false;
    });
  });

  // 设置新的活动玩家
  state.gameState.currentTeam = nextTeam.team;
  state.gameState.currentPlayerIndex = nextPlayerIndex;
  state.gameState.currentDart = 0;
  nextTeam.players[nextPlayerIndex].isActive = true;

  // 播放换手动画和音效
  useAudioPlayer().playAudio("/static/mp3/nextPalyer.mp3");
  if (playerContentRef && playerContentRef.value) {
    playerContentRef.value.playVideo(
      "/static/gif/NEXT-PALYER-2S.gif",
      true,
      () => {}
    );
  }

  console.log(
    "🔄 [Mickey2v2换手] 换手完成，当前玩家:",
    nextTeam.players[nextPlayerIndex].playerName
  );
};

//换手
const moveToNextPlayer = () => {
  // 防止重复调用
  if (isProcessingHandChange.value) {
    return;
  }

  // 🤖 AI对战模式：AI投镖过程中或AI回合禁止手动换手（包括UI跳过）
  // 但允许AI触发的自动换手（aiHandingOver=true）
  if (state.params?.type === 10 && (state.aiAutomaticBid || isAiTurn.value) && !aiHandingOver.value) {
    console.log("🤖 [Mickey AI保护] AI回合中，禁止手动换手");
    return;
  }

  if (
    state.gameSettings.type &&
    state.gameSettings.type === 11 &&
    userInfo.playerOnly !== getCurrentId()
  ) {
    return;
  }

  // 保存当前玩家信息，用于MPR处理
  const currentTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );
  const currentPlayer =
    currentTeam?.players[state.gameState.currentPlayerIndex];

  // 如果当前镖数小于3，说明是换手跳过，需要处理剩余镖数
  if (state.gameState.currentDart < 3 && currentPlayer) {
    handleSkipRemainingDarts(currentPlayer);
    finishCurrentRound(currentPlayer);
    console.log(`🎯 [MPR统计] 玩家${currentPlayer.playerName}提前换手/跳过，本回合计入0，已完成回合数=${currentPlayer.mprStats.completedRounds.length}`);
  }

  // 强制重置镖数状态，防止累积
  state.gameState.currentDart = 0;

  isProcessingHandChange.value = true;

  try {
    //对战模式给对手发送换手消息
    let rivalId = getRivalId();
    if (
      state.gameSettings.type &&
      state.gameSettings.type === 11 &&
      userInfo.playerOnly === getCurrentId()
    ) {
      //发送换手消息
      let msg = {
        msgType: "changeHands",
      };
      var messageTextObj = {
        type: 1,
        message: JSON.stringify(msg),
        extendedData: { msgType: "changeHands" },
      };
      $stores("zegoStore").sendMessage(rivalId, messageTextObj);
    }

    // 保存当前状态
    const currentTeam = state.teamArray.find(
      (t) => t.team === state.gameState.currentTeam
    );
    const currentScore = currentTeam?.currentScore;

    // 🔥 检查是否是2v2模式，使用专门的换手逻辑
    console.log(
      "🔄 [Mickey换手] teamSize:",
      state.gameState.teamSize,
      "teamArray.length:",
      state.teamArray.length
    );
    if (state.gameState.teamSize === 2) {
      console.log("🔄 [Mickey换手] 使用2v2专用逻辑");
      // 2v2专用换手逻辑
      handleMickey2v2MoveToNextPlayer();
    } else {
      console.log("🔄 [Mickey换手] 使用通用逻辑");

      // 🔥 修复：在调用通用换手逻辑之前，先处理当前玩家的MPR统计和镖数补充
      const currentPlayer =
        currentTeam?.players[state.gameState.currentPlayerIndex];
if (currentPlayer && state.gameState.currentDart < 3) {
if (state.gameState.averageScores[currentPlayer.id]) {
const expectedTotalDarts = state.gameState.currentRound * 3;
const currentTotalDarts =
state.gameState.averageScores[currentPlayer.id].currentDartAverage;
if (currentTotalDarts < expectedTotalDarts) {
state.gameState.averageScores[currentPlayer.id].currentDartAverage =
expectedTotalDarts;
console.log(
`🎯 [米老鼠AVE修复] 玩家${currentPlayer.playerName}镖数补充到期望值:${expectedTotalDarts}`
);
      // if (currentPlayer) {
      //   // 如果当前镖数小于3，处理剩余镖数和统计补充
      //   if (state.gameState.currentDart < 3) {
      //     const missingDarts = 3 - state.gameState.currentDart;

      //     // 处理MPR统计中的剩余镖数
      //     handleSkipRemainingDarts(currentPlayer);
      //     console.log(
      //       `🎯 [MPR统计] 玩家${currentPlayer.playerName}提前换手，处理剩余镖数`
      //     );

      //     // 补充缺失的镖数到总镖数统计中（使用期望值方式，与通用逻辑保持一致）
      //     if (state.gameState.averageScores[currentPlayer.id]) {
      //       const expectedTotalDarts = state.gameState.currentRound * 3;
      //       const currentTotalDarts =
      //         state.gameState.averageScores[currentPlayer.id]
      //           .currentDartAverage;
      //       if (currentTotalDarts < expectedTotalDarts) {
      //         state.gameState.averageScores[
      //           currentPlayer.id
      //         ].currentDartAverage = expectedTotalDarts;
      //         console.log(
      //           `🎯 [米老鼠AVE修复] 玩家${currentPlayer.playerName}镖数补充到期望值:${expectedTotalDarts}`
      //         );
      //       }
            // 不更新总倍数，因为空镖不产生倍数
          }
        }
      }

      // 调用通用换手逻辑（但不使用其镖数补充功能，因为我们已经在上面处理了）
      gameCommon.moveToNextPlayer(state, playerContentRef);
    }

    // 强制更新状态
    nextTick(() => {
      // 获取新的活动玩家和团队
      const nextTeam = state.teamArray.find(
        (t) => t.team === state.gameState.currentTeam
      );
      const nextPlayer = nextTeam?.players[state.gameState.currentPlayerIndex];

      if (nextPlayer) {
        // 强制更新玩家状态
        nextPlayer.isActive = true;
        // 强制更新团队分数
        nextTeam.currentScore = nextTeam.currentScore;
        // 触发视图更新
        state.gameState._updateTrigger = Date.now();
      }
    });
  } finally {
    // 清理之前的定时器
    if (handChangeProcessingTimer) {
      clearTimeout(handChangeProcessingTimer);
    }
    // 延迟重置标志
    handChangeProcessingTimer = setTimeout(() => {
      isProcessingHandChange.value = false;
      handChangeProcessingTimer = null;
    }, 1000);
  }
};

//重投
const rethrow = () => {
  // AI 对战：AI 回合或 AI 正在投镖时，禁止重投
  if (state.params?.type === 10 && (isAiTurn.value || state.aiAutomaticBid)) {
    showToast({ message: locale.value === 'zh' ? 'AI回合中，禁止重投' : 'Cannot rethrow during AI turn', icon: 'none' });
    return;
  }
  //如果是线上模式，不是自己的回合禁止重投
  if (
    state.gameSettings.type &&
    state.gameSettings.type === 11 &&
    userInfo.playerOnly !== getCurrentId()
  ) {
    return;
  }
  //
  //对战模式给对手发送换手消息
  let rivalId = getRivalId();
  if (
    state.gameSettings.type &&
    state.gameSettings.type === 11 &&
    userInfo.playerOnly === getCurrentId()
  ) {
    //发送重投消息
    let msg = {
      msgType: "rethrow",
    };
    var messageTextObj = {
      type: 1,
      message: JSON.stringify(msg),
      extendedData: { msgType: "rethrow" },
    };
    $stores("zegoStore").sendMessage(rivalId, messageTextObj);
  }
  // 检查回合状态
  if (state.gameState.currentDart === 0) {
      showToast({
          message: `${locale.value === "zh" ? "当前回合还未开始 " : "You have not started the round"  } `,
          icon: 'none',
      });
      return;
  }
  gameCommon.deductionRethrowCurrentRound(state);
};

//重新开始
const restartGame = () => {
  // 线上混合模式：点击“下一局”跳回混合页，等待双方就绪，不在本页直接开局
  if (state.gameSettings.type && state.gameSettings.type === 11) {
    if (state.params?.gameType === 8) {
      try {
        sheep.$router.go('/pages/game/mixed/minedIndex', state.params, 'reLaunch');
        console.log('[Mickey-线上混合] 返回混合页，等待双方就绪');
      } catch (e) { console.warn('[Mickey-线上混合] 返回混合页失败', e); }
    }
    return;
  }
  // AI 对战：先停止AI与相关状态，防止重启后AI残留继续运行
  if (state.params?.type === 10) {
    state.aiAutomaticBid = false; // 立即停止AI循环
    isProcessingDart.value = false;
    isProcessingHandChange.value = false;
    aiHandingOver.value = false;
    try {
      if (dartProcessingTimer) { clearTimeout(dartProcessingTimer); dartProcessingTimer = null; }
      if (handChangeProcessingTimer) { clearTimeout(handChangeProcessingTimer); handChangeProcessingTimer = null; }
    } catch (e) {}
  }

  gameCommon.restartGame(restart);
};

//结束游戏
const endGame = () => {
  // 标记为强制结束，结算页隐藏“下一局”
  state.forceEndGame = true;
  if (!state.params) state.params = {};
  state.params.forceEndGame = true;
  closeVideo();
  cleanupGameStorage();
  //对战模式给对手发送结束消息
  let rivalId = getRivalId();
  if (state.gameSettings.type && state.gameSettings.type === 11) {
    //发送结束游戏消息
    let msg = {
      msgType: "endGame",
    };
    var messageTextObj = {
      type: 1,
      message: JSON.stringify(msg),
      extendedData: { msgType: "endGame" },
    };
    $stores("zegoStore").sendMessage(rivalId, messageTextObj);
    //
    gameCommon.handleGameEnd("endGame", null, playerContentRef);
    return;
  }

  gameCommon.endGame("/pages/game/home/index");
};

const showRules = () => {
  getDomMessage(8);
};

const getDomMessage = async (id) => {
  await agreement.Api.findById(id).then((res) => {
    showToast({
      title: res.title,
      message: res.content,
      isSticky: true,
    });
  });
};

//返回大厅
const returnSala = () => {
  closeVideo();
  cleanupGameStorage();
  gameCommon.endGame("/pages/game/online/index");
};

const closeVideo = () => {
  // 立即发送停止事件，不等待
  console.log("🔧 [closeVideo-米奇] 立即发送停止事件");
  uni.$emit("stopLocalVideo");
  uni.$emit("stopRemoteVideo");

  // #ifdef APP-PLUS
  if (localVideo && typeof localVideo.hide === "function") {
    localVideo.hide();
  }
  if (remoteVideo && typeof remoteVideo.hide === "function") {
    remoteVideo.hide();
  }
  // #endif
};

// 清理游戏相关存储
const cleanupGameStorage = () => {
  // 🔧 游戏结束时更新邀请状态为已完成
  const currentInvitationId = uni.getStorageSync("currentInvitationId");
  if (currentInvitationId && state.gameSettings.type === 11) {
    // 对战模式下，将邀请状态更新为已完成 (state: 4)
    gameInvitation.Api.update({ id: currentInvitationId, state: 4 })
      .then(() => {
        console.log(
          "📝 [gameEnd] 邀请状态已更新为已完成:",
          currentInvitationId
        );
      })
      .catch((err) => {
        console.error("📝 [gameEnd] 更新邀请状态失败:", err);
      });

    // 清理邀请ID
    uni.removeStorageSync("currentInvitationId");
  }

  // 🔧 清理游戏结束后的老消息
  const zimStores = zimStore();
  if (zimStores.message) {
    zimStores.message.yaoqing = [];
    zimStores.message.cancel = [];
    zimStores.message.refuse = [];
    zimStores.message.accept = [];
    console.log("📝 [MickeyGameEnd] 已清理所有邀请相关消息");
  }

  uni.removeStorageSync("currentGameSettings");
  uni.removeStorageSync("roomID");
  uni.removeStorageSync("remoteUserId");
};

// 处理视频拖拽移动
const handleVideoMove = (type, data) => {
  console.log(`${type}视频移动:`, data);

  const subNVue = type === "local" ? localVideo : remoteVideo;
  if (!subNVue || typeof subNVue.setStyle !== "function") return;

  // 获取当前窗口状态
  const windowState = videoWindow.windowStates[type];
  if (!windowState.dragMode) return;

  // 获取屏幕尺寸
  const systemInfo = uni.getSystemInfoSync();
  const screenWidth = systemInfo.screenWidth;
  const screenHeight = systemInfo.screenHeight;

  // rpx转px的转换函数
  const rpxToPx = (rpxValue) => {
    if (typeof rpxValue === "string" && rpxValue.includes("rpx")) {
      const rpx = parseInt(rpxValue);
      return Math.round((rpx * screenWidth) / 750); // uni-app的rpx转换公式
    }
    return parseInt(rpxValue) || 0;
  };

  // 获取当前实际位置（处理百分比定位）
  let currentLeft, currentTop;

  // 如果使用right定位，需要转换为left
  if (windowState.position.right && !windowState.position.left) {
    const rightPercent = parseFloat(
      windowState.position.right.replace("%", "")
    );
    const windowWidth = rpxToPx(windowState.size.width) || 200;
    currentLeft =
      screenWidth - (screenWidth * rightPercent) / 100 - windowWidth;
  } else {
    currentLeft = parseInt(windowState.position.left) || 0;
  }

  // 如果使用bottom定位，需要转换为top
  if (windowState.position.bottom && !windowState.position.top) {
    const bottomPercent = parseFloat(
      windowState.position.bottom.replace("%", "")
    );
    const windowHeight = rpxToPx(windowState.size.height) || 300;
    currentTop =
      screenHeight - (screenHeight * bottomPercent) / 100 - windowHeight;
  } else {
    currentTop = parseInt(windowState.position.top) || 0;
  }

  // 计算新位置
  const newLeft = currentLeft + data.deltaX;
  const newTop = currentTop + data.deltaY;

  // 获取窗口尺寸（转换rpx为px）
  const windowWidth = rpxToPx(windowState.size.width) || 200;
  const windowHeight = rpxToPx(windowState.size.height) || 300;

  // 边界检查
  const boundedLeft = Math.max(0, Math.min(newLeft, screenWidth - windowWidth));
  const boundedTop = Math.max(0, Math.min(newTop, screenHeight - windowHeight));

  // 更新位置状态
  windowState.position = {
    left: `${boundedLeft}px`,
    right: "",
    top: `${boundedTop}px`,
    bottom: "",
    transform: "",
  };

  // 应用新样式到subNVue（subNVue需要px单位）
  const newStyle = {
    left: `${boundedLeft}px`,
    top: `${boundedTop}px`,
    width: `${windowWidth}px`,
    height: `${windowHeight}px`,
  };

  // 🔧 通知子组件更新窗口位置信息（修复拖拽后缩放方向问题）
  uni.$emit(`${type}VideoSizeChange`, {
    isOverSize: false, // 拖拽时不改变关闭按钮状态
    windowPosition: {
      left: boundedLeft,
      top: boundedTop,
      width: windowWidth,
      height: windowHeight,
      screenWidth: screenWidth,
      screenHeight: screenHeight,
    },
  });

  try {
    subNVue.setStyle(newStyle);
  } catch (error) {
    console.error(`${type}视频样式应用失败:`, error);
  }
};

// 处理视频缩放 - 高性能版本
const handleVideoScale = (type, data) => {
  const subNVue = type === "local" ? localVideo : remoteVideo;
  if (!subNVue || typeof subNVue.setStyle !== "function") return;

  // 获取当前窗口状态
  const windowState = videoWindow.windowStates[type];
  if (!windowState.scaleMode) return;

  // 设置缩放比例并立即应用新样式到subNVue
  videoWindow.setScale(type, data.scale);
  videoWindow.applyStyleToSubNVue(subNVue, type);
};

// 处理视频非等比缩放 - 强力节流版本
let lastResizeTime = { local: 0, remote: 0 };

const handleVideoResize = (type, data) => {
  // 父页面也添加节流，防止过于频繁的DOM更新
  const currentTime = Date.now();
  if (currentTime - lastResizeTime[type] < 50) {
    // 50ms节流
    return;
  }
  lastResizeTime[type] = currentTime;

  const subNVue = type === "local" ? localVideo : remoteVideo;
  if (!subNVue || typeof subNVue.setStyle !== "function") return;

  // 获取当前窗口状态
  const windowState = videoWindow.windowStates[type];
  if (!windowState.scaleMode) return;

  // 获取屏幕尺寸
  const systemInfo = uni.getSystemInfoSync();
  const screenWidth = systemInfo.screenWidth;
  const screenHeight = systemInfo.screenHeight;

  // rpx转px的转换函数
  const rpxToPx = (rpxValue) => {
    if (typeof rpxValue === "string" && rpxValue.includes("rpx")) {
      const rpx = parseInt(rpxValue);
      return Math.round((rpx * screenWidth) / 750);
    }
    return parseInt(rpxValue) || 0;
  };

  // 获取当前尺寸
  let currentWidth = rpxToPx(windowState.size.width) || 200;
  let currentHeight = rpxToPx(windowState.size.height) || 300;

  // 优化边界控制，提升用户体验
  const minWidth = 80; // 最小宽度稍微减小
  const minHeight = 50; // 最小高度稍微减小
  const maxWidth = Math.min(screenWidth * 0.8, 600); // 最大宽度放宽到80%
  const maxHeight = Math.min(screenHeight * 0.7, 500); // 最大高度放宽到70%

  // 🔧 基于窗口中心点的真正缩放
  // 计算新的尺寸
  let newWidth = currentWidth + data.widthChange;
  let newHeight = currentHeight + data.heightChange;

  // 计算尺寸变化量
  const widthDelta = newWidth - currentWidth;
  const heightDelta = newHeight - currentHeight;

  // 严格的边界检查
  newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
  newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

  // 优化宽高比限制，更符合视频窗口使用习惯
  const aspectRatio = newWidth / newHeight;
  const minAspectRatio = 0.4; // 最小宽高比放宽（允许更高的窗口）
  const maxAspectRatio = 4.0; // 最大宽高比放宽（允许更宽的窗口）

  if (aspectRatio < minAspectRatio) {
    // 太高了，调整高度
    newHeight = newWidth / minAspectRatio;
  } else if (aspectRatio > maxAspectRatio) {
    // 太宽了，调整宽度
    newWidth = newHeight * maxAspectRatio;
  }

  // 再次应用边界检查
  newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
  newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

  // 如果尺寸没有实际变化，不更新
  if (
    Math.abs(newWidth - currentWidth) < 3 &&
    Math.abs(newHeight - currentHeight) < 3
  ) {
    return;
  }

  // 更新窗口状态
  windowState.size = {
    width: `${newWidth}px`,
    height: `${newHeight}px`,
  };

  // 获取当前位置，处理百分比定位
  let currentLeft, currentTop;

  if (windowState.position.right && !windowState.position.left) {
    const rightPercent = parseFloat(
      windowState.position.right.replace("%", "")
    );
    currentLeft =
      screenWidth - (screenWidth * rightPercent) / 100 - currentWidth;
  } else {
    currentLeft = parseInt(windowState.position.left) || 0;
  }

  if (windowState.position.bottom && !windowState.position.top) {
    const bottomPercent = parseFloat(
      windowState.position.bottom.replace("%", "")
    );
    currentTop =
      screenHeight - (screenHeight * bottomPercent) / 100 - currentHeight;
  } else {
    currentTop = parseInt(windowState.position.top) || 0;
  }

  // 🔧 计算中心点缩放的位置补偿
  // 为了保持窗口中心点不变，需要调整窗口位置
  let newLeft = currentLeft;
  let newTop = currentTop;

  // 根据不同的角来调整位置补偿
  if (data.corner === "tl") {
    // 左上角缩放：需要向左上移动窗口来保持中心
    newLeft = currentLeft - widthDelta / 2;
    newTop = currentTop - heightDelta / 2;
  } else if (data.corner === "tr") {
    // 右上角缩放：需要向右上移动窗口来保持中心
    newLeft = currentLeft - widthDelta / 2;
    newTop = currentTop - heightDelta / 2;
  } else if (data.corner === "bl") {
    // 左下角缩放：需要向左下移动窗口来保持中心
    newLeft = currentLeft - widthDelta / 2;
    newTop = currentTop - heightDelta / 2;
  } else if (data.corner === "br") {
    // 右下角缩放：需要向右下移动窗口来保持中心
    newLeft = currentLeft - widthDelta / 2;
    newTop = currentTop - heightDelta / 2;
  }

  // 确保窗口不会超出屏幕边界
  newLeft = Math.max(0, Math.min(screenWidth - newWidth, newLeft));
  newTop = Math.max(0, Math.min(screenHeight - newHeight, newTop));

  // 更新位置状态为px单位
  windowState.position = {
    left: `${newLeft}px`,
    right: "",
    top: `${newTop}px`,
    bottom: "",
    transform: "",
  };

  // 应用新样式到subNVue
  const newStyle = {
    left: `${newLeft}px`,
    top: `${newTop}px`,
    width: `${newWidth}px`,
    height: `${newHeight}px`,
  };

  // 检查是否超过默认大小，显示关闭按钮
  const defaultWidth = 146; // 简化为固定值
  const defaultHeight = 64; // 简化为固定值
  const isOverSize =
    newWidth > defaultWidth + 20 || newHeight > defaultHeight + 20; // 超过默认尺寸20px就显示

  // 通知子组件更新关闭按钮状态和窗口位置信息
  uni.$emit(`${type}VideoSizeChange`, {
    isOverSize,
    windowPosition: {
      left: newLeft,
      top: newTop,
      width: newWidth,
      height: newHeight,
      screenWidth: screenWidth,
      screenHeight: screenHeight,
    },
  });

  try {
    subNVue.setStyle(newStyle);
  } catch (error) {
    console.error(`${type}视频缩放样式应用失败:`, error);
  }
};

// 处理视频重置
const handleVideoReset = (type) => {
  console.log(`重置${type}视频到默认状态`);

  const subNVue = type === "local" ? localVideo : remoteVideo;
  if (!subNVue || typeof subNVue.setStyle !== "function") return;

  // 重置窗口状态到默认值
  videoWindow.resetScale(type);
  videoWindow.resetWindowPosition(type);

  // 获取重置后的状态
  const windowState = videoWindow.windowStates[type];

  // 获取屏幕尺寸，计算默认位置的像素值
  const systemInfo = uni.getSystemInfoSync();
  const screenWidth = systemInfo.screenWidth;
  const screenHeight = systemInfo.screenHeight;

  // 计算默认位置（转换百分比为像素）
  const rightPercent = parseFloat(windowState.position.right.replace("%", ""));
  const bottomPercent = parseFloat(
    windowState.position.bottom.replace("%", "")
  );
  const defaultWidth = 146;
  const defaultHeight = 64;

  const rightPx =
    screenWidth - (screenWidth * rightPercent) / 100 - defaultWidth;
  const bottomPx =
    screenHeight - (screenHeight * bottomPercent) / 100 - defaultHeight;

  // 强制设置像素位置，确保立即生效
  const forceStyle = {
    left: `${rightPx}px`,
    top: `${bottomPx}px`,
    width: `${defaultWidth}px`,
    height: `${defaultHeight}px`,
  };

  try {
    subNVue.setStyle(forceStyle);
  } catch (error) {
    console.error(`${type}视频重置样式应用失败:`, error);
  }

  // 应用默认样式到subNVue
  videoWindow.applyStyleToSubNVue(subNVue, type);

  console.log(`${type}视频已重置到默认状态`);
};
</script>

<template>
  <view class="uni-body container">
    <view
      class="threeSituationDisplay"
      v-if="state.threeSituationDisplay"
      style=""
    >
      <!-- <view class="threeSituationDisplay-image" v-for="(item,index) in state.threeSituation"
                style="display: flex;width: 20%;display: flex;justify-content: center;align-items: center;">
                <image style="height: 90rpx;width: 100rpx;" :src="`/static/images/mls_${item}.png`"></image>
            </view> -->
      <view
        class="threeSituationDisplay-image"
        style="
          display: flex;
          width: 20%;
          display: flex;
          justify-content: center;
          align-items: center;
        "
      >
        <image
          style="height: 90rpx; width: 100rpx"
          :src="`/static/images/mls_${state.threeSituation[0]}.png`"
        ></image>
      </view>
      <view
        class="threeSituationDisplay-image"
        style="
          display: flex;
          width: 20%;
          display: flex;
          justify-content: center;
          align-items: center;
        "
      >
        <image
          style="height: 90rpx; width: 100rpx"
          :src="`/static/images/mls_${state.threeSituation[1]}.png`"
        ></image>
      </view>
      <view
        class="threeSituationDisplay-image"
        style="
          display: flex;
          width: 20%;
          display: flex;
          justify-content: center;
          align-items: center;
        "
      >
        <image
          style="height: 90rpx; width: 100rpx"
          :src="`/static/images/mls_${state.threeSituation[2]}.png`"
        ></image>
      </view>
      <!-- <view style="display: flex;width: 20%;display: flex;justify-content: center;align-items: center;"><image style="height: 100px;width: 100px;" src="/static/images/mlstwo.png"></image></view> -->
      <!-- <view style="display: flex;width: 20%;display: flex;justify-content: center;align-items: center;"><image style="height: 100px;width: 100px;" src="/static/images/mlstwo.png"></image></view> -->
    </view>
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view class="uni-h-full">
        <PlayerContent
          :state="state"
          :modeEnd="modeEnd"
          :isMixModel="state.params.gameType"
          :modes="state.params"
          :calculateResult="calculateGameResult"
          ref="playerContentRef"
          :forbiddenAreas="state.gameState.forbiddenAreas"
          :type="state.modeEntity.type"
          @restart="restartGame"
          @endGame="endGame"
          @rethrow="rethrow"
          @showRules="showRules"
          @updateScore="updateTeamScore"
          @move-to-next-player="moveToNextPlayer"
          @automatic-bid="automaticBid"
          @game-end-post-statistics="gameEndPostStatistics"
          @returnSala="returnSala"
          :teams="state.teamArray"
          :change-turn="state.gameState.isRoundEnd && !(state.params?.type === 10 && state.gameState.currentTeam === 2)"
          :mode="modeName"
          :player="getActivePlayer"
          :max-round="state.gameState.maxRounds"
          :round="state.gameState.currentRound"
          :teamLocks="state.teamLocks"
          :gameSettingsType="state.gameSettings.type"
          :firstTurnPlayerOnly="state.params.firstTurnPlayerOnly || state.params.gameSettings?.firstTurnPlayerOnly"
        />
      </view>
      <team-display
        :players="state.teamArray"
        :gameSettingsType="state.gameSettings.type"
        :teamWinsMap="teamWinsMap"
      />
    </view>

    <!-- 加过场动画组件 -->
    <transition-screen
      v-model:show="gameCommon.gameCommonState.transitionState.show"
      :text="gameCommon.gameCommonState.transitionState.text"
    />
    <!-- 添加过场ROUND动画组件 -->
    <transition-screen-text
      v-model:show="gameCommon.gameCommonState.transitionStateText.show"
      :text="gameCommon.gameCommonState.transitionStateText.text"
    />

    <!-- 调试面板 -->
    <!-- <debug-panel :current-round="state.gameState.currentRound" :current-dart="state.gameState.currentDart"
			@throw-dart="(data)=>bluetooth().setScoreCallback(data)" /> -->
  <!-- 结束动画覆盖层（确保结算动画一定可见） -->
  <view v-if="state.finishOverlayVisible" class="finish-overlay">
    <image class="finish-gif" :src="`/static/gif/finish01.24s.gif?t=${state.finishOverlayTs}`" @load="onFinishGifLoad" mode="aspectFill" />
  </view>
  </view>
</template>

<style scoped lang="scss">
.finish-overlay {
  position: fixed;
  z-index: 10000;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center;
}
.finish-gif { width: 100vw; height: 100vh; object-fit: cover; }
</style>

<style scoped lang="scss">
.threeSituationDisplay {
  background-color: #2f2b2bb5;
  height: 100%;
  width: 100%;
  position: fixed;
  flex-direction: row;
  align-items: center;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}
.threeSituationDisplay-image {
  display: flex;
  width: 20%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
