<script setup>
import Top from "@/sheep/components/game/home/top.vue";
import GameDataContent from "@/sheep/components/player/game/gameDataContent.vue";
</script>

<template>
  <view class="uni-body container">
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view>
        <top :showBluetooth="false" :showBackButton="true" :title="$t('game_data')"/>
      </view>
      <view class="uni-h-full content">
        <GameDataContent/>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">

</style>
