<script setup>
import Top from "@/sheep/components/game/home/top.vue";
import {reactive, ref, watch} from 'vue';
import {onLoad} from '@dcloudio/uni-app';
import MixedContent from "@/sheep/components/game/mixed/mixedContent.vue";


const close = (number) => {
  if (number === 1) {
    invitePopModalVisible.value = false
  } else if (number === 2) {
    friendPopModalVisible.value = false;
  }
}

const state = reactive({
  data: {},
  round: 0
})
onLoad((options) => {
  state.data = options
  // 转数字
  state.round = parseInt(options.round)
})
</script>

<template>
  <view class="uni-body container">
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view>
        <Top  :title="state.data.text" :showBluetooth="true"
             :showBackButton="true"/>
      </view>
      <view class="uni-h-full center uni-justify-content-center">
        <mixed-content :round="state.round"/>
      </view>
<!--      <view>-->
<!--        <bottom/>-->
<!--      </view>-->
    </view>
  </view>
</template>

<style scoped lang="scss">

</style>
