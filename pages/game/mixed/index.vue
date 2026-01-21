<script setup>
import Top from "@/sheep/components/game/home/top.vue";
import Bottom from "@/sheep/components/game/home/bottom.vue";
import Content from "@/sheep/components/game/mixed/home/content.vue";



</script>

<template>
  <view class="uni-body container">
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view>
        <Top back-url="/pages/game/home/index" :title="$t('mixed_mode')" :showBluetooth="true"
             :showBackButton="true"/>
      </view>
      <view class="uni-h-full content">
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
