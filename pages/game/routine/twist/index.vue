<script setup>
import {computed, reactive, ref, watch} from 'vue';
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
import {getGameConfig, useAudioPlayerFunIf,playAudioPlayerFunIf,getScoreConfig,getGameConfigGrouping, SCORING_AREAS } from "@/sheep/config/bluetoothConfig";
import DebugPanel from "@/sheep/components/debug/debugPanel.vue";
import {useAudioPlayer} from "@/sheep/util/useAudioPlayer";
import {useWatchWithLock} from "@/sheep/common/util";

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
// 获取路由传递的参数并初始化游戏
onLoad((options) => {
  const params = getParams(options);
  // 初始化游戏状态
  initGameState(params);
});

onReady(() => {
  gameCommon.handleGameStart(modeName.value, state.gameState.currentRound, state.teamArray[0].players[0].playerName,playerContentRef)
})

// 防重复处理的标志
const isProcessingBluetooth = ref(false);
let bluetoothProcessingTimer = null;

// 监听蓝牙分数
useWatchWithLock(() => bluetooth().scoreCallback, async (newVal) => {
  if (newVal) {
    // 防止重复处理
    if (isProcessingBluetooth.value) {
      console.log('Twist游戏：正在处理蓝牙数据，跳过重复调用');
      return;
    }

    console.log('监听蓝牙分数', newVal)
    isProcessingBluetooth.value = true;

    try {
      // 设置分数为空
      bluetooth().setScoreCallback(null)
      blurScore(newVal);
    } finally {
      // 清理之前的定时器
      if (bluetoothProcessingTimer) {
        clearTimeout(bluetoothProcessingTimer);
      }
      // 延迟重置标志
      bluetoothProcessingTimer = setTimeout(() => {
        isProcessingBluetooth.value = false;
        bluetoothProcessingTimer = null;
      }, 300);
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
    state.hitAreas[team.team] = {};
    team.players.forEach(player => {
      state.gameState.averageScores[player.id] = [];
    });
  });
  modeName.value = locale.value === 'zh' ? state.modeEntity.chineseModeName : state.modeEntity.englishModeName;

};

const blurScore = (data) => {
  console.log('handleData', data);
  if (data === '65') {
    gameCommon.moveToNextPlayer(state, playerContentRef, null, startOnConfirm)
  } else {
    const gameConfig = getGameConfig(data);
	gameConfig.gameType = state.modeEntity.type
    handleScore(gameConfig.score, gameConfig);
  }
}

// 状态检查和修复函数
const checkAndFixGameState = () => {
  // 检查镖数是否异常
  if (state.gameState.currentDart < 0) {
    console.warn('🚨 [Twist状态修复] 镖数异常(小于0)，重置为0');
    state.gameState.currentDart = 0;
  }
  if (state.gameState.currentDart > 3) {
    console.warn('🚨 [Twist状态修复] 镖数异常(大于3)，重置为0');
    state.gameState.currentDart = 0;
  }

  // 检查当前队伍和玩家索引
  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
  if (!activeTeam) {
    console.warn('🚨 [Twist状态修复] 找不到当前队伍，重置为第一队');
    state.gameState.currentTeam = 1;
    state.gameState.currentPlayerIndex = 0;
  }
};

// 投镖得分处理
const handleScore = (score, gameConfig) => {
  // 状态检查和修复
  checkAndFixGameState();

  // 增强防重复处理
  if (isProcessingBluetooth.value) {
    console.log('Twist游戏：正在处理投镖，跳过重复调用');
    return;
  }

  // 检查镖数是否已达到上限
  if (state.gameState.currentDart >= 3) {
    console.log('Twist游戏：当前回合已投完3镖，跳过处理');
    return;
  }

  // 判断是否换手
  console.log("是否换手："+state.gameState.isRoundEnd)
  if (state.gameState.isRoundEnd) return;
  // useAudioPlayer().playAudio('/static/mp3/dart.mp3');

  //如果1~20还没清完，那么投中牛眼是无效的，如果清完，那则是胜利

  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
  const activePlayer = activeTeam?.players[state.gameState.currentPlayerIndex];
  
  
  const infoHitAreas = state.hitAreas[activeTeam.team]
  const isAllStateOne = Object.values(infoHitAreas).every(subObj => subObj.status === 1);
  
  let clearState = false;
  if( isAllStateOne && gameConfig.originalScore === 21  ){
	  clearState = true;
  }
  if (!activePlayer) return;
  // 获取实际分区和倍数
  const scoringArea = gameConfig.originalScore;
  const multiplier = gameConfig.multiplier || 1; // 获取倍数，默认为1

  let newScore; // 用于最后加分
  if (state.hitAreas?.[activeTeam.team]?.[scoringArea]?.status !== 1 ) {
    newScore = score * activeTeam.combo * state.gameState.currentRound;
  } else {
    newScore = 0;
  }
  if(!clearState && gameConfig.originalScore === 21){
	  newScore = 0;
  }

  if (!state.hitAreas[activeTeam.team]) {
    state.hitAreas[activeTeam.team] = {};
  }
  if (!state.hitAreas[activeTeam.team][scoringArea]) {
    state.hitAreas[activeTeam.team][scoringArea] = {};
  }
  state.hitAreas[activeTeam.team][scoringArea].status = 1

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

  // 统一加分
  if (newScore > 0) {
    activeTeam.currentScore += newScore;
    activeTeam.combo++;
  } else {
    activeTeam.combo = 1;
  }

  // 更新当前镖数 - 添加调试日志
  console.log(`🎯 [Twist镖数调试] 投镖前: currentDart=${state.gameState.currentDart}, 玩家=${activePlayer.playerName}`);
  state.gameState.currentDart++;
  console.log(`🎯 [Twist镖数调试] 投镖后: currentDart=${state.gameState.currentDart}, 分数=${score}`);

  if (state.gameState.currentDart === 3 ) {
    console.log('🎯 [Twist] 投完三镖，设置回合结束');
    state.gameState.isRoundEnd=true;
  }

  // 如果投完三镖 或者命中有效牛眼的
  if (state.gameState.currentDart === 3 || clearState) {
    activeTeam.teamRoundNbr++;

    // 检查是否是最后一回合的最后一个玩家的最后一镖
    const isLastRound = state.gameState.currentRound === state.gameState.maxRounds;
    const isLastTeam = state.gameState.currentTeam === state.teamArray[state.teamArray.length - 1].team;
    const isLastPlayer = state.gameState.currentPlayerIndex === activeTeam.players.length - 1;
    if (isLastRound && isLastTeam && isLastPlayer || clearState) {
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
      state.gameState.isRoundEnd=false
      // 调用游戏结束处理
      gameCommon.handleGameEnd('score', playerNames, playerContentRef);
    }
  }
  useAudioPlayerFun(gameConfig, currentRoundScores)
};


// 音频动画播放
const useAudioPlayerFun = (gameConfig, currentRoundScores) => {
  let urlMp4 = useAudioPlayerFunIf(gameConfig,currentRoundScores);
  let urlMp3 = playAudioPlayerFunIf(gameConfig,currentRoundScores);
  
  if (urlMp4 || urlMp3) {
    urlMp4?playerContentRef.value.playVideo(urlMp4, true, () => {}):"";
	urlMp3?useAudioPlayer().playAudio(urlMp3):"";
  } else {
	  useAudioPlayer().playAudio('/static/mp3/jzbk.mp3');
    // useAudioPlayer().playAudio('/static/mp3/dart.wav');
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

  // 按分数从大到小��序
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
  const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound]?.[activeTeam.team]?.[activePlayer.id] || [];
  if (currentRoundScores.length < 3) {
    activeTeam.combo = 1;
  }
}

const routineRethrowCurrentRound = () => {
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

  // 重置combo
  activeTeam.combo -= currentRoundScoresNotZero.length;

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

  // 更新玩家的历史记录
  if (activePlayer.scoreHistory) {
    const existingRecordIndex = activePlayer.scoreHistory.recentRounds.findIndex(
        record => record.roundNumber === state.gameState.currentRound
    );
    if (existingRecordIndex !== -1) {
      activePlayer.scoreHistory.recentRounds.splice(existingRecordIndex, 1);
    }
  }
};

// 页面卸载时清理资源
onUnload(() => {
  // 清理定时器
  if (bluetoothProcessingTimer) {
    clearTimeout(bluetoothProcessingTimer);
    bluetoothProcessingTimer = null;
  }

  // 重置处理标志
  isProcessingBluetooth.value = false;

  // 清理蓝牙连接
  if (bluetooth().isConnected) {
    bluetooth().disconnect();
  }

  console.log('Twist游戏页面已卸载，资源已清理');
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
            @showRules="gameCommon.showGameRules(state.modeEntity.id)"
            @updateScore="updateTeamScore"
            @move-to-next-player="() => gameCommon.moveToNextPlayer(state,playerContentRef,null,startOnConfirm)"
            :teams="state.teamArray"
            :change-turn="state.gameState.isRoundEnd"
            :mode="modeName"
            :player="getActivePlayer"
            :max-round="state.gameState.maxRounds"
            :round="state.gameState.currentRound"
            :team-locks="getHitAreas"
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
<!--   <debug-panel-->
<!--       :current-round="state.gameState.currentRound"-->
<!--       :current-dart="state.gameState.currentDart"-->
<!--       @throw-dart="(data)=>bluetooth().setScoreCallback(data)"-->
<!--   />-->
  </view>
</template>

<style scoped lang="scss">
</style>
