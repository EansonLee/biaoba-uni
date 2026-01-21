<script setup>
import Top from "@/sheep/components/game/home/top.vue";
import Content from "@/sheep/components/game/home/content.vue";
import Bottom from "@/sheep/components/game/home/bottom.vue";
import {onMounted, ref, watch} from 'vue';
import {onLoad} from '@dcloudio/uni-app';
import bluetooth from "@/sheep/stores/bluetooth";
import player from '@/sheep/api/dart/player';
import {showToast} from "@/sheep/util/toast";
import {useI18n} from "vue-i18n";
import zimStore from '@/sheep/stores/zegoStore';
import playerFriends from '@/sheep/api/dart/playerFriends';
import gameInvitation from '@/sheep/api/dart/gameInvitation';

const {t} = useI18n();

let myMessageNumber=ref(null);
const zimStores = zimStore();
const showRedDotRealtime = ref(false);

// 实时监听好友申请/对战邀请，立刻亮红点（即使接口统计未更新）
watch(zimStores.message.addFriend, (New) => {
  if (New && New.length > 0) showRedDotRealtime.value = true;
}, { deep: true, immediate: true });
watch(zimStores.message.yaoqing, (New) => {
  if (New && New.length > 0) showRedDotRealtime.value = true;
}, { deep: true, immediate: true });

let redDotPollTimer;

onMounted(async () => {
  if (bluetooth().isDisconnected) {
    // 蓝牙连接
    bluetooth().connect();
    bluetooth().isDisconnected = false;
  }
  myMessageNumber.value=await player.Api.findMyMessageNumber();
  // 兜底轮询：接口统计或待处理列表只要>0即亮红点
  redDotPollTimer = setInterval(async ()=>{
    try{
      const [num, friendPending, invites] = await Promise.all([
        player.Api.findMyMessageNumber(),
        playerFriends.Api.getList({status:0}),
        gameInvitation.Api.getList({ types: [1,2], duelMode: 1 })
      ]);
      myMessageNumber.value = num || 0;
      const hasFriend = Array.isArray(friendPending) && friendPending.some(x=>true);
      const hasInvite = Array.isArray(invites) && invites.some(item=>item.state===0);
      showRedDotRealtime.value = hasFriend || hasInvite;
    }catch(e){}
  }, 10000);
})

const requestBluetoothPermissions = () => {
  // #ifdef APP-PLUS
  if (plus.os.name == 'Android') {
    // 获取App实例来管理授权弹窗状态
    const app = getApp();

    // 在请求权限前设置授权弹窗状态
    if (app && typeof app.setAuthDialogStatus === 'function') {
      app.setAuthDialogStatus(true);
    }

    // 安卓需要申请的权限
    const permissions = [
      "android.permission.BLUETOOTH",
      "android.permission.BLUETOOTH_ADMIN",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION"
    ];

    // Android 12及以上还需要额外权限
    if (plus.android.importClass("android.os.Build").VERSION.SDK_INT >= 31) {
      permissions.push("android.permission.BLUETOOTH_SCAN");
      permissions.push("android.permission.BLUETOOTH_CONNECT");
    }

    // 申请权限
    plus.android.requestPermissions(
        permissions,
        function(result) {
          console.log('蓝牙权限申请结果:', JSON.stringify(result));

          // 权限请求完成，延迟重置授权弹窗状态，避免与onShow事件竞争
          if (app && typeof app.setAuthDialogStatus === 'function') {
            setTimeout(() => {
              app.setAuthDialogStatus(false);
            }, 500); // 延迟500ms重置
          }
        },
        function(error) {
          console.error('蓝牙权限申请错误:', error.message);

          // 权限请求出错，也要延迟重置授权弹窗状态
          if (app && typeof app.setAuthDialogStatus === 'function') {
            setTimeout(() => {
              app.setAuthDialogStatus(false);
            }, 500); // 延迟500ms重置
          }
        }
    );
  }
  // #endif
}

const reload = async () =>{
  myMessageNumber.value=await player.Api.findMyMessageNumber();
  // 用户查看过消息中心后，临时红点清零（以接口统计为准）
  showRedDotRealtime.value = false;
}

const checkBluetoothStatus = () => {
  const btStore = bluetooth();
  uni.openBluetoothAdapter({
    success: () => {
      console.log('蓝牙适配器已打开，开始检查已连接设备...');
      uni.getConnectedBluetoothDevices({
        success: (res) => {
          if (res.devices && res.devices.length > 0) {
            const device = res.devices[0];
            console.log(`发现已连接设备: ${device.deviceId}`);
            // 假设 store 有一个 action `setConnectionState` 用于更新连接状态
            // 这将强制 UI 更新
            if (!btStore.isConnected || btStore.deviceId !== device.deviceId) {
              console.log('UI状态与蓝牙实际状态不符，正在进行同步...');
              // 这里我假设有一个 setConnectionState 的 action, 如果实际名称不同, 请告知我
              btStore.setConnectionState(true, device.deviceId);
            }
          } else {
            // 没有发现已连接设备, 确保UI状态为未连接
            if (btStore.isConnected) {
              btStore.setConnectionState(false, null);
            }
          }
        },
        fail: (err) => {
          console.error('获取已连接蓝牙设备失败:', err);
          if (btStore.isConnected) {
            btStore.setConnectionState(false, null);
          }
        }
      });
    },
    fail: (err) => {
      console.error('蓝牙适配器打开失败:', err);
      if (btStore.isConnected) {
        btStore.setConnectionState(false, null);
      }
      if (err.errCode === 10001) { // not authorized
        showToast({ message: t('bluetooth_authorization_required'), icon: 'none' });
      }
    }
  });
};

onLoad((options) => {
  requestBluetoothPermissions();
  checkBluetoothStatus();
});


import { onBeforeUnmount } from 'vue';

onBeforeUnmount(()=>{ if (redDotPollTimer) clearInterval(redDotPollTimer); });
</script>

<template>
  <view class="uni-body container">
    <view class="uni-flex uni-column uni-h-full uni-space-between">
      <view>
        <top :show-red-dots="(myMessageNumber>0) || showRedDotRealtime" @reload="reload"/>
      </view>
      <view class="uni-h-full content">
        <content/>
      </view>
      <view>
        <bottom/>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">

</style>
