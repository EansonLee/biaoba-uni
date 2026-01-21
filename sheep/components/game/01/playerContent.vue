<script setup>
import Bluetooth from "@/sheep/components/blue/Bluetooth.vue";
import FloatingBubble from "@/sheep/components/floatingBubble/floating-bubble.vue";
import PopUpLayer from "@/sheep/components/util/popUp/popUpLayer.vue";
import {ref, watch} from 'vue';
import NumberRoll from "@/sheep/components/common/numberRoll.vue";
import Backdrop from "@/sheep/components/game/mickeyMouse/backdrop.vue";
import Count from "@/sheep/components/game/mickeyMouse/count.vue";
import GameResult from "@/sheep/components/game/gameOver/gameResult.vue";
import DartBoard from "@/sheep/components/game/routine/xo/dartBoard.vue";
import TwistDartBoard from "@/sheep/components/game/routine/twist/twistDartBoard.vue";
import VideoPlayback from '@/sheep/components/mp4/VideoPlayback.vue';
import player from "@/sheep/api/dart/player";
import {init} from "@/sheep/config/bluetoothConfig";
import eventBus from "@/sheep/util/eventBus";
import useGameContextStore from '@/sheep/stores/gameContext';
import $stores from "@/sheep/stores";
import {useI18n} from 'vue-i18n';
const {locale} = useI18n();

const props = defineProps({
  maxRound: {
    type: Number,
    default: 20
  },
  scoreAverage: {
    type: Number,
    default: 0
  },

  round: {
    type: Number,
    default: 1
  },
  mode: {
    type: String,
    default: '01'
  },
  player: {
    type: {},
    default: () => ({})
  },
  practice: {
    type: {},
    default: () => ({})
  },
  changeTurn: {
    type: Boolean,
    default: false
  },
  type: {
    type: Number,
    default: 0
  },
  randomScore: {
    type: Object,
    default: () => ({})
  },
  teams: {
    type: Array,
    default: () => []
  },
  teamLocks: {
    type: Object,
    default: () => ({})
  },
  forbiddenAreas: {
    type: Array,
    default: () => []
  },
  calculateResult: {
    type: Function,
    required: true,
    default: (players) => {
      return players;
    }
  },
  gameSettingsType: {
    type: Number,
    default: 0
  },
  isMixModel: {
    type: Number,
    default: 0
  },
  modeEnd: {
    type: Boolean,
    default: true
  },
  state: {
    type: Object,
    default: undefined
  },
  showGif: {
    type: Boolean,
    default: false
  },
  HeartsHit: {
    type: Number,
    default: 0
  },
  firstTurnPlayerOnly: {
    type: [String, Number],
    default: ''
  }
});

const emit = defineEmits(['moveToNextPlayer', 'rethrow', 'restart', 'endGame', 'showRules', 'automaticBid', 'returnSala', 'updateScore', 'gameEndPostStatistics']);

// 监控player prop的变化
watch(() => props.player, (newPlayer, oldPlayer) => {
  if (newPlayer && oldPlayer) {
    console.log('PlayerContent: player prop变化', {
      oldPlayerName: oldPlayer.playerName,
      newPlayerName: newPlayer.playerName,
      oldScore: oldPlayer.currentScore,
      newScore: newPlayer.currentScore,
      timestamp: Date.now()
    });
  }
}, { deep: true });

// 设置弹出层状态
const modalVisible = ref(false);

// 🔥 同步游戏上下文（跨模式统一日志用）
const gameContext = useGameContextStore();
watch(() => props.state, (val) => { try { gameContext.updateFromState(val); } catch(_) {} }, { deep: true, immediate: true });

// 悬浮气泡点击事件
const handleBubbleClick = () => {
  try { eventBus.emit('log:gameEvent', { action: 'CHANGE_HAND_UI', source: 'ui', timestamp: Date.now() }); } catch(e) {}
  emit('moveToNextPlayer')
};

// 获取当前回合的投镖分数
const getCurrentRoundScore = (dartIndex) => {
  if (!props.player?.currentRoundScores) return null;
  // 新一位投手刚开始（currentDart===0）时，强制显示空标识，避免读取到残留数据
  if (props?.state?.gameState?.currentDart === 0) return null;
  const currentRoundScore = props.player.currentRoundScores[dartIndex];
  if (!currentRoundScore && currentRoundScore !== 0) return null;
  let score = '';
  if (currentRoundScore.originalScore===0 && currentRoundScore.score===0 ){
    // 仅在该镖位置已被实际投掷过时显示“X”；未投出的空位显示为空标识
    const thrownCount = (props?.state?.gameState?.currentDart ?? 0);
    if (thrownCount > dartIndex) {
      score = 'X'
      return score;
    } else {
      return null;
    }
  }

  if (currentRoundScore.multiplier === 1) {
    score += 'S'
  } else if (currentRoundScore.multiplier === 3) {
    score += 'T'
  } else if (currentRoundScore.multiplier === 2) {
    score += 'D'
  }
  score += currentRoundScore.originalScore;
  if (currentRoundScore.multiplier === 4) {
    score = 'DBull'
  } else if (currentRoundScore.multiplier === 5) {
    score = 'Bull'
  }

  return score;
};

//获取当前的MPR
const getMPR = () => {
  // 如果是米老鼠游戏且有MPR统计数据，使用新的计算方式
  if (props.type === 2 && props.player.mprStats) {
    // 计算历史完成回合总倍数 + 当前回合累计倍数
    const completedRoundsTotal = props.player.mprStats.completedRounds.reduce((sum, total) => sum + total, 0);
    const currentRoundTotal = props.player.mprStats.currentRoundExpected.reduce((sum, mult) => sum + mult, 0);
    const totalMultiplier = completedRoundsTotal + currentRoundTotal;

    // 🔥 修复：计算实际参与的回合数
    // 实际参与的回合数 = 已完成的回合数 + (当前回合是否有投镖 ? 1 : 0)
    // 注意：跳过的回合也算作参与的回合，因为它们已经被保存到completedRounds中
    const hasCurrentRoundData = currentRoundTotal > 0;
    const actualParticipatedRounds = props.player.mprStats.completedRounds.length + (hasCurrentRoundData ? 1 : 0);
    
    // 如果玩家还没有参与任何回合，返回0
    if (actualParticipatedRounds === 0) {
      console.log(`🎯 [MPR调试] 玩家${props.player.playerName}: 还没有参与任何回合，MPR=0`);
      return 0;
    }

    const mpr = totalMultiplier / actualParticipatedRounds;
    const result = Number.isInteger(mpr) ? mpr : parseFloat(mpr.toFixed(2));

    console.log(`🎯 [MPR调试] 玩家${props.player.playerName}: 已完成回合倍数=${completedRoundsTotal}, 当前回合倍数=${currentRoundTotal}, 实际参与回合数=${actualParticipatedRounds}, MPR=${result}`);
    console.log(`🎯 [MPR详细] 玩家${props.player.playerName}: completedRounds=[${props.player.mprStats.completedRounds.join(',')}], currentRoundExpected=[${props.player.mprStats.currentRoundExpected.join(',')}]`);
    return result;
  }

  // 其他游戏模式使用原来的计算方式
  const mpr = props.player.currentScore / props.round;
  return Number.isInteger(mpr) ? mpr : parseFloat(mpr.toFixed(2));
};

// 处理设置按钮点击
const handleSettingsClick = () => {
  modalVisible.value = true;
};

// 处理菜单选项点击
const handleMenuClick = (action) => {
  player.Api.updateInGame(0);
  modalVisible.value = false;
  init();
  try { 
    const map = { restart: 'RESTART_GAME_UI', rethrow: 'RETHROW_UI', endGame: 'END_GAME_UI' };
    const act = map[action] || action;
    eventBus.emit('log:gameEvent', { action: act, source: 'ui', timestamp: Date.now() });
  } catch(e) {}
  emit(action);
};

const multiplierCount = (item) => {
  if (item?.multiplier === 5) {
    return 1;
  } else if (item?.multiplier === 4) {
    return 2;
  }
  return item?.multiplier;
}

//在玩练习模式的时候有概率出现内单和外单的情况，改方法将展示性的内单和外单整合
const removeInnerCharacter = (text) => {
  if (!text) return text;

  // 获取当前语言设置
  const currentLocale = locale.value;

  // 处理特殊情况：牛眼
  if (text === 'BULL') {
    return currentLocale === 'zh' ? '请攻击 牛眼外围' : 'Bull';
  }
  if (text === 'DBULL') {
    return currentLocale === 'zh' ? '请攻击 牛眼' : 'Double Bull';
  }

  // 解析倍数标识和数字
  let multiplier = '';
  let number = '';

  if (text.includes('T')) {
    multiplier = 'T';
    number = text.replace('T', '');
  } else if (text.includes('D')) {
    multiplier = 'D';
    number = text.replace('D', '');
  } else if (text.includes('S')) {
    multiplier = 'S';
    number = text.replace('S', '');
  } else {
    return text; // 如果没有倍数标识，直接返回原文本
  }

  // 根据语言返回相应的文案
  if (currentLocale === 'zh') {
    // 中文：显示完整的攻击指令
    return `请攻击 ${multiplier}${number}`;
  } else {
    // 英文：转换为英文描述
    const multiplierMap = {
      'T': 'Triple',
      'D': 'Double',
      'S': 'Single'
    };
    return `${multiplierMap[multiplier]} ${number}`;
  }
}

// 仅在米老鼠线上对战且当前用户为邀请方（先手）时，交换中间打靶左右列
const shouldSwapBackdropSides = () => {
  if (props.type !== 2) return false;
  // 线上对战：左侧必须显示对方，若当前左侧是自己则交换
  if (props.gameSettingsType === 11) {
    const userInfo = $stores('user').getUserInfo();
    const leftTeam = props.teams?.[0];
    const leftIsSelf = leftTeam && leftTeam.players?.[0]?.playerOnly && String(leftTeam.players[0].playerOnly) === String(userInfo.playerOnly);
    return !!leftIsSelf; // 左是自己 -> 交换，使左变对方
  }
  // 非线上：按传入顺序（上层已保证顺序与底部一致）
  return false;
}

const getTotal = (recentRounds) => {
  // 检查是否为爆镖回合，使用多重检查确保准确性
  if (recentRounds?.exceedFlay || recentRounds?.isBust) {
    return "BUST";
  } else if (recentRounds !== -1 && recentRounds !== null && recentRounds !== undefined) {
    return recentRounds?.total || 0;
  } else {
    return 0;
  }
}

// 获取要显示的回合记录（最后4个或3个，不足时用空对象填充）
const getDisplayRounds = () => {
  const maxDisplay = props.type === 4 ? 3 : 4;
  const recentRounds = props.player?.scoreHistory?.recentRounds || [];
  
  let displayRounds;
  
  // 如果回合数少于等于最大显示数，直接使用所有回合
  if (recentRounds.length <= maxDisplay) {
    displayRounds = [...recentRounds];
  } else {
    // 返回最后几个回合
    displayRounds = recentRounds.slice(-maxDisplay);
  }
  
  // 如果不足最大显示数，用空对象填充到最大显示数
  while (displayRounds.length < maxDisplay) {
    displayRounds.push(null);
  }
  
  return displayRounds;
}
const gameResult = ref(null);
const show = () => {
  gameResult.value.show();
}
const dartBoardRef = ref(null);
const checkWin = (team, requiredLines = 1) => {
  return dartBoardRef.value.checkWin(team, requiredLines);
}

const checkWinCall = (team) => {
  return dartBoardRef.value.checkWinCall(team);
}

const generateRandomBoard = () => {
  dartBoardRef.value.generateRandomBoard();
}
const twistDartBoardRef = ref(null)

const videoPlayer = ref(null);
const closeOnClick = ref(false);

// 暴露方法

let onVideoEndedFun;
const playVideo = (src, closeOnClickOption, onEndCallback) => {
  // 设置播放完成后的回调
  onVideoEndedFun = onEndCallback;
  if (!src) {
    videoPlayer.value.isPlaying = false;
    return;
  }
  closeOnClick.value = closeOnClickOption;
  if (videoPlayer.value) {
    videoPlayer.value.isPlaying = true;
  }
  videoPlayer.value.startVideo(src);
};

const onVideoEnded = () => {
  console.log('视频播放结束');
  // 在这里处理视频播放结束后的逻辑
  if (onVideoEndedFun) {
    onVideoEndedFun()
  }

  // 触发换手动画结束事件
  eventBus.emit('handChangeEnd');
};
const automaticBid = () => {
  emit('automaticBid')
};
const gameEndPostStatistics = () => {
  emit('gameEndPostStatistics')
};

const roundToTwo = () => {
  let total = 0;
  let roundCount = 0;  // 计算轮数
  if (!props.player || !props.player.scoreHistory || !props.player.scoreHistory.recentRounds) {
    return 0;
  }

  // 🔥 PPR计算：包括所有回合，包括没有投镖的回合（算作0分）

  props.player.scoreHistory.recentRounds.forEach(recentRound => {
    // PPR计算每轮得分，包括BUST回合（得分为0）
    // 只要有回合记录，就说明玩家参与了该回合，即使得分为0
    let roundScore = 0;
    
    // 如果是爆镖回合，得分为0，但仍然计入回合数
    if (recentRound.exceedFlay || recentRound.isBust) {
      roundScore = 0;
    } else {
      roundScore = recentRound.total || 0;
    }
    
    total += roundScore;
    roundCount += 1;
  })

  const ppr = roundCount > 0 ? total / roundCount : 0;
  return ppr.toFixed(2);
}


const computeAve = () => {
  // 🔥 米老鼠模式（type===2）：AVE 按“倍数/镖数”计算，等于总有效倍数 ÷ 总镖数（含离线累计）
  if (props.type === 2) {
    let currentGameTotalMultiplier = 0; // 本场累计有效倍数
    let currentGameTotalDarts = 0;      // 本场累计镖数

    // 优先使用全局统计（index.vue 已将 scoreAverage 记为总倍数，currentDartAverage 记为总镖数）
    if (props.state && props.state.gameState && props.state.gameState.averageScores && props.state.gameState.averageScores[props.player.id]) {
      const playerStats = props.state.gameState.averageScores[props.player.id];
      currentGameTotalMultiplier = Number(playerStats.scoreAverage) || 0;
      currentGameTotalDarts = Number(playerStats.currentDartAverage) || 0;
    }

    // 兜底：从最近回合明细累加（仅当全局统计缺失时）
    if (currentGameTotalDarts === 0 && props.player && props.player.scoreHistory && props.player.scoreHistory.recentRounds) {
      props.player.scoreHistory.recentRounds.forEach(round => {
        if (round && Array.isArray(round.scores)) {
          round.scores.forEach(scoreObj => {
            if (scoreObj && typeof scoreObj.multiplier === 'number') {
              if (scoreObj.multiplier >= 1 && scoreObj.multiplier <= 3) {
                currentGameTotalMultiplier += scoreObj.multiplier;
              } else if (scoreObj.multiplier === 4) { // DBULL
                currentGameTotalMultiplier += 2;
              } else if (scoreObj.multiplier === 5) { // BULL
                currentGameTotalMultiplier += 1;
              }
              currentGameTotalDarts += 1; // 每条记录代表一镖
            }
          });
        }
      });
    }

    // 累计（含离线）：离线倍数=offlineScore，离线镖数=offlineTotal（没有 offlineGameRound）
    const totalMultiplier = (props.player?.offlineScore || 0) + currentGameTotalMultiplier;
    const totalDarts = (props.player?.offlineTotal || 0) + currentGameTotalDarts;

    const ave = totalDarts > 0 ? totalMultiplier / totalDarts : 0; // AVE=倍数/镖数

    const finalAveNumber = !isFinite(ave) || isNaN(ave) ? 0 : ave;

    // 存储到 player 上，供其它逻辑使用
    if (props.player) {
      props.player.AVE = finalAveNumber;
    }

    console.log(`🎯 [米老鼠AVE] 玩家${props.player.playerName}: 总倍数=${totalMultiplier}, 总镖数=${totalDarts}, AVE=${finalAveNumber.toFixed(2)}`);
    return finalAveNumber.toFixed(2);
  }

  // 其他游戏模式：AVE = (离线总分 + 当前游戏总分) / (离线总镖数 + 当前游戏总镖数)
  let currentGameTotalScore = 0;
  let currentGameTotalDarts = 0;

  // 从全局统计数据中获取当前游戏的总分和总镖数
  if (props.state && props.state.gameState && props.state.gameState.averageScores && props.state.gameState.averageScores[props.player.id]) {
    const playerStats = props.state.gameState.averageScores[props.player.id];
    currentGameTotalScore = playerStats.scoreAverage || 0; // 当前游戏总得分
    currentGameTotalDarts = playerStats.currentDartAverage || 0; // 当前游戏总镖数
  }

  // 如果没有全局统计数据，则从recentRounds计算（兜底逻辑）
  if (currentGameTotalDarts === 0 && props.player && props.player.scoreHistory && props.player.scoreHistory.recentRounds) {
    props.player.scoreHistory.recentRounds.forEach(round => {
      if (round && round.scores) {
        round.scores.forEach(scoreObj => {
          if (scoreObj && typeof scoreObj.score === 'number') {
            currentGameTotalScore += scoreObj.score;
            currentGameTotalDarts += 1;
          }
        });
      }
    });
  }

  // 计算AVE：(离线总分 + 当前游戏总分) / (离线总镖数 + 当前游戏总镖数)
  const totalScore = (props.player?.offlineScore || 0) + currentGameTotalScore;
  const totalDarts = (props.player?.offlineTotal || 0) + currentGameTotalDarts;

  const ave = totalDarts > 0 ? totalScore / totalDarts : 0;

  const finalAveNumber = !isFinite(ave) || isNaN(ave) ? 0 : ave;

  // 在player对象中存储实际的数字值，以备其他逻辑计算使用
  if (props.player) {
    props.player.AVE = finalAveNumber;
  }
  // 返回一个格式化为两位小数的字符串，用于界面显示
  return finalAveNumber.toFixed(2);
};


// 暴露给父组件的方法
defineExpose({
  show,
  checkWin,
  checkWinCall,
  generateRandomBoard,
  playVideo,
  automaticBid,
  gameEndPostStatistics
});
</script>

<template>
  <game-result :state="props.state" :modeEnd="props.modeEnd" :isMixModel="props.isMixModel"
               :showAssembleDart="practice.showAssembleDart" :gameType="props.type" :round="props.round"
               :PPR="parseFloat(roundToTwo(props.scoreAverage)) || 0"
               :calculateResult="calculateResult" :type="gameSettingsType" :players="teams"
               @exit="handleMenuClick('endGame')"
               @restart="handleMenuClick('restart')" @returnSala="handleMenuClick('returnSala')" ref="gameResult"/>
  <view class="uni-flex uni-space-between uni-items-center uni-h-full backgroundImageByType"
        style="color: #ffffff;height: 100%;">
    <view class="game-left">
      <view class="uni_text uni_text_top">
        <view :class="['font-regular','defMode',props.type!==1&&props.type!==6?'mode-cricket':'']">
          {{ mode }}</view>

        <view v-if="type!=6" class="text-style" style="margin-top: 20rpx; font-weight: bold; font-size: 15rpx">ROUND <span class="text-style-cr-2">{{ round }}/{{
            maxRound !== -1 ? maxRound : '∞'
          }}</span></view>
      </view>
      <!-- 最近四回合的总分 -->
      <template v-if="type!==6">
        <view class="round-nbr">
          <view :class="type === 2 ? 'round-itemCr' : 'round-item'" v-for="(roundRecord, index) in getDisplayRounds()" :key="roundRecord?.roundNumber || index">
            <view class="round-item-text">

              <text class="label text-style-cr-1">R{{
                  roundRecord?.roundNumber || (index + 1)
                }}
              </text>
              <view class="value" v-if="type!==2">
                {{ getTotal(roundRecord) }}
              </view>
              <view class="value value-scores" v-if="type===2">
                <template v-for="(item,index2) in roundRecord?.scores || []"
                          :key="index2">
                  <view class="dart-score-item">
                    <!--                    <span style="width: 500px;display: block">    {{item}}</span>-->

                    <count color="#5ad3ff" :count="multiplierCount(item)"
                           :isForbidden="item.isFirstClose?false:item.isForbidden"
                           :area="item.area" lineWidth="1"
                           circle-width="1"/>
                  </view>
                </template>
              </view>
            </view>
          </view>
        </view>

      </template>
    </view>
    <!-- 中间数据 -->

    <view class="game-content" v-if="type===1||type===3||type===4">
      <NumberRoll :state="props.state" :number="props.player ? props.player.currentScore : 0" :height="140"/>
    </view>

    <view class="game-content AttackNumber" v-if="type===7">
      <!-- 头部攻击目标文案 -->
      <view class="AttackNumberBackground">
        {{ removeInnerCharacter(randomScore.remarks) }}
      </view>
      <!-- 中间大数字显示 -->
      <view class="attack-score-display">
        <NumberRoll :state="props.state" :number="props.player ? props.player.currentScore : 0" :height="120"/>
      </view>



    </view>
    <view class="game-content2">
<backdrop v-if="type===2" :swapSides="shouldSwapBackdropSides()" :forbiddenAreas="forbiddenAreas" :teams="teams" :teamLocks="teamLocks" :gameSettingsType="gameSettingsType"/>
      <dartBoard ref="dartBoardRef" v-else-if="type===6" :hitAreas="teamLocks"/>
      <TwistDartBoard ref="twistDartBoardRef" v-else-if="type===5" :show-gif="props.showGif" :hitAreas="teamLocks" :HeartsHit="props.HeartsHit"/>
    </view>
    <view class="game-right">
      <view class="uni-flex game-player-data" v-if="type===5">
        <view class="uni-flex uni-column center">
          <view class="game-player-item">
            X&nbsp;{{ props.player.combo }}
          </view>
          <text class="game-player-title">COMBO</text>
        </view>
        <view class="uni-flex uni-column center">
          <view class="game-player-item">
            X&nbsp;{{ props.round }}
          </view>
          <text class="game-player-title">ROUND</text>
        </view>
      </view>
      <view class="uni-flex uni-column">
        <view>
          <Bluetooth size="40" color="#1296db"/>
          <view class="icon-size-40 in-game-settings overflow-hidden">
            <image v-clickSound
                   :style="{transform: 'scale(1.8)'}"
                   class="uni-img"
                   src="@/static/images/game/settings.png"
                   mode="aspectFill"
                   @tap="handleSettingsClick"
            />
          </view>
        </view>

        <template v-if="type!==6">
          <view class="uni_text" v-if="type===1 || type===2">
            <view v-if="type!=2">
              <view class="text-style-cr-1">PPR</view>
              <view style="height:40rpx">
                <view style="font-size: 30rpx;color:#62E4FF;position: absolute;right: 10rpx;">
                  {{ roundToTwo(props.scoreAverage) }}
                </view>
              </view>
            </view>
            <view v-if="type===2">
              <view class="text-style-cr-1">MPR</view>
              <view style="height:40rpx">
                <view style="font-size: 30rpx;color:#62E4FF;position: absolute;right: 10rpx;">{{ getMPR() }}</view>
              </view>
            </view>

            <view class="text-style">Ave：{{ computeAve() }}</view>
          </view>
          <view class="uni_text" v-if="type===7">
            <view style="height:30rpx">
              <view style="font-size: 14rpx;color:#62E4FF;position: absolute;right: 10rpx;">
                {{$t('accuracyRate')}}：{{ practice.accuracy }}%
              </view>
            </view>
            <view style="height:20rpx">
              <view style="font-size: 14rpx;color:#62E4FF;position: absolute;right: 10px;">
                {{$t('hitRate')}}：{{ practice.hitDart }}/{{ practice.showAssembleDart }}
              </view>
            </view>
          </view>
          <!-- 当前回合的三镖分数 -->
          <view>
            <view class="dart-score uni-flex center uni-justify-content-center uni-column positionRight"
                  style="margin-top: 10rpx;">
              <template v-for="index in 3" :key="index">
                <view class="icon-size-30 uni-flex center uni-justify-content-center" style="margin: 2rpx">
                  <template v-if="getCurrentRoundScore(index - 1) !== null">
                    <view style="font-size: 10px"
                          class="score-text uni-circle uni-flex center uni-justify-content-center">
                      {{ getCurrentRoundScore(index - 1)}}
                    </view>
                  </template>
                  <template v-else>
                    <image class="uni-img uni-img-scale3" src="@/static/images/game/dart.png"/>
                  </template>
                </view>
              </template>
            </view>
          </view>

        </template>
      </view>
    </view>
  </view>

  <!--    <FloatingBubble :on-click="handleBubbleClick" text="跳过"/>-->
  <FloatingBubble v-if="changeTurn" :on-click="handleBubbleClick" :text="locale === 'zh' ? '跳过' : 'Next'"/>

  <!-- 设置弹出层 -->
  <PopUpLayer
      v-model:modalVisible="modalVisible"
      :confirm="false"
      :cancel="false"
      width="auto"
      height="auto"
  >
    <view style="padding: 10rpx">
      <view class="button-group">
        <button v-clickSound class="uni-button pattern-button uni-flex center uni-justify-content-center"
                @tap="handleMenuClick('rethrow')">{{$t('rethrow')}}
        </button>
        <button v-clickSound class="uni-button pattern-button uni-flex center uni-justify-content-center"
                @tap="handleMenuClick('restart')">{{$t('Restart')}}
        </button>
      </view>
      <view class="button-group">
        <button v-clickSound class="uni-button pattern-button uni-flex center uni-justify-content-center"
                @tap="handleMenuClick('endGame')">{{$t('end_game')}}
        </button>
        <!--        <button class="uni-button pattern-button uni-flex center uni-justify-content-center"-->
        <!--                @tap="show">结束游戏show-->
        <!--        </button>-->
        <button v-clickSound class="uni-button pattern-button uni-flex center uni-justify-content-center"
                @tap="handleMenuClick('showRules')">{{$t('show_rules')}}
        </button>
      </view>
    </view>
  </PopUpLayer>

  <VideoPlayback ref="videoPlayer" :closeOnClick="closeOnClick" @videoEnded="onVideoEnded"/>
</template>

<style scoped lang="scss">
.game-player-data {
  display: flex;
  flex-direction: column;
  gap: 10rpx;

  .game-player-title {
    font-size: 12rpx;
  }

  .game-player-item {
    // 背景图片
    background-image: url("/static/images/game/player-item.png");
    background-size: 100% 100%;

    width: 40rpx;
    height: 40rpx;
    color: #FFF;
    font-size: 12rpx;
    display: flex;
    justify-content: center;
    align-items: center;
  }
}

.dart-score-item {
  width: 15rpx;
  height: 15rpx;
}

.value-scores {
  flex: 1;
  display: flex;
  gap: 6rpx;
}

.uni_text_top {
  margin-left: 10px;
}

.uni_text {
  font-size: 12rpx;
}

.round-nbr {
  display: flex;
  flex-direction: column;
  margin-left: 10px;
}

.button-group {
  display: flex;
  justify-content: center;
}

.button-group .uni-button {
  width: 120rpx;
  margin: 5rpx;
  border-radius: 5rpx;
  font-size: 12rpx;
  border: 3rpx solid #8857FF !important;

}

@media (max-width: 425px) {
  .button-group .uni-button {
    width: 125rpx;
    margin: 5rpx;
    border-radius: 5rpx;
    font-size: 12rpx;
    border: 3rpx solid #8857FF !important;

  }
}

.button-group .active {
  background-color: #00ccff;
  color: white;
}

.game-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  text-align: center;
  z-index: 10; /* 确保内容在最上层 */
}

.game-content2 {
  width: 100%;
  height: 100%;
  position: absolute;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center
}

/* 保持其他样式 */
.game-left,
.game-right {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 90%;
  gap: 5rpx;
}

.game-right {
  flex-direction: row;
  text-align: right;
  padding-right: 0.4rem;
}

.game-left {
  text-align: left;
  padding-left: 0.4rem;
  align-items: flex-start;
}

.round-item {
  // 放大
  transform: scale(1.2);
  width: 105rpx;
  height: 45rpx;
  display: flex;
  align-items: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('@/static/images/round_bg.png');
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: center;
  }


  .round-item-text {
    align-items: center;
    width: 100%;
    display: flex;
    justify-content: space-between;
    font-size: 12rpx;
    padding: 0 30rpx 0 20rpx;
    position: relative;
    z-index: 1;
    font-weight: 400;
    gap: 5rpx;

    .label {
      width: 15rpx;
      height: 15rpx;
      color: #fff;
      text-shadow: 0 0 3rpx rgba(0, 0, 0, 0.5);
    }

    .value {
      color: #fff;
      text-shadow: 0 0 3rpx rgba(0, 0, 0, 0.5);
    }
  }
}

.round-itemCr {
  // 放大
  transform: scale(1.2);
  width: 140rpx;
  height: 45rpx;
  display: flex;
  align-items: center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('@/static/images/round_bg.png');
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: center;
  }


  .round-item-text {
    align-items: center;
    width: 100%;
    display: flex;
    justify-content: space-between;
    font-size: 12rpx;
    padding: 0 30rpx 0 20rpx;
    position: relative;
    z-index: 1;
    font-weight: 400;
    gap: 5rpx;

    .label {
      width: 15rpx;
      height: 15rpx;
      color: #fff;
      text-shadow: 0 0 3rpx rgba(0, 0, 0, 0.5);
    }

    .value {
      color: #fff;
      text-shadow: 0 0 3rpx rgba(0, 0, 0, 0.5);
    }
  }
}

.dart-score {
  width: 40rpx;

  .score-text {
    width: 80%;
    height: 80%;
    border: 2rpx solid #8957FF;
    font-size: 11rpx;
    font-weight: 500;
    color: #ffffff;
  }

  img {
    width: 100%;
    height: 100%;
    opacity: 0.6;
  }
}

.settings-menu {
  padding: 20rpx;

  .menu-button {
    width: 100%;
    height: 80rpx;
    margin: 20rpx 0;
    border-radius: 10rpx;
    background-color: #f5f5f5;
    font-size: 28rpx;
    color: #333;
    border: none;

    &:active {
      background-color: #e0e0e0;
    }
  }
}

.in-game-settings {
  cursor: pointer;

  &:active {
    opacity: 0.8;
  }
}

.AttackNumber {
  font-size: 50rpx;
  color: #FFFFFF;
}

.positionRight {
  position: absolute;
  right: 20rpx;
}

.AttackNumberBackground {
  width: 100%;
  height: 80rpx;
  font-size: 36rpx;
  color: #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-weight: bold;
  margin-top: -46rpx;
  text-shadow:
    0 0 5rpx #ff00ff,
    0 0 10rpx #ff00ff,
    0 0 15rpx #ff00ff,
    0 0 20rpx #ff00ff,
    0 0 35rpx #ff00ff,
    0 0 40rpx #ff00ff;
}

.attack-score-display {
  display: flex;
  justify-content: center;
  align-items: center;
}

.defMode {
  color: #F0C422;
  font-size: 24.74rpx;
  font-family: "PingFang SC-Regular";
}

.mode-cricket {
  color: #62E4FF ;
  font-size: 26.99rpx;
  font-family: 'YouSheBiaoTiHei';
  font-weight: normal;
  color: #62E4FF;
  text-align: left;
  font-style: normal;
  text-transform: none;
}

.text-style {
  font-family: 'AlimamaFangYuan', 'AlimamaFangYuan';

}

.text-style-cr {  
  font-family: 'YouSheBiaoTiHei', 'YouSheBiaoTiHei';
}

.text-style-cr-1 {
  font-family: 'PingFangSC-Medium', 'PingFangSC-Medium';
}

.text-style-cr-2 {
  font-family: 'PingFangSC-Medium', 'PingFangSC-Medium';
}



</style>
