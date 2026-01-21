<script setup>
import {computed} from 'vue';
import TeamScoreBottom from "@/sheep/components/game/01/teamScoreBottom.vue";

const props = defineProps({
  players: {
    type: Array,
    default: () => []
  }
});

// 处理所有团队的数据
const teams = computed(() => {
  return props.players.map(team => {
    const isActive = team.players.some(player => player.isActive); // 判断该团队中是否有玩家 active
    return {
      player: team.players.map(p => ({
        headImgUrl: p.headImgUrl,
        playerName: p.playerName,
        isActive: p.isActive,
        averageColor: p.averageColor
      })),
      score: team.currentScore || 0,
      team: team.team,
      isEliminated: team?.isEliminated,
      tempEliminated: team?.tempEliminated,
      isActive // 为团队添加 isActive 标记
    };
  });
});

// 计算总玩家数量
const totalPlayers = computed(() => {
  return props.players.reduce((total, team) => total + team.players.length, 0);
});
</script>

<template>
  <view class="teams-container">
    <view class="teams-row">
      <template v-for="(team, teamIndex) in teams" :key="teamIndex">
        <team-score-bottom :showName="false" :playerlLength="totalPlayers" :team="team" :show-score="true" padding="5rpx 15rpx"/>
      </template>
    </view>
  </view>
</template>


<style scoped lang="scss">
.teams-container {
  width: 100%;
}

.teams-row {
  display: flex;
  width: 100%;
  justify-content: space-evenly;
}


</style>
