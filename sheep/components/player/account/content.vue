<script setup>
import { ref } from 'vue'

// 模拟的个人信息数据
const userInfo = ref({
  avatar: '/static/images/user.png', // 头像链接
  accountId: '123456789', // 账户ID
  name: 'John Doe', // 用户名称
  rating: 'A+', // 用户评级
  country: 'USA', // 国家
  onlineGames: 102, // 在线游戏次数
  ppdScore: 9875, // 01PPd分值
  crmprScore: 1357 // CRMPR分值
})
</script>

<template>
  <view class="container">
    <view class="profile-card">
      <!-- 头像 -->
      <image :src="userInfo.avatar" class="avatar" />

      <!-- 用户信息 -->
      <view class="user-info">
        <text class="user-name">{{ userInfo.name }}</text>
        <text class="account-id">Account ID: {{ userInfo.accountId }}</text>
      </view>

      <!-- 其他信息 -->
      <view class="details">
        <view class="info-item">
          <text class="label">Rating:</text>
          <text class="value">{{ userInfo.rating }}</text>
        </view>
        <view class="info-item">
          <text class="label">Country:</text>
          <text class="value">{{ userInfo.country }}</text>
        </view>
        <view class="info-item">
          <text class="label">Online Games:</text>
          <text class="value">{{ userInfo.onlineGames }}</text>
        </view>
        <view class="info-item">
          <text class="label">01PPd Score:</text>
          <text class="value">{{ userInfo.ppdScore }}</text>
        </view>
        <view class="info-item">
          <text class="label">CPMPD Score:</text>
          <text class="value">{{ userInfo.crmprScore }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  overflow-x: auto; /* 允许水平滚动 */
}

.profile-card {
  display: flex;
  flex-direction: row; /* 横向排列 */
  align-items: center; /* 垂直居中 */
  background-color: #fff;
  border-radius: 10rpx;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 20rpx;
  width: 90%; /* 容器宽度 */
}

.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 20rpx; /* 头像和文本之间的间距 */
}

.user-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-right: 20rpx; /* 用户名和ID与详细信息之间的间距 */
}

.user-name {
  font-size: 20rpx;
  font-weight: bold;
  color: #333;
}

.account-id {
  font-size: 14rpx;
  color: #777;
}

.details {
  display: flex;
  flex-direction: column;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.label {
  font-size: 14rpx;
  color: #555;
}

.value {
  font-size: 14rpx;
  color: #333;
  font-weight: bold;
}
</style>
