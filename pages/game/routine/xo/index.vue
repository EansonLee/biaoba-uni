<script setup>
import { computed, reactive, ref, onMounted, nextTick } from "vue";
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

import { useAudioPlayer } from "@/sheep/util/useAudioPlayer";

import {
  getGameConfig,
  useAudioPlayerFunIf,
  playAudioPlayerFunIf,
  getGameConfigGrouping,
  SCORING_AREAS,
} from "@/sheep/config/bluetoothConfig";
import agreement from "@/sheep/api/dart/agreement";
import eventBus from "@/sheep/util/eventBus";

const { locale } = useI18n();

const state = reactive({
  teamArray: [], // 队伍数组
  gameSettings: {},
  gameState: {
    currentRound: 1, // 当前回合
    currentTeam: 1, // 当前投掷的队伍
    currentPlayerIndex: 0, // 当前队伍中的玩家索引
    currentDart: 0, // 当前投掷的镖数(1-3)
    maxRounds: 20, // 最大回合数
    averageScores: {}, // 每个玩家的平均分记录 {playerId: averageScore}
    roundScores: {}, // 每回合的得分记录 {roundId: {teamId: {playerId: [得分数组]}}}
    // 修改回合结束的判断逻辑
    isRoundEnd: computed(() => {
      // 当前镖数为3且已经投掷完成时才算回合结束
      return state.gameState.currentDart === 3;
    }),
    teamSize: 1,
    // 🔥 2v2换手计数器
    turnCounter: 0,
  },
  modeEntity: {},
  teamLocks: {},
  // XO：用于“重投”恢复当前回合开始前的棋盘状态快照
  preTurnTeamLocksSnapshot: null,
});

const gameCommon = useGameCommon();
const modeName = ref();
const playerContentRef = ref(null);
// 初始化游戏状态函数
const initGameState = async (params) => {
  if (params.gameSettings.customRound) {
    params.gameSettings.roundNbr = params.gameSettings.customRound;
  }
  // 根据team分组玩家
  state.teamArray = params.players;
  // 循环玩家，设置玩家的颜色，只设置第一个团队第一个玩家和第二个团队第二个玩家分别是blur和green.png
  state.teamArray.forEach((team, index) => {
    team.players.forEach((player, playerIndex) => {
      player.averageColor = index === 0 ? "#659ff8" : "#95f274";
    });
  });

  // 获取最大的玩家团队
  state.gameState.teamSize = params.gameSettings.teamSize;
  state.modeEntity = params.modeEntity;

  // 设置游戏设置
  state.gameState.maxRounds = params.gameSettings?.roundNbr || 20;

  // 获取配置
  state.gameSettings = params.gameSettings;

  // 初始化第一个队伍第一个玩家活动状态
  if (state.teamArray.length > 0 && state.teamArray[0].players.length > 0) {
    state.teamArray[0].players[0].isActive = true;
    state.gameState.currentTeam = state.teamArray[0].team;
  }

  // 初始化回合分数记录
  state.gameState.roundScores = {
    1: {}, // 初始化第一回合
  };

  // 初始化每个玩家的平均分记录
  state.teamArray.forEach((team) => {
    team.teamRoundNbr = 0;
    team.currentScore = team.startingScore;
    team.players.forEach((player) => {
      state.gameState.averageScores[player.id] = [];
    });
  });

  state.gameState.currentRound = 1;
  state.gameState.currentTeam = state.teamArray[0].team;
  state.gameState.currentPlayerIndex = 0;

  modeName.value =
    locale.value === "zh"
      ? state.modeEntity.chineseModeName
      : state.modeEntity.englishModeName;
};

// 获取路由传递的参数并初始化游戏
onLoad((options) => {
  const params = getParams(options);
  // 初始化游戏状态
  initGameState(params);
});

onMounted(() => {
  // 立即初始化棋盘，不等待页面完全ready
  nextTick(() => {
    if (playerContentRef.value) {
      playerContentRef.value.generateRandomBoard();
    }
  });
});

onReady(() => {
  gameCommon.handleGameStart(
    modeName.value,
    state.gameState.currentRound,
    state.teamArray[0].players[0].playerName,
    playerContentRef
  );
});

// 防重复处理的标志
const isProcessingDart = ref(false);
const isProcessingHandChange = ref(false);

// 设置蓝牙数据回调函数 - 每次接收数据都会触发
bluetooth().setScoreCallback((newVal) => {
  if (newVal) {
    // 处理换手按钮（在所有模式下都有效）
    if (newVal === "65" || newVal === 65) {
      // 🔧 防止重复处理换手按钮
      if (isProcessingHandChange.value) {
        return;
      }
      moveToNextPlayerLocal();
      return;
    }

    // 🔧 防止重复处理本地蓝牙投镖
    if (isProcessingDart.value) {
      return;
    }

    if (!state.gameState.isRoundEnd) {
      blurScore(newVal);
    }
  }
});

// 🔥 XO连线模式2v2专用换手逻辑
const handleXO2v2MoveToNextPlayer = () => {
  console.log("🔄 [XO2v2换手] 开始处理2v2换手逻辑");

  // 获取当前活动团队
  const activeTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );
  if (!activeTeam) return;

  // 获取当前玩家
  const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];
  if (!activePlayer) return;

  console.log(
    "🔄 [XO2v2换手] 当前状态 - 队伍:",
    activeTeam.team,
    "玩家:",
    activePlayer.playerName,
    "镖数:",
    state.gameState.currentDart
  );

  // 🔥 修复：不要每次换手都增加teamRoundNbr，而是通过turnCounter精确控制
  console.log(
    "🔄 [XO2v2换手] 队伍",
    activeTeam.team,
    "玩家",
    activePlayer.playerName,
    "完成投掷(投了",
    state.gameState.currentDart,
    "镖)"
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
    "🔄 [XO2v2换手] 换手计数器:",
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
      "🔄 [XO2v2换手] 所有队伍完成当前回合，当前回合:",
      state.gameState.currentRound,
      "最大回合:",
      state.gameState.maxRounds
    );

    // 🔥 XO连线模式特殊处理：检查是否已经有队伍获胜
    let hasWinner = false;
    state.teamArray.forEach((team) => {
      if (team.currentScore >= state.gameSettings.requiredLines) {
        hasWinner = true;
        console.log(
          "🔄 [XO2v2换手] 队伍",
          team.team,
          "已获胜，连线数:",
          team.currentScore
        );
      }
    });

    if (hasWinner) {
      console.log("🔄 [XO2v2换手] 已有队伍获胜，游戏应该已经结束");
      return;
    }

    // 🔥 XO连线模式：没有回合限制，移除回合数检查

    // 🔥 XO连线模式：进入下一回合，但没有回合数限制
    console.log("🔄 [XO2v2换手] 进入下一回合");
    state.gameState.currentRound++;
    state.gameState.roundScores[state.gameState.currentRound] = {};

    // 重置换手计数器
    state.gameState.turnCounter = 0;

    // 从第一个队伍的第一个玩家开始新回合
    nextTeam = state.teamArray[0];
    nextPlayerIndex = 0;

    // 🔥 XO连线模式：显示回合动画（但不检查回合数限制）
    let roundType = "";
    // XO连线模式没有最终回合的概念，所以不设置 "Final Round"

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
      "🔄 [XO2v2换手] 显示回合动画，当前回合:",
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
      "🔄 [XO2v2换手] 换手计数器:",
      state.gameState.turnCounter,
      "序列位置:",
      currentPositionInSequence
    );
    console.log(
      "🔄 [XO2v2换手] 计算结果 - targetTeamIndex:",
      targetTeamIndex,
      "targetPlayerIndex:",
      targetPlayerIndex
    );
  }

  console.log(
    "🔄 [XO2v2换手] 队伍结构:",
    state.teamArray.map(
      (t) => `队伍${t.team}:${t.players.map((p) => p.playerName).join(",")}`
    )
  );
  console.log(
    "🔄 [XO2v2换手] 目标队伍:",
    nextTeam?.team,
    "目标玩家:",
    nextTeam?.players[nextPlayerIndex]?.playerName
  );

  // 验证计算结果的合理性
  if (!nextTeam || !nextTeam.players[nextPlayerIndex]) {
    console.error("🔄 [XO2v2换手] 计算错误，回退到通用逻辑");
    gameCommon.moveToNextPlayer(state, playerContentRef, null);
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

  // 🔥 XO连线模式特殊处理：通知活跃队伍变化
  eventBus.emit("xoActiveTeamChange", nextTeam.team);

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
    "🔄 [XO2v2换手] 换手完成，当前玩家:",
    nextTeam.players[nextPlayerIndex].playerName
  );
};

// 本地换手函数，带防重复机制
const moveToNextPlayerLocal = () => {
  // 🔧 防止重复处理换手按钮
  if (isProcessingHandChange.value) {
    return;
  }

  // 设置处理标志
  isProcessingHandChange.value = true;

  try {
    // 🔥 检查是否是2v2模式，使用专门的换手逻辑
    console.log(
      "🔄 [XO换手] teamSize:",
      state.gameState.teamSize,
      "teamArray.length:",
      state.teamArray.length
    );
    if (state.gameState.teamSize === 2) {
      console.log("🔄 [XO换手] 使用2v2专用逻辑");
      // 2v2专用换手逻辑
      handleXO2v2MoveToNextPlayer();
    } else {
      console.log("🔄 [XO换手] 使用通用逻辑");
      // 调用通用换手逻辑
      gameCommon.moveToNextPlayer(state, playerContentRef, null);
    }
  } finally {
    // 延迟重置换手处理标志
    setTimeout(() => {
      isProcessingHandChange.value = false;
    }, 500);
  }
};

const blurScore = (data) => {
  // 设置处理标志
  isProcessingDart.value = true;

  try {
    const gameConfig = getGameConfig(data);
    gameConfig.gameType = state.modeEntity.type;
    handleScore(gameConfig.score, gameConfig);
  } finally {
    // 延迟重置处理标志
    setTimeout(() => {
      isProcessingDart.value = false;
    }, 100);
  }
};

// 状态检查和修复函数
const checkAndFixGameState = () => {
  // 检查镖数是否异常
  if (state.gameState.currentDart < 0) {
    state.gameState.currentDart = 0;
  }
  if (state.gameState.currentDart > 3) {
    state.gameState.currentDart = 0;
  }

  // 检查当前队伍和玩家索引
  const activeTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );
  if (!activeTeam) {
    state.gameState.currentTeam = 1;
    state.gameState.currentPlayerIndex = 0;
  }
};

// 投镖得分处理
const handleScore = (score, gameConfig) => {
  // 状态检查和修复
  checkAndFixGameState();

  // 检查镖数是否已达到上限
  if (state.gameState.currentDart >= 3) {
    return;
  }

  if (state.gameState.isRoundEnd) return;

  const activeTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );
  eventBus.emit("xoActiveTeamChange", activeTeam.team);
  const activePlayer = activeTeam?.players[state.gameState.currentPlayerIndex];

  if (!activePlayer) return;

  // 获取实际分区
  const scoringArea = gameConfig.originalScore;
  const multiplier = gameConfig.multiplier; // 获取倍数

  // 在本玩家回合的第一镖前，保存棋盘快照，便于重投恢复
  if (state.gameState.currentDart === 0) {
    try {
      state.preTurnTeamLocksSnapshot = JSON.parse(JSON.stringify(state.teamLocks));
    } catch (e) {
      state.preTurnTeamLocksSnapshot = null;
    }
  }

  // 更新当前镖数
  state.gameState.currentDart++;
  const teamLock = state.teamLocks[scoringArea];
  // 存储射中区域
  // 根据倍数判断处理方式
  if (!teamLock) {
    // 初始化锁定状态
    state.teamLocks[scoringArea] = {
      team: activeTeam.team,
      flash: false,
      averageColor: activePlayer.averageColor,
      pendingTeam: undefined,
    };
  } else {
    // 判断是否为不同团队（攻击对方区域）
    if (teamLock.team && activeTeam.team !== teamLock.team) {
      if (multiplier === 3) {
        // 三倍直接占领
        teamLock.team = activeTeam.team;
        teamLock.averageColor = activePlayer.averageColor;
        teamLock.flash = false;
        teamLock.pendingTeam = undefined;
      } else if (multiplier === 2) {
        // 双倍：若此前由我方打出过1倍并处于闪烁，则视为1+2=3，直接占领；否则回到未选中
        if (teamLock.flash && teamLock.pendingTeam === activeTeam.team) {
          teamLock.team = activeTeam.team;
          teamLock.averageColor = activePlayer.averageColor;
          teamLock.flash = false;
          teamLock.pendingTeam = undefined;
        } else {
          teamLock.team = undefined;
          teamLock.flash = false;
          teamLock.averageColor = undefined; // 清空颜色
          teamLock.pendingTeam = undefined;
        }
      } else if (multiplier === 1) {
        // 单倍：切换闪烁，并记录闪烁归属为当前进攻方；若关闭闪烁则回到未选中
        const willFlash = !teamLock.flash;
        teamLock.flash = willFlash;
        if (willFlash) {
          teamLock.pendingTeam = activeTeam.team;
        } else {
          teamLock.team = undefined; // 清空锁定的团队
          teamLock.pendingTeam = undefined;
        }
      }
    } else {
      // 同队或未归属：归我方
      Object.assign(teamLock, {
        team: activeTeam.team,
        averageColor: activePlayer.averageColor,
        flash: false,
        pendingTeam: undefined,
      });
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
    score: scoringArea === 21 ? "B" : scoringArea,
    originalScore: gameConfig.originalScore,
    multiplier: gameConfig.multiplier,
  };
  // 添加到回合记录
  state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][
    activePlayer.id
  ].push(throwRecord);
  useAudioPlayerFun(gameConfig, null);
  // 检查是否获胜
  const checkWin = playerContentRef.value.checkWin(activeTeam.team);
  playerContentRef.value.checkWinCall(scoringArea);
  const currentRoundScores =
    state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][
      activePlayer.id
    ];
  if (
    gameConfig.multiplier === 4 ||
    currentRoundScores.filter((item) => item.multiplier === 5).length === 2
  ) {
    // 如果是两镖外牛眼或者一标内牛眼会播放打乱音效
    //播放打乱mp3
    // playerContentRef.value.playVideo('/static/gif/sbull_20f.gif', true, () => {
    // });
    useAudioPlayer().playAudio("/static/mp3/daluan.mp3");

    // 延迟一点时间让音效先播放，然后再重新生成棋盘
    setTimeout(() => {
      playerContentRef.value.generateRandomBoard();
    }, 200);
  }

  if (checkWin > 0) {
    activeTeam.currentScore = checkWin;
    // 判断是否胜利
    if (checkWin === state.gameSettings.requiredLines) {
      const playerNames = activeTeam.players
        .map((p) => p.playerName)
        .join("、");
      gameCommon.handleGameEnd("score", playerNames, playerContentRef);
      return;
    }
  }

  // 如果投完三镖
  if (state.gameState.currentDart === 3) {
    activeTeam.teamRoundNbr++;
  }
  useAudioPlayerFun(gameConfig, currentRoundScores);
};

// 音频动画播放
const useAudioPlayerFun = (gameConfig, currentRoundScores) => {
  let urlMp4 = useAudioPlayerFunIf(gameConfig, currentRoundScores);
  console.log("MP4为：" + urlMp4);
  let urlMp3 = playAudioPlayerFunIf(gameConfig, currentRoundScores);

  if (urlMp4 || urlMp3) {
    urlMp4 ? playerContentRef.value.playVideo(urlMp4, true, () => {}) : "";
    urlMp3 ? useAudioPlayer().playAudio(urlMp3) : "";
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

  // 获取当前回合的镖得分
  return {
    ...activePlayer,
    recentRounds: activePlayer.scoreHistory.recentRounds,
    currentScore: activeTeam.currentScore,
  };
});

// 重新开始游戏
const restart = () => {
  // 清空棋盘状态
  state.teamLocks = {};
  // 重置游戏状态
  state.gameState.currentRound = 1;
  state.gameState.currentDart = 0;
  // 🔥 重置2v2换手计数器
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

  playerContentRef.value.generateRandomBoard();
  gameCommon.handleGameStart(
    modeName.value,
    state.gameState.currentRound,
    state.teamArray[0].players[0].playerName,
    playerContentRef
  );
};

// 添加更新分数的方法
const updateTeamScore = ({ teamId, newScore }) => {
  const team = state.teamArray.find((t) => t.team === teamId);
  if (team && newScore >= 1) {
    team.currentScore = newScore;
  }
};

// XO模式：重投当前回合并恢复棋盘到本回合开始前的状态
const rethrowXO = () => {
  // 通用重投：清空本回合当前玩家投掷记录并将镖数置0
  gameCommon.routineRethrowCurrentRound(state);

  // 恢复棋盘快照（若存在）
  if (state.preTurnTeamLocksSnapshot) {
    try {
      state.teamLocks = JSON.parse(JSON.stringify(state.preTurnTeamLocksSnapshot));
    } catch (e) {
      state.teamLocks = {};
    }
  }

  // 重新计算当前活跃队伍的连线数（作为UI修正）
  const activeTeam = state.teamArray.find(
    (t) => t.team === state.gameState.currentTeam
  );
  if (activeTeam && playerContentRef && playerContentRef.value) {
    const lines = playerContentRef.value.checkWin(activeTeam.team);
    activeTeam.currentScore = lines || 0;
  }
};

// 添加计算方法
const calculateGameResult = (players) => {
  // 深拷贝防止影响原数据
  const sortedPlayers = JSON.parse(JSON.stringify(players));

  // 按分数从大到小排序
  return sortedPlayers.sort((a, b) => {
    // 如果分数相同，多人队伍排在前面
    if (a.currentScore === b.currentScore) {
      return b.players.length - a.players.length;
    }
    // 分数高的排在前面
    return b.currentScore - a.currentScore;
  });
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

// 页面卸载时清理资源
onUnload(() => {
  // 🔧 优化：退出游戏时保持蓝牙连接，提升用户体验
  // 用户可以在不同游戏之间切换而无需重新连接蓝牙
});
</script>

<template>
  <view class="uni-body container">
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view class="uni-h-full">
        <PlayerContent
          :calculateResult="calculateGameResult"
          ref="playerContentRef"
          :type="state.modeEntity.type"
          @rethrow="rethrowXO"
          @restart="gameCommon.restartGame(restart)"
          @endGame="gameCommon.endGame('/pages/game/home/index')"
          @showRules="getDomMessage(12)"
          @updateScore="updateTeamScore"
          @move-to-next-player="moveToNextPlayerLocal"
          :teams="state.teamArray"
          :change-turn="state.gameState.isRoundEnd"
          :mode="modeName"
          :player="getActivePlayer"
          :max-round="state.gameState.maxRounds"
          :round="state.gameState.currentRound"
          :teamLocks="state.teamLocks"
        />
      </view>
      <team-display :type="state.modeEntity.type" :players="state.teamArray" />
    </view>

    <!-- 加过场动画组件 -->
    <transition-screen
      v-model:show="gameCommon.gameCommonState.transitionState.show"
      :text="gameCommon.gameCommonState.transitionState.text"
    />
    <transition-screen-text
      v-model:show="gameCommon.gameCommonState.transitionStateText.show"
      :text="gameCommon.gameCommonState.transitionStateText.text"
    />
    <!-- 调试面板 -->
    <!--    <debug-panel-->
    <!--        :current-round="state.gameState.currentRound"-->
    <!--        :current-dart="state.gameState.currentDart"-->
    <!--        @throw-dart="(data)=>bluetooth().setScoreCallback(data)"/>-->
  </view>
</template>

<style scoped lang="scss"></style>
