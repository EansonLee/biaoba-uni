<!-- 弹窗口组件 -->
<template name="globalDialog">
  <view class="mask position-fixed bg-#000 opacity-60% w-100vh h-100vh" style="z-index:1" v-if="show">
		mask
  </view>
</template>
 
 
<script setup lang="ts">
import { ref } from "vue";
 
let show = ref(false);
 
const open = () => {
  show.value = true;
};
const close = () => {
  show.value = false;
};
 
 
//暴露open和close方法
defineExpose({
  open,
  close,
});
</script>
<style lang="scss" scoped>
 
</style>