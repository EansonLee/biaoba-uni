<script setup>
import {ref, reactive, computed} from 'vue';
import email from '@/sheep/api/dart/email';
import autoUser from "@/sheep/api/user/autoUser";
import {useI18n} from "vue-i18n";
import sheep from "@/sheep";
import {getMessage} from "@/sheep/common/msgCommon";
import Background from "@/sheep/components/common/background.vue";
import {showToast} from "@/sheep/util/toast";

const {t} = useI18n();

const state = reactive({
  playerName: '',
  email: '',
  code: '',
  password: '',
  confirmPassword: '',
  countdown: 0,
});

let timer = null;

const sendCode = async () => {
  if (!state.email) {
    showToast({message: t('email_required'), icon: 'none'});
    return;
  }
  const {code, data} = await email.Api.sendEmailCode(state.email);
  if (code !== 0) {
    showToast({message: getMessage('code_sent_failed', {reason: data.message}), icon: 'none'});
    return;
  }
  showToast({message: t('code_sent_successfully'), icon: 'success'});
  state.countdown = 60;

  timer = setInterval(() => {
    if (state.countdown > 0) {
      state.countdown -= 1;
    } else {
      clearInterval(timer);
    }
  }, 1000);
};

const register = async () => {
  if (!state.email || !state.code || !state.password || !state.confirmPassword) {
    showToast({message: t('password_required'), icon: 'none'});
    return;
  }

  if (state.password !== state.confirmPassword) {
    showToast({message: t('password_mismatch'), icon: 'none'});
    return;
  }

  const data = await autoUser.Api.forgetPassword({
    email: state.email,
    code: state.code,
    password: state.password,
    confirmPassword: state.confirmPassword,
  });

  showToast({message: t('reset_success'), icon: 'success'});
  setTimeout(() => {
    sheep.$router.go('/pages/index/index')
  }, 1500);
};

</script>

<template>
  <view class="page-wrapper">
    <Background/>
    <view class="back-button" @click="sheep.$router.go('/')">
      <image class="icon-size-30" src="@/static/images/back.png" mode="aspectFill"/>
    </view>

    <scroll-view class="container" scroll-y>
      <view class="content-wrapper">
        <view class="form content">
          <view class="title">{{ $t('reset_password') }}</view>

          <!-- 表单项 -->
          <view class="form-items">
            <view class="form-item">
              <input class="uni-input" type="email" v-model="state.email" :placeholder="$t('enter_email')"/>
            </view>

            <view class="form-item form-code">
              <input class="uni-input" type="text" v-model="state.code" :placeholder="$t('enter_verification_code')"/>
              <button class="btn-code" @click="sendCode" :disabled="state.countdown > 0">
                {{
                  state.countdown > 0 ? getMessage('resend_after_seconds', {countdown: state.countdown}) : $t('get_verification_code')
                }}
              </button>
            </view>

            <view class="form-item">
              <input class="uni-input" type="password" v-model="state.password" :placeholder="$t('enter_password')"/>
            </view>

            <view class="form-item">
              <input class="uni-input" type="password" v-model="state.confirmPassword"
                     :placeholder="$t('confirm_password')"/>
            </view>
          </view>

          <button class="btn-submit" @click="register">{{ $t('submit_reset') }}</button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page-wrapper {
  height: 100vh;
  position: relative;
}

.back-button {
  position: fixed;
  top: 20rpx;
  left: 20rpx;
  padding: 5rpx;
  z-index: 100;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: 25rpx;
  height: 25rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);

  &:active {
    opacity: 0.8;
  }
}

.container {
  height: 100%;
  box-sizing: border-box;
}

.content-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20rpx 10rpx;
}

.form {
  height: 80%;
  width: 90%;
  max-width: 400rpx;
  display: flex;
  flex-direction: column;
  padding: 20rpx 40rpx;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 6rpx;
  margin: auto;
}

.title {
  font-size: 20rpx;
  font-weight: bold;
  margin-bottom: 5rpx;
  text-align: center;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.form-item {
  margin-bottom: 10rpx;

  .uni-input {
    border: 1px solid #ccc;
    border-radius: 4rpx;
    padding: 8rpx;
    height: 20rpx;
    color: #ffffff;

    &::placeholder {
      color: rgba(255, 255, 255, 0.9);
      font-size: 12rpx;
    }
  }
}

.form-code {
  display: flex;
  align-items: center;
  gap: 8rpx;

  .uni-input {
    flex: 1;
  }

  .btn-code {
    height: 37.55rpx;
    padding: 8rpx 10rpx !important;
    background-color: #2196f3;
    color: white;
    border: none;
    border-radius: 4rpx;
    font-size: 13rpx !important;
    white-space: nowrap;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;

    &:disabled {
      background-color: rgba(33, 150, 243, 0.5);
    }
  }
}

.btn-submit {
  height: 35rpx;
  width: 100%;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4rpx;
  font-size: 14rpx;
  font-weight: 500;

  &:active {
    background-color: darken(#4caf50, 5%);
  }
}

.uni-input-placeholder {
  color: rgba(255, 255, 255, 0.9);
}
</style>
