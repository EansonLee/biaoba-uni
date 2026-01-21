<script setup>
import { defineProps } from 'vue';

// 接收组件参数
const props = defineProps({
  x: {
    type: Number,
    default: 25, // 默认距离右侧 20vh
  },
  y: {
    type: Number,
    default: 25, // 默认距离底部 30vh
  },
  size: {
    type: Number,
    default: 15, // 默认气泡大小 60px
  },
  onClick: {
    type: Function,
    default: () => {
      console.log('气泡被点击！');
    },
  },
  text:{
    type: String,
    default: '点击我'
  }
});
</script>

<template>
  <view
      class="floating-bubble"
      :style="{ bottom: `${y}vh`, right: `${x}vh`, width: `${size}vh`, height: `${size}vh` }"
      @click="onClick"
  >
    {{ text }}
  </view>
</template>

<style scoped lang="scss">
.floating-bubble {
  position: fixed;
  border-radius: 50%;
  background-color: #007bff;
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  font-size: 14rpx;
  padding: 4rpx;
  text-align: center;
  word-break: break-word;
  overflow: hidden;
  z-index: 25;
  animation: bounce 2s infinite;
}

/* 气泡弹跳效果 */
@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}
</style>
