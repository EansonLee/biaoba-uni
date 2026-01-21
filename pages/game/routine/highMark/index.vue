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
import {showToast} from "@/sheep/util/toast";
import {getGameConfig, useAudioPlayerFunIf,playAudioPlayerFunIf} from "@/sheep/config/bluetoothConfig";
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
    isRoundEnd: computed(() => {
      // 当前镖数为3且已经投掷完成时才算回合结束
      return state.gameState.currentDart === 3;
    }),
    teamSize: 1,
    // 🔥 2v2换手计数器
    turnCounter: 0,
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
      moveToNextPlayer();
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
    team.teamRoundNbr = 0;
    team.currentScore = team.startingScore;
    team.players.forEach(player => {
      state.gameState.averageScores[player.id] = [];
    });
  });
  modeName.value = locale.value === 'zh' ? state.modeEntity.chineseModeName : state.modeEntity.englishModeName;
};

// 🔥 九镖高分模式2v2专用换手逻辑
const handleHighMark2v2MoveToNextPlayer = () => {
  console.log('🔄 [HighMark2v2换手] 开始处理2v2换手逻辑');

  // 获取当前活动团队
  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
  if (!activeTeam) return;

  // 获取当前玩家
  const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];
  if (!activePlayer) return;

  console.log('🔄 [HighMark2v2换手] 当前状态 - 队伍:', activeTeam.team, '玩家:', activePlayer.playerName, '镖数:', state.gameState.currentDart);

  // 🔧 补零回合：无论投了几镖，先补齐当前回合3个位置并写入回合记录（确保“跳过回合”也有0分记录）
  try {
    // 填充到3镖
    gameCommon.initializeRoundScore(state, state.gameState.currentRound, activeTeam, activePlayer);
    const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id] || [];
    const roundTotal = currentRoundScores.reduce((sum, item) => sum + (Number(item?.score) || 0), 0);

    if (!activePlayer.scoreHistory) {
      activePlayer.scoreHistory = { recentRounds: [], currentRound: [] };
    }
    const existingRecordIndex = activePlayer.scoreHistory.recentRounds.findIndex(r => r.roundNumber === state.gameState.currentRound);
    const roundRecord = {
      roundNumber: state.gameState.currentRound,
      scores: [...currentRoundScores],
      total: roundTotal,
      exceedFlay: false,
      isBust: false,
    };
    if (existingRecordIndex !== -1) {
      activePlayer.scoreHistory.recentRounds[existingRecordIndex] = roundRecord;
    } else {
      activePlayer.scoreHistory.recentRounds.push(roundRecord);
    }
  } catch (e) { console.warn('[HighMark2v2] 补零回合失败:', e); }

  // 🔥 修复：不要每次换手都增加teamRoundNbr，而是通过turnCounter精确控制
  console.log('🔄 [HighMark2v2换手] 队伍', activeTeam.team, '玩家', activePlayer.playerName, '完成投掷(投了', state.gameState.currentDart, '镖)');

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
  const allTeamsCompleted = state.gameState.turnCounter > 0 && 
    (state.gameState.turnCounter % totalTurnsPerRound === 0);
  
  console.log('🔄 [HighMark2v2换手] 换手计数器:', state.gameState.turnCounter, 
    '每回合总换手数:', totalTurnsPerRound, 
    '是否完成回合:', allTeamsCompleted);

  let nextTeam, nextPlayerIndex;

  if (allTeamsCompleted) {
    // 所有队伍都完成了当前回合
    console.log('🔄 [HighMark2v2换手] 所有队伍完成当前回合，当前回合:', state.gameState.currentRound, '最大回合:', state.gameState.maxRounds);
    
    // 🔥 检查是否已经是最后一轮，如果是则结束游戏
    if (state.gameState.currentRound >= state.gameState.maxRounds) {
      console.log('🔄 [HighMark2v2换手] 已达到最大回合数，游戏结束');
      
      // 找到分数最高的队伍作为获胜者
      let winningTeam = state.teamArray[0];
      let maxScore = winningTeam.currentScore || 0;
      
      state.teamArray.forEach(team => {
        if ((team.currentScore || 0) > maxScore) {
          maxScore = team.currentScore;
          winningTeam = team;
        }
      });
      
      // 构造胜利者名称
      const playerNames = winningTeam.players.map(player => player.playerName).join('、');
      
      console.log('🔄 [HighMark2v2换手] 游戏结束，获胜队伍:', winningTeam.team, '获胜玩家:', playerNames, '最高分:', maxScore);
      
      // 调用游戏结束处理
      gameCommon.handleGameEnd('rounds', playerNames, playerContentRef);
      return;
    }
    
    // 进入下一回合
    console.log('🔄 [HighMark2v2换手] 进入下一回合');
    state.gameState.currentRound++;
    state.gameState.roundScores[state.gameState.currentRound] = {};

    // 重置换手计数器（不重置teamRoundNbr，因为我们不再依赖它）
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
    state.teamArray.forEach(team => {
      team.players.forEach(player => {
        player.isActive = false;
      });
    });

    // 设置新回合的第一个玩家
    state.gameState.currentTeam = nextTeam.team;
    state.gameState.currentPlayerIndex = nextPlayerIndex;
    state.gameState.currentDart = 0;
    nextTeam.players[nextPlayerIndex].isActive = true;
    
    // 播放回合音效和动画
    useAudioPlayer().playAudio('/static/mp3/round1.mp3');
    gameCommon.handleNextRound(state.gameState.currentRound, roundType);
    
    console.log('🔄 [HighMark2v2换手] 显示回合动画，当前回合:', state.gameState.currentRound, '当前玩家:', nextTeam.players[nextPlayerIndex].playerName);
    return; // 直接返回，不执行后续的换手动画
  } else {
    // 🔥 使用换手计数器计算下一个玩家
    // 期望顺序：队伍1A → 队伍2A → 队伍3A → ... → 队伍1B → 队伍2B → 队伍3B → ...
    const currentPositionInSequence = state.gameState.turnCounter % (totalTeams * playersPerTeam);

    // 计算应该是哪个队伍和哪个玩家
    const targetTeamIndex = currentPositionInSequence % totalTeams;
    const targetPlayerIndex = Math.floor(currentPositionInSequence / totalTeams);

    nextTeam = state.teamArray[targetTeamIndex];
    nextPlayerIndex = targetPlayerIndex;

    console.log('🔄 [HighMark2v2换手] 换手计数器:', state.gameState.turnCounter, '序列位置:', currentPositionInSequence);
    console.log('🔄 [HighMark2v2换手] 计算结果 - targetTeamIndex:', targetTeamIndex, 'targetPlayerIndex:', targetPlayerIndex);
  }

  console.log('🔄 [HighMark2v2换手] 队伍结构:', state.teamArray.map(t => `队伍${t.team}:${t.players.map(p => p.playerName).join(',')}`));
  console.log('🔄 [HighMark2v2换手] 目标队伍:', nextTeam?.team, '目标玩家:', nextTeam?.players[nextPlayerIndex]?.playerName);

  // 验证计算结果的合理性
  if (!nextTeam || !nextTeam.players[nextPlayerIndex]) {
    console.error('🔄 [HighMark2v2换手] 计算错误，回退到通用逻辑');
    gameCommon.moveToNextPlayer(state, playerContentRef, null);
    return;
  }

  // 重置当前玩家状态
  state.teamArray.forEach(team => {
    team.players.forEach(player => {
      player.isActive = false;
    });
  });

  // 设置新的活动玩家
  state.gameState.currentTeam = nextTeam.team;
  state.gameState.currentPlayerIndex = nextPlayerIndex;
  state.gameState.currentDart = 0;
  nextTeam.players[nextPlayerIndex].isActive = true;

  // 播放换手动画和音效
  useAudioPlayer().playAudio('/static/mp3/nextPalyer.mp3');
  if (playerContentRef && playerContentRef.value) {
    playerContentRef.value.playVideo("/static/gif/NEXT-PALYER-2S.gif", true, () => {});
  }

  console.log('🔄 [HighMark2v2换手] 换手完成，当前玩家:', nextTeam.players[nextPlayerIndex].playerName);
};

// 本地换手函数，带防重复机制
const moveToNextPlayer = () => {
  // 🔧 防止重复处理换手按钮
  if (isProcessingHandChange.value) {
    return;
  }

  // 设置处理标志
  isProcessingHandChange.value = true;

  try {
    // 🔥 检查是否是2v2模式，使用专门的换手逻辑
    console.log('🔄 [HighMark换手] teamSize:', state.gameState.teamSize, 'teamArray.length:', state.teamArray.length);
    if (state.gameState.teamSize === 2) {
      console.log('🔄 [HighMark换手] 使用2v2专用逻辑');
      // 2v2专用换手逻辑
      handleHighMark2v2MoveToNextPlayer();
    } else {
      console.log('🔄 [HighMark换手] 使用通用逻辑');
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
    gameConfig.gameType = state.modeEntity.type
    handleScore(gameConfig.score, gameConfig);
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

  // 🔧 移除重复的防重复检查，因为在蓝牙监听中已经处理了

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


  let newScore = score; // 用于最后加分

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
    score: actualScore,
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
  if (activePlayer.scoreHistory.recentRounds.length > 3) {
    activePlayer.scoreHistory.recentRounds.shift();
  }

  // 统一加分
  if (newScore > 0) {
    activeTeam.currentScore += newScore;
  }

  // 更新当前镖数
  state.gameState.currentDart++;

  // 检查是否是最后一回合的最后一个玩家
  const isLastRound = state.gameState.currentRound === state.gameState.maxRounds;
  const isLastTeam = state.gameState.currentTeam === state.teamArray[state.teamArray.length - 1].team;
  const isLastPlayer = state.gameState.currentPlayerIndex === activeTeam.players.length - 1;

  // 如果投完三镖
  if (state.gameState.currentDart === 3) {
    activeTeam.teamRoundNbr++;

    // 如果是最后一回合的最后一个玩家投完最后一镖，立即结束游戏
    if (isLastRound && isLastTeam && isLastPlayer) {
      // 先播放本镖的音效/动画，再结束游戏
      useAudioPlayerFun(gameConfig, currentRoundScores);
      // 延迟一点时间让音效播放完成，然后结束游戏
      setTimeout(() => {
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

        // 调用游戏结束处理
        gameCommon.handleGameEnd('score', playerNames, playerContentRef, true);
      }, 1000); // 延迟1秒让音效和动画播放完成
      return; // 立即返回，不再执行后续的换手逻辑
    }
  }
  useAudioPlayerFun(gameConfig, currentRoundScores);
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
    currentScore: activeTeam.currentScore
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
  // 🔥 重置2v2换手计数器
  state.gameState.turnCounter = 0;

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

// 页面卸载时清理资源
onUnload(() => {
  // 🔧 优化：退出游戏时保持蓝牙连接，提升用户体验
  // 用户可以在不同游戏之间切换而无需重新连接蓝牙
});
</script>

<template>

  <view class="uni-body container backgroundImageByType">
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view class="uni-h-full">
        <PlayerContent
            :calculateResult="calculateGameResult"
            ref="playerContentRef"
            :type="state.modeEntity.type"
            @rethrow="gameCommon.routineRethrowCurrentRound(state)"
            @restart="gameCommon.restartGame(restart)"
            @endGame="gameCommon.endGame('/pages/game/home/index')"
            @showRules="getDomMessage(10)"
            @updateScore="updateTeamScore"
            @move-to-next-player="moveToNextPlayer"
            :teams="state.teamArray"
            :change-turn="state.gameState.isRoundEnd"
            :mode="modeName"
            :player="getActivePlayer"
            :max-round="state.gameState.maxRounds"
            :round="state.gameState.currentRound"
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
<!--        :current-round="state.gameState.currentRound"-->
<!--        :current-dart="state.gameState.currentDart"-->
<!--        @throw-dart="(data)=>bluetooth().setScoreCallback(data)"-->
<!--    />-->
  </view>
</template>

<style scoped lang="scss">
.backgroundImageByType{
  // background-image: url("@/static/images/game/highMark/highMarkBackGround.png");
  background-size: 145% 145%;
  background-repeat: no-repeat;
  background-position: center;
}
</style>
