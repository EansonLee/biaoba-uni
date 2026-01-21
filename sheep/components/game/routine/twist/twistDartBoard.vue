<script setup>
import {ref, watch} from 'vue';
import {targetConfig} from "@/sheep/config/bluetoothConfig";

const props = defineProps({
  hitAreas: {
    type: Object,
    default: () => ({}),
  },
  offsetAngle: {
    type: Number,
    default: -9,
  },
  radius: {
    type: Number,
    default: 120,
  },
  centerX: {
    type: Number,
    default: 132,
  },
  centerY: {
    type: Number,
    default: 132,
  },
  centerCircleSize: {
    type: Number,
    default: 8,
  },
  showGif: {
    type: Boolean,
    default: false,
  },
  HeartsHit: {
    type: Number,
    default: 0
  }
});

// 控制分数显示的响应式变量
const showScore = ref(false);
const currentScore = ref(0);
const animationKey = ref(0); // 用于强制重新触发动画

// 监听HeartsHit的变化
watch(() => props.HeartsHit, (newVal) => {
  if (newVal && newVal !== 0) {
    // 先隐藏，确保动画可以重新触发
    showScore.value = false;
    
    // 使用nextTick确保DOM更新后再显示
    setTimeout(() => {
      // 提取实际分数（去除时间戳）
      // 如果值在1000-1099之间，显示1000；如果在10000-10099之间，显示10000
      if (newVal >= 10000 && newVal < 10100) {
        currentScore.value = 10000;
      } else if (newVal >= 1000 && newVal < 1100) {
        currentScore.value = 1000;
      } else {
        currentScore.value = newVal;
      }
      
      showScore.value = true;
      animationKey.value++; // 增加key值强制重新渲染
      
      // 1秒后隐藏
      setTimeout(() => {
        showScore.value = false;
      }, 1000);
    }, 50);
  }
});

// 生成扇区数据
const areas = ref(
    targetConfig.map((number, index) => ({
      number,
      startAngle: ((360 / 20) * index + props.offsetAngle - 90) * (Math.PI / 180),
      endAngle: ((360 / 20) * (index + 1) + props.offsetAngle - 90) * (Math.PI / 180),
    }))
);

// 检查是否命中
const isAreaHit = (number) => props.hitAreas[number]?.status === 1;

// 计算每个数字的位置
const calculatePosition = (area) => {
  const midAngle = (area.startAngle + area.endAngle) / 2;
  const innerRadius = props.radius * 0.93;
  return {
    x: props.centerX + innerRadius * Math.cos(midAngle),
    y: props.centerY + innerRadius * Math.sin(midAngle),
  };
};

// 检查是否应该动画
const shouldAnimate = (number) => props.hitAreas[number]?.status === 2;

// 获取文本样式
const getTextStyle = (number) => {
  const baseStyle = {
    color: props.hitAreas[number]?.color || '#c29b29',
    fontSize: props.hitAreas[number]?.size ? props.hitAreas[number].size + 'rpx' : '18rpx',
    fontWeight: 600,
    textShadow: '1rpx 1rpx 2rpx rgba(0,0,0,0.5)'
  };
  if (shouldAnimate(number)) {
    baseStyle.color = props.hitAreas[number]?.color || 'rgba(255, 255, 255, 0.8)';
  }

  return baseStyle;
};
</script>

<template>
  <view class="dartboard-container">
    <!-- 牛眼得分显示（带动画效果） -->
    <span v-if="showScore" :key="animationKey" class="heartsHit score-animate">{{ currentScore }}</span>
    <image v-if="props.showGif" src="/static/gif/honxin.gif" mode="aspectFill" class="overlay-gif"></image>

    <!-- 扇形区域 -->
    <view class="sectors-container">
      <view v-for="(area, index) in areas"
            :key="index"
            class="sector"
            :class="{ 'hit': isAreaHit(area.number) }"
            :style="{
             transform: `rotate(${(index * 18) + props.offsetAngle}deg)`,
           }">
        <view class="sector-content"></view>
      </view>
    </view>

    <!-- 数字 -->
    <view class="number-container">
      <view
          v-for="area in areas"
          :key="area.number"
          class="sector-number"
          :class="{
            'hit': isAreaHit(area.number),
            'number-animate': shouldAnimate(area.number)
          }"
          :style="{
            top: `${calculatePosition(area).y}rpx`,
            left: `${calculatePosition(area).x}rpx`,
            '--delay': `${area.number * 0.1}s`
          }"
      >
        <view class="nbr-region" :style="getTextStyle(area.number)">{{ area.number }}
        </view>
      </view>
    </view>

    <!-- 中心圆圈 -->
    <view class="center-circle"
          :style="{
           width: `${props.centerCircleSize}rpx`,
           height: `${props.centerCircleSize}rpx`,
         }">
    </view>
  </view>
</template>

<style scoped>
.nbr-region {
  transition: all 0.5s;
}

.dartboard-container {
  position: relative;
  width: 265rpx;
  height: 265rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}

.overlay-gif {
  position: absolute;
  width: 400rpx;
  height: 400rpx;
  top: -35rpx;
  left: -80rpx;
  z-index: 5; /* 确保GIF在最顶层 */
}

.sectors-container {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 2;
}

.sector {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-origin: center;
}

.sector-content {
  position: absolute;
  width: 100%;
  height: 100%;
  clip-path: polygon(
      50% 50%,
      50% 0%,
      calc(50% + 50% * cos(18deg)) calc(50% - 50% * sin(18deg))
  );
  transition: background-color 0.3s;
}

.number-container {
  background-image: url("/static/images/game/twist/dartBoard.png");
  background-size: 100% 100%;
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 3;
}

.sector-number {
  position: absolute;
  transform: translate(-50%, -50%);
  filter: brightness(1.2);
}

.sector-number.number-animate {
  animation: floatNumber 2s ease-in-out infinite;
  animation-delay: var(--delay);
}

@keyframes floatNumber {
  0%, 100% {
    transform: translate(-50%, -50%);
    opacity: 0.8;
  }
  50% {
    transform: translate(-50%, calc(-50% - 4rpx));
    opacity: 1;
  }
}

.sector-number.hit {
  opacity: 0;
  transition: opacity 0.3s;
  animation: none;
}

.center-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  border: 2rpx solid rgba(255, 255, 255, 0.5);
  z-index: 4;
  left: 50%;
  top: 50.1%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 10rpx rgba(255, 255, 255, 0.3);
  box-sizing: border-box;
}

.heartsHit{
  position: absolute;
  top: 50%;
  left: 50%;
  color: #ffffff;
  font-size: 24rpx;
  font-weight: bold;
  font-style: italic;
  text-shadow:
      0 0 10rpx rgba(255, 255, 255, 0.8),
      0 0 20rpx rgba(223, 223, 223, 0.6),
      0 0 30rpx rgba(163, 163, 163, 0.4),
      0 0 40rpx rgba(240, 196, 34, 0.2),
      2rpx 2rpx 4rpx rgba(0, 0, 0, 0.5);
  z-index: 10;
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
}

.score-animate {
  animation: scorePopup 1s ease-out;
}

@keyframes scorePopup {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
  20% {
    transform: translate(-50%, -50%) scale(7);
    opacity: 1;
  }
  40% {
    transform: translate(-50%, -50%) scale(6);
    opacity: 1;
  }
  80% {
    transform: translate(-50%, -50%) scale(6);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(6);
    opacity: 0;
  }
}

</style>