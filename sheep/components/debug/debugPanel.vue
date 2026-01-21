<script setup>
import { reactive } from 'vue';

const props = defineProps({
  currentRound: {
    type: Number,
    default: 1
  },
  currentDart: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['throw-dart']);

const debugState = reactive({
  isVisible: true,
  scoreInput: '01',
  isDragging: false,
  position: {
    x: 20,
    y: 20
  },
  dragOffset: {
    x: 0,
    y: 0
  }
});

// 开始拖动
const startDrag = (event) => {
  debugState.isDragging = true;
  const touch = event.touches[0];

  // 计算触摸点相对于面板的偏移
  debugState.dragOffset.x = touch.clientX - debugState.position.x;
  debugState.dragOffset.y = touch.clientY - debugState.position.y;
};

// 拖动中
const onDrag = (event) => {
  if (!debugState.isDragging) return;

  const touch = event.touches[0];

  // 计算新位置
  let newX = touch.clientX - debugState.dragOffset.x;
  let newY = touch.clientY - debugState.dragOffset.y;

  // 获取屏幕尺寸
  const systemInfo = uni.getSystemInfoSync();
  const windowWidth = systemInfo.windowWidth;
  const windowHeight = systemInfo.windowHeight;

  // 防止面板拖出屏幕
  const panelWidth = 300; // rpx 转 px
  const panelHeight = 200; // 估算面板高度

  // 限制边界
  newX = Math.max(0, Math.min(newX, windowWidth - panelWidth));
  newY = Math.max(0, Math.min(newY, windowHeight - panelHeight));

  // 更新位置
  debugState.position.x = newX;
  debugState.position.y = newY;
};

// 结束拖动
const endDrag = () => {
  debugState.isDragging = false;
};

// 投镖
const throwDart = () => {
  const score = debugState.scoreInput;
  emit('throw-dart', score);
};
</script>

<template>
  <view
      v-if="debugState.isVisible"
      class="debug-panel"
      :style="{
      left: debugState.position.x + 'px',
      top: debugState.position.y + 'px'
    }"
  >
    <view
        class="debug-header"
        @touchstart.stop="startDrag"
        @touchmove.stop.prevent="onDrag"
        @touchend.stop="endDrag"
    >
      <text class="uni-text">调试面板</text>
      <text class="close-btn" @tap="debugState.isVisible = false">X</text>
    </view>
    <view class="debug-content">
      <view class="debug-info">
        <text class="uni-text">当前回合: {{ currentRound }}</text>
        <text class="uni-text">当前镖数: {{ currentDart }}/3</text>
      </view>
      <view class="debug-input">
        <input
            class="uni-input"
            v-model="debugState.scoreInput"
            placeholder="输入编码"
        />
        <button class="uni-button" @tap="throwDart">投镖</button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.debug-panel {
  position: fixed;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #ccc;
  border-radius: 10rpx;
  padding: 20rpx;
  width: auto;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.debug-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
  padding: 10rpx;
  background-color: #f5f5f5;
  border-radius: 5rpx;

  .close-btn {
    padding: 0 10rpx;
  }
}

.debug-content {
  .debug-info {
    display: flex;
    flex-direction: column;
    margin-bottom: 10rpx;

    .uni-text {
      margin: 5rpx 0;
    }
  }

  .debug-input {
    display: flex;
    gap: 10rpx;

    .uni-input {
      flex: 1;
      border: 1px solid #ffffff;
      padding: 4rpx 8rpx;
      border-radius: 4rpx;
      color: black;
    }

    .uni-button {
      background-color: #00ccff;
      color: white;
      border: none;
      border-radius: 4rpx;

      &:active {
        background-color: #0099cc;
      }
    }
  }
}
</style> 