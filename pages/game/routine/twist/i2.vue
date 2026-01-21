<script setup>
import {computed, reactive, ref, watch} from 'vue';
import PlayerContent from "@/sheep/components/game/01/playerContent.vue";
import {onLoad, onReady, onUnload} from '@dcloudio/uni-app';
import {getParams} from "@/sheep/router";
import {useI18n} from "vue-i18n";
import TeamDisplay from "@/sheep/components/game/01/teamDisplay.vue";
import TransitionScreen from "@/sheep/components/common/transitionScreen.vue";
import TransitionScreenText from "@/sheep/components/common/transitionScreenText.vue";
import {useGameCommon} from "@/sheep/hooks/useGameCommon2";
import bluetooth from "@/sheep/stores/bluetooth";
import {showToast} from "@/sheep/util/toast";
import {getGameConfig, useAudioPlayerFunIf,playAudioPlayerFunIf,getScoreConfig,getGameConfigGrouping, SCORING_AREAS } from "@/sheep/config/bluetoothConfig";
import DebugPanel from "@/sheep/components/debug/debugPanel.vue";
import {useAudioPlayer} from "@/sheep/util/useAudioPlayer";

import agreement from "@/sheep/api/dart/agreement";

const {locale} = useI18n();

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
    averageScores: {}, // 每个玩家的平均分记录 {playerId: averageScore}
    // 修改回合结束的判断逻辑
    // isRoundEnd: computed(() => {
    //   // 当前镖数为3且已经投掷完成时才算回合结束
    //   return state.gameState.currentDart === 3;
    // }),
    isRoundEnd: false,
    teamSize: 1,
  },
  modeEntity: {},
  // 记录团队区域中标情况
  hitAreas: {},
  teamLocks: {},
});

const gameCommon = useGameCommon();
const modeName = ref();
const playerContentRef = ref(null);
const showGif=ref(false);
const HeartsHit=ref(0);

// 获取路由传递的参数并初始化游戏
onLoad((options) => {
  const params = getParams(options);
  params.gameSettings.roundNbr = 8;
  // 初始化游戏状态
  initGameState(params);
});

onReady(() => {
  gameCommon.handleGameStart(modeName.value, state.gameState.currentRound, state.teamArray[0].players[0].playerName,playerContentRef)
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
    team.combo = 1;
    team.teamRoundNbr = 0;
    team.currentScore = team.startingScore;
    team.hasHitValidArea = false; // 初始化有效区域标记
    state.hitAreas[team.team] = {};
    team.players.forEach(player => {
      state.gameState.averageScores[player.id] = [];
    });
  });
  modeName.value = locale.value === 'zh' ? shanghaiThrill(state.modeEntity.chineseModeName) : state.modeEntity.englishModeName;

};

function shanghaiThrill(item) {
  if(item === '上海TWIST'){
    return  '上海挑战'
  }else{
    return item
  }
}


// 本地换手函数，带防重复机制
const moveToNextPlayerLocal = () => {
  // 🔧 防止重复处理换手按钮
  if (isProcessingHandChange.value) {
    return;
  }

  // 设置处理标志
  isProcessingHandChange.value = true;

  try {
    moveToNextPlayer();
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
    handleScore(gameConfig.score, gameConfig);
  } finally {
    // 延迟重置处理标志
    setTimeout(() => {
      isProcessingDart.value = false;
    }, 100);
  }
}

// 投镖得分处理
const handleScore = (score, gameConfig) => {
  // 判断是否换手
  if (state.gameState.isRoundEnd) return;

  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
  const activePlayer = activeTeam?.players[state.gameState.currentPlayerIndex];

  if (!activePlayer) return;
  
  // 获取实际分区和倍数
  const scoringArea = gameConfig.originalScore;
  const multiplier = gameConfig.multiplier || 1; // 获取倍数，默认为1
  let newScore = 0; // 用于最后加分

  // 获取当前区域状态
  const currentAreaStatus = state.hitAreas?.[activeTeam.team]?.[scoringArea]?.status;

  // 🎵 记录区域状态用于音效判断
  const isHighlightArea = currentAreaStatus === 2; // 高亮区域
  const isAlreadyHit = currentAreaStatus === 1;    // 已被击中的区域
  const isNormalArea = currentAreaStatus === 0 || !currentAreaStatus; // 普通区域

  gameConfig.isHighlightArea = isHighlightArea;
  gameConfig.isAlreadyHit = isAlreadyHit;
  gameConfig.isNormalArea = isNormalArea;

  // 判断是否为有效区域
  let isValidArea = false;
  
  if (scoringArea >= 1 && scoringArea <= 20) {
    // 1-20区域：未消除就是有效区域
    isValidArea = !isAlreadyHit;
  } else if (scoringArea === 21) {
    // 牛眼区域：只有1-20全部清除后才有效
    // 检查1-20区域是否全部清除
    const is1To20Cleared = Array.from({ length: 20 }, (_, i) => i + 1)
      .every(num => state.hitAreas[activeTeam.team]?.[num]?.status === 1);
    isValidArea = is1To20Cleared;
  }

  // 🎯 有效区域才能获得分数和消除
  if (isValidArea) {
    // 🔥 新逻辑：每一镖击中有效区域就立即增加combo
    if (!activeTeam.combo) {
      activeTeam.combo = 1;
    }
    activeTeam.combo++;
    
    // 同步所有队友的combo值（如果是团队赛）
    if (state.gameState.teamSize > 1) {
      // 找到所有同队的团队并同步combo值
      state.teamArray.forEach(team => {
        if (team.team === activeTeam.team && team !== activeTeam) {
          team.combo = activeTeam.combo;
        }
      });
    }
    
    if (scoringArea >= 1 && scoringArea <= 20) {
      // 1-20区域正常计分（使用更新后的combo）
      newScore = score * activeTeam.combo * state.gameState.currentRound;
    } else if (scoringArea === 21) {
      // 牛眼特殊处理
      if (multiplier === 5) {
        newScore = 1000;  // 外牛眼
      } else if (multiplier === 4) {
        newScore = 10000; // 内牛眼
      }
    }

    // 标记本回合击中了有效区域
    activeTeam.hasHitValidArea = true;
  } else {
    // 无效区域：不得分
    newScore = 0;
  }

  gameConfig.isValidArea = isValidArea;

  // 初始化区域记录
  if (!state.hitAreas[activeTeam.team]) {
    state.hitAreas[activeTeam.team] = {};
  }
  if (!state.hitAreas[activeTeam.team][scoringArea]) {
    state.hitAreas[activeTeam.team][scoringArea] = {};
  }

  // 🎯 有效区域且是1-20区域才消除
  if (isValidArea && scoringArea >= 1 && scoringArea <= 20) {
    state.hitAreas[activeTeam.team][scoringArea].status = 1;
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
    area: scoringArea === 21 ? 'B' : scoringArea,
    multiplier: multiplier,
    score: newScore,
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



  // 更新当前镖数
  state.gameState.currentDart++;
  if (state.gameState.currentDart === 3 ) {
    state.gameState.isRoundEnd=true;
  }

  // 统一加分
  if (newScore > 0) {
    activeTeam.currentScore += newScore;
  }

  // 注意：combo的更新移到了换手时处理，这里不再立即更新


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
      //胜利改状态
      state.gameState.isRoundEnd = false;
      // 调用游戏结束处理
      gameCommon.handleGameEnd('score', playerNames, playerContentRef);
      showGif.value = false; // 确保在游戏结束后gif不会显示
    }
  }

  // 检查1-20是否全部清除，决定是否显示gif
  const teamIs1To20Cleared = Array.from({ length: 20 }, (_, i) => i + 1).every(num => {
    return state.hitAreas[activeTeam.team]?.[num]?.status === 1;
  });
  
  if (teamIs1To20Cleared) {
    showGif.value = true;
  } else {
    showGif.value = false;
  }
  
  // 每次击中牛眼都要更新HeartsHit值以触发动画
  if (teamIs1To20Cleared && scoringArea === 21) {
    if (multiplier === 4) { // 内牛眼
      // 使用时间戳确保值变化，触发watch
      HeartsHit.value = 10000 + Date.now() % 100;
    } else if (multiplier === 5) { // 外牛眼
      // 使用时间戳确保值变化，触发watch
      HeartsHit.value = 1000 + Date.now() % 100;
    }
  } else {
    HeartsHit.value = 0;
  }
  useAudioPlayerFun(gameConfig, currentRoundScores)
};


// 音频动画播放
const useAudioPlayerFun = (gameConfig, currentRoundScores) => {
  let urlMp4 = useAudioPlayerFunIf(gameConfig,currentRoundScores);
  let urlMp3 = playAudioPlayerFunIf(gameConfig,currentRoundScores);

  // 🎵 Twist游戏音效逻辑：根据区域有效性和倍数播放不同音效
  const multiplier = gameConfig.multiplier || 1;

  if (gameConfig.isAlreadyHit) {
    // 击中已消除的区域：播放无效区音效
    useAudioPlayer().playAudio('/static/mp3/mlsfdfqyu.mp3');
    return;
  }

  if (!gameConfig.isValidArea) {
    // 击中无效区域（如1-20未清完时的牛眼）：播放无效区音效
    useAudioPlayer().playAudio('/static/mp3/mlsfdfqyu.mp3');
    return;
  }

  if (gameConfig.isValidArea) {
    // 击中有效区域：根据倍数播放对应音效
    if (multiplier === 1) {
      useAudioPlayer().playAudio('/static/mp3/danbei.mp3');
    } else if (multiplier === 2) {
      useAudioPlayer().playAudio('/static/mp3/shuangbei.mp3');
    } else if (multiplier === 3) {
      useAudioPlayer().playAudio('/static/mp3/shanbei.mp3');
    } else if (multiplier === 4) {
      // 内牛眼
      useAudioPlayer().playAudio('/static/mp3/dbull.mp3');
    } else if (multiplier === 5) {
      // 外牛眼
      useAudioPlayer().playAudio('/static/mp3/bull.mp3');
    }
    return;
  }

  // 其他情况使用原有逻辑
  if (urlMp4 || urlMp3) {
    urlMp4?playerContentRef.value.playVideo(urlMp4, true, () => {}):"";
    urlMp3?useAudioPlayer().playAudio(urlMp3):"";
  } else {
    useAudioPlayer().playAudio('/static/mp3/jzbk.mp3');
  }
}




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
    currentScore: activeTeam.currentScore,
    combo: activeTeam.combo,
  };
});

// 重新开始游戏
const restart = () => {
  state.gameState.isRoundEnd=false;
  showGif.value = false; // 重置gif显示状态
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
  // 重置第一个玩家为活动状态
  state.teamArray.forEach(team => {
    state.hitAreas[team.team] = {};
    team.combo = 1;
    team.hasHitValidArea = false; // 重置有效区域标记
    team.players.forEach(player => {
      player.isActive = false;
    });
  });
  state.teamArray[0].players[0].isActive = true;
  state.gameState.currentTeam = state.teamArray[0].team;
  state.gameState.currentPlayerIndex = 0;

  gameCommon.handleGameStart(modeName.value, state.gameState.currentRound, state.teamArray[0].players[0].playerName,playerContentRef)
};

// 添加更新分数的方法
const updateTeamScore = ({teamId, newScore}) => {
  const team = state.teamArray.find(t => t.team === teamId);
  if (team && newScore >= 1) {
    team.currentScore = newScore;
  }
};

// 添加计算方法
const calculateGameResult = (players) => {
  // 深拷贝防止影响原数据
  const sortedPlayers = JSON.parse(JSON.stringify(players));

  // 按分数从大到小序
  return sortedPlayers.sort((a, b) => {
    // 如果分数相同，多人队伍排在前面
    if (a.currentScore === b.currentScore) {
      return b.players.length - a.players.length;
    }
    // 分数高的排在前面
    return b.currentScore - a.currentScore;
  });
};

const color = ['#5bcf45', '#cd29cd', '#3976d0'];
// 换手后的标靶区域统计处理
const getHitAreas = computed(() => {
  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
  // 循环state.hitAreas[activeTeam.team]，并从1-20的区域中找出未标记的区域，再找到最小的区域
  const hitAreas = state.hitAreas[activeTeam.team];
  const unHitAreas = [];
  for (let i = 1; i <= 20; i++) {
    if (!hitAreas[i] || hitAreas[i].status !== 1) {
      unHitAreas.push(i);
    }
  }
  // 将最小的三个区域的size分别设置为50 35 25并给他们三个独立醒目的颜色
  unHitAreas.sort((a, b) => a - b);
  unHitAreas.forEach((area, index) => {
    if (index < 3) {
      hitAreas[area] = {
        status: 2,
        size: index === 0 ? 60 : index === 1 ? 45 : 30,
        color: color[index % color.length], // 循环分配颜色池中的颜色
      };
    }else{
      hitAreas[area] = {
        status: 0,
      }
    }

  });
  return hitAreas;
})

const startOnConfirm = (activeTeam, activePlayer) => {
  // 在新回合开始时，combo已经在换手时更新过了，这里不需要再次更新
}

const routineRethrowCurrentRound = () => {
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

  // 查询出currentRoundScores中score不等于0的数据
  const currentRoundScoresNotZero = currentRoundScores.filter(score => score.score !== 0);

  // 减少团队轮数（如果是最后一镖）
  if (state.gameState.currentDart === 3) {
    activeTeam.teamRoundNbr--;
  }
  const scoreToDeduct = currentRoundScoresNotZero.reduce((sum, score) => sum + score.score, 0);

  // 减去正确计算的分数
  activeTeam.currentScore -= scoreToDeduct;

  // 重置有效区域标记（因为要重新投这一轮）
  if (currentRoundScoresNotZero.length > 0) {
    activeTeam.hasHitValidArea = false;
  }

  // 清空当前回合的投掷记录
  if (state.gameState.roundScores[state.gameState.currentRound]?.[activeTeam.team]) {
    state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id] = [];
  }

  // 重置命中区域
  if (currentRoundScoresNotZero.length > 0) {
    currentRoundScoresNotZero.forEach(score => {
      if (score.originalScore && state.hitAreas[activeTeam.team]?.[score.originalScore]) {
        // 如果区域存在且状态为1（已命中），则删除该区域的记录
        if (state.hitAreas[activeTeam.team][score.originalScore].status === 1) {
          delete state.hitAreas[activeTeam.team][score.originalScore];
        }
        // 如果状态为2（提示区域），重置为未命中状态
        else if (state.hitAreas[activeTeam.team][score.originalScore].status === 2) {
          state.hitAreas[activeTeam.team][score.originalScore].status = 0;
        }
      }
    });
  }

  // 重置当前镖数
  state.gameState.currentDart = 0;
  
  // 重投时重置isRoundEnd状态，允许继续投掷
  state.gameState.isRoundEnd = false;
  
  // 重投时根据有效击中情况调整combo值
  // 如果重投前有击中有效区域，需要回退combo值
  if (currentRoundScoresNotZero.length > 0) {
    // 计算本回合击中的有效区域数量
    const validHits = currentRoundScoresNotZero.filter(score => score.score > 0).length;
    if (validHits > 0 && activeTeam.combo > 1) {
      // 回退combo值（每次有效击中会增加combo，所以要减去对应次数）
      activeTeam.combo = Math.max(1, activeTeam.combo - validHits);
    }
  }

  // 更新玩家的历史记录
  if (activePlayer.scoreHistory) {
    const existingRecordIndex = activePlayer.scoreHistory.recentRounds.findIndex(
        record => record.roundNumber === state.gameState.currentRound
    );
    if (existingRecordIndex !== -1) {
      activePlayer.scoreHistory.recentRounds.splice(existingRecordIndex, 1);
    }
  }

  //判断当前玩家是否将1~20的区域都命中了，如果命中了，则显示gif
  const rethrowIs1To20Cleared = Array.from({ length: 20 }, (_, i) => i + 1).every(num => {
    return state.hitAreas[activeTeam.team]?.[num]?.status === 1;
  });
  if (rethrowIs1To20Cleared){
    showGif.value=true;
  }else {
    showGif.value=false;
  }
};

const getDomMessage  = async (id) => {
  await agreement.Api.findById(id)
      .then((res=>{
        showToast({
          title: res.title,
          message: res.content,
          isSticky: true
        });
      }))
}

const moveToNextPlayer = () => {
  // 🔥 新逻辑：在换手前检查整个回合的情况
  const currentTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
  if (currentTeam) {
    // 如果整个回合都没有击中有效区域，重置combo为1
    if (!currentTeam.hasHitValidArea) {
      console.log(`🎯 [Combo] 队伍${currentTeam.team}整个回合未击中有效区域，combo重置为1`);
      currentTeam.combo = 1;
      
      // miss后同步重置所有队友的combo值
      if (state.gameState.teamSize > 1) {
        state.teamArray.forEach(team => {
          if (team.team === currentTeam.team && team !== currentTeam) {
            team.combo = 1;
          }
        });
      }
    } else {
      console.log(`🎯 [Combo] 队伍${currentTeam.team}本回合击中有效区域，combo保持为${currentTeam.combo}`);
    }

    // 重置有效区域标记，为下一回合做准备
    currentTeam.hasHitValidArea = false;
  }
  
  // 获取下一位玩家
  gameCommon.moveToNextPlayer(state, playerContentRef, null, startOnConfirm);
  
  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
  
  // 判断当前玩家是否将1~20的区域都命中了，如果命中了，则显示gif
  const activeTeamIs1To20Cleared = Array.from({ length: 20 }, (_, i) => i + 1).every(num => {
    return state.hitAreas[activeTeam.team]?.[num]?.status === 1;
  });
  
  HeartsHit.value = 0;
  if (activeTeamIs1To20Cleared) {
    showGif.value = true;
  } else {
    showGif.value = false;
  }
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
            @rethrow="routineRethrowCurrentRound"
            @restart="gameCommon.restartGame(restart)"
            @endGame="gameCommon.endGame('/pages/game/home/index')"
            @showRules="getDomMessage(11)"
            @updateScore="updateTeamScore"
            @move-to-next-player="moveToNextPlayerLocal"
            :teams="state.teamArray"
            :change-turn="state.gameState.isRoundEnd"
            :mode="modeName"
            :player="getActivePlayer"
            :max-round="state.gameState.maxRounds"
            :round="state.gameState.currentRound"
            :team-locks="getHitAreas"
            :showGif="showGif"
            :HeartsHit="HeartsHit"
        />
      </view>
      <team-display :players="state.teamArray"/>
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

<style scoped lang="scss">
</style>
