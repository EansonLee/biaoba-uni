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

const getIPInfo = async () => {
  try {
    const response = await fetch('http://ip-api.com/json/?lang=zh-CN');
    if (!response.ok) {
      throw new Error('网络请求失败: ' + response.status);
    }
    const data = await response.json();
    return data.countryCode; // 假设你要返回 countryCode
  } catch (error) {
    console.error('获取 IP 信息时出错:', error);
    return null; // 或者返回一个默认值，例如空字符串 ''
  }
};

const getCountryCode = async () => {


};

const register = preventDuplicateClick(async () => {
  console.log("点击注册按钮")
  const code = await getIPInfo();
  countryCode.value = code;
  const charCount = state.playerName.replace(/[^\x00-\xff]/g, '**').length; // 计算字符数（每个汉字两个字符）
  if (charCount>12){
    showToast({message: t('charCountLanger'), icon: 'none'});
    return;
  }


  if (!state.isAgreed) {
    showToast({message: t('please_agree_terms'), icon: 'none'});
    return;
  }
  if (state.playerName===null ||state.playerName===undefined|| state.playerName.trim()===''){
    showToast({message: t('password_required'), icon: 'none'});
    return;
  }



  if ((state.type === 1 && !state.playerName) || !state.email || !state.code || !state.password || !state.confirmPassword) {
    showToast({message: t('password_required'), icon: 'none'});
    return;
  }
  
  let flag=validateEmail(state.email);
  console.log("邮箱为："+state.email+"-------邮箱校验为："+flag)
  if(!flag){
  	showToast({message: t('mailbox_is_incorrectly_formatted'), icon: 'none'});
  	return;
  }

  if (!flay()) {
    return;
  }
  await autoUser.Api.register({
    playerName: state.playerName,
    email: state.email,
    code: state.code,
    password: state.password,
    confirmPassword: state.confirmPassword,
    type: state.type,
    country: countryCode.value
  });

  showToast({message: t('register_success'), icon: 'success'});
  setTimeout(() => {
    sheep.$router.go('/pages/index/index?jumpType=no');
  }, 2000);
});

const forgot = preventDuplicateClick(async () => {
  if (!flay()) {
    return;
  }

  if (!state.email || !state.code || !state.password || !state.confirmPassword) {
    showToast({message: t('password_required'), icon: 'none'});
    return false;
  }
  
  let flag=validateEmail(state.email);
  console.log("邮箱为："+state.email+"-------邮箱校验为："+flag)
  if(!flag){
  	showToast({message: t('mailbox_is_incorrectly_formatted'), icon: 'none'});
  	return;
  }
  

  await autoUser.Api.forgetPassword({
    email: state.email,
    code: state.code,
    password: state.password,
    confirmPassword: state.confirmPassword,
    type: state.type
  });

  showToast({message: t('reset_success'), icon: 'success'});
  setTimeout(() => {
    sheep.$router.go('/pages/index/index?jumpType=no');
  }, 2000);
});

const typeFun = preventDuplicateClick(() => {
  if (state.type === 1 || state.type === '1') {
    register()
  } else if (state.type === 2 || state.type === '2') {
    forgot();
  } else {
    showToast({message: t('exception'), icon: 'none'})
  }
})

const agreementText = computed(() => {
  return getMessage('agreement', {
    terms_link: `<a class="text_yellow">${t('terms_link')}</a>`,
    privacy_link: `<a class="text_yellow">${t('privacy_link')}</a>`,
  });
});

const flay = () => {
  if (state.password !== state.confirmPassword) {
    showToast({message: t('password_mismatch'), icon: 'none'});
    return false;
  }
  return true
}

//服务条款
const TermsOfService= async ()=>{
  await agreement.Api.findById(1)
      .then((res=>{
        showToast({
          title: res.title,
          message: res.content,
          isSticky: true
        });
      }))

}

const PrivacyPolicy = async ()=>{
  await agreement.Api.findById(2)
      .then((res=>{
        showToast({
          title: res.title,
          message: res.content,
          isSticky: true
        });
      }))
}
</script>

<template>
  <view class="page-wrapper">
    <Background/>
    <BackButton @onClick="sheep.$router.back()"/>

    <scroll-view class="container">
      <view class="content-wrapper">
        <view class="form content">
          <!-- 输入框组 -->
          <input
              v-if="state.type===1||state.type==='1'"
              class="uni-input"
              type="text"
              v-model="state.playerName"
              :placeholder="$t('enter_account_name')"
              maxlength="12"
          />
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
            <!--            <button class="btn-code" @click="sendCode" :disabled="state.countdown > 0">-->
            <!--              {{-->
            <!--                state.countdown > 0 ? getMessage('resend_after_seconds', {countdown: state.countdown}) : $t('get_verification_code')-->
            <!--              }}-->
            <!--            </button>-->
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

          <!-- 按钮 -->
          <!-- 登陆按钮 -->
          <sub-button :text="state.type===1||state.type==='1'?$t('submit_register'):$t('reset_password')"
                      @onClick="typeFun"/>
          <!-- 协议选择 -->
          <view class="agreement" v-if="state.type===1||state.type==='1'">
            <checkbox-group @change="e => state.isAgreed = e.detail.value.length > 0">
              <label class="checkbox-label">
                <checkbox
                    :value="'agreed'"
                    :checked="state.isAgreed"
                    color="#2196f3"
                    style="transform: scale(0.6)"
                />
                <template v-if="$i18n.locale === 'zh'">
                  勾选表示您同意我们的<a @click="TermsOfService()" data-v-1cf27b2a class="text_yellow">《服务条款》</a>和<a data-v-1cf27b2a @click="PrivacyPolicy()" class="text_yellow">《隐私政策》</a>
                </template>
                <template v-else>
                  By checking this box, you agree to our <a @click="TermsOfService()" data-v-1cf27b2a class="text_yellow">Terms of Service</a> and <a data-v-1cf27b2a @click="PrivacyPolicy()" class="text_yellow">Privacy Policy</a>
                </template>
              </label>
            </checkbox-group>
          </view>
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