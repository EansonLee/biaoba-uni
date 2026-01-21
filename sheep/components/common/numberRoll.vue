<script setup>
import { ref, watch } from 'vue';
import eventBus from "@/sheep/util/eventBus";

const props = defineProps({
  number: {
    type: [Number, String],
    required: true
  },
  height: {
    type: Number,
    default: 40
  },

  state: {
    type: Object,
    default: null
  }
});

// 将数字转换为数组
const numberArray = ref([]);

// 处理数字，确保在1-1000范围内
const processNumber = (num) => {
  // 转换为数字
  let value = Number(num);
  // 限制范围
  value = Math.max(0, Math.min(value, 1000)); // 修复了原代码中的 Math.min 参数缺失问题
  // 转换为字符串数组，确保至少显示一位数
  const numStr = String(value);
  return numStr.split('').map(Number);
};

// 新增：按钮点击事件
const animateNumber = (newVal, oldValue) => {
  if (typeof oldValue === 'undefined') {
  numberArray.value = processNumber(newVal);
    return;
  }
  
  let currentNumber = oldValue;
  const interval = setInterval(() => {
    if (currentNumber <= newVal) {    //随机次数
      clearInterval(interval);
      return;
    }
    currentNumber--;
    numberArray.value = processNumber(currentNumber);
  }, 5); // 每5毫秒更新一次数字，加快滚动速度
};

// 初始化和更新数字
watch(() => props.number, (newVal, oldValue) => {
  if (props.state && props.state.isChangeHand){
    numberArray.value = processNumber(newVal);
    eventBus.emit('handChangeEnd');
  }else {
    numberArray.value = processNumber(newVal);
    // 直接更新数字，不调用动画函数
    // animateNumber(newVal, oldValue);
  }

}, { immediate: true });
</script>

<template>
  <view class="number-roll-container">
    <view
        v-for="(digit, index) in numberArray"
        :key="index"
        class="digit-wrapper"
        :style="{ height: `${height}rpx`, width: `${height}rpx` }"
    >
      <image
          :src="`/static/images/figure/${digit}.png`"
          :style="{ height: `${height}rpx`, width: `${height}rpx` }"
          mode="aspectFit"
      />
    </view>
  </view>
  <!-- 新增：按钮 -->
<!--  <button @click="animateNumber">点击变化</button>-->
</template>

<style scoped>
.number-roll-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.digit-wrapper {
  transform: scale(1.4);
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 新增：按钮样式 */
button {
  margin-top: 20rpx;
  padding: 10rpx 20rpx;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5rpx;
}
</style>