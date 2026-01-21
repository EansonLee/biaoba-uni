<script setup>
import Top from "@/sheep/components/game/home/top.vue";
import SelectionAiContent from "@/sheep/components/game/aiMode/selectionAiContent.vue";
// import Bottom from "@/sheep/components/game/home/bottom.vue";



</script>

<template>
  <view class="uni-body container">
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view>
        <Top back-url="/pages/game/home/index" :title="$t('ai_fight')" :showBluetooth="true"
             :showBackButton="true"/>
      </view>
      <view class="uni-h-full content">
        <SelectionAiContent/>
      </view>
      <!-- <view>
        <bottom/>
      </view> -->
    </view>
  </view>
</template>

<style scoped lang="scss">

</style>
