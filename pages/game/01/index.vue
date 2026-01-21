<script setup>
import { computed, reactive, ref, watch, nextTick } from "vue";
import PlayerContent from "@/sheep/components/game/01/playerContent.vue";
import { onLoad, onReady, onUnload } from "@dcloudio/uni-app";
import { getParams } from "@/sheep/router";
import sheep from "@/sheep";
import { useI18n } from "vue-i18n";
import TeamDisplay from "@/sheep/components/game/01/teamDisplay.vue";
import TransitionScreen from "@/sheep/components/common/transitionScreen.vue";
import { ZegoOrientation } from "@/uni_modules/zego-ZegoExpressUniApp-JS/components/zego-ZegoExpressUniApp-JS/lib/ZegoExpressEngine";
import invitePop from "@/sheep/components/player/messages/invitePop.vue";

import TransitionScreenText from "@/sheep/components/common/transitionScreenText.vue";
import { useVideoWindow } from "@/sheep/composables/useVideoWindow";
import { useGameCommon } from "@/sheep/hooks/useGameCommon";
import bluetooth from "@/sheep/stores/bluetooth";
import { showToast } from "@/sheep/util/toast";
import {
  getGameConfig,
  useAudioPlayerFunIf,
  playAudioPlayerFunIf,
  getRegionCode,
  getGifTimeLength,
} from "@/sheep/config/bluetoothConfig";

import { getHitRate } from "@/sheep/config/hitAlgorithm";
import { useAudioPlayer } from "@/sheep/util/useAudioPlayer";
import { useWatchWithLock } from "@/sheep/common/util";
import DebugPanel from "@/sheep/components/debug/debugPanel.vue";
import playerInfo from "@/sheep/api/dart/playerInfo";
import gameInvitation from "@/sheep/api/dart/gameInvitation";
import zimStore from "@/sheep/stores/zegoStore";
import $stores from "@/sheep/stores";
import agreement from "@/sheep/api/dart/agreement";
import player from "@/sheep/api/dart/player";
import eventBus from "@/sheep/util/eventBus";
import useGameContextStore from '@/sheep/stores/gameContext';

const userInfo = $stores("user").getUserInfo();
const { locale } = useI18n();
const gameResult = ref(null);
const zimStores = zimStore();

// 🔥 集成游戏上下文Store，供日志上报使用
const gameContext = useGameContextStore();

$stores("zegoStore").initLogin();

// 防重复处理的标志 - 使用 ref 确保响应式和正确的生命周期管理
const isProcessingDart = ref(false);
const isProcessingHandChange = ref(false);
// 🤖 AI换手保护：仅用于允许AI在自身回合结束时触发一次换手
const aiHandingOver = ref(false);

// 定时器引用，用于清理
let dartProcessingTimer = null;
let handChangeProcessingTimer = null;

//监听对战内的投标
// 🔧 添加消息ID追踪，防止重复处理同一条消息
let lastProcessedMessageId = null;

const tobiaoWatcher = watch(
  zimStores.message.tobiao,
  (New, Old) => {
    const rival = getRivalId();
    const value = New[rival];
    if (!value || value.length === 0) return;

    const newValue = value[value.length - 1];
    console.log("----------------------------------监听到投标消息,", New);

    // 🔧 防止重复处理同一条消息
    if (newValue.messageID === lastProcessedMessageId) {
      return;
    }
    lastProcessedMessageId = newValue.messageID;

    // 🔧 修复：对手投镖标记为远程投镖，绕过重复处理检查
    blurScore(newValue.value, true);
  },
  { deep: true }
);

const changeHandsWatcher = watch(
  zimStores.message.changeHands,
  (New, Old) => {
    if (isProcessingHandChange.value) {
      console.log("正在处理换手，跳过重复消息");
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
    gameCommon.handleGameEnd("opponentEndGame", null, playerContentRef);
    closeVideo();
    cleanupGameStorage();
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

const invitePopModalVisible = ref(false);
const invitePopRef = ref(null);
watch(
  zimStores.message.yaoqing,
  (New, Old) => {
    invitePopModalVisible.value = true;
    const newValue = New[New.length - 1];
    invitePopRef.value.getInviteInfo(newValue.invitationId);
    zimStores.message.yaoqing = [];
  },
  { deep: true }
);
const close = (number) => {
  invitePopModalVisible.value = false;
};

const state = reactive({
  aiAutomaticBid: false,
  teamArray: [], // 队伍数组
  gameSettings: {},
  averageScores: 0, // 当前队伍总平均分
  isChangeHand: false,
  gameState: {
    teamId: 0, //当前队伍id
    currentRound: 1, // 当前回合
    currentTeam: 1, // 当前投掷的队伍
    currentPlayerIndex: 0, // 当前队伍中的玩家索引
    currentDart: 0, // 当前投掷的镖数(1-3)
    maxRounds: 20, // 最大回合数
    roundScores: {}, // 每回合的得分记录 {roundId: {teamId: {playerId: [得分数组]}}}
    averageScores: {}, // 每个玩家的平均分 {playerId: averageScore}
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
  },
  modeEntity: {},
  params: {},
});

// 🔥 同步到日志上下文：监听核心状态变化
watch(() => state?.teamArray, () => { try { gameContext.updateFromState(state); } catch(_) {} }, { deep: true });
watch(() => state?.gameState, () => { try { gameContext.updateFromState(state); } catch(_) {} }, { deep: true });
// 当前是否轮到AI（AI对战模式且当前队伍为2）
const isAiTurn = computed(() => state.params?.type === 10 && state.gameState.currentTeam === 2);

const gameCommon = useGameCommon();
const modeName = ref();
const modeEnd = ref(true);
// 计算混合模式下的团队胜场映射（teamId -> winCount）
const teamWinsMap = computed(() => {
  const map = {};
  try {
    const wins = state.params?.tameWin?.teamIdWin || [];
    wins.forEach(id => { map[id] = (map[id] || 0) + 1; });
  } catch(e) {}
  return map;
});
const playerContentRef = ref(null);
const endOutTimeout = ref(0); //结束延迟时间
const platform = uni.getSystemInfoSync().platform; // 'ios' 或 'android'

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

const watchOrientation = ref(null);

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
  if (params.type) {
    params.gameSettings.type = params.type;
  }
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
    // 视频窗口位置将在initGameState之后设置，确保与玩家位置匹配

    // 启用缩放模式（默认启用）
    videoWindow.windowStates.local.scaleMode = true;
    videoWindow.windowStates.remote.scaleMode = true;

    // 通知子组件启用缩放模式
    uni.$emit("localScaleModeChange", true);
    uni.$emit("remoteScaleModeChange", true);

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
      (e) => { }
    );
  } else {
    closeVideo();
  }
  // #endif
  // 初始化游戏状态
  console.log("start", JSON.stringify(state));
  // 打印进入页面时的开局/结束设置，便于排查
  console.log('[GameInit] opening(before normalize):', params?.gameSettings?.opening, 'doubleStart:', params?.gameSettings?.doubleStart);
  console.log('[GameInit] finish(before normalize):', params?.gameSettings?.finish, 'doubleEnd:', params?.gameSettings?.doubleEnd);
  if (params.gameSettings.type === 11) {
    //如果是线上模式
    player.Api.updateInGame(1);

    // 确保远程视频数据在游戏开始时是完整的
    setTimeout(() => {
      const app = getApp();
      if (app && app.restoreRemoteVideoData) {
        // 首先尝试恢复数据
        const restored = app.restoreRemoteVideoData();

        if (!restored) {
          console.log("🎮 [游戏页面] 数据恢复失败，尝试从params重新构造...");

          // 从params重新获取数据
          const gameSettings = params.gameSettings;
          if (gameSettings && gameSettings.type === 11) {
            const playerArray = params.playerArray || [];
            if (playerArray.length >= 2) {
              const newRoomId = playerArray[0].id + "" + playerArray[1].id;
              const newRemoteUserId = playerArray.find(
                (p) => p.id !== uni.getStorageSync("userInfo")?.playerOnly
              )?.playerOnly;
              let newZeGoTokenThird = uni.getStorageSync("zeGoTokenThird");

              if (!newZeGoTokenThird) {
                const zeGoToken = uni.getStorageSync("zeGoToken");
                if (zeGoToken) {
                  newZeGoTokenThird = zeGoToken;
                }
              }

              if (newRoomId && newRemoteUserId && newZeGoTokenThird) {
                app.setRemoteVideoData({
                  roomId: newRoomId,
                  remoteUserId: newRemoteUserId,
                  zeGoTokenThird: newZeGoTokenThird,
                });
                console.log("🎮 [游戏页面] 从params成功重构数据");
              }
            }
          }
        }
      }
    }, 1000); // 延迟1秒确保页面完全加载
  }
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
        right: "4%",
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
      console.log('[视频位置] 当前用户是邀请方（先手），本地视频在右，远程视频在左');
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
        right: "4%",
        top: "",
        bottom: "3%",
        transform: "",
      };
      console.log('[视频位置] 当前用户是被邀请方（后手），本地视频在左，远程视频在右');
    }
  }
  // #endif

  // 启动蓝牙状态定期检查
  startBluetoothStatusCheck();
  
  // 🔥 初始化游戏上下文路由
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    gameContext.setRoute(currentPage?.route || '');
  } catch (_) {}
});

onUnload(() => {
  if (watchOrientation.value) {
    plus.orientation.clearWatch(watchOrientation.value);
  }

  // 停止蓝牙状态检查
  stopBluetoothStatusCheck();

  // 清理事件监听器
  eventBus.off("handChangeEnd", onHandChangeEnd);

  // 清理 uni.$on 事件监听器
  uni.$off("localVideoMove");
  uni.$off("remoteVideoMove");
  uni.$off("localVideoScale");
  uni.$off("remoteVideoScale");
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

  console.log("01游戏页面已卸载，所有资源已清理");
});

onReady(() => {
  // playerContentRef.value.playVideo("/Animation/Bulls%20Eye.mp4",true,()=>{
  //   gameCommon.handleGameStart(modeName.value, state.gameState.currentRound, state.teamArray[0].players[0].playerName)
  // });
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
        console.log("🤖 [AI保护] AI回合中，忽略设备换手按钮");
        return;
      }
      // 🔧 换手时重置处理标志
      isProcessingDart.value = false;
      moveToNextPlayer();
      return;
    }

    // 🔧 修复在线对战模式下的投镖处理
    // 🤖 AI回合期间（或AI正在投镖）禁止处理本地蓝牙投镖
    if (!state.aiAutomaticBid && !isAiTurn.value) {
      //倘若ai在进行投标则禁止 蓝牙投标
      // 不要清空scoreCallback，保持数据监听
      // bluetooth().setScoreCallback(null)

      // 🔧 防止重复处理本地蓝牙投镖
      if (isProcessingDart.value) {
        return;
      }

      // 🔧 在线对战模式下，只有轮到当前用户时才处理本地蓝牙投镖
      if (state.gameSettings.type === 11) {
        const currentPlayerId = getCurrentId();
        if (currentPlayerId !== userInfo.playerOnly) {
          console.log(
            "🎯 [在线对战] 不是当前用户回合，忽略本地蓝牙投镖:",
            newVal
          );
          return;
        }
      }

      if (!state.gameState.isRoundEnd) {
        blurScore(newVal);
      }
    }
  }
});

// 初始化游戏状态
const initGameState = async (params) => {
  if (params.gameSettings.customRound) {
    params.gameSettings.roundNbr = params.gameSettings.customRound;
  }
  // 根据team分组玩家
  state.teamArray = params.players;

  // 线上对战(type===11)：UI规则固定 左=对方 右=自己，不改变队伍顺序
  if (params.gameSettings?.type === 11 && state.teamArray.length >= 2) {
    console.log('[线上对战] 保持UI左右：左对方/右自己，不交换队伍顺序');
  }

  // 获取最大的玩家团队
  state.gameState.teamSize = params.gameSettings.teamSize;
  state.modeEntity = params.modeEntity;

  // 设置游戏设置
  state.gameState.maxRounds = params.gameSettings?.roundNbr || 20;

  // 获取配置
  state.gameSettings = params.gameSettings;
  // 🔧 规范化开局/结束等数值，防止后端返回字符串导致判定失败
  if (state.gameSettings) {
    const toInt = (v) => (v === undefined || v === null || v === '' ? 0 : parseInt(v, 10));
    state.gameSettings.opening = toInt(state.gameSettings.opening);    // 0:无要求 1:双倍开局 2:倍数开局
    state.gameSettings.finish = toInt(state.gameSettings.finish);      // 0:无要求 1:双倍结束 2:倍数结束
    state.gameSettings.bullEyeFraction = toInt(state.gameSettings.bullEyeFraction || state.gameSettings.bullsEyeFraction);
    state.gameSettings.requiredLines = toInt(state.gameSettings.requiredLines);
    state.gameSettings.bidSequence = toInt(state.gameSettings.bidSequence);
  }

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

  // 先手方：谁发起邀请谁先手
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
    state.gameState.teamId = starter.players[0].id;
    state.gameState.currentTeam = starter.team;
  }

  // 初始化回合分数记录
  state.gameState.roundScores = {
    1: {}, // 初始化第一回合
  };

  // 初始化每个玩家的平均分记录
  await state.teamArray.forEach((team) => {
    team.teamRoundNbr = 0;
    team.currentScore = team.startingScore;
    team.teamHasStarted = false; // 团队开局标记（2v2共享）
    // 🔧 修复：初始化HighCheckout相关状态
    team.inScoreRange = undefined;
    team.dartsInScoreRange = undefined;
    team.players.forEach((player) => {
      state.gameState.averageScores[player.id] = {
        average: 0, //  总分/总回合数
        scoreAverage: 0, //总分数
        currentDartAverage: 0, //总标数
        currentRound: 0, //当前回合数
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

// 🔥 初始化完成后，同步一次上下文
try { gameContext.updateFromState(state); } catch(_) {}
};

//获取对手玩家id
const getRivalId = () => {
  let userId;
  state.teamArray.forEach((item, index) => {
    if (item.players[0].playerOnly !== userInfo.playerOnly) {
      userId = item.players[0].playerOnly;
    }
  });
  return userId;
};

//获取获取当前回合玩家id
const getCurrentId = () => {
  let userId;
  state.teamArray.forEach((item, index) => {
    if (item.team === state.gameState.currentTeam) {
      userId = item.players[0].playerOnly;
    }
  });
  return userId;
};

const blurScore = (data, isRemoteDart = false) => {
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

  if (data === "65") {
    console.log(
      "🔄 [blurScore换手] teamSize:",
      state.gameState.teamSize,
      "teamArray.length:",
      state.teamArray.length
    );
    // 🔥 检查是否是2v2模式，使用专门的换手逻辑
    if (state.gameState.teamSize === 2) {
      // 2v2专用换手逻辑
      handle2v2MoveToNextPlayer();
    } else {
      // 调用通用换手逻辑
      gameCommon.moveToNextPlayer(state, playerContentRef, null);
    }
  } else {
    const gameConfig = getGameConfig(data);
    //添加游戏模式
    gameConfig.gameType = state.modeEntity.type;

    let score = gameConfig.score;
    // 判断是否是牛眼，判断牛眼分数
    if (gameConfig.multiplier === 5) {
      if (
        gameConfig.bullEyeFraction === "50" ||
        state.gameSettings.bullEyeFraction === 50
      ) {
        score = 50;
      } else if (
        gameConfig.outsideBullEyeScore === "50" ||
        state.gameSettings.outsideBullEyeScore === 50
      ) {
        score = 50;
      }
    }

    const activeTeam = state.teamArray.find(
      (t) => t.team === state.gameState.currentTeam
    );
    const activePlayer =
      activeTeam?.players[state.gameState.currentPlayerIndex];

  // 在本回合第一镖前记录开局状态快照，供重投/爆镖回退时恢复
  if (state.gameState.currentDart === 0 && activePlayer) {
      activePlayer.hasStartedAtRoundStart = !!activePlayer.hasStarted;
      activePlayer._snapshotRoundNumber = state.gameState.currentRound;
      // 记录团队开局状态快照（2v2共享开局）
      activeTeam.teamHasStartedAtRoundStart = !!activeTeam.teamHasStarted;
      // 记录本回合开始时的团队剩余分数，用于BUST回退
      activeTeam._scoreAtRoundStart = Number(activeTeam.currentScore) || 0;

      // High Checkout 判定改为“以回合开始时的分数”为准，且每回合重置计数
      const startScore = activeTeam._scoreAtRoundStart;
      const inHighRange = startScore >= 100 && startScore <= 180;
      activeTeam.inScoreRange = inHighRange;
      activeTeam.dartsInScoreRange = inHighRange ? 0 : undefined;
      if (inHighRange) {
        console.log(`[HighCheckout] 本回合开始分数=${startScore}（在100~180区间），开始计数`);
      } else {
        console.log(`[HighCheckout] 本回合开始分数=${startScore}（不在100~180区间），不计数`);
      }
  }

    // 检查开局条件
    console.log("检查开局条件:" + activePlayer?.hasStarted);
    if (!activePlayer?.hasStarted) {
      if (checkStartCondition(gameConfig)) {
        // 任一队员满足开局条件，整个队伍视为已开局（2v2共享）
        activeTeam.teamHasStarted = true;
        activePlayer.hasStarted = true;
        // 如果满足开局条件,处理得分
        handleScore(score, gameConfig, isRemoteDart);
      } else {
        // 没有满足开局条件,只增加镖数
        if (!isRemoteDart) {
          showToast({
            message: locale.value === "zh" ? "需要击中特定区域才能开始计分" : "Score only in designated area",
            icon: "none",
          });
        }
        handleScore(0, gameConfig, isRemoteDart);
      }
    } else {
      // 已经开局了,正常处理得分
      handleScore(score, gameConfig, isRemoteDart);
    }
  }
};

//请求接口
const postStatistics = async (postData) => {
  await playerInfo.Api.updatePlayer(postData);
  let idList = [];
  state.teamArray.forEach((team) => {
    idList.push(team.players[0].id);
  });
};

// 游戏结束后上报数据到接口做统计 比如PPR ,PPD的统计  playerId = 玩家id
const gameEndPostStatistics = () => {
  // 检查是否有来自useGameCommon的混合模式结束标志
  if (state.mixedModeEnd !== undefined) {
    modeEnd.value = state.mixedModeEnd;
    // 清除标志
    delete state.mixedModeEnd;
  }

  state.teamArray.forEach((item, index) => {
    item.players.forEach((player, i) => {
      if (player.playerId && player.playerId === userInfo.id) {
        const postData = {
          playerId: player.playerId, //玩家id
          total: state.gameState.averageScores[player.id].currentDartAverage, //当场游戏总镖数
          score: state.gameState.averageScores[player.id].scoreAverage, //当场游戏总获得分数
          gameRound: state.gameState.currentRound, //当场游戏总回合数
          emptyDart: 0, //当前场次空镖次数
          gameType: state.gameSettings.type === 11 ? 2 : 1,
        };
        postStatistics(postData);
      }
    });
  });
};

let openHighCheckOut = ref(false);
// 状态检查和修复函数
const checkAndFixGameState = () => {
  // 检查镖数是否异常
  if (state.gameState.currentDart < 0) {
    console.warn("🚨 [状态修复] 镖数异常(小于0)，重置为0");
    state.gameState.currentDart = 0;
  }
  if (state.gameState.currentDart > 3) {
    console.warn("🚨 [状态修复] 镖数异常(大于3)，重置为0");
    state.gameState.currentDart = 0;
  }

  // 检查当前队伍和玩家索引
  const activeTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );
  if (!activeTeam) {
    console.warn("🚨 [状态修复] 找不到当前队伍，重置为第一队");
    state.gameState.currentTeam = 1;
    state.gameState.currentPlayerIndex = 0;
  }
};

// 投镖得分处理
const handleScore = (score, gameConfig, isRemoteDart = false) => {
  // 状态检查和修复
  checkAndFixGameState();

  // 🔧 修复：只对本地投镖进行重复处理检查，对手投镖直接处理
  if (!isRemoteDart && isProcessingDart.value) {
    console.log("正在处理投镖，跳过重复调用");
    return;
  }

  // 检查镖数是否已达到上限
  if (state.gameState.currentDart >= 3) {
    console.log("当前回合已投完3镖，跳过处理");
    return;
  }

  // 判断是否换手
  if (state.gameState.isRoundEnd) return;

  // 🔧 修复：只有在确实要处理投镖时才设置标志，避免在早期返回时标志卡住
  if (!isRemoteDart) {
    isProcessingDart.value = true;
  }

  const activeTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );
  state.gameState.teamId = activeTeam.players[0].id;
  if (!activeTeam) {
    // 🔧 异常情况下也要重置标志
    if (!isRemoteDart) {
      isProcessingDart.value = false;
    }
    return;
  }

  const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];
  if (!activePlayer) {
    // 🔧 异常情况下也要重置标志
    if (!isRemoteDart) {
      isProcessingDart.value = false;
    }
    return;
  }

  // 确保玩家有得分记录结构
  if (!activePlayer.scoreHistory) {
    activePlayer.scoreHistory = {
      recentRounds: [],
      currentRound: [],
    };
  }

  // 计算扣分后的分数
  const newScore = activeTeam.currentScore - score;

  // 记录本次投镖分数
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

  const throwRecord = {
    multiplier: gameConfig.multiplier,
    score: score,
    originalScore: gameConfig.originalScore,
  };

  // 添加得分记录
  state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][
    activePlayer.id
  ].push(throwRecord);

  // 即时更新历史记录
  const currentRoundScores =
    state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][
    activePlayer.id
    ];
  const roundTotal = currentRoundScores.reduce(
    (sum, item) => sum + item.score,
    0
  );

  //更新当前玩家平均分（PPR） //
  let scoreAverage =
    newScore < 0
      ? state.gameState.averageScores[activePlayer.id].scoreAverage
      : state.gameState.averageScores[activePlayer.id].scoreAverage + score; //总分数  newScore < 0 不计入分数
  let average = state.gameState.averageScores[activePlayer.id].average;
  let currentDartAverage =
    state.gameState.averageScores[activePlayer.id].currentDartAverage + 1; //总标数

  // let currentDartAverage = state.gameState.averageScores[activePlayer.id].currentDartAverage + 1 //总回合数
  //当前回合获得的总分数
  const currentRoundScoresSum = currentRoundScores.reduce(
    (sum, item) => sum + item.score,
    0
  );
  // 当前镖数
  const gameCurrentDart = state.gameState.currentDart + 1;
  const throwAverage = {
    // average : (scoreAverage / state.gameState.currentRound).toFixed(2), //上回合总平均分
    scoreAverage: scoreAverage, //总分数
    currentDartAverage: currentDartAverage, //总标数
    currentRound: state.gameState.currentRound, //当前回合数
  };

  // state.averageScores = (scoreAverage / state.gameState.currentRound).toFixed(2), //上回合总平均分
  // state.averageScores = throwAverage.average
  state.gameState.averageScores[activePlayer.id] = throwAverage;
  // 更新或添加当前回合记录
  const roundRecord = {
    roundNumber: state.gameState.currentRound,
    scores: [...currentRoundScores],
    total: roundTotal,
    exceedFlay: newScore < 0,
    isBust: newScore < 0, // 添加额外的BUST标记，确保显示正确
  };
  const existingRecordIndex = activePlayer.scoreHistory.recentRounds.findIndex(
    (record) => record.roundNumber === state.gameState.currentRound
  );
  if (existingRecordIndex !== -1) {
    activePlayer.scoreHistory.recentRounds[existingRecordIndex] = roundRecord;
  } else {
    activePlayer.scoreHistory.recentRounds.push(roundRecord);
  }

  // 🔥 修复PPR计算：根据游戏最大回合数动态调整记录保留数量
  // 保留所有回合记录，直到游戏设置的最大回合数，确保PPR计算的准确性
  const maxRecordsToKeep = state.gameState.maxRounds || 20; // 使用游戏设置的最大回合数
  if (activePlayer.scoreHistory.recentRounds.length > maxRecordsToKeep) {
    const removedRecord = activePlayer.scoreHistory.recentRounds.shift();
    console.log(`🎯 [回合记录] 玩家${activePlayer.playerName}回合记录超过${maxRecordsToKeep}个，删除最早的回合${removedRecord?.roundNumber}(得分:${removedRecord?.total})`);
  }
  // 更新当前镖数
  state.gameState.currentDart++;

  // 如果投完三镖
  if (state.gameState.currentDart === 3) {
    console.log(`🎯 [镖数调试] 投完三镖，增加团队轮数`);
    activeTeam.teamRoundNbr++;

    // 检查是否剩余1分且有结束条件限制，如果是则按爆镖处理
    if (
      newScore === 1 &&
      (state.gameSettings.finish === 1 || state.gameSettings.finish === 2)
    ) {
      console.log(
        `[剩余1分] 玩家 ${activePlayer.playerName} 投完三镖后剩余1分，按爆镖处理`
      );
      console.log(`🎯 [剩余1分爆镖] 当前分数: ${activeTeam.currentScore}, newScore: ${newScore}`);
      // 🔧 修复：传递正确的当前分数给handleScoreOverflow
      handleScoreOverflow(activeTeam, newScore);
      // 🔧 重置处理标志
      if (!isRemoteDart) {
        isProcessingDart.value = false;
      }
      return;
    }
  }

  // 检查是否在投镖过程中剩余1分且有结束条件限制
  if (
    newScore === 1 &&
    (state.gameSettings.finish === 1 || state.gameSettings.finish === 2)
  ) {

    // 强制设置为投完三镖，然后按爆镖处理
    state.gameState.currentDart = 3;
    activeTeam.teamRoundNbr++;
    handleScoreOverflow(activeTeam, newScore);
    // 🔧 重置处理标志
    if (!isRemoteDart) {
      isProcessingDart.value = false;
    }
    return;
  }

  // 处理分数为0或超出的情况
  if (newScore < 0) {
    // 🔧 修复：传递正确的当前分数给handleScoreOverflow
    handleScoreOverflow(activeTeam, newScore);
    // 🔧 重置处理标志
    if (!isRemoteDart) {
      isProcessingDart.value = false;
    }
    return;
  }

  // 检查结束条件
  if (newScore === 0 && !checkFinishCondition(score, gameConfig)) {
    handleScoreOverflow(activeTeam);
    showToast({
      message: locale.value === "zh" ? "需要以特定方式结束游戏" : "The game needs to be ended in a specific way",
      icon: "none",
    });
    // 🔧 重置处理标志
    if (!isRemoteDart) {
      isProcessingDart.value = false;
    }
    return;
  }

  // 更新团队当前分数（只有在没有爆镖的情况下才更新）
  activeTeam.currentScore = newScore;
  if (activeTeam.inScoreRange === true) {
    activeTeam.dartsInScoreRange++;
    console.log(`[HighCheckout] 区间内第${activeTeam.dartsInScoreRange}镖`);
  }

  // 更稳健：根据本局的先攻标识(firstTurnPlayerOnly)推导“本回合最后出手队伍”
  // 线上对战固定左右，但先攻可能不同，不能仅用 teamArray 顺序推断
  let lastTeamId = state.teamArray[state.teamArray.length - 1]?.team; // 兜底
  try {
    const firstTurnPO = state.modeEntity?.firstTurnPlayerOnly
      || state.gameSettings?.firstTurnPlayerOnly
      || state.params?.firstTurnPlayerOnly
      || state.firstTurnPlayerOnly;
    if (firstTurnPO) {
      const firstTeam = state.teamArray.find(t => t?.players?.[0]?.playerOnly === firstTurnPO);
      const otherTeam = state.teamArray.find(t => t && (!firstTeam || t.team !== firstTeam.team));
      if (otherTeam) lastTeamId = otherTeam.team;
    }
  } catch (e) {}
  const isLastTeam = state.gameState.currentTeam === lastTeamId;
  // 检查结束条件
  // 2v2 修复：在达到最大回合数时，必须等到“最后一队的最后一位玩家”投完第三镖才结算
  const isLastPlayer = state.gameState.currentPlayerIndex === (activeTeam.players.length - 1);
  const reachMaxRoundEnd = (
    state.gameState.currentRound === state.gameState.maxRounds &&
    isLastTeam &&
    state.gameState.currentDart === 3 &&
    // 单人对战：无需判断玩家索引；2v2：必须是队内最后一位玩家
    (state.gameState.teamSize === 1 || isLastPlayer)
  );
  if (
    newScore === 0 ||
    reachMaxRoundEnd
  ) {
    const playerNames = activeTeam.players
      .map((player) => player.playerName)
      .join("、");

    //判断是否混合模式，并且还有游戏未完成
    if (state.params.gameType === 8) {
      //如果是混合模式

      // 🔧 修复：正确确定01游戏的胜利者
      let winnerTeam = null;

      if (newScore === 0) {
        // 如果是减到0分获胜，那么当前投镖队伍就是胜利者
        winnerTeam = activeTeam;
        console.log(
          `[01混合模式] ${activeTeam.players[0].playerName} 减到0分获胜`
        );
      } else {
        // 如果是达到最大回合数，找分数最低的队伍作为胜利者
        winnerTeam = state.teamArray[0];
        let lowestScore = winnerTeam.currentScore;

        state.teamArray.forEach((team) => {
          console.log(
            `[01混合模式] 队伍${team.team}(${team.players[0].playerName}) 最终分数: ${team.currentScore}`
          );
          if (team.currentScore < lowestScore) {
            lowestScore = team.currentScore;
            winnerTeam = team;
          }
        });
        console.log(
          `[01混合模式] 达到最大回合数，${winnerTeam.players[0].playerName} 分数最低(${lowestScore})获胜`
        );
      }

      // 为胜利者设置win属性
      if (
        winnerTeam.players[0].win === null ||
        winnerTeam.players[0].win === undefined
      ) {
        winnerTeam.players[0].win = 1;
      } else {
        winnerTeam.players[0].win++;
      }

      console.log(
        `[01混合模式] 胜利者: ${winnerTeam.players[0].playerName}, 胜利次数: ${winnerTeam.players[0].win}`
      );

      // 🔧 修复：直接记录本局胜利者信息，供mixedModeGameEnd使用
      state.params.currentGameWinner = {
        team: winnerTeam.team,
        playerName: winnerTeam.players[0].playerName,
      };
      console.log(
        `[01混合模式] 记录本局胜利者信息: 队伍${winnerTeam.team}(${winnerTeam.players[0].playerName})`
      );
      //获取最后一个游戏名称
      // if (nowModelName.toString() === lastModelName.toString()) {//判断当前游戏是否是最后一个游戏
      //   modeEnd.value = true;
      // } else {
      //   modeEnd.value = false;
      //   //获取第一名的用户
      //   // gameCommon.mixedModeGameEnd(state)
      //   // return;
      // }
      // 首先标记当前游戏为已完成
      // 需要根据具体的游戏ID或起始分数来精确匹配，而不是只看类型
      const currentGameId = state.modeEntity.id;
      const currentStartingScore = state.modeEntity.startingScore;

      state.params.modes.forEach((item) => {
        // 使用ID和起始分数来精确匹配当前游戏
        if (
          item.id === currentGameId &&
          item.startingScore === currentStartingScore &&
          !item.status
        ) {
          item.status = true;
        }
      });

      // 检查是否是混合模式的最后一局
      let isLast = false;

      // 检查胜利条件：是否有队伍达到了胜利要求
      let winNumber = winnerTeam.players[0].win;
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
    let showFinish = true;

    // 判断是否触发 High Checkout：以回合开始时分数在100~180为准，且本回合内三镖内清零
    if (
      activeTeam.inScoreRange === true &&
      activeTeam.dartsInScoreRange != null &&
      activeTeam.dartsInScoreRange <= 3
    ) {
      console.log("触发High Checkout规则，播放HighCheckout动画和音效");
      playerContentRef.value.playVideo(
        "/static/gif/HighCheckout3.06s.gif",
        true,
        (res) => { }
      );
      useAudioPlayer().playAudio("/static/mp3/PerfectGame.mp3");

      // 获取HighCheckout动画的正确时长
      const animationDuration = getGifTimeLength("HighCheckout3.06s.gif");
      console.log("HighCheckout动画时长:", animationDuration);

      // High Checkout动画播放完后直接显示获胜信息，不播放finish动画
      endOutTimeout.value = animationDuration; // 使用正确的动画时长
      showFinish = false; // 不播放finish动画，直接显示获胜信息
    } else {
      endOutTimeout.value = 0;
    }

    setTimeout(() => {
      gameCommon.handleGameEnd(
        "score",
        playerNames,
        playerContentRef,
        showFinish
      );
      endOutTimeout.value = 0;
    }, endOutTimeout.value);

    return;
  }
  useAudioPlayerFun(score, gameConfig, currentRoundScores);

  // 🔧 重置处理标志（延迟重置，防止快速重复触发）
  if (!isRemoteDart) {
    setTimeout(() => {
      isProcessingDart.value = false;
    }, 300);
  }
};

// 音频动画播放
const useAudioPlayerFun = (score, gameConfig, currentRoundScores) => {
  let urlMp4 = useAudioPlayerFunIf(gameConfig, currentRoundScores);
  console.log("mp4为：" + urlMp4);
  let urlMp3 = playAudioPlayerFunIf(gameConfig, currentRoundScores);
  console.log("mp3为：" + urlMp3);

  // 最小化修复：第三镖为T20且未触发任何回合特殊动画时，播放T20单镖动画与音效
  const isThirdDart = Array.isArray(currentRoundScores) && currentRoundScores.length === 3;
  const isCurrentDartT20 = gameConfig?.gameType === 1 && gameConfig?.multiplier === 3 && gameConfig?.originalScore === 20;
  // 若第三镖为T20，且未有任何回合级GIF（如LOWTON/HighTon/ThreeinaBed等），补充T20单镖GIF
  if (isThirdDart && isCurrentDartT20 && !urlMp4) {
    urlMp4 = "/static/gif/t20-1.09S.gif";
    // 音效保持原逻辑（可能是"/static/mp3/shanbei.mp3"），除非本次就是T20专用
    if (!urlMp3 || urlMp3 === "/static/mp3/shanbei.mp3") {
      urlMp3 = "/static/mp3/T20.mp3";
    }
  }

  if (urlMp4 || urlMp3) {
    let outTime = 0;
    urlMp4 ? playerContentRef.value.playVideo(urlMp4, true, () => { }) : "";

    if (urlMp3 === "/static/mp3/ThreeinaBed_1.mp3") {
      outTime = 100;
    }
    if (urlMp3 === "/static/mp3/HighTon_1.mp3") {
      outTime = 200;
    }
    if (urlMp3 === "/static/mp3/T20.mp3") {
      outTime = 300;
    }
    if (urlMp3 === "/static/mp3/LOWTON.mp3") {
      outTime = 500;
    }
    console.log(outTime);
    setTimeout(() => {
      urlMp3 ? useAudioPlayer().playAudio(urlMp3) : "";
    }, outTime);
  } else {
    useAudioPlayer().playAudio("/static/mp3/jzbk.mp3");
    // useAudioPlayer().playAudio('/static/mp3/dart.wav');
  }
};

// 处理分数超出的情况（BUST/非法结束/超分）
const handleScoreOverflow = (team, currentScore = null) => {
  playerContentRef.value.playVideo("/static/gif/bust02s.gif", true, () => { });
  setTimeout(() => {
    useAudioPlayer().playAudio("/static/mp3/BUST.mp3");
  }, 500);

  const activePlayer = team.players[state.gameState.currentPlayerIndex];

  // 获取当前回合的所有得分（确保是数值）
  const currentRoundScores =
    state.gameState.roundScores[state.gameState.currentRound]?.[team.team]?.[
      activePlayer.id
    ] || [];

  // 优先使用回合开始时的分数快照，避免字符串拼接/跨回合累计造成的异常
  const snapshot = Number(team._scoreAtRoundStart);
  if (!Number.isNaN(snapshot) && snapshot >= 0) {
    console.log(`🎯 [爆镖回退] 使用回合快照回退到: ${snapshot}`);
    team.currentScore = snapshot;
  } else {
    // 兜底：根据当回合得分列表计算回退值（全数值运算）
    const numericCurrent = Number(team.currentScore) || 0;
    const currentRoundTotal = currentRoundScores.reduce((sum, item) => sum + (Number(item?.score) || 0), 0);
    const lastThrowScore = Number(currentRoundScores[currentRoundScores.length - 1]?.score) || 0;

    let roundStartScore;
    if (currentScore !== null) {
      // 传入的是 newScore（可能为1/0/负数），回退到本回合开始前
      const numericNew = Number(currentScore) || 0;
      roundStartScore = numericNew + currentRoundTotal;
      console.log(`🎯 [爆镖回退-兜底] newScore=${numericNew}, 回合得分=${currentRoundTotal}, 回退到=${roundStartScore}`);
    } else {
      // 非传入场景（非法结束），根据当前留分与本次投掷前累计回退
      roundStartScore = numericCurrent + currentRoundTotal - lastThrowScore;
      console.log(`🎯 [爆镖回退-兜底] current=${numericCurrent}, 回合得分=${currentRoundTotal}, 最后1镖=${lastThrowScore}, 回退到=${roundStartScore}`);
    }
    team.currentScore = roundStartScore;
  }

  // BUST后，更新玩家历史记录，该回合得分为0
  const roundRecord = {
    roundNumber: state.gameState.currentRound,
    scores: [...currentRoundScores], // 保留投镖记录用于显示
    total: 0, // BUST后该回合总分为0
    exceedFlay: true, // 标记为BUST
    isBust: true, // 添加额外的BUST标记，确保显示正确
  };

  // 确保scoreHistory结构存在
  if (!activePlayer.scoreHistory) {
    activePlayer.scoreHistory = {
      recentRounds: [],
      currentRound: [],
    };
  }

  const existingRecordIndex = activePlayer.scoreHistory.recentRounds.findIndex(
    (record) => record.roundNumber === state.gameState.currentRound
  );
  if (existingRecordIndex !== -1) {
    activePlayer.scoreHistory.recentRounds[existingRecordIndex] = roundRecord;
  } else {
    activePlayer.scoreHistory.recentRounds.push(roundRecord);
  }

  // 🔥 修复PPR计算：根据游戏最大回合数动态调整记录保留数量
  const maxRecordsToKeep = state.gameState.maxRounds || 20; // 使用游戏设置的最大回合数
  if (activePlayer.scoreHistory.recentRounds.length > maxRecordsToKeep) {
    const removedRecord = activePlayer.scoreHistory.recentRounds.shift();
    console.log(`🎯 [BUST-回合记录] 玩家${activePlayer.playerName}回合记录超过${maxRecordsToKeep}个，删除最早的回合${removedRecord?.roundNumber}(得分:${removedRecord?.total})`);
  }

  // 🔧 强制响应式更新，确保Vue检测到数据变化
  activePlayer.scoreHistory = { ...activePlayer.scoreHistory };

  // 🔥 同步回滚 AVE/PPD 统计：爆镖时，本回合内已累计的分数与镖数都应回退
  try {
    const stats = state.gameState.averageScores?.[activePlayer.id];
    if (stats) {
      const roundDarts = currentRoundScores.length;
      const currentRoundTotal = currentRoundScores.reduce((sum, it) => sum + (Number(it?.score) || 0), 0);
      const lastThrowScore = Number(currentRoundScores[currentRoundScores.length - 1]?.score) || 0;
      // 仅回滚本回合中“实际累计进 stats.scoreAverage 的分数”，镖数不回退
      // 情况1：超分(<0) -> 最后一镖未计入，需要回滚本回合除最后一镖外的分数
      // 情况2：剩1分(=1) 或 非法结束(=0但不满足结束条件) -> 最后一镖已计入，需要回滚整回合分数
      let subtractPoints = currentRoundTotal;
      if (currentScore !== null && Number(currentScore) < 0) {
        subtractPoints = currentRoundTotal - lastThrowScore;
      }
      const newScoreAvg = Math.max(0, (Number(stats.scoreAverage) || 0) - subtractPoints);
      const keepDartAvg = Number(stats.currentDartAverage) || 0; // 保留已投镖数
      state.gameState.averageScores[activePlayer.id] = {
        ...stats,
        scoreAverage: newScoreAvg,
        currentDartAverage: keepDartAvg,
      };
      console.log(`🎯 [BUST回滚] 已回滚AVE得分：减分=${subtractPoints}（镖数保留，+${roundDarts}）`);
    }
  } catch (e) {
    console.warn('[BUST] 回滚AVE失败:', e);
  }

  // 强制结束回合
  state.gameState.currentDart = 3; // 表示已投完三镖

  // 该回合视为已结束：计入团队轮次，避免因BUST导致当前回合无法推进
  try {
    if (typeof team.teamRoundNbr !== 'number') team.teamRoundNbr = 0;
    team.teamRoundNbr++;
  } catch (e) {
    console.warn('[BUST] teamRoundNbr increase failed:', e);
  }

  // 显示提示
  // showToast({ message: '分数超出，回合结束', icon: 'none' });
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
    currentRoundScores, // 直接使用当前回合的得分记录
    currentScore: activeTeam.currentScore,
    _updateTrigger: Date.now(), // 添加一个更新触发器
  };
});

// 重新开始游戏
const restart = () => {
  // 🔧 修复：停止AI投镖状态并重置所有标志
  state.aiAutomaticBid = false;
  isProcessingDart.value = false;
  isProcessingHandChange.value = false;
  state.isChangeHand = false;

  // 清理定时器
  if (dartProcessingTimer) {
    clearTimeout(dartProcessingTimer);
    dartProcessingTimer = null;
  }
  if (handChangeProcessingTimer) {
    clearTimeout(handChangeProcessingTimer);
    handChangeProcessingTimer = null;
  }

  console.log("🔄 [重新开始] 已重置所有处理标志和AI状态");

  state.teamArray.forEach((team) => {
    team.players[0].hasStarted = undefined;
    team.teamHasStarted = false;
    team.currentScore = team.startingScore;
    team.teamRoundNbr = 0;
    team.inScoreRange = undefined;
    team.dartsInScoreRange = undefined;
    console.log(JSON.stringify("队伍：" + JSON.stringify(team)));
    team.players.forEach((player) => {
      // 重置玩家开局标记
      player.hasStarted = undefined;
      // 清空玩家的得分记录
      if (player.scoreHistory) {
        player.scoreHistory.recentRounds = [];
        player.scoreHistory.currentRound = [];
      }
      state.averageScores = 0;
      state.gameState.averageScores[player.id] = {
        average: 0, //平均分
        scoreAverage: 0, //总分数
        currentDartAverage: 0, //总标数
      };
    });
  });

  // 重置游戏状态
  state.gameState.currentRound = 1;
  state.gameState.currentDart = 0;
  state.gameState.roundScores = { 1: {} };
  // 🔧 修复2v2模式重新开始时玩家顺序混乱：重置换手计数器
  state.gameState.turnCounter = 0;

  // 重置第一个玩家为活动状态
  state.teamArray.forEach((team) => {
    team.players.forEach((player) => {
      player.isActive = false;
    });
  });
  state.teamArray[0].players[0].isActive = true;
  state.gameState.currentTeam = state.teamArray[0].team;
  state.gameState.currentPlayerIndex = 0;
  
  // 🔥 同步更新游戏上下文
  gameContext.updateFromState(state);
  gameCommon.handleGameStart(
    modeName.value,
    state.gameState.currentRound,
    state.teamArray[0].players[0].playerName,
    playerContentRef,
    playerContentRef
  );

  // 🔧 修复：重新开始游戏时也检查AI
  setTimeout(() => {
    checkAndTriggerAIOnStart();
  }, 3000);
};

// 显示游戏玩法
const showRules = () => {
  let isLast = true;
  getDomMessage(7);
  state.params.modes.forEach((item) => {
    if (item.status) {
      isLast = false;
    }
  });
  console.log("是否是最后一局？" + isLast);
  // getDomMessage(7)
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

// 添加更新分数的方法
const updateTeamScore = ({ teamId, newScore }) => {
  const team = state.teamArray.find((t) => t.team === teamId);
  if (team && newScore >= 1) {
    team.currentScore = newScore;
  }
};

// 判断是否满足开局条件
const checkStartCondition = (gameConfig) => {
  console.log("gameConfig:" + JSON.stringify(gameConfig));
  const activeTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );
  if (!activeTeam) return;

  const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];
  if (!activePlayer) return;

  // 2v2共享：如果团队已开局，则直接允许计分
  if (activeTeam.teamHasStarted) return true;

  // 如果当前玩家已经开始了,直接返回true
  if (activePlayer.hasStarted) return true;

  // 二倍区开局（包含DBULL）
  if (state.gameSettings.opening === 1) {
    return gameConfig.multiplier === 2 || gameConfig.multiplier === 4;
  }

  // 倍数区开局(二倍或三倍区，含DBULL)
  else if (state.gameSettings.opening === 2) {
    return (
      gameConfig.multiplier === 2 ||
      gameConfig.multiplier === 3 ||
      gameConfig.multiplier === 4
    );
  }

  // 没有开局要求
  return true;
};

// 判断是否满足结束条件
const checkFinishCondition = (score, gameConfig) => {
  const activeTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );
  if (!activeTeam) return false;

  // 二倍区结束（包含DBULL）
  if (state.gameSettings.finish === 1) {
    return gameConfig.multiplier === 2 || gameConfig.multiplier === 4;
  }
  // 倍数区结束（含DBULL）
  else if (state.gameSettings.finish === 2) {
    return gameConfig.multiplier === 2 || gameConfig.multiplier === 3 || gameConfig.multiplier === 4;
  }
  // 没有结束要求
  return true;
};

// 添加计算方法
const calculateGameResult = (players) => {
  console.log(players);
  // 深拷贝防止影响原数据
  const sortedPlayers = JSON.parse(JSON.stringify(players));

  // 按分数从小到大排序
  return sortedPlayers.sort((a, b) => {
    // 如果分数相同，多人队伍排在前面
    if (a.currentScore === b.currentScore) {
      return b.players.length - a.players.length;
    }
    // 分数小的排在前面
    return a.currentScore - b.currentScore;
  });
};

function weightedRandomPercent(options) {
  const random = Math.random(); // 0 ~ 1
  let cumulative = 0;

  for (const opt of options) {
    cumulative += opt.percent;
    if (random < cumulative) {
      return opt.value;
    }
  }
}

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
    console.log("🤖 [01 AI调试] 游戏开始时不需要触发AI");
  }
};

// 🔥 01游戏AI目标选择函数（严格按后台配置概率引擎执行）
const get01AITarget = (aiDifficulty) => {
  // 记录调试信息，确认后台下发参数是否齐全
  console.log("🤖 [01 AI Debug] 后台难度对象:", JSON.stringify(aiDifficulty));

  // 规范化并限幅参数（完全使用后台配置）
  const options = {
    // 是否允许空镖：命中前置判定。后端约定 airTarget: 0=允许空镖，1=不允许空镖
    airTarget: Number(aiDifficulty?.airTarget ?? 0),
    // 命中率：0~100，空镖概率 = 100%-命中率（当允许空镖时生效）
    hittingAccuracy: Math.max(0, Math.min(100, Number(aiDifficulty?.hittingAccuracy ?? 50))),
    // 分区难度：1=简单, 2=中等, 3=困难, 4=专家（映射到 lowOrhighConfig）
    partitionDiff: Number(aiDifficulty?.partitionDiff ?? 2),
    // 倍区难度：1=简单, 2=中等, 3=困难（映射到 multipleConfig/centerConfig）
    multiple: Number(aiDifficulty?.multiple ?? 2),
  };

  try {
    // 🔧 01游戏使用通用算法，支持1-20所有分区
    const key = getHitRate(options); // 可能返回 0（空镖）或有效键（'0F'、'50'等）
    console.log("🤖 [01 AI Debug] 概率引擎返回:", key);
    return key;
  } catch (e) {
    console.error("🤖 [01 AI Error] getHitRate 执行失败，使用兔底T20:", e);
    return "50"; // 兔底返回 T20
  }
};

// Ai自动投标方法
const automaticBid = () => {
  // 🔧 修复：强制重置换手状态和处理标志，确保AI能正常开始
  if (state.isChangeHand) {
    state.isChangeHand = false;
  }

  // 🔧 确保AI开始投镖时重置处理标志
  isProcessingDart.value = false;

  let number = 3; //3次投标
  state.aiAutomaticBid = true;
  const activeTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );

  const selectAiDifficulty = state.params.selectAiDifficulty;
  let throwCount = 0;
  let waitCount = 0; // 添加等待计数器，避免无限等待

  const throwDart = () => {
    // 检查AI是否被暂停、游戏是否结束或者已经投掷完三次
    if (
      !state.aiAutomaticBid ||
      !bluetooth().isGameStart ||
      throwCount >= number
    ) {
      state.aiAutomaticBid = false;
      if (bluetooth().isGameStart && throwCount >= number) {
        // 确保所有投掷动画和状态更新完成后再换手
        setTimeout(() => {
          // 允许AI在自身回合结束时触发一次换手
          aiHandingOver.value = true;
          moveToNextPlayer();
          // 立即清除标志，以免影响后续逻辑
          setTimeout(() => { aiHandingOver.value = false; }, 0);
          // 在换手后等待3秒，确保过场动画和音效播放完成
          state.isChangeHand = true;
          setTimeout(() => {
            state.isChangeHand = false;
          }, 3000);
        }, 1000);
      }
      return;
    }

    // 如果正在换手，等待换手动画完成
    if (state.isChangeHand) {
      waitCount++;

      // 🔧 修复：避免无限等待，最多等待5次（15秒）
      if (waitCount > 5) {
        state.isChangeHand = false;
      } else {
        setTimeout(throwDart, 3000);
        return;
      }
    }

    // 🔥 修复：AI也需要遵循开局和结束条件
    const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];

    if (activeTeam.currentScore <= 20) {
      //如果当前Ai剩余分数< 20分，那么根据设置的难度百分比来获取一镖清0
      const key = getRegionCode(activeTeam.currentScore);
      const gameConfig = getGameConfig(key);

      // 🔥 AI结束条件检查：如果是尝试结束游戏，需要检查结束条件
      if (activeTeam.currentScore - gameConfig.score === 0) {
        if (!checkFinishCondition(gameConfig.score, gameConfig)) {
          console.log(
            "🤖 [AI条件检查] AI尝试结束但不满足结束条件，寻找替代策略"
          );

          // 🔥 智能策略：寻找可以用倍数区结束的分数
          let targetScore = null;

          // 检查是否可以减少到偶数分数用二倍区结束
          if (state.gameSettings.finish === 1) {
            // 二倍区结束
            // 寻找最接近的偶数分数（可以用二倍区结束）
            for (let i = activeTeam.currentScore - 1; i >= 2; i--) {
              if (i % 2 === 0 && i <= 40) {
                // 偶数且在二倍区范围内
                const reduceScore = activeTeam.currentScore - i;
                if (reduceScore > 0 && reduceScore <= 60) {
                  // 确保减少的分数合理
                  targetScore = reduceScore;
                  console.log(
                    `🤖 [AI策略] 减少${reduceScore}分到${i}分，以便用二倍区结束`
                  );
                  break;
                }
              }
            }
          } else if (state.gameSettings.finish === 2) {
            // 倍数区结束
            // 寻找可以用二倍或三倍区结束的分数
            for (let i = activeTeam.currentScore - 1; i >= 2; i--) {
              if ((i % 2 === 0 && i <= 40) || (i % 3 === 0 && i <= 60)) {
                const reduceScore = activeTeam.currentScore - i;
                if (reduceScore > 0 && reduceScore <= 60) {
                  targetScore = reduceScore;
                  console.log(
                    `🤖 [AI策略] 减少${reduceScore}分到${i}分，以便用倍数区结束`
                  );
                  break;
                }
              }
            }
          }

          if (targetScore) {
            // 找到了合适的策略，投掷减少分数
            const targetKey = getRegionCode(targetScore);
            if (targetKey) {
              console.log(`🤖 [AI策略] 执行策略投镖，减少${targetScore}分`);
              blurScore(targetKey);
          } else {
            // 如果找不到精确分数，使用随机投镖
            const biao = get01AITarget(selectAiDifficulty);
            if (biao === 0) {
              handleScore(0, getGameConfig(0));
            } else {
              blurScore(biao);
            }
          }
        } else {
          // 找不到合适策略，使用随机投镖而不是空镖
          console.log("🤖 [01 AI策略] 找不到合适策略，使用随机投镖");
          const biao = get01AITarget(selectAiDifficulty);
          if (biao === 0) {
            handleScore(0, getGameConfig(0));
          } else {
            blurScore(biao);
          }
        }
        } else {
          console.log("🤖 [AI条件检查] AI满足结束条件，执行结束投镖");
          blurScore(key);
        }
      } else {
        // 不是结束投镖，正常投掷
        blurScore(key);
      }
    } else {
      //获取当前Ai需要命中的区域
      console.log("🤖 [01 AI] 调用AI目标选择，难度参数:", selectAiDifficulty);
      const biao = get01AITarget(selectAiDifficulty);
      console.log("🤖 [01 AI] AI选择结果:", biao);
      
      if (biao === 0) {
        // 0 = 空镖
        console.log("🤖 [01 AI] AI投空镖");
        handleScore(0, getGameConfig(0));
      } else {
        const gameConfig = getGameConfig(biao);

        // 🔥 AI开局条件检查：如果玩家还没开局，需要检查开局条件
        if (!activePlayer?.hasStarted) {
          if (!checkStartCondition(gameConfig)) {
            console.log("🤖 [01 AI条件检查] AI投镖不满足开局条件，改为投空镖");
            // 不满足开局条件，投空镖
            handleScore(0, getGameConfig(0));
          } else {
            console.log("🤖 [01 AI条件检查] AI满足开局条件，执行投镖");
            blurScore(biao);
          }
        } else {
          // 已经开局，正常投掷
          console.log("🤖 [01 AI] AI投掷区域:", biao);
          blurScore(biao);
        }
      }
    }

    throwCount++;
    // 安排下一次投掷，但要检查AI是否仍在运行
    setTimeout(() => {
      if (state.aiAutomaticBid) {
        throwDart();
      } else {
        console.log("🤖 [AI投镖调试] AI已停止，不继续投镖");
      }
    }, 3000);
  };

  // 开始第一次投掷
  throwDart();
};

// 🔥 2v2专用换手逻辑 - 重新设计
const handle2v2MoveToNextPlayer = () => {


  // 获取当前活动团队
  const activeTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );
  if (!activeTeam) return;

  // 获取当前玩家
  const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];
  if (!activePlayer) return;

  console.log(
    "🔄 [2v2换手] 当前状态 - 队伍:",
    activeTeam.team,
    "玩家:",
    activePlayer.playerName,
    "镖数:",
    state.gameState.currentDart
  );

  // 🔥 修复：不要每次换手都增加teamRoundNbr，而是通过turnCounter精确控制
  console.log(
    "🔄 [2v2换手] 队伍",
    activeTeam.team,
    "玩家",
    activePlayer.playerName,
    "完成投掷(投了",
    state.gameState.currentDart,
    "镖)"
  );
  // 初始化当前玩家的 roundScore
  gameCommon.initializeRoundScore(
    state,
    state.gameState.currentRound,
    activeTeam,
    activePlayer
  );

  // 🔥 修复：确保为当前玩家创建正确的回合记录
  const currentRoundScores =
    state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][
    activePlayer.id
    ];
  const roundTotal = currentRoundScores.reduce(
    (sum, item) => sum + item.score,
    0
  );

  // 确保scoreHistory结构存在
  if (!activePlayer.scoreHistory) {
    activePlayer.scoreHistory = {
      recentRounds: [],
      currentRound: [],
    };
  }

  // 🔧 修复：检查是否已存在回合记录，如果存在且是爆镖记录，则保持爆镖状态
  const existingRecordIndex = activePlayer.scoreHistory.recentRounds.findIndex(
    (record) => record.roundNumber === state.gameState.currentRound
  );
  
  let roundRecord;
  if (existingRecordIndex !== -1) {
    // 已存在回合记录，检查是否为爆镖
    const existingRecord = activePlayer.scoreHistory.recentRounds[existingRecordIndex];
    if (existingRecord.exceedFlay || existingRecord.isBust) {
      // 如果是爆镖记录，保持爆镖状态，不覆盖

      roundRecord = existingRecord; // 保持原有的爆镖记录
      // 🔧 强制响应式更新，确保BUST状态被保持
      activePlayer.scoreHistory = {...activePlayer.scoreHistory};
    } else {
      // 不是爆镖记录，正常更新
      roundRecord = {
        roundNumber: state.gameState.currentRound,
        scores: [...currentRoundScores],
        total: roundTotal,
        exceedFlay: false,
        isBust: false,
      };
      activePlayer.scoreHistory.recentRounds[existingRecordIndex] = roundRecord;
    }
  } else {
    // 不存在回合记录，创建新记录
    roundRecord = {
      roundNumber: state.gameState.currentRound,
      scores: [...currentRoundScores],
      total: roundTotal,
      exceedFlay: false,
      isBust: false,
    };
    activePlayer.scoreHistory.recentRounds.push(roundRecord);
  }

  console.log(
    `🔄 [2v2换手] 为玩家${activePlayer.playerName}创建回合${state.gameState.currentRound}记录，总分:${roundTotal}`
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
    "🔄 [2v2换手] 换手计数器:",
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
      "🔄 [2v2换手] 所有队伍完成当前回合，当前回合:",
      state.gameState.currentRound,
      "最大回合:",
      state.gameState.maxRounds
    );

    // 🔥 检查是否已经是最后一轮，如果是则结束游戏
    if (state.gameState.currentRound >= state.gameState.maxRounds) {
      console.log("🔄 [2v2换手] 已达到最大回合数，游戏结束");

      // 计算本局胜者（01：分数最低者胜）
      let winningTeam = state.teamArray[0];
      let minScore = winningTeam.currentScore;
      state.teamArray.forEach((team) => {
        if (team.currentScore < minScore) {
          minScore = team.currentScore;
          winningTeam = team;
        }
      });

      // 构造胜利者名称
      const playerNames = winningTeam.players.map((player) => player.playerName).join("、");

      // 如果是混合模式，需要记录胜负并标记当前模式完成
      if (state.params?.gameType === 8) {
        // 胜场计数（用于星标与胜场判断）
        if (winningTeam.players[0].win === null || winningTeam.players[0].win === undefined) {
          winningTeam.players[0].win = 1;
        } else {
          winningTeam.players[0].win++;
        }

        // tameWin 记录（供混合页面统计）
        if (!state.params.tameWin) {
          state.params.tameWin = { teamIdWin: [], teamIdfail: [] };
        }
        state.params.tameWin.teamIdWin.push(winningTeam.team);
        state.teamArray.forEach(t => { if (t.team !== winningTeam.team) state.params.tameWin.teamIdfail.push(t.team); });

        // 标记当前模式完成（按 id + startingScore 精确匹配）
        const currentGameId = state.modeEntity.id;
        const currentStartingScore = state.modeEntity.startingScore;
        if (Array.isArray(state.params.modes)) {
          state.params.modes.forEach((item) => {
            if (item.id === currentGameId && item.startingScore === currentStartingScore && !item.status) {
              item.status = true;
            }
          });
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
        // 把结果通过 state 传递给结算组件
        state.mixedModeEnd = isLast;
      }

      console.log(
        "🔄 [2v2换手] 游戏结束，获胜队伍:", winningTeam.team,
        "获胜玩家:", playerNames,
        "最低分:", minScore
      );

      // 调用结算：混合模式或普通模式都统一走这里
      gameCommon.handleGameEnd("rounds", playerNames, playerContentRef, true);
      return;
    }

    // 进入下一回合
    console.log("🔄 [2v2换手] 进入下一回合");
    state.gameState.currentRound++;
    state.gameState.roundScores[state.gameState.currentRound] = {};

    // 重置换手计数器
    state.gameState.turnCounter = 0;

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
      "🔄 [2v2换手] 显示回合动画，当前回合:",
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
      "🔄 [2v2换手] 换手计数器:",
      state.gameState.turnCounter,
      "序列位置:",
      currentPositionInSequence
    );
    console.log(
      "🔄 [2v2换手] 计算结果 - targetTeamIndex:",
      targetTeamIndex,
      "targetPlayerIndex:",
      targetPlayerIndex
    );
  }

  console.log(
    "🔄 [2v2换手] 队伍结构:",
    state.teamArray.map(
      (t) => `队伍${t.team}:${t.players.map((p) => p.playerName).join(",")}`
    )
  );
  console.log(
    "🔄 [2v2换手] 目标队伍:",
    nextTeam?.team,
    "目标玩家:",
    nextTeam?.players[nextPlayerIndex]?.playerName
  );

  // 验证计算结果的合理性
  if (!nextTeam || !nextTeam.players[nextPlayerIndex]) {
    console.error("🔄 [2v2换手] 计算错误，回退到通用逻辑");
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
      () => { }
    );
  }

  console.log(
    "🔄 [2v2换手] 换手完成，当前玩家:",
    nextTeam.players[nextPlayerIndex].playerName
  );
};

//换手
const moveToNextPlayer = () => {
  // 🔥 UI换手事件日志
  // 防止重复调用
  if (isProcessingHandChange.value) {
    console.log("正在处理换手，跳过重复调用");
    return;
  }

  // 🤖 AI对战模式：AI投镖过程中或AI回合禁止手动换手（包括UI跳过）
  // 但允许AI触发的自动换手（aiHandingOver=true）
  if (state.params?.type === 10 && (state.aiAutomaticBid || isAiTurn.value) && !aiHandingOver.value) {
    console.log("🤖 [AI保护] AI回合中，禁止手动换手");
    return;
  }

  // 线上对战模式：只有在自己回合时才能换手
  if (
    state.gameSettings.type &&
    state.gameSettings.type === 11 &&
    userInfo.playerOnly !== getCurrentId()
  ) {
    console.log("不是自己的回合，无法换手");
    return;
  }

  // 强制重置镖数状态，防止累积
  console.log("换手前镖数状态:", state.gameState.currentDart);
  state.gameState.currentDart = 0;
  console.log("换手后镖数状态:", state.gameState.currentDart);

  isProcessingHandChange.value = true;
  state.isChangeHand = true;

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

    console.log(
      "🔄 [moveToNextPlayer] teamSize:",
      state.gameState.teamSize,
      "teamArray.length:",
      state.teamArray.length
    );
    // 🔥 检查是否是2v2模式，使用专门的换手逻辑
    if (state.gameState.teamSize === 2) {
      console.log("🔄 [moveToNextPlayer] 使用2v2专用逻辑");
      // 2v2专用换手逻辑
      handle2v2MoveToNextPlayer();
    } else {
      console.log("🔄 [moveToNextPlayer] 使用通用逻辑");
      // 调用通用换手逻辑
      gameCommon.moveToNextPlayer(state, playerContentRef);
    }

    // 使用 nextTick 确保在DOM更新后执行，并强制更新状态，解决AI换手后UI不刷新的问题
    nextTick(() => {
      // 获取新的活动玩家和团队
      const nextTeam = state.teamArray.find(
        (t) => t.team === state.gameState.currentTeam
      );
      if (!nextTeam) return;
      const nextPlayer = nextTeam.players[state.gameState.currentPlayerIndex];

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

const onHandChangeEnd = () => {
  state.isChangeHand = false;

  // 延迟重置处理标志，防止动画结束时的重复触发
  setTimeout(() => {
    isProcessingHandChange.value = false;
  }, 500); // 延迟500毫秒重置

  // 清理定时器
  if (handChangeProcessingTimer) {
    clearTimeout(handChangeProcessingTimer);
    handChangeProcessingTimer = null;
  }
};
eventBus.on("handChangeEnd", onHandChangeEnd);

//重投
const rethrow = () => {
  // 🔥 UI重投事件日志
  eventBus.emit('log:gameEvent', { action: 'RETHROW_UI', source: 'ui', timestamp: Date.now() });
  // AI 对战：AI 回合或 AI 正在投镖时，禁止重投以免干扰
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
  gameCommon.rethrowCurrentRound(state.gameState, state.teamArray);
};

//重新开始
const restartGame = () => {
  // 🔥 UI重新开始事件日志
  eventBus.emit('log:gameEvent', { action: 'RESTART_GAME_UI', source: 'ui', timestamp: Date.now() });
  // 线上混合模式：点击“下一局”跳回混合页，等待双方就绪，不在本页直接开局
  if (state.gameSettings.type && state.gameSettings.type === 11) {
    if (state.params?.gameType === 8) {
      try {
        sheep.$router.go('/pages/game/mixed/minedIndex', state.params, 'reLaunch');
        console.log('[01-线上混合] 返回混合页，等待双方就绪');
      } catch (e) { console.warn('[01-线上混合] 返回混合页失败', e); }
    }
    return;
  }

  gameCommon.restartGame(restart);
};

//结束游戏
const endGame = () => {
  // 🔥 UI结束事件日志
  eventBus.emit('log:gameEvent', { action: 'END_GAME_UI', source: 'ui', timestamp: Date.now() });
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
  state.teamArray.forEach((team) => {
    team.players[0].hasStarted = undefined;
  });
  gameCommon.endGame("/pages/game/home/index");
};

//返回大厅
const returnSala = () => {
  closeVideo();
  cleanupGameStorage();
  gameCommon.endGame("/pages/game/online/index");
};

const closeVideo = () => {
  // 立即发送停止事件，不等待
  console.log("🔧 [closeVideo] 立即发送停止事件");
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
  if (zimStores.message) {
    zimStores.message.yaoqing = [];
    zimStores.message.cancel = [];
    zimStores.message.refuse = [];
    zimStores.message.accept = [];
    console.log("📝 [GameEnd] 已清理所有邀请相关消息");
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
    currentLeft = screenWidth - (screenWidth * rightPercent) / 100 - newWidth;
  } else {
    currentLeft = parseInt(windowState.position.left) || 0;
  }

  if (windowState.position.bottom && !windowState.position.top) {
    const bottomPercent = parseFloat(
      windowState.position.bottom.replace("%", "")
    );
    currentTop =
      screenHeight - (screenHeight * bottomPercent) / 100 - newHeight;
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
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view class="uni-h-full">
        <PlayerContent :state="state" :modeEnd="modeEnd" :isMixModel="state.params.gameType" :modes="state.params"
          :calculateResult="calculateGameResult" ref="playerContentRef" :type="state.modeEntity.type"
          @restart="restartGame" @endGame="endGame" @rethrow="rethrow" @showRules="showRules"
          @updateScore="updateTeamScore" @move-to-next-player="moveToNextPlayer" @automatic-bid="automaticBid"
          @game-end-post-statistics="gameEndPostStatistics" @returnSala="returnSala" :teams="state.teamArray"
          :change-turn="state.gameState.isRoundEnd && !(state.params?.type === 10 && state.gameState.currentTeam === 2)" :mode="modeName" :player="getActivePlayer"
          :max-round="state.gameState.maxRounds" :round="state.gameState.currentRound"
          :scoreAverage="state.averageScores" :gameSettingsType="state.gameSettings.type" />
      </view>
      <team-display :players="state.teamArray" :gameSettingsType="state.gameSettings.type" :teamWinsMap="teamWinsMap" />
    </view>

    <!-- 添加过场动画组件 -->
    <transition-screen v-model:show="gameCommon.gameCommonState.transitionState.show"
      :text="gameCommon.gameCommonState.transitionState.text" />

    <!-- 添加过场ROUND动画组件 -->
    <transition-screen-text v-model:show="gameCommon.gameCommonState.transitionStateText.show"
      :text="gameCommon.gameCommonState.transitionStateText.text" />

    <invitePop ref="invitePopRef" @close="close(1)" :modalVisible="invitePopModalVisible" :is-show-toast="true">
    </invitePop>

    <!-- 调试面板 -->
    <!-- <debug-panel
        :current-round="state.gameState.currentRound"
        :current-dart="state.gameState.currentDart"
        @throw-dart="(data)=>bluetooth().setScoreCallback(data)"/> -->
  </view>
</template>

<style scoped lang="scss"></style>
