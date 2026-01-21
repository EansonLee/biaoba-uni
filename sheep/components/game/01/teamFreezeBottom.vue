<script setup>
import {computed} from 'vue';
import TeamScoreBottom from "@/sheep/components/game/01/teamScoreBottom.vue";

const props = defineProps({
  players: {
    type: Array,
    default: () => []
  }
});

// 处理所有玩家的数据
const teams = computed(() => {
  let allPlayers = [];
  // 遍历所有团队
  props.players.forEach(team => {
    // 将每个团队的玩家转换为独立的对象
    team.players.forEach(p => {
      allPlayers.push({
        player: [{  // 保持与原有结构兼容，将单个玩家包装在数组中
          headImgUrl: p.headImgUrl,
          playerName: p.playerName,
          isActive: p.isActive,
          averageColor: team.averageColor || p.averageColor // 使用团队颜色
        }],
        score: p.currentScore || 0,
        team: team.team,
        isEliminated: p.isEliminated,
        tempEliminated: p.tempEliminated,
        isActive: p.isActive,
        averageColor: team.averageColor || p.averageColor // 使用团队颜色
      });
    });
  });
  return allPlayers;
});
</script>

<template>
  <view class="teams-container">
    <view class="teams-row">
      <template v-for="(player, playerIndex) in teams" :key="playerIndex">
        <team-score-bottom 
          :team="player" 
          :show-score="true"
          :freeze="true"
          padding="5rpx"
        />
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
  flex-wrap: nowrap; // 允许换行显示
}
</style>
