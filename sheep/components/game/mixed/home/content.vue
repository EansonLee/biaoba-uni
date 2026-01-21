<script>
export const mixedOptions = [
  {
    round: 3,
  },
  {
    round: 5,
  },
  {
    round: 7,
  },
]
</script>
<script setup>
import {ref, reactive} from 'vue';
import sheep from "@/sheep";

const state = reactive({
  options: mixedOptions,
})

</script>

<template>
  <view class="container">
    <view class="view_container">
      <view v-clickSound  v-for="(item, index) in state.options"
            :key="index"
            class="item"
            @click="sheep.$router.go('/pages/game/mixed/modeIndex', item)">
        <view class="item-bg">
          <text class="item-text">
            {{ item.round }}LEG
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.item-bg {
  height: 100%;
  width: 100%;
  background-image: url("/static/images/game/mixed/item-bg.png");
  background-color: transparent;
  background-size: cover; /* 背景图片覆盖整个区域 */
  background-position: center; /* 背景居中 */
  background-repeat: no-repeat; /* 防止背景图片重复 */
  display: flex;
  align-items: center;
  justify-content: center; /* 文字居中 */
}

.item-text {
  font-size: 20rpx;
  font-weight: 600;
  text-align: center;
  color: #FF24FB;
  white-space: nowrap; // 确保不换行
  overflow: hidden; // 超出隐藏
}

.container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 在 style 文件中设置样式 */
.view_container {
  display: flex;
  flex-wrap: wrap; /* 允许换行 */
  justify-content: space-between; /* 元素之间的间距 */
  gap: 25rpx; /* 元素之间的间距 */
  padding: 0 50rpx;
}

.item {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-sizing: border-box; /* 包括内边距和边框 */
  text-align: center;
  width: 120rpx;
  height: 120rpx;
}

</style>