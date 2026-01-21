<script setup>
import Top from "@/sheep/components/game/home/top.vue";
import Bottom from "@/sheep/components/game/home/bottom.vue";
import Content from "@/sheep/components/player/friend/content.vue";
</script>

<template>
  <view class="uni-body container">
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view>
        <Top  :title="$t('friend_list')" :showBluetooth="false"
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
