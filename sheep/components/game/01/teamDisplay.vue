<script setup>
import TeamSoloBottom from "./teamSoloBottom.vue";
import TeamBottom from "./teamBottom.vue";
import TeamFreezeBottom from "@/sheep/components/game/01/teamFreezeBottom.vue";

const props = defineProps({
  players: {
    type: Array,
    default: () => []
  },
  type: {
    type: Number,
    default: 0
  },
  duelMode: {
    type: Number,
    default: 1
  },
  useVideo: {
    type: Boolean,
    default: false
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
</script>

<template>
  <view class="team-display">
    <template v-if="duelMode===1">
      <template v-if="players.length === 1">
<team-solo-bottom :players="players" :gameSettingsType="gameSettingsType" :teamWinsMap="teamWinsMap"/>
      </template>
      <template v-else-if="players.length === 2">
<team-solo-bottom :show-score="type!==6" :players="players" :gameSettingsType="gameSettingsType" :teamWinsMap="teamWinsMap"/>
      </template>
      <template v-else>
        <team-bottom :players="players" style="margin-top: 15px;"/>
      </template>
    </template>
    <template v-if="duelMode===2">
      <team-freeze-bottom :players="players" style="margin-top: 15rpx"/>
    </template>
  </view>
</template>

<style scoped lang="scss">
.team-display {
  height: 80rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>