<script setup>
import Top from "@/sheep/components/game/home/top.vue";
import GameTrainDataContent from "@/sheep/components/player/game/gameTrainDataContent.vue";
</script>

<template>
  <view class="uni-body container">
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view>
        <top :showBluetooth="false" :showBackButton="true" :title="$t('game_train_data')"/>
      </view>
      <view class="uni-h-full content">
        <GameTrainDataContent/>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">

</style>
