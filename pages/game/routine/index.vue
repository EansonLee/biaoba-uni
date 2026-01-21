<script setup>
import Top from "@/sheep/components/game/home/top.vue";
import Content from "@/sheep/components/game/routine/content.vue";
import Bottom from "@/sheep/components/game/home/bottom.vue";


</script>

<template>
  <view class="uni-body container">
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view>
        <Top :title="$t('regular_game')" :showBluetooth="true"
             :showBackButton="true"/>
      </view>
      <view class="uni-h-full">
        <content/>
      </view>
      <view>
        <bottom/>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">

</style>
