<script setup>
import {reactive, computed, ref} from 'vue';
import autoUser from "@/sheep/api/user/autoUser";
import {useI18n} from "vue-i18n";
import sheep from "@/sheep";
import {getMessage} from "@/sheep/common/msgCommon";
import Background from "@/sheep/components/common/background.vue";
import BackButton from "@/sheep/components/common/backButton.vue";
import sendCommon from "@/sheep/common/sendCommon";
import {onLoad} from '@dcloudio/uni-app';
import {preventDuplicateClick} from "@/sheep/common/util";
import SubButton from "@/sheep/components/common/subButton.vue";
import {showToast} from "@/sheep/util/toast";
import {validateEmail} from "@/sheep/util/emailUtil.js"
import agreement from '@/sheep/api/dart/agreement';
import $stores from "@/sheep/stores";

const userInfo = $stores('user').getUserInfo();
const {t} = useI18n();

const state = reactive({
  playerName: '',
  email: '',
  code: '',
  password: '',
  confirmPassword: '',
  countdown: 0,
  isAgreed: false,
  timer: null,
  type: 1,
});

onLoad((options) => {
  state.type = options.type
})
const countryCode=ref(null);

const bindEamil = preventDuplicateClick(async () => {
  if (!flay()) {
    return;
  }

  if (!state.email || !state.code || !state.password || !state.confirmPassword) {
    showToast({message: t('password_required'), icon: 'none'});
    return false;
  }
  
  let flag=validateEmail(state.email);
  if(!flag){
  	showToast({message: t('mailbox_is_incorrectly_formatted'), icon: 'none'});
  	return;
  }
  
  await autoUser.Api.bindEmail({
    email: state.email,
    code: state.code,
    password: state.password,
    confirmPassword: state.confirmPassword,
    type: state.type,
	userId: userInfo.id
  });

  showToast({message: t('update_success'), icon: 'success'});
  
  $stores('user').updateUserData()
  setTimeout(() => {
    sheep.$router.back();
  }, 2000);
});


const flay = () => {
  if (state.password !== state.confirmPassword) {
    showToast({message: t('password_mismatch'), icon: 'none'});
    return false;
  }
  return true
}

</script>

<template>
  <view class="page-wrapper">
    <Background/>
    <BackButton @onClick="sheep.$router.back()"/>

    <scroll-view class="container">
      <view class="content-wrapper">
        <view class="form content">
          <input
              class="uni-input"
              type="email"
              v-model="state.email"
              :placeholder="$t('enter_email')"
          />
          <view class="code-input-group">
            <input
                class="uni-input"
                type="text"
                v-model="state.code"
                :placeholder="$t('enter_verification_code')"
            />
            <view
                class="btn-code uni-flex uni-justify-content-center center"
                @click="sendCommon.sendCode(state,t)"
            >
              <text class="btn-text">{{
                  state.countdown > 0 ? getMessage('resend_after_seconds', {countdown: state.countdown}) : $t('get_verification_code')
                }}
              </text>
            </view>
          </view>
          <input
              class="uni-input"
              type="password"
              v-model="state.password"
              :placeholder="$t('enter_password')"
          />
          <input
              class="uni-input"
              type="password"
              v-model="state.confirmPassword"
              :placeholder="$t('confirm_password')"
          />

          <sub-button :text="$t('bindEamil')"  @onClick="bindEamil"/>
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

.container {
  height: 100%;
  display: flex;
  align-items: center;
}

.content-wrapper {
  width: 100%;
  height: 100%;
  padding: 0 1.25rem;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin: auto;
  font-size: 12rpx;
}

.code-input-group {
  display: flex;
  gap: 5rpx;

  .uni-input {
    flex: 1;
  }
}

.agreement {
  display: flex;
  justify-content: center;
  text-align: center;
  color: rgba(255, 255, 255, 0.9);

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 2rpx;
    font-size: 12rpx;

    // 自定义复选框样式
    ::v-deep .uni-checkbox-input {
      width: 16rpx !important;
      height: 16rpx !important;
      border: 1px solid rgba(255, 255, 255, 0.6) !important;
      border-radius: 50% !important;
      margin: 0 !important;
      padding: 0 !important;
      background-color: transparent !important;

      &.uni-checkbox-input-checked {
        background-color: #00C6FB !important;
        border-color: #00C6FB !important;

        &::before {
          font-size: 12rpx !important;
          transform: translate(-50%, -50%) scale(0.8) !important;
          color: #fff !important;
        }
      }
    }
  }

  .agreement-text {
    line-height: 12rpx;
  }

  .text_blur {
    color: #00C6FB;
  }
}

// 确保文本不换行
.space-nowrap {
  white-space: nowrap;
}
</style>