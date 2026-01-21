<script setup>
import {computed, reactive, ref} from 'vue';
import PlayerContent from "@/sheep/components/game/01/playerContent.vue";
import {onLoad, onReady, onUnload} from '@dcloudio/uni-app';
import {getParams} from "@/sheep/router";
import {useI18n} from "vue-i18n";
import TeamDisplay from "@/sheep/components/game/01/teamDisplay.vue";
import TransitionScreen from "@/sheep/components/common/transitionScreen.vue";
import TransitionScreenText from "@/sheep/components/common/transitionScreenText.vue";
import {useGameCommon} from "@/sheep/hooks/useGameCommon";
import bluetooth from "@/sheep/stores/bluetooth";
import {
  getGameConfig,
  useAudioPlayerFunIf,
  playAudioPlayerFunIf,
  getScoreConfig,
  getGameConfigGrouping,
  getRandomScoreConfig
} from "@/sheep/config/bluetoothConfig";

import {useAudioPlayer} from "@/sheep/util/useAudioPlayer";

import {showToast} from "@/sheep/util/toast";
import gameTrain from "@/sheep/api/dart/gameTrain";
import $stores from "@/sheep/stores";
import agreement from "@/sheep/api/dart/agreement";

const userInfo = $stores('user').getUserInfo();
const {locale} = useI18n();

let randomScore = null;

const state = reactive({
  teamArray: [], // 队伍数组
  gameSettings: {},
  gameState: {
    currentRound: 1, // 当前回合
    currentTeam: 1, // 当前投掷的队伍
    currentPlayerIndex: 0, // 当前队伍中的玩家索引
    currentDart: 0, // 当前投掷的镖数(1-3)
    assembleDart: 0, // 总投掷的镖数
    showAssembleDart: 0,//展示的总投掷的镖数
    hitDart: 0, // 总命中的镖数
    nullDart: 0, // 空镖数
    accuracy: 0,
    maxRounds: 20, // 最大回合数
    roundScores: {}, // 每回合的得分记录 {roundId: {teamId: {playerId: [得分数组]}}}
    averageScores: {}, // 每个玩家的平均分记录 {playerId: averageScore}
    shouldUpdateTarget: false, // 是否需要更新目标区域的标志
    // 修改回合结束的判断逻辑
    isRoundEnd: computed(() => {
      // 当前镖数为3且已经投掷完成时才算回合结束
      return state.gameState.currentDart === 3;
    }),
    teamSize: 1,
  },
  modeEntity: {},
});

const gameCommon = useGameCommon();
const modeName = ref();
const playerContentRef = ref(null);
// 获取路由传递的参数并初始化游戏
onLoad((options) => {
  const params = getParams(options);
  // 初始化游戏状态
  initGameState(params);
});

onReady(() => {
  gameCommon.handleGameStart(modeName.value, state.gameState.currentRound, state.teamArray[0].players[0].playerName, playerContentRef)
})

// 防重复处理的标志
const isProcessingDart = ref(false);
const isProcessingHandChange = ref(false);

// 设置蓝牙数据回调函数 - 每次接收数据都会触发
bluetooth().setScoreCallback((newVal) => {
  if (newVal) {
    // 处理换手按钮（在所有模式下都有效）
    if (newVal === '65' || newVal === 65) {
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

// 初始化游戏状态
const initGameState = async (params) => {

  randomScore = getRandomScoreConfig(params.gameSettings.partition);

  if (params.gameSettings.customRound) {
    params.gameSettings.roundNbr = params.gameSettings.customRound
  }
  // 根据team分组玩家
  state.teamArray = params.players;

  // 获取最大的玩家团队
  state.gameState.teamSize = params.gameSettings.teamSize
  state.modeEntity = params.modeEntity

  // 设置游戏设置
  state.gameState.maxRounds = params.gameSettings?.roundNbr || 20;

  // 获取配置
  state.gameSettings = params.gameSettings;

  // 初始化第一个队伍第一个玩家为活动状态
  if (state.teamArray.length > 0 && state.teamArray[0].players.length > 0) {
    state.teamArray[0].players[0].isActive = true;
    state.gameState.currentTeam = state.teamArray[0].team;
  }

  // 初始化回合分数记录
  state.gameState.roundScores = {
    1: {} // 初始化第一回合
  };

  // 初始化每个玩家的平均分记录
  state.teamArray.forEach(team => {
    team.teamRoundNbr = 0;
    team.currentScore = team.startingScore;
    team.players.forEach(player => {
      state.gameState.averageScores[player.id] = [];
    });
  });
  modeName.value = locale.value === 'zh' ? state.modeEntity.chineseModeName : state.modeEntity.englishModeName;
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
    //获取当前未投多少标
    let nullDart = 3 - state.gameState.currentDart;
    state.gameState.nullDart = state.gameState.nullDart + nullDart
    state.gameState.assembleDart = state.gameState.assembleDart + nullDart //总投标

    // 若本回合尚未结束（未到3镖），按“回合数”规则分母+1
    if (state.gameState.currentDart !== 3) {
      state.gameState.showAssembleDart++;
      // 重算命中率
      state.gameState.accuracy = (state.gameState.hitDart / state.gameState.showAssembleDart * 100).toFixed(2);
      if (isNaN(state.gameState.accuracy)) {
        state.gameState.accuracy = 0;
      }
    }

    // 如果标记需要更新目标区域，在换手时更新
    if (state.gameState.shouldUpdateTarget) {
      randomScore = getRandomScoreConfig(state.gameSettings.partition);
      state.gameState.shouldUpdateTarget = false; // 重置标志
    }

    gameCommon.moveToNextPlayer(state, playerContentRef, null);
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
    gameConfig.gameType = state.modeEntity.type
    // handleScore(gameConfig.score, gameConfig);
    // const gameConfig = getGameConfig(data);
    let score = gameConfig.score;
    // 判断是否是牛眼，判断牛眼分数
    if (gameConfig.multiplier === 5 && (state.gameSettings.bullEyeFraction === 50 || gameConfig.bullEyeFraction === '50')) {
      score = 50;
    }

    const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
    const activePlayer = activeTeam?.players[state.gameState.currentPlayerIndex];

    // 检查开局条件
    if (!activePlayer?.hasStarted) {
      if (checkStartCondition(gameConfig)) {
        activePlayer.hasStarted = true;
        // 如果满足开局条件,处理得分
        handleScore(score, gameConfig);
      } else {
        // 没有满足开局条件,只增加镖数
        handleScore(0, gameConfig);
        showToast({
          message: locale.value === 'zh' ? '需要击中特定区域才能开始计分':'Score only in designated area',
          icon: 'none'
        });
      }
    } else {
      // 已经开局了,正常处理得分
      handleScore(score, gameConfig);
    }
  } finally {
    // 延迟重置处理标志
    setTimeout(() => {
      isProcessingDart.value = false;
    }, 100);
  }
}

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
  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
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

  // 判断是否换手
  if (state.gameState.isRoundEnd) return;

  // useAudioPlayer().playAudio('/static/mp3/dart.mp3');

  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
  const activePlayer = activeTeam?.players[state.gameState.currentPlayerIndex];
  if (!activePlayer) return;

  // 获取实际分区和倍数
  const scoringArea = gameConfig.originalScore;
  const actualScore = gameConfig.score;
  const multiplier = gameConfig.multiplier || 1; // 获取倍数，默认为1
  let newScore = score;

  // 先判断是否击中目标，如果未击中则设置分数为0
  if (gameConfig.originalScore !== randomScore.originalScore || gameConfig.score !== randomScore.score) {
    score = 0;
    gameConfig.score = 0;
    newScore = 0;
    state.gameState.nullDart++; //空标数
  }

  // 记录本次投镖分数和区域
  if (!state.gameState.roundScores[state.gameState.currentRound][activeTeam.team]) {
    state.gameState.roundScores[state.gameState.currentRound][activeTeam.team] = {};
  }
  if (!state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id]) {
    state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id] = [];
  }

  // 确保玩家有得分记录结构
  if (!activePlayer.scoreHistory) {
    activePlayer.scoreHistory = {
      recentRounds: [],
      currentRound: []
    };
  }

  // 记录本次投镖的完整信息
  const throwRecord = {
    multiplier: gameConfig.multiplier,
    score: gameConfig.score,
    originalScore: gameConfig.originalScore,
  };

  // 添加到回合记录
  state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id].push(throwRecord);

  // 更新历史记录
  const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id];
  const roundTotal = currentRoundScores.reduce((sum, item) => sum + item.score, 0);

  // 创建回合记录
  const roundRecord = {
    roundNumber: state.gameState.currentRound,
    scores: [...currentRoundScores],
    teamScore: activeTeam.currentScore,
    total: roundTotal,
  };

  // 更新或添加到历史记录
  const existingRecordIndex = activePlayer.scoreHistory.recentRounds.findIndex(
      record => record.roundNumber === state.gameState.currentRound
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
  if (newScore > 0) {
    activeTeam.currentScore += newScore;
  }

  // 更新当前镖数
  state.gameState.currentDart++;
  state.gameState.assembleDart++; //总投掷的标数

  if (gameConfig.originalScore === randomScore.originalScore && gameConfig.score === randomScore.score) {
    // 不再立即更新randomScore，而是标记需要更新
    state.gameState.hitDart++; //命中标数
    state.gameState.shouldUpdateTarget = true; // 标记需要更新目标区域

    // 如果还没投完3镖，标记为回合结束但保持正确的镖数
    if (state.gameState.currentDart < 3) {
      // 填充剩余的空镖到统计中
      const remainingDarts = 3 - state.gameState.currentDart;
      state.gameState.assembleDart += remainingDarts;
      // 设置为3表示回合结束，但这是安全的因为后面会重置
      state.gameState.currentDart = 3;
    }

    state.gameState.showAssembleDart++;
  } else if (state.gameState.currentDart === 3) {
    state.gameState.showAssembleDart++;
  }
  
  state.gameState.accuracy=(state.gameState.hitDart/state.gameState.showAssembleDart*100).toFixed(2);
  if (isNaN(state.gameState.accuracy) ) {
    // accuracy是可以转换为数字的字符串
    state.gameState.accuracy=0;
  }

  // 如果投完三镖
  if (state.gameState.currentDart === 3) {
    activeTeam.teamRoundNbr++;

    // 检查是否是最后一回合的最后一个玩家的最后一镖
    const isLastRound = state.gameState.currentRound === state.gameState.maxRounds;
    const isLastTeam = state.gameState.currentTeam === state.teamArray[state.teamArray.length - 1].team;
    const isLastPlayer = state.gameState.currentPlayerIndex === activeTeam.players.length - 1;

    if (isLastRound && isLastTeam && isLastPlayer) {
      // 游戏结束，计算胜利者
      let winningTeam = state.teamArray[0];
      let maxScore = winningTeam.currentScore;

      // 遍历所有团队找出分数最高的
      state.teamArray.forEach(team => {
        if (team.currentScore > maxScore) {
          maxScore = team.currentScore;
          winningTeam = team;
        }
      });

      // 获取胜利团队的玩家名字
      const playerNames = winningTeam.players.map(player => player.playerName).join('、');

      saveTrain()
      // 调用游戏结束处理
      gameCommon.handleGameEnd('score', playerNames, playerContentRef);
    }
  }
  useAudioPlayerFun(score, gameConfig, currentRoundScores);
};

// 修改获取活动玩家的计算属性
const getActivePlayer = computed(() => {
  const activeTeam = state.teamArray.find(team =>
      team.players.find(player => player.isActive)
  );

  if (!activeTeam) return null;

  const activePlayer = activeTeam.players.find(player => player.isActive);
  if (!activePlayer) return null;

  // 确保得分记录结构存在
  if (!activePlayer.scoreHistory) {
    activePlayer.scoreHistory = {
      recentRounds: [],
      currentRound: []
    };
  }

  // 获取当前回合的镖得分
  const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound]?.[activeTeam.team]?.[activePlayer.id] || [];
  return {
    ...activePlayer,
    recentRounds: activePlayer.scoreHistory.recentRounds,
    currentRoundScores, // 直接使用当前回合的得分记录
    currentScore: activeTeam.currentScore
  };
});

// 重新开始游戏
const restart = () => {
  randomScore = getRandomScoreConfig(state.gameSettings.partition);
  state.teamArray.forEach(team => {
    team.currentScore = team.startingScore
    team.teamRoundNbr = 0;
    team.players.forEach(player => {
      // 清空玩家的得分记录
      if (player.scoreHistory) {
        player.scoreHistory.recentRounds = [];
        player.scoreHistory.currentRound = [];
      }
    });
  });

  // 重置游戏状态
  state.gameState.currentRound = 1;
  state.gameState.currentDart = 0;
  state.gameState.roundScores = {1: {}};
  state.gameState.assembleDart = 0;
  state.gameState.hitDart = 0;
  state.gameState.nullDart = 0;
  state.gameState.accuracy = 0;
  state.gameState.showAssembleDart = 0; // 重置显示的总投掷镖数
  state.gameState.shouldUpdateTarget = false; // 重置更新目标标志

  // 重置第一个玩家为活动状态
  state.teamArray.forEach(team => {
    team.players.forEach(player => {
      player.isActive = false;
    });
  });
  state.teamArray[0].players[0].isActive = true;
  state.gameState.currentTeam = state.teamArray[0].team;
  state.gameState.currentPlayerIndex = 0;

  gameCommon.handleGameStart(modeName.value, state.gameState.currentRound, state.teamArray[0].players[0].playerName, playerContentRef)
};

// 添加更新分数的方法
const updateTeamScore = ({teamId, newScore}) => {
  const team = state.teamArray.find(t => t.team === teamId);
  if (team && newScore >= 1) {
    team.currentScore = newScore;
  }
};

// 练习模式专用的重投方法
const practiceRethrow = () => {
  
  // 检查回合状态
  if (state.gameState.currentDart === 0) {
      showToast({
          message: `${locale.value === "zh" ? "当前回合还未开始 " : "You have not started the round"  } `,
          icon: 'none',
      });
      return;
  }
  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
  const activePlayer = activeTeam?.players[state.gameState.currentPlayerIndex];
  
  if (!activePlayer) return;
  
  // 获取当前回合的得分记录
  const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound]?.[activeTeam.team]?.[activePlayer.id] || [];
  
  // 计算当前回合是否已结束（3镖或命中提前结束）
  const roundEnded = state.gameState.currentDart === 3;
  
  // 计算需要回退的总投掷镖数：
  // - 已结束的回合，无论如何都按3镖计（因为命中提前结束时补齐了剩余镖数）
  // - 未结束的回合，按已记录的镖数回退
  const actualDartsThrown = roundEnded ? 3 : currentRoundScores.length;
  
  // 记录开始重投前的数据状态，用于日志
  const beforeStats = {
    hitDart: state.gameState.hitDart,
    assembleDart: state.gameState.assembleDart,
    showAssembleDart: state.gameState.showAssembleDart,
    nullDart: state.gameState.nullDart,
    accuracy: state.gameState.accuracy
  };
  
  // 如果是投完3镖的情况，减少团队轮数
  if (state.gameState.currentDart === 3) {
    activeTeam.teamRoundNbr--;
  }
  
  // 计算本回合的命中次数和空镖数（用于回退）
  let roundHits = 0;
  let roundNullDarts = 0;
  currentRoundScores.forEach(record => {
    if (record.score > 0) {
      roundHits++;
    } else {
      roundNullDarts++;
    }
  });
  
  // 本回合是否已计入“几中几”的分母（showAssembleDart）
  // 条件：命中过 或 已结束且未命中
  const roundCountedInDenominator = (roundHits > 0) || (roundEnded && roundHits === 0);
  
  // 回退本回合的统计数据（仅限当前回合，不影响历史回合）
  // 命中回合：hitDart -1，showAssembleDart -1
  // 未命中但结束的回合：showAssembleDart -1
  if (roundHits > 0) {
    state.gameState.hitDart = Math.max(0, state.gameState.hitDart - 1);
  }
  if (roundCountedInDenominator) {
    state.gameState.showAssembleDart = Math.max(0, state.gameState.showAssembleDart - 1);
  }
  // 总投掷镖数：结束回合按3，未结束按已投
  state.gameState.assembleDart = Math.max(0, state.gameState.assembleDart - actualDartsThrown);
  // 空镖：按当前回合统计回退
  state.gameState.nullDart = Math.max(0, state.gameState.nullDart - roundNullDarts);
  
  // 重新计算命中率
  if (state.gameState.showAssembleDart > 0) {
    state.gameState.accuracy = (state.gameState.hitDart / state.gameState.showAssembleDart * 100).toFixed(2);
  } else {
    state.gameState.accuracy = 0;
  }
  
  // 减去当前回合的分数
  const scoreToDeduct = currentRoundScores.reduce((sum, score) => sum + score.score, 0);
  activeTeam.currentScore -= scoreToDeduct;
  
  // 清空当前回合的投掷记录
  state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id] = [];
  
  // 更新玩家的得分历史记录
  if (activePlayer.scoreHistory) {
    const currentRoundIndex = activePlayer.scoreHistory.recentRounds.findIndex(
      round => round.roundNumber === state.gameState.currentRound
    );
    if (currentRoundIndex !== -1) {
      activePlayer.scoreHistory.recentRounds.splice(currentRoundIndex, 1);
    }
  }
  
  // 重置当前镖数
  state.gameState.currentDart = 0;
  
  // 重置目标更新标志（如果之前打中过）
  state.gameState.shouldUpdateTarget = false;
  
  // 不重新生成目标区域，保持当前的目标不变
  // randomScore 保持不变，让玩家继续打相同的目标
  
  console.log(`🎯 [练习模式重投] 回合${state.gameState.currentRound}重投完成`);
  console.log(`   重投前: 命中${beforeStats.hitDart}/${beforeStats.showAssembleDart}, 命中率${beforeStats.accuracy}%`);
  console.log(`   重投后: 命中${state.gameState.hitDart}/${state.gameState.showAssembleDart}, 命中率${state.gameState.accuracy}%`);
  console.log(`   本回合回退: ${roundHits > 0 ? 1 : 0}次命中, 总投掷回退${actualDartsThrown}镖, 分母回退${roundCountedInDenominator ? 1 : 0}`);
  console.log(`   当前目标区域保持不变: ${randomScore.originalScore}分区，${randomScore.score}分`);
};

// 音频动画播放
const useAudioPlayerFun = (score, gameConfig, currentRoundScores) => {
  let urlMp4 = useAudioPlayerFunIf(gameConfig, currentRoundScores);
  let urlMp3 = playAudioPlayerFunIf(gameConfig, currentRoundScores);

  if (urlMp4 || urlMp3) {
    urlMp4 ? playerContentRef.value.playVideo(urlMp4, true, () => {
    }) : "";
    urlMp3 ? useAudioPlayer().playAudio(urlMp3) : "";
  } else {
    useAudioPlayer().playAudio('/static/mp3/jzbk.mp3');
    // useAudioPlayer().playAudio('/static/mp3/dart.wav');
  }
}

//保存用户训练模式数据
const saveTrain = () => {

  let totalScore = 0;// 团队总分
  state.teamArray.forEach((team) => {
    team.players.forEach((player) => {
      player.scoreHistory.recentRounds.forEach((round) => {
        totalScore += round.total; // 团队总分
      });
    });
  });

  let data = {
    playerId: userInfo?.id,
    nullDart: state.gameState.nullDart,
    hitDart: state.gameState.hitDart,
    assembleDart: state.gameState.assembleDart,
    accuracy: state.gameState.accuracy,
    score: totalScore,
    random: state.gameSettings.partition //可获分区选择
  }
  gameTrain.Api.postCreate(data)

}


const calculateGameResult = (teams) => {
  // 深拷贝防止影响原数据
  const sortedTeams = JSON.parse(JSON.stringify(teams));

  // 计算每个团队的总分、命中几中几和命中率
  sortedTeams.forEach((team) => {
    let totalScore = 0;

    team.players.forEach((player) => {
      player.scoreHistory.recentRounds.forEach((round) => {
        totalScore += round.total; // 团队总分
      });
    });

    team.totalScore = totalScore; //总分
    team.totalHits = state.gameState.hitDart; //命中数
    team.totalThrows = state.gameState.assembleDart; //总投掷次数
    team.accuracy = state.gameState.accuracy; // 保留两位小数
  });

  // 按规则排序
  return sortedTeams.sort((a, b) => {
    if (a.totalScore === b.totalScore) {
      // 分数相同，按命中率从高到低排序
      if (b.accuracy === a.accuracy) {
        // 命中率相同，按玩家数量排序
        return b.players.length - a.players.length;
      }
      return b.accuracy - a.accuracy;
    }
    // 分数高的排前面
    return b.totalScore - a.totalScore;
  });
};

// 判断是否满足开局条件
const checkStartCondition = (gameConfig) => {
  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
  if (!activeTeam) return;

  const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];
  if (!activePlayer) return;

  // 如果已经开始了,直接返回true
  if (activePlayer.hasStarted) return true;

  // 二倍区开局
  // if (state.gameSettings.opening === 1) {
  //   return gameConfig.multiplier === 2 || gameConfig.multiplier === 4;
  // }

  // // 倍数区开局(二倍或三倍区)
  // else if (state.gameSettings.opening === 2) {
  //   return gameConfig.multiplier === 2 || gameConfig.multiplier === 3 || gameConfig.multiplier === 4;
  // }

  // 没有开局要求
  return true;
};

const getDomMessage = async (id) => {
  await agreement.Api.findById(id)
      .then((res => {
        showToast({
          title: res.title,
          message: res.content,
          isSticky: true
        });
      }))
}

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
            @rethrow="practiceRethrow()"
            @restart="gameCommon.restartGame(restart)"
            @endGame="gameCommon.endGame('/pages/game/home/index')"
            @showRules="getDomMessage(13)"
            @updateScore="updateTeamScore"
            @move-to-next-player="moveToNextPlayerLocal"
            :teams="state.teamArray"
            :change-turn="state.gameState.isRoundEnd"
            :mode="modeName"
            :player="getActivePlayer"
            :max-round="state.gameState.maxRounds"
            :round="state.gameState.currentRound"
            :randomScore="randomScore"
            :practice="state.gameState"
        />
      </view>
      <team-display :players="state.teamArray" :gameSettingsType="7"/>
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
    <!-- <debug-panel
          :current-round="state.gameState.currentRound"
          :current-dart="state.gameState.currentDart"
          @throw-dart="(data)=>bluetooth().setScoreCallback(data)"
      /> -->
  </view>
</template>

<style scoped lang="scss"></style>
