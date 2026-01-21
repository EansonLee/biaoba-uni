<script setup>
import {computed, reactive, ref, watch, nextTick} from 'vue';
import PlayerContent from "@/sheep/components/game/01/playerContent.vue";
import {onLoad, onReady, onUnload} from '@dcloudio/uni-app';
import {getParams} from "@/sheep/router";
import {useI18n} from "vue-i18n";
import TeamDisplay from "@/sheep/components/game/01/teamDisplay.vue";
import TransitionScreen from "@/sheep/components/common/transitionScreen.vue";
import TransitionScreenText from "@/sheep/components/common/transitionScreenText.vue";
import {useGameCommon} from "@/sheep/hooks/useGameCommon";
import bluetooth from "@/sheep/stores/bluetooth";
import {showToast} from "@/sheep/util/toast";
import {getGameConfig, useAudioPlayerFunIf,playAudioPlayerFunIf} from "@/sheep/config/bluetoothConfig";
import DebugPanel from "@/sheep/components/debug/debugPanel.vue";
import {useAudioPlayer} from "@/sheep/util/useAudioPlayer";


const {locale} = useI18n();

// 添加一个全局标志位来防止重复换人
let isChangingPlayer = false;

const state = reactive({
  teamArray: [], // 队伍数组
  gameSettings: {},
  gameState: {
    currentRound: 1, // 当前回合
    currentTeam: 1, // 当前投掷的队伍
    currentPlayerIndex: 0, // 当前队伍中的玩家索引
    currentDart: 0, // 当前投掷的镖数(1-3)
    maxRounds: 20, // 最大回合数
    roundScores: {}, // 每回合的得分记录 {roundId: {teamId: {playerId: [得分数组]}}}
    averageScores: {}, // 每个玩家的平均分 {playerId: averageScore}
    // 修改回合结束的判断逻辑
    isRoundEnd: computed(() => {
      // 当前镖数为3且已经投掷完成时才算回合结束
      return state.gameState.currentDart === 3;
    }),
    teamSize: 1,
    duelMode: 1,
  },
  modeEntity: {},
});
const gameCommon = useGameCommon();
const modeName = ref();
const playerContentRef = ref(null)
const bingdo = ref(false);

// 获取路由传递的参数并初始化游戏
onLoad((options) => {
  const params = getParams(options);
  // 初始化游戏状态
  initGameState(params);
});

onReady(() => {
  gameCommon.handleGameStart(modeName.value, state.gameState.currentRound, state.teamArray[0].players[0].playerName,playerContentRef)
  // playerContentRef.value.playVideo("/Animation/Freeze.mp4",true,()=>{
  //   gameCommon.handleGameStart(modeName.value, state.gameState.currentRound, state.teamArray[0].players[0].playerName,playerContentRef)
  // });
  // useAudioPlayer().playAudio("/static/mp3/bingdo.mp3");
  // playerContentRef.value.playVideo("/static/gif/bingdo.gif",true,()=>{
  //   gameCommon.handleGameStart(modeName.value, state.gameState.currentRound, state.teamArray[0].players[0].playerName,playerContentRef)
  // });
})

// 防重复处理的标志
const isProcessingDart = ref(false);
const isProcessingHandChange = ref(false);
let handChangeProcessingTimer = null;

// 设置蓝牙数据回调函数 - 每次接收数据都会触发
bluetooth().setScoreCallback((newVal) => {
  if (newVal) {
    // 处理换手按钮（在所有模式下都有效）
    if (newVal==='65'||newVal===65){
      // 🔧 防止重复处理换手按钮
      if (isProcessingHandChange.value) {
        return;
      }
      moveToNextPlayer();
      return;
    }

    // 🔧 防止重复处理本地蓝牙投镖
    if (isProcessingDart.value) {
      return;
    }

    if (!state.gameState.isRoundEnd){
      blurScore(newVal);
    }
  }
});

// 初始化游戏状态
const initGameState = async (params) => {
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
    team.teamHasStarted = false; // 团队开局标记（2v2共享）
    let color;
    team.players.forEach((player, index) => {
      if (index === 0) {
        color = player.averageColor;
      } else {
        player.averageColor = color;
      }
      player.currentScore = team.startingScore
      player.isFrozen = false; // 初始化冰冻状态
      player.showFreezeEffect = false; // 初始化冰冻特效显示状态
      state.gameState.averageScores[player.id] = {
		  average : 0, //平均分
		  scoreAverage: 0, //总分数
		  currentDartAverage:0//总标数
	  };
    });
  });
  modeName.value = locale.value === 'zh' ? state.modeEntity.chineseModeName : state.modeEntity.englishModeName;
};

const blurScore = (data) => {
  // 防止重复处理
  if (isProcessingDart.value) {
    return;
  }

  // 设置处理标志
  isProcessingDart.value = true;

  const gameConfig = getGameConfig(data);
  gameConfig.gameType = state.modeEntity.type
  let score = gameConfig.score;

  // 判断是否是牛眼，判断牛眼分数
  if (gameConfig.multiplier === 5 && (state.gameSettings.bullEyeFraction === 50 || gameConfig.bullEyeFraction === '50')) {
    score = 50;
  }

  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
  const activePlayer = activeTeam?.players[state.gameState.currentPlayerIndex];

  // 在本回合第一镖前记录开局状态快照，供重投时恢复
  if (state.gameState.currentDart === 0 && activePlayer) {
    activePlayer.hasStartedAtRoundStart = !!activePlayer.hasStarted;
    activePlayer._snapshotRoundNumber = state.gameState.currentRound;
  }

  // 检查开局条件
  if (!activePlayer?.hasStarted) {
    if (checkStartCondition(gameConfig)) {
      // 任一队员满足开局条件，整个队伍视为已开局（2v2共享）
      activeTeam.teamHasStarted = true;
      activePlayer.hasStarted = true;
      // 如果满足开局条件,处理得分
      handleScore(score, gameConfig);
    } else {
      // 没有满足开局条件,只增加镖数
      handleScore(0, gameConfig);
      showToast({
        message: locale.value === 'zh' ? '需要击中特定区域才能开始计分' : 'Score only in designated area',
        icon: 'none'
      });
    }
  } else {
    // 已经开局了,正常处理得分
    handleScore(score, gameConfig);
  }
}

// 投镖得分处理
const handleScore = (score, gameConfig) => {
  // 判断是否换手
  if (state.gameState.isRoundEnd) return;
  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
  if (!activeTeam) return;

  const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];
  if (!activePlayer) return;

  // 确保玩家有得分记录结构
  if (!activePlayer.scoreHistory) {
    activePlayer.scoreHistory = {
      recentRounds: [],
      currentRound: []
    };
  }

  // 计算扣分后的分数
  const newScore = activePlayer.currentScore - score;

  // 记录本次投镖分数
  if (!state.gameState.roundScores[state.gameState.currentRound][activeTeam.team]) {
    state.gameState.roundScores[state.gameState.currentRound][activeTeam.team] = {};
  }
  if (!state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id]) {
    state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id] = [];
  }

  const throwRecord = {
    multiplier: gameConfig.multiplier,
    score: score,
    originalScore: gameConfig.originalScore,
  };

  // 添加得分记录
  state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id].push(throwRecord);

  // 即时更新历史记录
  const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id];
  const roundTotal = currentRoundScores.reduce((sum, item) => sum + item.score, 0);

//更新当前玩家平均分（PPR） //
  let scoreAverage = state.gameState.averageScores[activePlayer.id].scoreAverage + score  //总分数
  let average = state.gameState.averageScores[activePlayer.id].average
  let currentDartAverage = state.gameState.averageScores[activePlayer.id].currentDartAverage + 1 //总标数
  let avg = 0;
  if (currentDartAverage > 0) {
      avg = scoreAverage / currentDartAverage;
  }
  const throwAverage = {
	  average : Number(avg.toFixed(2)), // 【修复】强制转换为数字类型，解决prop警告
	  scoreAverage: scoreAverage, //总分数
	  currentDartAverage:currentDartAverage //总标数
  }
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

  // 更新当前镖数
  state.gameState.currentDart++;

  // 更新团队当前分数
  activePlayer.currentScore = newScore;

  // 处理分数为0或超出的情况
  if (newScore < 0) {
    handleScoreOverflow(activeTeam, activePlayer);
    return; // 爆镖后直接返回，不继续处理
  }
  // 检查结束条件
  if (newScore === 0 && !checkFinishCondition(score, gameConfig)) {
    handleScoreOverflow(activeTeam, activePlayer);
    // showToast({
    //   message: '需要以特定方式结束游戏',
    //   icon: 'none'
    // });
    return; // 爆镖后直接返回，不继续处理
  }

  // 统计团队分数
  activeTeam.currentScore = activeTeam.players.reduce((sum, player) => sum + player.currentScore, 0);

  // 检查是否达到胜利条件（增加冰冻状态判断）
  const isTeamFrozen = activeTeam.players.some(p => p.isFrozen);

  if (newScore === 0) {
    // 找到队内分数最高的玩家
    const highestScorePlayer = activeTeam.players.reduce((maxPlayer, p) => p.currentScore > maxPlayer.currentScore ? p : maxPlayer, activeTeam.players[0]);

    // 冰冻状态下的胜利条件判断
    if (!isTeamFrozen) {
      // 队伍未冰冻，可以正常获胜
      const playerNames = activeTeam.players.map(player => player.playerName).join('、');
      if(currentDartAverage === 9){
        playerContentRef.value.playVideo("/static/gif/PEPFECT-GAME_04.08S.gif", true, () => {})
        useAudioPlayer().playAudio('/static/mp3/PerfectGame.mp3');
        setTimeout(() => {
          gameCommon.handleGameEnd('PEPFECTGAME', playerNames, playerContentRef);
        }, 4000);
        return;
      }
      gameCommon.handleGameEnd('score', playerNames, playerContentRef);
      return;
    } else {
      // 队伍处于冰冻状态
      if (activePlayer.id === highestScorePlayer.id) {
        // 解除冰冻条件2：分值最高的队友能够自己结束游戏
        console.log(`[Freeze] 队伍 ${activeTeam.team} 分值最高玩家 ${activePlayer.playerName} 结束游戏，解除冰冻`);
        const playerNames = activeTeam.players.map(player => player.playerName).join('、');
        gameCommon.handleGameEnd('score', playerNames, playerContentRef);
        return;
      } else {
        // 其他玩家在冰冻状态下结束游戏，视为爆分
        console.log(`[Freeze] 玩家 ${activePlayer.playerName} 在冰冻状态下分数清零，但不是分值最高玩家，按爆分处理。`);
        handleScoreOverflow(activeTeam, activePlayer);
        return;
      }
    }
  }

  // 【优化】统一调用checkFreezeState来处理冰冻逻辑，移除此处的独立实现
  state.teamArray.forEach(t => checkFreezeState(t, state.teamArray));

  // 检查是否在投镖过程中剩余1分且有结束条件限制
  if (
    newScore === 1 &&
    (state.gameSettings.finish === 1 || state.gameSettings.finish === 2)
  ) {
    // 强制设置为投完三镖，然后按爆镖处理
    state.gameState.currentDart = 3;
    handleScoreOverflow(activeTeam, activePlayer);
    return;
  }

  // 【最终修复】确保在所有逻辑处理完毕后（包括爆分、冰冻状态和音效）才检查回合是否结束
  // 这样无论是正常投完三镖还是中途爆分（currentDart被设为3），都能正确处理队伍回合数
  if (state.gameState.currentDart === 3) {
    // 检查是否剩余1分且有结束条件限制，如果是则按爆镖处理
    if (newScore === 1 && (state.gameSettings.finish === 1 || state.gameSettings.finish === 2)) {
      console.log(`[剩余1分] 玩家 ${activePlayer.playerName} 投完三镖后剩余1分，按爆镖处理`);
      handleScoreOverflow(activeTeam, activePlayer);
      return;
    }
    
    // 只有在正常投完三镖的情况下才增加teamRoundNbr（爆镖情况下已经在handleScoreOverflow中处理了）
    if (newScore >= 0) {
      console.log(`[回合结束] 玩家 ${activePlayer.playerName} 正常投完三镖，队伍回合数增加。当前队伍回合数：${activeTeam.teamRoundNbr} -> ${activeTeam.teamRoundNbr + 1}`);
      activeTeam.teamRoundNbr++;
    }
  }

  // 在所有逻辑处理完成后播放音效，避免与爆镖音效冲突
  useAudioPlayerFun(score, gameConfig, currentRoundScores);

  // 重置处理标志（延迟重置，防止快速重复触发）
  setTimeout(() => {
    isProcessingDart.value = false;
  }, 300);
};


// 音频动画播放
const useAudioPlayerFun = (score, gameConfig, currentRoundScores) => {
  let urlMp4 = useAudioPlayerFunIf(gameConfig, currentRoundScores);
  console.log("mp4为：" + urlMp4);
  let urlMp3 = playAudioPlayerFunIf(gameConfig, currentRoundScores);
  console.log("mp3为：" + urlMp3);

  // 最小化修复（Freeze）：第三镖为T20且未有回合级GIF时，补充T20动效与音效
  const isThirdDart = Array.isArray(currentRoundScores) && currentRoundScores.length === 3;
  const isCurrentDartT20 = gameConfig?.gameType === 1 && gameConfig?.multiplier === 3 && gameConfig?.originalScore === 20;
  if (isThirdDart && isCurrentDartT20 && !urlMp4) {
    urlMp4 = "/static/gif/t20-1.09S.gif";
    if (!urlMp3 || urlMp3 === "/static/mp3/shanbei.mp3") {
      urlMp3 = "/static/mp3/T20.mp3";
    }
  }

  if (urlMp4 || urlMp3) {
    let outTime = 0;
    urlMp4 ? playerContentRef.value.playVideo(urlMp4, true, () => {}) : "";

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
    useAudioPlayer().playAudio('/static/mp3/jzbk.mp3');
    // useAudioPlayer().playAudio('/static/mp3/dart.wav');
  }
}


// 处理分数超出的情况
const handleScoreOverflow = (team, player) => {
  playerContentRef.value.playVideo("/static/gif/bust02s.gif", true, () => {});
  setTimeout(() => {
    useAudioPlayer().playAudio('/static/mp3/BUST.mp3');
  }, 500);

  const activePlayer = team.players[state.gameState.currentPlayerIndex];

  // 获取当前回合的所有得分
  const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound]?.[team.team]?.[activePlayer.id] || [];

  // 回退分数 - 恢复到本回合开始前的分数
  const currentRoundTotal = currentRoundScores.reduce((sum, item) => sum + item.score, 0);
  activePlayer.currentScore = activePlayer.currentScore + currentRoundTotal;

  // 清空当前回合的得分记录，因为它们已无效
  if (state.gameState.roundScores[state.gameState.currentRound]?.[team.team]) {
    state.gameState.roundScores[state.gameState.currentRound][team.team][activePlayer.id] = [];
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

  // 更新或添加BUST回合记录
  const existingRecordIndex = activePlayer.scoreHistory.recentRounds.findIndex(
    record => record.roundNumber === state.gameState.currentRound
  );

  if (existingRecordIndex !== -1) {
    activePlayer.scoreHistory.recentRounds[existingRecordIndex] = roundRecord;
  } else {
    activePlayer.scoreHistory.recentRounds.push(roundRecord);
  }

  // 爆分后，立即重新检查所有队伍的冰冻状态
  state.teamArray.forEach(t => checkFreezeState(t, state.teamArray));

  // 爆镖后需要增加团队轮数并强制结束回合
  team.teamRoundNbr++;
  state.gameState.currentDart = 3;

  // 重置处理标志
  setTimeout(() => {
    isProcessingDart.value = false;
  }, 300); 
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

  // 获取当前回合的三镖得分
  const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound]?.[activeTeam.team]?.[activePlayer.id] || [];
  return {
    ...activePlayer,
    recentRounds: activePlayer.scoreHistory.recentRounds,
    currentRoundScores, // 直接使用当前回合的得分记录
    currentScore: activePlayer.currentScore
  };
});

// 重新开始游戏
const restart = () => {
  state.teamArray.forEach(team => {
    team.teamRoundNbr = 0;
    team.teamHasStarted = false;
    team.players.forEach(player => {
      player.hasStarted = undefined;
      player.currentScore = team.startingScore;
      player.isFrozen = false; // 重置冰冻状态
      player.showFreezeEffect = false; // 重置冰冻特效显示状态
      // 清空玩家的得分记录
      if (player.scoreHistory) {
        player.scoreHistory.recentRounds = [];
        player.scoreHistory.currentRound = [];
		
      }
	  state.averageScores = 0;
	  state.gameState.averageScores[player.id] = {
	    average : 0, //平均分
	    scoreAverage: 0, //总分数
	    currentDartAverage:0//总标数
	  };
    });
  });

  // 重置冰冻效果的UI
  bingdo.value = false;

  // 重置游戏状态
  state.gameState.currentRound = 1;
  state.gameState.currentDart = 0;
  state.gameState.roundScores = {1: {}};

  // 重置第一个玩家为活动状态
  state.teamArray.forEach(team => {
    team.players.forEach(player => {
      player.isActive = false;
    });
  });
  state.teamArray[0].players[0].isActive = true;
  state.gameState.currentTeam = state.teamArray[0].team;
  state.gameState.currentPlayerIndex = 0;

  gameCommon.handleGameStart(modeName.value, state.gameState.currentRound, state.teamArray[0].players[0].playerName,playerContentRef)
};

// 显示游戏玩法
const showRules = () => {
  gameCommon.showGameRules(state.modeEntity.id)
};

// 判断是否满足开局条件
const checkStartCondition = (gameConfig) => {
  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
  if (!activeTeam) return;

  const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];
  if (!activePlayer) return;

  // 2v2共享：如果团队已开局，则直接允许计分
  if (activeTeam.teamHasStarted) return true;

  // 如果已经开始了,直接返回true
  if (activePlayer.hasStarted) return true;

  // 二倍区开局
  if (state.gameSettings.opening === 1) {
    return gameConfig.multiplier === 2 || gameConfig.multiplier === 4;
  }

  // 倍数区开局(二倍或三倍区，含DBULL)
  else if (state.gameSettings.opening === 2) {
    return gameConfig.multiplier === 2 || gameConfig.multiplier === 3 || gameConfig.multiplier === 4;
  }

  // 没有开局要求
  return true;
};

// 判断是否满足结束条件
const checkFinishCondition = (score, gameConfig) => {
  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
  if (!activeTeam) return false;

  const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];
  if (!activePlayer) return false;

  // 二倍区结束（包含DBULL）
  if (state.gameSettings.finish === 1) {
    return gameConfig.multiplier === 2 || gameConfig.multiplier === 4;
  }
  // 倍数区结束（含DBULL）
  else if (state.gameSettings.finish === 2) {
    return gameConfig.multiplier === 2 || gameConfig.multiplier === 3 || gameConfig.multiplier === 4;
  }

  // 判断当前人员对高分数是否大于其他团队总分，如果大于的话是不允许结束游戏的
  // 获取当前团队玩家的最高分
  const currentTeamMaxScore = Math.max(...activeTeam.players.map(player => player.currentScore));

  // 获取其他团队玩家的最高分
  const otherTeamsMaxScore = Math.max(...state.teamArray.filter(team => team.team !== activeTeam.team).map(team => team.currentScore));
  // 如果大于返回false
  if (currentTeamMaxScore > otherTeamsMaxScore) {
    return false;
  }
  // 没有结束要求
  return true;
};

// 添加计算方法
const calculateGameResult = (teams) => {
  // 深拷贝防止影响原数据
  const processedTeams = JSON.parse(JSON.stringify(teams));

  // 遍历每个团队，找到玩家的最低分并赋值给团队的 `currentScore`
  processedTeams.forEach((team) => {
    team.currentScore = Math.min(...team.players.map((player) => player.currentScore)); // 将最低分赋值给团队
  });

  // 按团队的 `currentScore` 从小到大排序
  return processedTeams.sort((teamA, teamB) => teamA.currentScore - teamB.currentScore);
};

// 【最终修复】使用"加锁防抖"和"后处理"机制，彻底修复换人逻辑
const moveToNextPlayer = () => {
  // 🔧 防止重复处理换手按钮
  if (isProcessingHandChange.value) {
    return;
  }

  // 设置处理标志
  isProcessingHandChange.value = true;

  try {
    // 1. 检查是否正在换人，如果是，则忽略本次请求
    if (isChangingPlayer) {
      return;
    }

    // 2. 上锁，开始换人流程
    isChangingPlayer = true;

  // 3. 先调用原始的moveToNextPlayer函数，让它处理动画和音效，但不使用其换手逻辑
  const playedTransition = gameCommon.moveToNextPlayer(state, playerContentRef);
  
  // 4. 实现freeze01模式的特殊换手逻辑
  // 换手规则：队伍1A → 队伍2A → 队伍3A → 队伍4A → 队伍1B → 队伍2B → ...

  // 计算当前应该轮到哪个玩家
  const totalTeams = state.teamArray.length;
  const playersPerTeam = state.teamArray[0].players.length;

  // 计算全局投掷次数（所有队伍的总投掷轮数）
  const totalThrows = state.teamArray.reduce((sum, team) => sum + team.teamRoundNbr, 0);

  // 计算当前应该是第几个玩家位置（0-based）
  const currentPlayerPosition = Math.floor(totalThrows / totalTeams);
  const currentTeamIndex = totalThrows % totalTeams;

  const correctTeam = state.teamArray[currentTeamIndex];
  const correctPlayerIndex = currentPlayerPosition % playersPerTeam;

  console.log(`[Freeze Team Logic] 队伍轮数详情:`, state.teamArray.map(t => `队伍${t.team}:${t.teamRoundNbr}`));
  console.log(`[Freeze Team Logic] 总投掷次数: ${totalThrows}, 当前队伍索引: ${currentTeamIndex}, 玩家位置: ${currentPlayerPosition}, 玩家索引: ${correctPlayerIndex}`);
  console.log(`[Freeze Team Logic] gameCommon换手后: 队伍${state.gameState.currentTeam}玩家${state.gameState.currentPlayerIndex}`);
  console.log(`[Freeze Team Logic] 应该是: 队伍${correctTeam.team}玩家${correctPlayerIndex}`);

  // 5. 修正队伍和玩家（覆盖gameCommon的换手结果）
  // 清除所有玩家的活跃状态
  state.teamArray.forEach(team => {
    team.players.forEach(player => {
      player.isActive = false;
    });
  });

  // 设置正确的玩家为活动状态
  state.gameState.currentTeam = correctTeam.team;
  state.gameState.currentPlayerIndex = correctPlayerIndex;
  correctTeam.players[correctPlayerIndex].isActive = true;

  console.log(`[Freeze Team Logic] 修正后: 队伍${state.gameState.currentTeam}玩家${state.gameState.currentPlayerIndex}(${correctTeam.players[correctPlayerIndex].playerName})`);

  // 4. 检查新的活动玩家是否处于冰冻状态，如果是则触发冰冻效果
  const activeTeam = state.teamArray[state.gameState.currentTeam - 1];
  const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];

  // 换人后，立即为所有队伍检查一次冰冻状态
  state.teamArray.forEach(t => checkFreezeState(t, state.teamArray));

  if (activePlayer && activePlayer.showFreezeEffect) {
    console.log(`[Freeze Effect] 轮到玩家 ${activePlayer.playerName}，显示冰冻特效。`);
    // 仅当没有播放其他过渡音效时才播放冰冻音效
    if (!playedTransition) {
      nextTick(() => {
        bingdo.value = true;
        // useAudioPlayer().playAudio("/static/mp3/bingdo.mp3"); // 【修复】使用nextTick延迟播放，避免音频冲突
      });
    }
  } else {
    bingdo.value = false;
  }

    // 5. 延时解锁，防止短时间内重复触发
    setTimeout(() => {
      isChangingPlayer = false;
    }, 500); // 500毫秒的防抖时间
  } finally {
    // 延迟重置换手处理标志
    setTimeout(() => {
      isProcessingHandChange.value = false;
    }, 500);
  }
}

// 新增：独立的冰冻状态检查函数
const checkFreezeState = (team, allTeams) => {
  const opponentTeams = allTeams.filter(t => t.team !== team.team);

  // 计算场上其他队伍分值相加的最低值
  const opponentTeamTotals = opponentTeams.map(t => t.players.reduce((sum, p) => sum + p.currentScore, 0));
  const minOpponentTeamTotal = Math.min(...opponentTeamTotals);

  const teamIsFrozen = team.players.some(p => p.isFrozen);

  // 检查是否触发冰冻：队伍中任意玩家分值 > 场上其他队伍分值相加的最低值
  const hasPlayerAboveThreshold = team.players.some(p => p.currentScore > minOpponentTeamTotal);

  if (hasPlayerAboveThreshold) {
    if (!teamIsFrozen) {
      console.log(`[Freeze] 冰冻条件触发！队伍 ${team.team} 有玩家分值超过对手队伍最低总分 (${minOpponentTeamTotal})`);
      // 整个队伍进入冰冻状态
      team.players.forEach(p => p.isFrozen = true);
    }

    // 无论是新进入冰冻状态还是已经处于冰冻状态，都要重新分配冰冻特效
    // 找到队内分值最低且分数≤180的玩家，标记为显示冰冻特效
    const eligiblePlayers = team.players.filter(p => p.currentScore <= 180);
    
    if (eligiblePlayers.length > 0) {
      const lowestScorePlayer = eligiblePlayers.reduce((minPlayer, p) =>
        p.currentScore < minPlayer.currentScore ? p : minPlayer, eligiblePlayers[0]);

      // 检查当前显示冰冻特效的玩家是否需要更换
      const currentFreezeEffectPlayer = team.players.find(p => p.showFreezeEffect);

      if (!currentFreezeEffectPlayer || currentFreezeEffectPlayer.id !== lowestScorePlayer.id) {
        // 重置所有玩家的冰冻特效标记
        team.players.forEach(p => p.showFreezeEffect = false);
        // 只有分值最低且≤180分的玩家显示冰冻特效
        lowestScorePlayer.showFreezeEffect = true;

      }
    } else {
      // 如果没有符合条件的玩家（所有玩家分数都>180），则不显示冰冻特效
      team.players.forEach(p => p.showFreezeEffect = false);
    }
  } else {
    // 检查是否解除冰冻：所有玩家分值都 < 场上其他队伍分值相加的最小值
    if (teamIsFrozen) {
      console.log(`[Freeze] 解除冰冻条件触发！队伍 ${team.team} 所有玩家分值都低于对手队伍最低总分 (${minOpponentTeamTotal})`);
      team.players.forEach(p => {
        p.isFrozen = false;
        p.showFreezeEffect = false;
      });
    }
  }
}

// 页面卸载时清理资源
onUnload(() => {
  // 🔧 优化：退出游戏时保持蓝牙连接，提升用户体验
  // 用户可以在不同游戏之间切换而无需重新连接蓝牙
  console.log('01 Freeze游戏页面已卸载，蓝牙连接保持');
});
</script>

<template>
  
  <view class="uni-body container" :style="bingdo ? 'background-image: url(\'/static/gif/bingdo.gif\'); background-size: 100% 100%;' : ''">

    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view class="uni-h-full" >
        <!-- <image  src="/static/gif/bingdo.gif" mode="widthFix" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></image> -->
        <PlayerContent
            :calculateResult="calculateGameResult"
            ref="playerContentRef"
            :type="state.modeEntity.type || 0"
            @restart="gameCommon.restartGame(restart)"
            @endGame="gameCommon.endGame('/pages/game/01/gameSelection')"
            @rethrow="gameCommon.rethrowCurrentRound(state.gameState, state.teamArray)"
            @showRules="showRules"
            @move-to-next-player="moveToNextPlayer"
            :teams="state.teamArray"
            :change-turn="state.gameState.isRoundEnd"
            :mode="modeName"
            :player="getActivePlayer"
            :max-round="state.gameState.maxRounds"
            :round="state.gameState.currentRound"
        />
      </view>
      <team-display :players="state.teamArray" :duelMode="state.gameSettings.duelMode"/>
    </view>

    <!-- 添加过场动画组件 -->
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
<!--    <debug-panel-->
<!--        :current-round="state.gameState.currentRound"-->
<!--        :current-dart="state.gameState.currentDart"-->
<!--        @throw-dart="(data)=>bluetooth().setScoreCallback(data)"-->
<!--    />-->
  </view>
</template>

<style scoped lang="scss">
</style>
