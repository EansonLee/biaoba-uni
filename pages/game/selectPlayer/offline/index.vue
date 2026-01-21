<script setup>
import Top from "@/sheep/components/game/home/top.vue";
import Content from "@/sheep/components/game/selectPlayer/offline/content.vue";
import {reactive, computed} from 'vue';
import {
  onLoad,
} from '@dcloudio/uni-app';
import {useI18n} from "vue-i18n";
import {getParams} from "@/sheep/router";




const state = reactive({
  params: {},
  message: '人员安排',
  startingScore: 0,
})
const {t,locale} = useI18n();

// 获取路由传递的参数
onLoad((options) => {
  state.params = getParams(options);
})
function shanghaiThrill(item) {
  if(item === '上海TWIST'){
    return  '上海挑战'
  }else{
    return item
  }
}

const getTitle = computed(() => {
  if (state.params.type === 8) {
    return `${t('mixed_mode')}`
  }
  return String(locale.value === 'zh' ? shanghaiThrill(state.params.chineseModeName) : state.params.englishModeName);
})
</script>

<template>
  <view class="uni-body container">
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view>
        <Top :title="getTitle" :showBluetooth="true" :showBackButton="true"/>
      </view>
      <view class="uni-h-full content">
        <Content :params="state.params" :type="state.params.type"/>
      </view>
    </view>
  </view>

</template>

<style scoped lang="scss">

</style>
