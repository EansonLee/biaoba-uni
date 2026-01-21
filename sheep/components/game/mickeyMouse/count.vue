<script setup>
import {computed} from 'vue';

const props = defineProps({
  count: {
    type: Number,
    default: 0
  },
  color: {
    type: String,
    required: true
  },
  area: {
    type: [Number, String],
    default: 15,
  },
  isLetting: {
    type: Boolean,
    default: false
  },
  lineWidth: {
    type: Number,
    default: 2
  },
  circleWidth: {
    type: Number,
    default: 2
  },
  isForbidden:{
    type: Boolean,
    default: false
  }
});

// 根据 count 值动态计算状态
const state = computed(() => {
  if (props.count === 1) {
    return "singleLine";
  } else if (props.count === 2) {
    return "cross";
  } else if (props.count >= 3) {
    return "crossWithCircle";
  }
  return "none";
});
</script>

<template>
  <view class="container">
    <template v-if="isLetting">
      <!-- 让分机制显示 -->
      <view class="shape cross-with-circle">
        <!-- 圆形 -->
        <view class="circle" :style="{ 
          '--mark-color': count >= 3 ? color : '#999999',
          '--circle-width': circleWidth + 'rpx'
        }"></view>

        <!-- X的第一条线 -->
        <view class="cross first-line" 
              :style="{ 
                '--mark-color': count >= 1 ? color : '#999999',
                '--line-width': lineWidth + 'rpx'
              }">
        </view>

        <!-- X的第二条线 -->
        <view class="cross second-line"
              :style="{ 
                '--mark-color': count >= 2 ? color : '#999999',
                '--line-width': lineWidth + 'rpx'
              }">
        </view>
      </view>
    </template>
    <template v-else>
      <!-- 原有的非让分显示逻辑保持不变 -->
      <template v-if="area < 15||isForbidden">
        <view class="shape dash" :style="{ 
          '--mark-color': '#dcbc87',
          '--line-width': lineWidth + 'rpx'
        }"></view>
      </template>
      <template v-else>
        <view v-if="state === 'singleLine'" 
              class="shape cross single-line"
              :style="{ 
                '--mark-color': color + 'FF',
                '--line-width': lineWidth + 'rpx'
              }"></view>
        <view v-else-if="state === 'cross'" 
              class="shape cross"
              :style="{ 
                '--mark-color': color + 'FF',
                '--line-width': lineWidth + 'rpx'
              }"></view>
        <view v-else-if="state === 'crossWithCircle'" 
              class="shape cross-with-circle"
              :style="{ '--mark-color': color }">
          <view class="circle" :style="{ '--circle-width': circleWidth + 'rpx' }"></view>
          <view class="cross" :style="{ '--line-width': lineWidth + 'rpx' }"></view>
        </view>
      </template>
    </template>
  </view>
</template>

<style scoped lang="scss">
.container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.shape {
  position: relative;
  width: 100%;
  height: 100%;
}

// 添加横杠样式
.dash {
  &::before {
    content: "";
    position: absolute;
    background-color: var(--mark-color);
    width: 100%;
    height: var(--line-width);
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    transition: all 0.3s ease;
  }
}

.cross {
  &::before,
  &::after {
    content: "";
    position: absolute;
    background-color: var(--mark-color);
    width: var(--line-width);
    height: 100%;
    top: 0;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    transition: all 0.3s ease;
  }

  &::after {
    transform: translateX(-50%) rotate(-45deg);
  }

  // 单线模式只显示一条线
  &.single-line::after {
    display: none;
  }
}

.cross-with-circle {
  position: relative;
  width: 100%;
  height: 100%;

  .circle {
    position: absolute;
    width: 60%;
    height: 60%;
    border-width: var(--circle-width);
    border-style: solid;
    border-color: var(--mark-color);
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transition: all 0.3s ease;
    transform: translate(-50%, -50%);
  }

  .first-line,
  .second-line {
    position: absolute;
    width: 100%;
    height: 100%;

    &::before {
      content: "";
      position: absolute;
      background-color: var(--mark-color);
      width: var(--line-width);
      height: 100%;
      top: 0;
      left: 50%;
    }
  }

  .first-line::before {
    transition: all 0.3s ease;
    transform: translateX(-50%) rotate(45deg);
    z-index: 20;
  }

  .second-line::before {
    transition: all 0.3s ease;
    transform: translateX(-50%) rotate(-45deg);
  }
}
</style>