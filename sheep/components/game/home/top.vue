<script setup>
import Bluetooth from "@/sheep/components/blue/Bluetooth.vue";
import sheep from "@/sheep";
import $stores from "@/sheep/stores";
import MessageContent from "@/sheep/components/player/messages/content.vue";
import {ref, onUnmounted} from 'vue';
const emit = defineEmits(['reload']);
import gameInvitation from "@/sheep/api/dart/gameInvitation";
import playerFriends from "@/sheep/api/dart/playerFriends";
import notice from "@/sheep/api/dart/notice";
import emitter from "@/sheep/util/eventBus";

const props = defineProps({
  showBackButton: {
    type: Boolean,
    default: false
  },
  showBluetooth: {
    type: Boolean,
    default: true
  },
  title: {
    type: String,
    default: ''
  },
  backUrl: {
    type: String,
    default: ''
  },
  showRedDots:{
    type: Boolean,
    default: false
  },
  duiZhanRedDots:{
    type: Boolean,
    default: false
  }
});
let modalVisible = ref(false);
const backUrlFun = () => {
  if (props.backUrl) {
    sheep.$router.go(props.backUrl)
  } else {
    sheep.$router.back()
  }
}

let duiZhan=[];
let friend=[];
let xiTon=[];
let duiZhanRed=ref();
let friendRed=ref();
let xiTonRed=ref(false);

const messageVisible = async () =>{
  duiZhan=await gameInvitation.Api.getList();
  friend=await playerFriends.Api.getList({status:0});
  xiTon=await notice.Api.getNoticeList();

  // 🔧 修复红点计算：只计算有效的邀请（排除已完成、已拒绝、已取消、已过期的邀请）
  const validInvitations = duiZhan.filter(item => item.state === 0); // 只显示待接受的邀请
  duiZhanRed.value = validInvitations.length > 0;
  friendRed.value=friend.length>0;
  xiTonRed.value=xiTon.length>0;
  modalVisible.value = true;
}

function onFoo(e) {
  console.log('监听页面中：',e);
  const userInfo = $stores('user').getUserInfo();
  if (userInfo) {
    userInfo.headImgUrl = e;
  }
}

emitter.on('headImageUpdateSuccess', onFoo);

onUnmounted(() => {
  emitter.off('headImageUpdateSuccess', onFoo);
})

const close = () =>{
	modalVisible.value = false;
  emit('reload')
}

const closeRed = (index) =>{
  console.log('触发关闭红点方法--->'+index)
  if (index===1){
    duiZhanRed.value=false;
  } else if (index===2){  // 🔧 修复条件判断错误
    friendRed.value=false;
  }else if (index===3){
    xiTonRed.value=false;
  }
  console.log('触发关闭红点方法--->'+xiTonRed)
}

</script>
<template>
  <view class="top-bar">
    <!-- 左侧：头像 + 设置按钮 + 详细按钮 -->
    <view class="left">
      <template v-if="showBackButton">
        <view v-clickSound @click="backUrlFun" class="icon-size-30 ">
          <image class="uni-img uni-img-scale2" src="@/static/images/back.png"></image>
        </view>
      </template>
      <template v-else>
        <view class="uni-flex">
          <view v-clickSound class=" icon-size-30 mr-20"
                style="border-radius: 50%; border: 1rpx solid rgba(136, 86, 255, 0.3);"
                @click="sheep.$router.go('/pages/player/profile/index')">
            <image class="uni-circle uni-img"
                   :src="($stores('user').getUserInfo()?.headImgUrl) || '/static/images/user.png'" mode="aspectFill"></image>
          </view>
          <view v-clickSound class="icon-size-30" style="padding-right: 20rpx"
                @click="sheep.$router.go('/pages/player/setting/index')">
            <image class="uni-img uni-img-scale3"
                   src="@/static/images/settings.png" mode="aspectFill"></image>
          </view>
          <view v-clickSound class="icon-size-30 messagePosition" @click="messageVisible">
            <image class="uni-img uni-img-scale3" src="@/static/images/message.png" mode="aspectFill"></image>
            <view class="red-dot" v-if="showRedDots"></view>
          </view>
        </view>
      </template>
    </view>

    <!-- 中间：标题 -->
    <view class="center" v-if="title">
      <text class="title">{{ title }}</text>
    </view>

    <!-- 右侧：蓝牙状态按钮 -->
    <view class="right">
      <Bluetooth v-if="showBluetooth" size="40" color="#1296db"/>
    </view>
  </view>

  <MessageContent :xiTonRed="xiTonRed" :dui-zhan-red-dots="duiZhanRed" :friendRed="friendRed" :modalVisible="modalVisible" @closeRed="closeRed" @close="close">

  </MessageContent>

</template>

<style scoped lang="scss">
.avatar-container {
  // 确保容器有足够的空间
  min-width: 40rpx;
  min-height: 40rpx;
  width: 40rpx;
  height: 40rpx;
  overflow: hidden; // 防止内容溢出
  border-radius: 50%;

  .avatar {
    width: 100%;
    height: 100%;
    object-fit: cover; // 确保图片填充整个容器
    display: block; // 消除可能的间隙
  }
}

// 如果头像在flex容器中，确保不会被压缩
.flex-container {
  display: flex;
  align-items: center;

  .avatar-container {
    flex-shrink: 0; // 防止头像被压缩
  }
}

.left {
  display: flex;
  align-items: center;
  flex-shrink: 0; /* 防止左侧内容挤占空间 */
  position: relative;
}

.right {
  display: flex;
  align-items: center;
  flex-shrink: 0; /* 防止右侧内容挤占空间 */
}

.top-bar {
  padding: 5rpx 20rpx 0 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative; /* 为了定位中间标题 */
}

.center {
  position: absolute; /* 使用绝对定位 */
  left: 50%;
  transform: translateX(-50%); /* 使元素居中 */
}

.title {
  font-size: 18rpx;
  font-weight: 300; /* 适当减小字体粗细 */
  color: #ffffff;
  // -webkit-text-stroke: 0.3rpx #8856FF; /* 更细的描边 */
  //text-shadow: 0 0 3px #8856FF, /* 核心光晕，减小扩散半径 */
  //0 0 6px #8856FF, /* 外层光晕 */
  //0 0 10px #8856FF, /* 更外层散光 */
  //0 0 20px #8856FF; /* 扩展散光层，弱化散光 */
}

.red-dot {
  position: absolute;
  width: 8rpx;  /* 红点大小 */
  height: 8rpx;
  background-color: #ff4d4f; /* 小红点颜色 */
  border-radius: 50%;        /* 圆形 */
  border: 1rpx solid white;   /* 白色边框，让红点更突出 */
  z-index: 10;               /* 确保显示在图标上方 */
  top: 0rpx;
  right: -2rpx;
}


</style>
