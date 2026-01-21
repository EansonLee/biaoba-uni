<script setup>
import {computed} from 'vue';
import TeamScoreBottom from "@/sheep/components/game/01/teamScoreBottom.vue";
import $stores from "@/sheep/stores";

const userInfo = $stores('user').getUserInfo();

const props = defineProps({
  players: {
    type: Array,
    default: () => []
  },
  showScore: {
    type: Boolean,
    default: true
  },
  gameSettingsType: {
    type: Number,
    default: 0
  },
  // 混合模式：团队胜场映射（teamId -> count）
  teamWinsMap: {
    type: Object,
    default: () => ({})
  }
});

// 判断是否为线上对战模式
const isOnlineMode = computed(() => {
  return props.gameSettingsType === 11;
});

// 处理左侧显示的团队数据（线上模式：对方，普通模式：团队1）
const team1 = computed(() => {

  let targetTeam;
  if (isOnlineMode.value && props.players.length === 2) {
    // 线上对战模式：左边显示对方
    targetTeam = props.players.find(team =>
      team.players[0].playerOnly !== userInfo.playerOnly
    );
    console.log('左侧对方团队：', targetTeam?.players[0]?.playerName, targetTeam?.players[0]?.playerOnly)
  } else {
    // 普通/离线模式：左边固定显示队伍1
    targetTeam = props.players.find(team => team.team === 1);
    console.log('普通模式团队1：', targetTeam?.players[0]?.playerName)
  }

  if (!targetTeam) return null;

  const isActive = targetTeam.players.some(player => player.isActive);
  return {
    player: targetTeam?.players.map(p => ({
      headImgUrl: p.headImgUrl == null ? '/static/images/user.png' : p.headImgUrl,
      playerName: p.playerName,
      isActive: p.isActive,
      averageColor: p.averageColor,
      win: p.win,
    })) || [],
    score: targetTeam?.currentScore || 0,
    isActive,
    isEliminated: targetTeam?.isEliminated,
    tempEliminated: targetTeam?.tempEliminated,
    id: targetTeam?.players[0].id,
    teamId: targetTeam?.team,
    winCount: props.teamWinsMap?.[targetTeam?.team] || 0,
  };
});

// 处理右侧显示的团队数据（线上模式：自己，普通模式：团队2）
const team2 = computed(() => {
  if (props.players.length == 2) {
    console.log('=== teamSoloBottom team2 计算 ===')
    let targetTeam;
    if (isOnlineMode.value) {
      // 线上对战模式：右边显示自己
      targetTeam = props.players.find(team =>
        team.players[0].playerOnly === userInfo.playerOnly
      );
      console.log('右侧自己团队：', targetTeam?.players[0]?.playerName, targetTeam?.players[0]?.playerOnly)
    } else {
      // 普通/离线模式：右边固定显示队伍2
      targetTeam = props.players.find(team => team.team === 2);
      console.log('普通模式团队2：', targetTeam?.players[0]?.playerName)
    }

    if (!targetTeam) return null;

    const isActive = targetTeam.players.some(player => player.isActive);
    // 🔧 修复2v2模式下队伍2玩家头像顺序问题：由于CSS使用了row-reverse，需要预先反转数组
    const playerArray = targetTeam?.players.map(p => ({
      headImgUrl: p.headImgUrl == null ? '/static/images/user.png' : p.headImgUrl,
      playerName: p.playerName,
      isActive: p.isActive,
      averageColor: p.averageColor,
      win: p.win,
    })) || [];
    
    // 反转玩家数组顺序，抵消CSS的row-reverse效果
    const reversedPlayerArray = [...playerArray].reverse();

    return {
      player: reversedPlayerArray,
      score: targetTeam?.currentScore || 0,
      isEliminated: targetTeam?.isEliminated,
      tempEliminated: targetTeam?.tempEliminated,
      isActive,
      id: targetTeam?.players[0].id,
      teamId: targetTeam?.team,
      winCount: props.teamWinsMap?.[targetTeam?.team] || 0,
    };
  }
});

</script>

<template>

  <!-- 普通模式：原有的居中布局 -->
  <view class="uni-w-full uni-flex uni-space-between uni-items-center" style="justify-content: center;">
     <template v-if="gameSettingsType === 7">
        <team-score-bottom :playerlLength="props.players.length" :team="team1" padding="10rpx 20rpx"></team-score-bottom>
     </template>
    <template v-else>
    <!-- 团队1 -->
    <team-score-bottom :playerlLength="props.players.length" :team="team1" padding="10rpx 20rpx"></team-score-bottom>

    <!-- 中间VS -->
    <view class="vs font-regular">
      <text class="score" v-if="showScore" 
            :style="{
              'margin-left': '20rpx',
              'margin-right': '20rpx',
              'font-size': team1.score >= 10000 ? '36rpx' : 
                          team1.score >= 1000 ? '46rpx' : '56.22rpx'
            }">{{ team1.score }}</text>
      <text v-if="props.players.length == 2" class="vs-font">VS</text>
      <text class="score" v-if="showScore && props.players.length == 2" 
            :style="{
              'margin-left': '20rpx',
              'margin-right': '20rpx',
              'font-size': team2.score >= 10000 ? '36rpx' : 
                          team2.score >= 1000 ? '46rpx' : '56.22rpx'
            }">{{ team2.score }}</text>
    </view>

    <!-- 团队2 -->
    <team-score-bottom :playerlLength="props.players.length" :team="team2" padding="10rpx 20rpx" sort="right" v-if="props.players.length == 2"/>
    </template>
  </view>
</template>


<style scoped lang="scss">
.score {
  font-size: 56.22rpx;
  width: 120rpx;
  color: #ffffff;
  // font-family: YouSheBiaoTiHei-Regular;
  font-family: YouSheBiaoTiHei, YouSheBiaoTiHei;
  display: inline-block;
  transition: font-size 0.3s ease;
}

.vs {
  display: flex;
  text-align: center;
  align-items: center;
  gap: 20rpx;
  font-weight: normal;
  font-size: 26.99rpx;
  color: #62E4FF;
  font-style: normal;
  text-transform: none;
  min-width: 300rpx;
  justify-content: center
}

.vs-font {
  // font-family: AlibabaPuHuiTi-Regular;
  font-family: YouSheBiaoTiHei, YouSheBiaoTiHei;
}

// 线上对战模式的布局样式
.online-battle-layout {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0 2%; // 与视频区域的左右边距保持一致
}

.left-area {
  width: 33.33%; // 对应左边视频宽度
  display: flex;
  justify-content: flex-start;
}

.center-area {
  flex: 1; // 占据剩余空间
  display: flex;
  justify-content: center;

  .vs {
    display: flex;
    align-items: center;
    gap: 20rpx;
    min-width: auto; // 覆盖原有的min-width
  }
}

.right-area {
  width: 20%; // 对应右边视频宽度
  display: flex;
  justify-content: flex-end;
}

</style>
