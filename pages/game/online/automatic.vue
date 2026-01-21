<script setup>
import Top from "@/sheep/components/game/home/top.vue";
import Bottom from "@/sheep/components/game/home/bottom.vue";
import automaticContent from "@/sheep/components/game/online/automaticContent.vue";
import {onLoad} from '@dcloudio/uni-app';
import {reactive} from 'vue';
import {getParams} from "@/sheep/router";
const state = reactive({
  data: {}
})
onLoad((options) => {
  state.data = getParams(options)
})
</script>

<template>
  <view class="uni-body container">
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view>
        <Top  :title="$t('online_lobby')" :showBluetooth="true"
             :showBackButton="true"/>
      </view>
      <view class="uni-h-full content">
        <automaticContent :selectiveGame="state.data.selectiveGame" :modalContent="state.data.modalContent"  :mixGame="state.data.mixGame"/>
      </view>
      <view>
        <!-- <bottom/> -->
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">

</style>
