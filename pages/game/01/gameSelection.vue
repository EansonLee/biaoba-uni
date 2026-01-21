<script setup>
import Top from "@/sheep/components/game/home/top.vue";
import SelectionContent from "@/sheep/components/game/01/selectionContent.vue";
import Bottom from "@/sheep/components/game/home/bottom.vue";
</script>

<template>
  <view class="uni-body container">
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view>
        <Top back-url="/pages/game/home/index" :title="$t('score_deduction')" :showBluetooth="true"
             :showBackButton="true"/>
      </view>
      <view class="uni-h-full content">
        <SelectionContent/>
      </view>
      <view>
        <bottom/>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">

</style>
