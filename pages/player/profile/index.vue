<script setup>
import Top from "@/sheep/components/game/home/top.vue";
import Content from "@/sheep/components/player/profile/content.vue";
</script>

<template>
  <view class="uni-body container">
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view>
        <top :showBluetooth="false" :showBackButton="true" :title="$t('personal_information')"/>
      </view>
      <view class="uni-h-full content">
        <content/>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">

</style>
