<script setup>
import {
  ref,
  computed, watch
} from 'vue';
import FloatingBubble from "@/sheep/components/floatingBubble/floating-bubble.vue";
import {useGameCommon} from "@/sheep/hooks/useGameCommon";
import $stores from "@/sheep/stores";
import zimStore from "@/sheep/stores/zegoStore";
import {showToast} from "@/sheep/util/toast";
import Toast from "@/sheep/components/util/toast/toast.vue";
import player from "@/sheep/api/dart/player";
	import {useI18n} from 'vue-i18n';
	const {t, locale} = useI18n();

const props = defineProps({
  players: {
    type: Array,
    default: () => [],
  },
  // 开放计算
  calculateResult: {
    type: Function,
    required: true,
    default: (players) => {
      return players;
    }
  },
  type: {
    type: Number,
    default: 0
  },
  PPR: {
    type: Number,
    default: 0
  },
  round: {
    type: Number,
    default: 0
  },
  gameType: {
    type: Number,
    default: 0
  },
  showAssembleDart: {
    type: Number,
    default: 0
  },
  isMixModel: {//判断是否是混合模式
    type: Number,
    default: 0
  },
  modeEnd: {//判断是否是最后的游戏
    type: Boolean,
    default: true
  },
  state: {//游戏状态
    type: Object,
    default: undefined
  }
});
const emit = defineEmits(['exit', 'restart', 'returnSala']);
const visible = ref(false);
const sortedPlayers = ref([]);
const settlement = ref(false);//结算属性用于判断是否进入混合模式最终结算页面
const userInfo = $stores('user').getUserInfo();
const zimStores = zimStore();
watch(zimStores.message.returnToLobby, (New, Old) => {
  playerEXit.value = true;
  //接收到其他玩家返回大厅消息
      showToast({
        title: locale.value === 'zh' ? '玩家退出提示' : 'Player Exit Prompt',
        message: locale.value === 'zh' ? '对战玩家退出游戏' : 'The competing player has exited the game.',
      });
    },
    {deep: true}
)

const playerEXit = ref(false);

// 将数字转换为图片路径数组
const getNumberImages = (number) => {
  return number.toString().split('').map(digit => `/static/images/top/${digit}.png`);
};

// 显示结果
const show = () => {
  sortedPlayers.value = props.calculateResult(props.players);
  visible.value = true;
};

// 隐藏结果
const hide = () => {
  setTimeout(() => {
    visible.value = false;
  }, 300);
};

// 计算容器高度
const containerHeight = computed(() => {
  const playerCount = sortedPlayers.value.length;
  // 根据玩家数量计算合适的高度，最多8个玩家
  const baseHeight = 80; // 基础高度
  const playerHeight = Math.min(400 / playerCount, 80); // 每个玩家卡片的高度，最大80rpx
  return playerHeight * playerCount + 180; // 180是标题和按钮的总高度
});

const restart = () => {
  hide();
  emit('restart')
}
const exit = () => {
  hide();
  player.Api.updateInGame(0);
  emit('exit')
}

const getRivalId = () => {
  let userId;
  props.state.teamArray.forEach((item, index) => {
    if (item.players[0].playerOnly !== userInfo.playerOnly) {
      userId = item.players[0].playerOnly
    }
  })
  return userId;
}

const returnSala = () => {
  if (props.isMixModel===8){
    let rivalId = getRivalId()
    if (props.state.gameSettings.type && props.state.gameSettings.type === 11) {
      //发送返回大厅消息
      let msg = {
        msgType: "returnToLobby"
      }
      var messageTextObj = {type: 1, message: JSON.stringify(msg), extendedData: {msgType: "returnToLobby"}};
      $stores('zegoStore').sendMessage(rivalId, messageTextObj);
    }
  }
  emit('returnSala')

}

const getAve = (player) => {
  // 米老鼠模式（gameType === 2）：按倍数统计
  if (props.gameType === 2) {
    let currentGameTotalMultiplier = 0;
    let currentGameTotalDarts = 0;

    // 优先使用全局统计（与对局中显示一致）
    if (
      props.state &&
      props.state.gameState &&
      props.state.gameState.averageScores &&
      props.state.gameState.averageScores[player?.id]
    ) {
      const stats = props.state.gameState.averageScores[player.id];
      currentGameTotalMultiplier = stats.scoreAverage || 0; // 在米老鼠中这里存的是总倍数
      currentGameTotalDarts = stats.currentDartAverage || 0; // 总镖数
    } else if (player && player.scoreHistory && player.scoreHistory.recentRounds) {
      // 兜底：从回合明细统计倍数与镖数
      player.scoreHistory.recentRounds.forEach((round) => {
        if (round && round.scores) {
          round.scores.forEach((scoreObj) => {
            if (scoreObj && typeof scoreObj.multiplier === "number") {
              if (scoreObj.multiplier >= 1 && scoreObj.multiplier <= 3) {
                currentGameTotalMultiplier += scoreObj.multiplier;
              } else if (scoreObj.multiplier === 4) {
                // 内牛眼(DBULL)按2倍
                currentGameTotalMultiplier += 2;
              } else if (scoreObj.multiplier === 5) {
                // 外牛眼(BULL)按1倍
                currentGameTotalMultiplier += 1;
              }
              currentGameTotalDarts += 1;
            }
          });
        }
      });
    }

    const totalMultiplier = (player?.offlineScore || 0) + currentGameTotalMultiplier;
    const totalDarts = (player?.offlineTotal || 0) + currentGameTotalDarts;

    const ave = totalDarts > 0 ? totalMultiplier / totalDarts : 0;
    const finalAveNumber = !isFinite(ave) || isNaN(ave) ? 0 : ave;
    return finalAveNumber.toFixed(2);
  }

  // 其他模式：按分数统计
  let currentGameTotalScore = 0;
  let currentGameTotalDarts = 0;

  // 优先使用全局统计（对局与结算一致）
  if (
    props.state &&
    props.state.gameState &&
    props.state.gameState.averageScores &&
    props.state.gameState.averageScores[player?.id]
  ) {
    const stats = props.state.gameState.averageScores[player.id];
    currentGameTotalScore = stats.scoreAverage || 0; // 当前局总得分
    currentGameTotalDarts = stats.currentDartAverage || 0; // 当前局总镖数
  } else if (player && player.scoreHistory && player.scoreHistory.recentRounds) {
    // 兜底：从回合明细统计分数与镖数
    player.scoreHistory.recentRounds.forEach((round) => {
      if (round && round.scores) {
        round.scores.forEach((scoreObj) => {
          if (scoreObj && typeof scoreObj.score === "number") {
            currentGameTotalScore += scoreObj.score;
            currentGameTotalDarts += 1;
          }
        });
      }
    });
  }

  const totalScore = (player?.offlineScore || 0) + currentGameTotalScore;
  const totalDarts = (player?.offlineTotal || 0) + currentGameTotalDarts;
  const ave = totalDarts > 0 ? totalScore / totalDarts : 0;
  const finalAveNumber = !isFinite(ave) || isNaN(ave) ? 0 : ave;
  return finalAveNumber.toFixed(2);
};

// 新增玩家数量计算属性
const playerCount = computed(() => sortedPlayers.value.length);

// 判断是否显示"下一局"按钮
const shouldShowNextButton = computed(() => {
  // 如果玩家退出，或当前局是强制结束（菜单结束游戏），不显示
  if (playerEXit.value) {
    return false;
  }
  if (props.state && (props.state.forceEndGame || props.state.params?.forceEndGame)) {
    return false;
  }

  // 如果是混合模式
  const isMixed = parseInt(props.isMixModel) === 8;
  if (isMixed) {
    // 若已有人提前达到胜场目标（如5局3胜），不显示“下一局”
    try {
      const modesArr = (props.state && props.state.params && Array.isArray(props.state.params.modes))
        ? props.state.params.modes
        : (props.state && Array.isArray(props.state.modes) ? props.state.modes : []);
      if (Array.isArray(modesArr) && modesArr.length > 0) {
        const needWins = Math.floor(modesArr.length / 2 + 1);

        // 1) 优先使用 tameWin 统计
        const winsArr = props.state?.params?.tameWin?.teamIdWin || [];
        const winMapFromTameWin = winsArr.reduce((acc, id) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {});
        let clinched = Object.values(winMapFromTameWin).some(c => c >= needWins);

        // 2) 兜底：若 tameWin 尚未更新（例如刚弹出结算时），用各队 players[0].win 推断
        if (!clinched) {
          const teams = (Array.isArray(props.players) && props.players.length > 0)
            ? props.players
            : (props.state && Array.isArray(props.state.teamArray) ? props.state.teamArray : []);
          const winMapFromTeams = {};
          teams.forEach(t => {
            const w = (t?.players?.[0]?.win) || 0;
            // 使用队伍ID作为key
            if (t && typeof t.team !== 'undefined') {
              winMapFromTeams[t.team] = w;
            }
          });
          clinched = Object.values(winMapFromTeams).some(c => c >= needWins);
        }
        if (clinched) return false;
      }
    } catch (e) {}
    // 1) 优先根据 modes 判断是否还有未完成的游戏
    const modes = (props.state && props.state.params && Array.isArray(props.state.params.modes))
      ? props.state.params.modes
      : (props.state && Array.isArray(props.state.modes) ? props.state.modes : []);
    if (Array.isArray(modes) && modes.length > 0) {
      const hasUnfinished = modes.some(m => !m || !m.status);
      return hasUnfinished; // 只要还有未完成的，就显示“下一局”
    }

    // 2) 兜底：无法读取modes时，按modeEnd为false显示“下一局”
    return props.modeEnd === false;
  }

  // 非混合模式，按原逻辑
  return !props.modeEnd;
});

const gameCommon = useGameCommon();
const playersReady = () => {
  // 清空每个队伍中每位玩家上一场的回合记录，避免混合模式2v2第二名玩家残留
  props.players.forEach(team => {
    if (team && Array.isArray(team.players)) {
      team.players.forEach(p => {
        if (p && p.scoreHistory) {
          p.scoreHistory.recentRounds = [];
        }
      })
    }
  })
  gameCommon.mixedModeGameEnd(props.state)
}

const changeSettlement = (flag) => {
  // 修改状态后根据 win 值排序
  settlement.value = flag;

  // 按照 win 值从高到低排序
  sortedPlayers.value.sort((a, b) => {
    return (b.players[0].win || 0) - (a.players[0].win || 0);
    // 确保 win 值存在，若不存在则默认为 0
    const winA = a.players[0]?.win || 0;
    const winB = b.players[0]?.win || 0;
    return winB - winA; // 从高到低排序
  })
}

const getMPR = (currentScore, round, player = null) => {
  // 米老鼠模式：基于 completedRounds 和 currentRoundExpected 动态计算
  if (props.gameType === 2 && player && player.mprStats) {
    const completedRoundsTotal = (player.mprStats.completedRounds || []).reduce((sum, total) => sum + total, 0);
    const currentRoundTotal = (player.mprStats.currentRoundExpected || []).reduce((sum, mult) => sum + mult, 0);
    const totalMultiplier = completedRoundsTotal + currentRoundTotal;

    const actualCompletedRounds = (player.mprStats.completedRounds || []).length;
    const hasCurrentRoundData = currentRoundTotal > 0;
    const totalRoundsForCalculation = actualCompletedRounds + (hasCurrentRoundData ? 1 : 0);

    const mpr = totalRoundsForCalculation > 0 ? totalMultiplier / totalRoundsForCalculation : 0;
    return Number.isInteger(mpr) ? mpr : parseFloat(mpr.toFixed(2));
  }

  // 其他游戏模式使用原来的计算方式
  const mpr = currentScore / round;
  return Number.isInteger(mpr) ? mpr : parseFloat(mpr.toFixed(2));
};

const getPPR = (player) => {
  console.log('玩家：'+JSON.stringify(player))
  let total = 0;
  let roundCount = 0;  // 改为计算轮数

  if (player.scoreHistory === undefined) {
    return 0.00;
  }
  player.scoreHistory.recentRounds.forEach(recentRound => {
    total += recentRound.total;
    roundCount += 1;  // 每个recentRound代表一轮，直接+1
  })
  const ppr = total / roundCount || 0;
  return ppr.toFixed(2);
};


defineExpose({
  show,
  hide
});
</script>

<template>
  <view v-if="visible" class="game-result-overlay animate-fade-in" @click.stop>
    <view class="game-result animate-slide-up">
      <!-- 标题 -->
      <view class="title peopleNumberGreaterThanThreeTitle">GAME OVER</view>

      <!-- 玩家列表 -->
      <view v-if="sortedPlayers.length===1 || sortedPlayers.length===2" class="players-list"
            :class="{ 'two-column-layout': playerCount > 3 }">
        <view v-for="(player, index) in sortedPlayers" :key="index" class="player-card"
              :class="{'winner': index === 0}">
          <!-- 玩家背景 -->
          <view class="player-info left">
            <!-- 排名标记 -->
            <view class="rank">
              <image v-if="index === 0" class="huangguan" src="/static/images/huangguan.png">
              </image>
              <image class="rank-number" :src="`/static/images/top/${index + 1}.png`"/>
              <image v-if="index === 0" class="crown" src="/static/images/top/crown.png"/>
            </view>

            <!-- 玩家头像和名字 -->
            <view class="player-avatar">
              <template v-if="player.players.length === 1">
                <!-- 单个玩家显示头像和名字 -->
                <image class="avatar" :src="player.players[0].headImgUrl||'/static/images/user.png'" mode="aspectFill"/>
                <text class="name">
                  {{ player.players[0].playerName }}
                </text>
                <text class="pprAndAveCss" v-if="props.gameType===1">
                  PPR： {{getPPR(player.players[0])}}
                  <br>
                  AVE：{{ getAve(player.players[0]) }}
                </text>
                <text class="pprAndAveCss" v-if="props.gameType===2">
                  MPR：{{getMPR(player.currentScore,props.round, player.players[0]) }}
                  <br>
                  AVE：{{ getAve(player.players[0]) }}
                </text>
              </template>
              <template v-else>
                <!-- 多个玩家只显示头像，两个一行 -->
                <view class="avatar-grid">
                  <view class="avatar-row" v-for="row in Math.ceil(player.players.length/2)"
                        :key="row">
                    <view class="avatar-wrapper"
                          v-for="(p, index) in player.players.slice((row-1)*2, row*2)" :key="index">
                      <image class="multi-avatar" :src="p.headImgUrl||'/static/images/user.png'" mode="aspectFill"/>
                    </view>
                    <text class="pprAndAveCss" v-if="props.gameType===1">
                      PPR： {{getPPR(player.players[0])}}
                      <br>
                      AVE：{{ getAve(player.players[0]) }}
                    </text>
                    <text class="pprAndAveCssRight" v-if="props.gameType===1">
                      PPR： {{getPPR(player.players[1])}}
                      <br>
                      AVE：{{ getAve(player.players[1]) }}
                    </text>
                    <text class="pprAndAveCss" v-if="props.gameType===2">
                      <span style="color: black">{{player.currentScore,props.round}}</span>
                      MPR：{{getMPR(player.currentScore,props.round, player.players[0]) }}
                      <br>
                      AVE：{{ getAve(player.players[0]) }}
                    </text>
                    <text class="pprAndAveCssRight" v-if="props.gameType===2">
                      <span style="color: black">{{player.currentScore,props.round}}</span>

                      MPR：{{getMPR(player.currentScore,props.round, player.players[1]) }}
                      <br>
                      AVE：{{ getAve(player.players[1]) }}
                    </text>

                  </view>
                </view>
              </template>
            </view>

            <!-- 玩家数据 -->
            <view class="player-data">
              <view class="score-text" style="color: yellow;font-size: 12px" v-if="player.accuracy">{{locale === 'zh'?'命中率':'Hit Rate'}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{
                  player.accuracy
                }}%
              </view>
              <view class="score-text" :style="{color:'#00c6fb',fontSize:'12px',width:locale !== 'zh'?'160px':'',}" v-if="player.accuracy && gameType!=7">{{locale === 'zh'?'几中几':'Hits / Attempts'}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{
                  player.totalHits + '/' + player.totalThrows
                }}
              </view>
              <view class="score-text"  :style="{color:'#00c6fb',fontSize:'12px',width:locale !== 'zh'?'160px':'',}" v-if="player.accuracy && gameType===7">{{locale === 'zh'? '几中几':'Hits / Attempts'}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{
                  player.totalHits + '/' + showAssembleDart
                }}
              </view>
              <!--							<view class="score-text" v-if="player.totalHits&&player.totalThrows">-->
              <!--								中标数:{{ player.totalHits + '/' + player.totalThrows }}-->
              <!--							</view>-->
            </view>

            <!-- 分数 -->
            <view v-if="props.isMixModel!==8">
              <view class="score" v-if="!settlement">
                <text style="color: yellow" class="score-text font-regular">{{ player.currentScore }}</text>
              </view>
            </view>
            <view v-if="props.isMixModel===8">
              <view class="score" v-if="!modeEnd">
                <text style="color: yellow" class="score-text font-regular">{{ player.currentScore }}</text>
              </view>
              <view class="score" v-if="modeEnd">
                <text style="color: yellow" class="score-text font-regular">{{ player.players[0].win || 0 }}</text>
              </view>
            </view>

            <!--            <view class="score">-->
            <!--              <text style="color: yellow" class="score-text font-regular">{{ player.players[0].win }}</text>-->
            <!--            </view>-->
          </view>

        </view>


      </view>


      <view v-if="sortedPlayers.length===3" class="players-list" :class="{ 'two-column-layout': playerCount > 3 }">
        <view v-for="(player, index) in sortedPlayers" :key="index" class="player-card"
              :class="{'winner': index === 0}">
          <!-- 玩家背景 -->
          <view class="player-info" style="height: 2.125rem">
            <!-- 排名标记 -->
            <view class="rank">
              <image v-if="index === 0" class="huangguan" src="/static/images/huangguan.png" style="margin-top: -120px">
              </image>
              <image class="rank-number" :src="`/static/images/top/${index + 1}.png`"/>
              <image v-if="index === 0" class="crown" src="/static/images/top/crown.png"/>
            </view>

            <!-- 玩家头像和名字 -->
            <view class="player-avatar">
              <template v-if="player.players.length === 1">
                <!-- 单个玩家显示头像和名字 -->
                <image class="avatar" :src="player.players[0].headImgUrl||'/static/images/user.png'" mode="aspectFill"/>
                <text class="name">
                  {{ player.players[0].playerName }}
                </text>
                <text class="pprAndAveCss" v-if="props.gameType===1">
                  PPR：{{ getPPR(player.players[0]) }}
                  <br>
                  AVE：{{ getAve(player.players[0]) }}
                </text>
                <text class="pprAndAveCss" v-if="props.gameType===2">
                  MPR：{{getMPR(player.currentScore,props.round, player.players[0]) }}
                  <br>
                  AVE：{{ getAve(player.players[0]) }}
                </text>


              </template>
              <template v-else>
                <!-- 多个玩家只显示头像，两个一行 -->
                <view class="avatar-grid">
                  <view class="avatar-row" v-for="row in Math.ceil(player.players.length/2)"
                        :key="row">
                    <view class="avatar-wrapper"
                          v-for="(p, index) in player.players.slice((row-1)*2, row*2)" :key="index">
                      <image class="multi-avatar" :src="p.headImgUrl ||'/static/images/user.png'" mode="aspectFill"/>
                    </view>
                  </view>
                  <text class="pprAndAveCss" v-if="props.gameType===1">
                    PPR： {{getPPR(player.players[0])}}
                    <br>
                    AVE：{{ getAve(player.players[0]) }}
                  </text>
                  <text class="pprAndAveCssRight" v-if="props.gameType===1">
                    PPR： {{getPPR(player.players[1])}}
                    <br>
                    AVE：{{ getAve(player.players[1]) }}
                  </text>
                  <text class="pprAndAveCss" v-if="props.gameType===2">
                    MPR：{{getMPR(player.currentScore,props.round, player.players[0]) }}
                    <br>
                    AVE：{{ getAve(player.players[0]) }}
                  </text>
                  <text class="pprAndAveCss" v-if="props.gameType===2">
                    MPR：{{getMPR(player.currentScore,props.round, player.players[1]) }}
                    <br>
                    AVE：{{ getAve(player.players[1]) }}
                  </text>
                </view>
              </template>
            </view>

            <!-- 玩家数据 -->
            <view class="player-data">
              <view class="score-text" style="color: yellow;font-size: 12px" v-if="player.accuracy">{{locale === 'zh'?'命中率':'Hit Rate'}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{
                  player.accuracy
                }}%
              </view>
              <view class="score-text" :style="{color:'#00c6fb',fontSize:'12px',width:locale !== 'zh'?'160px':'',}" v-if="player.accuracy && gameType!=7">{{locale === 'zh'?'几中几':'Hits / Attempts'}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{
                  player.totalHits + '/' + player.totalThrows
                }}
              </view>
              <view class="score-text" :style="{color:'#00c6fb',fontSize:'12px',width:locale !== 'zh'?'160px':'',}" v-if="player.accuracy && gameType===7">{{locale === 'zh'?'几中几':'Hits / Attempts'}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{
                  player.totalHits + '/' + showAssembleDart
                }}
              </view>
              <!--							<view class="score-text" v-if="player.totalHits&&player.totalThrows">-->
              <!--								中标数:{{ player.totalHits + '/' + player.totalThrows }}-->
              <!--							</view>-->
            </view>

            <!-- 分数 -->
            <view class="score">
              <text style="color: yellow" class="score-text font-regular">{{ player.currentScore }}</text>
            </view>
          </view>

        </view>


      </view>


      <view v-if="sortedPlayers.length>3" class="players-list" :class="{ 'two-column-layout': playerCount > 3 }">
        <view v-for="(player, index) in sortedPlayers" :key="index" class="player-card"
              :class="{'winner': index === 0}">
          <!-- 玩家背景 -->
          <view class="player-info left" style="height: 1.125rem;width: 85%;margin: 0px 4px">
            <!-- 排名标记 -->
            <view class="rank">
              <image style="width: 70px;height: 70px;margin-top: -70px;margin-left: 30px" v-if="index === 0"
                     class="huangguan" src="/static/images/huangguan.png">
              </image>
              <image style="width: 20px;height: 20px;position: absolute;left: 5px;" class="rank-number"
                     :src="`/static/images/top/${index + 1}.png`"/>
              <image v-if="index === 0" class="crown" src="/static/images/top/crown.png"/>
            </view>

            <!-- 玩家头像和名字 -->
            <view class="player-avatar">
              <template v-if="player.players.length === 1">
                <!-- 单个玩家显示头像和名字 -->
                <image style="width: 20rpx;height: 20rpx;margin-left: 8rpx" class="avatar"
                       :src="player.players[0].headImgUrl||'/static/images/user.png'" mode="aspectFill"/>
                <text class="name" style="font-size: 8rpx">
                  {{ player.players[0].playerName }}
                </text>
                <text class="pprAndAveCss" style="right: 30%;font-size: 8rpx" v-if="props.gameType===1">
                  PPR：{{ getPPR(player.players[0]) }}
                  <br>
                  AVE：{{ getAve(player.players[0]) }}
                </text>
                <text class="pprAndAveCss" style="right: 30%;font-size: 8rpx" v-if="props.gameType===2">
                  MPR：{{getMPR(player.currentScore,props.round, player.players[0]) }}
                  <br>
                  AVE：{{ getAve(player.players[0]) }}
                </text>


              </template>
              <template v-else>
                <!-- 多个玩家只显示头像，两个一行 -->
                <view class="avatar-grid">
                  <view class="avatar-row" v-for="row in Math.ceil(player.players.length/2)"
                        :key="row">
                    <view class="avatar-wrapper"
                          v-for="(p, index) in player.players.slice((row-1)*2, row*2)" :key="index">
                      <image style="width: 25px;height: 25px;margin-top: 2px" class="multi-avatar"
                             :src="p.headImgUrl||'/static/images/user.png'" mode="aspectFill"/>

                    </view>
                  </view>
                  <text class="pprAndAveCssGameNumZhanFour" v-if="props.gameType===1">
                    PPR： {{getPPR(player.players[0])}}
                    <br>
                    AVE：{{ getAve(player.players[0]) }}
                  </text>
                  <text class="pprAndAveCssRightGameNumZhanFour" v-if="props.gameType===1">
                    PPR： {{getPPR(player.players[1])}}
                    <br>
                    AVE：{{ getAve(player.players[1]) }}
                  </text>
                  <text class="pprAndAveCssGameNumZhanFour" v-if="props.gameType===2">
                    MPR：{{getMPR(player.currentScore,props.round, player.players[0]) }}
                    <br>
                    AVE：{{ getAve(player.players[0]) }}
                  </text>
                  <text class="pprAndAveCssRightGameNumZhanFour" v-if="props.gameType===2">
                    MPR：{{getMPR(player.currentScore,props.round, player.players[1]) }}
                    <br>
                    AVE：{{ getAve(player.players[1]) }}
                  </text>
                </view>
              </template>
            </view>

            <!-- 玩家数据 -->
            <view class="player-data">
              <view class="score-text" style="color: yellow;font-size: 8rpx" v-if="player.accuracy">{{locale === 'zh'?'命中率':'Hit Rate'}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{
                  player.accuracy
                }}%
              </view>
              <view class="score-text" :style="{color:'#00c6fb',fontSize:'12px',width:locale !== 'zh'?'160px':'',}" v-if="player.accuracy && gameType!=7">{{locale === 'zh'?'几中几':'Hits / Attempts'}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{
                  player.totalHits + '/' + player.totalThrows
                }}
              </view>
              <view class="score-text" :style="{color:'#00c6fb',fontSize:'12px',width:locale !== 'zh'?'160px':'',}" v-if="player.accuracy && gameType===7">{{locale === 'zh'?'几中几':'Hits / Attempts'}}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{
                  player.totalHits + '/' + showAssembleDart
                }}
              </view>
              <!--							<view class="score-text" v-if="player.totalHits&&player.totalThrows">-->
              <!--								中标数:{{ player.totalHits + '/' + player.totalThrows }}-->
              <!--							</view>-->
            </view>

            <!-- 分数 -->
            <view class="score">
              <text style="color: yellow;font-size: 10px" class="score-text font-regular">{{
                  player.currentScore
                }}
              </text>
            </view>
          </view>

        </view>


      </view>

      <!-- 按钮区域 -->
      <view class="buttons">
        <view v-if="type !== 11 && parseInt(props.isMixModel)!=8" class="btn restart" v-clickSound @click="restart">{{ locale === 'zh' ? '重新开始':'Restart'}}</view>
        <view v-if="type !== 11 && modeEnd" class="btn exit" v-clickSound @click="exit">{{locale === 'zh' ? '退出游戏' : 'Exit Game'}}</view>
        <view v-if="type === 11" class="btn exit" v-clickSound @click="returnSala">{{locale === 'zh' ? '返回大厅' : 'Return Home'}}</view>
<!--        <view v-if="props.isMixModel && props.modeEnd" class="btn restart" v-clickSound @click="changeSettlement(true)">-->
<!--          结束游戏-->
<!--        </view>-->
      </view>
      <FloatingBubble v-if="shouldShowNextButton" :on-click="playersReady" :text="locale === 'zh' ? '下一局' : 'Next Round'"/>

    </view>
    <toast/>
  </view>
</template>

<style scoped lang="scss">


.huangguan {
  width: 120rpx;
  height: 110rpx;
  position: fixed;
  margin-top: -120rpx;
  z-index: 200;
}

// 添加淡入动画
@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

// 添加上移动画
@keyframes slideUp {
  from {
    transform: translateY(20rpx);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

// 添加淡出动画
@keyframes fadeOut {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease forwards;
}

.animate-slide-up {
  animation: slideUp 0.3s ease forwards;
}

.animate-fade-out {
  animation: fadeOut 0.3s ease forwards;
}

.game-result-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.game-result {
  width: 90%;
  height: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title {
  font-size: 32rpx;
  color: #FFFFFF;
  text-shadow: 0 0 10rpx #8856FF;
  font-weight: bold;
  margin-top: 30rpx;
}

.player-info1 {
  background: url('/static/images/top/bg1.png') no-repeat center/100% 100% !important;
}

.players-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-bottom: 5rpx;
  overflow-y: auto;
  text-align: center;
  align-items: center;

  .player-card {
    position: relative;
    width: 83%;
    transition: all 0.3s ease;
    display: flex;
    text-align: center;
    align-items: center;

    .player-info {
      padding: 0 12% 0 9%;
      margin: 0 -15px;
      text-align: center;
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 100rpx;
      background: url('/static/images/top/bg.png') no-repeat center/100% 100%;

      .rank {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;

        .rank-number {
          width: 24rpx;
          height: 32rpx;
          object-fit: contain;
        }

        .crown {
          position: absolute;
          width: 24rpx;
          height: 24rpx;
          top: -12rpx;
          left: 50%;
          transform: translateX(-50%);
        }
      }

      .player-avatar {
        width: 100rpx;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: left;
        margin: 0 15%;

        // 单个玩家样式
        .avatar {
          width: 40rpx;
          height: 40rpx;
          border-radius: 50%;
          flex-shrink: 0;
          margin-right: 10rpx;
        }

        .name {
          color: #FFFFFF;
          font-size: 14rpx;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        // 多个玩家网格布局
        .avatar-grid {
          display: flex;
          flex-direction: column;
          gap: 5rpx;

          .avatar-row {
            display: flex;
            justify-content: center;
            gap: 10rpx;

            .avatar-wrapper {
              width: 30rpx;
              height: 30rpx;

              .multi-avatar {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                object-fit: cover;
              }
            }
          }
        }
      }

      .score {
        width: 100rpx;
        display: flex;
        align-items: center;
        justify-content: center;

        .score-text {
          color: #FFFFFF;
          font-size: 20rpx;
        }
      }
    }

    &.winner {

      .player-info {
        //background: url('/static/images/top/bg.png') no-repeat center/100% 100%,
        //            linear-gradient(90deg, rgba(136, 86, 255, 0.2), transparent);
        //background-image: url("/static/images/top/bg.png");
        //background-size: 100% 100%;
        //background-repeat: no-repeat;
        //background-position: center;
      }
    }
  }
}

.buttons {
  display: flex;
  gap: 30rpx;
  margin-top: auto;

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5rpx 15rpx;
    border-radius: 3rpx;
    font-size: 14rpx;
    min-width: 80rpx;
    height: 30rpx;
    cursor: pointer;
    border: 1rpx solid transparent;

    &.restart {
      color: #4CAF50; // 绿色字体
      background: rgba(76, 175, 80, 0.1); // 透明绿色背景
      border-color: #4CAF50; // 绿色边框

      &:active {
        background: rgba(76, 175, 80, 0.2);
      }
    }

    &.exit {
      color: #FF5656; // 红色字体
      background: rgba(255, 86, 86, 0.1); // 透明红色背景
      border-color: #FF5656; // 红色边框

      &:active {
        background: rgba(255, 86, 86, 0.2);
      }
    }
  }
}

.player-data {
  color: #FFFFFF;
}

.pprAndAveCss {
  right: 245rpx;
  position: absolute;
  margin-left: 30rpx;
  color: white;
  font-size: 10rpx
}

.pprAndAveCssRight{
  right: 150rpx;
  position: absolute;
  margin-left: 30rpx;
  color: white;
  font-size: 10rpx
}

// 新增两列布局样式
.players-list.two-column-layout {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

// 覆盖卡片宽度
.players-list.two-column-layout .player-card {
  width: 100%; // 取消原83%宽度限制
}

// 调整卡片内边距适应新布局
.players-list.two-column-layout .player-info {
  padding: 0 8% 0 6%; // 减少左右内边距
}

.peopleNumberGreaterThanThreeTitle {
  font-size: 15px;
}

.player-info-people-number-greater-than-three {
  height: 1.125rem;
  width: 85%;
  margin: 0px 4px;
}

.pprAndAveCssGameNumZhanFour {
  right: 130rpx;
  position: absolute;
  margin-left: 30rpx;
  color: white;
  font-size: 8rpx
}

.pprAndAveCssRightGameNumZhanFour {
  right: 50rpx;
  position: absolute;
  margin-left: 30rpx;
  color: white;
  font-size: 8rpx
}
</style>