<script setup>
import {computed, reactive, ref} from 'vue';
import sheep from "@/sheep";
import autoUser from "@/sheep/api/user/autoUser";
import {OAuthLogin} from "@/sheep/oauth";
import {useI18n} from "vue-i18n";
import {getMessage} from "@/sheep/common/msgCommon";
import Background from "@/sheep/components/common/background.vue";
import SubButton from "@/sheep/components/common/subButton.vue";
import {preventDuplicateClick} from "@/sheep/common/util";
import {showToast} from "@/sheep/util/toast";
import Oauth from "@/sheep/components/common/oauth/oauth.vue";
import VideoPlayback from "@/sheep/components/mp4/VideoPlayback.vue";
import {onReady,onLoad} from '@dcloudio/uni-app';
import {useAudioPlayer} from "@/sheep/util/useAudioPlayer";
import {getParams} from "@/sheep/router";
import {validateEmail} from "@/sheep/util/emailUtil.js"
import agreement from '@/sheep/api/dart/agreement';
import $stores from "@/sheep/stores";
const {t,locale} = useI18n()

// 创建音频实例引用
const audioPlayerInstance = ref(null);

const state = reactive({
  email: '',
  password: '',
  isAgreed: false,
  params:{},
  hasAnimationStarted: false,
  isOrientationReady: false // 屏幕方向是否就绪
});

const pageStyle = ref({});

const onLogin = preventDuplicateClick(async () => {
  if (!state.isAgreed) {
    showToast({message: t('please_agree_terms'), icon: 'none'});
    return;
  }
  

  // 判空
  if (!state.email || !state.password) {
    showToast({message: t('please_fill_in_all_information'), icon: 'none'});
    return;
  }
  
  let flag=validateEmail(state.email);
  console.log("邮箱为："+state.email+"-------邮箱校验为："+flag) 
  if(!flag){
	showToast({message: t('mailbox_is_incorrectly_formatted'), icon: 'none'});
	return;
  }

  

  await autoUser.Api.login({
    email: state.email,
    password: state.password,
  })

  showToast({message: t('login_success'), icon: 'success'});
  setTimeout(() => {
    sheep.$router.go('/pages/game/home/index'); // 跳转到首页页面
  }, 2000);
});

const agreementText = computed(() => {
  return getMessage('agreement', {
    terms_link: `<a class="text_yellow">${t('terms_link')}</a>`,
    privacy_link: `<a class="text_yellow">${t('privacy_link')}</a>`
  });
})

const videoPlayer = ref(null);
const closeOnClick = ref(false);
const scrollViewd = ref(false);

onLoad((options) => {
  const { windowHeight, windowWidth } = uni.getSystemInfoSync();
  // 确保使用横屏尺寸
  pageStyle.value = {
    height: `${Math.min(windowHeight, windowWidth)}px`,
    width: '100%'
  };
  const params = getParams(options);
  state.params = params;
  // 初始化游戏状态
});

// 封装开屏动画逻辑
const startIntroAnimation = () => {
  if (state.hasAnimationStarted) return; // 防止重复执行
  state.hasAnimationStarted = true;
  
  let jumpType = state.params.jumpType;
  // 只有当jumpType明确为"no"时才跳过动画，其他情况都播放动画
  if (jumpType !== "no") {
    playVideo("/static/gif/FVIntroSplash16by9Format_1.gif", true, () => {})
    // 保存音频实例引用
    audioPlayerInstance.value = useAudioPlayer();
    audioPlayerInstance.value.playAudio('/static/mp3/FVIntroSplash16by9Format.mp3');
  } else {
    scrollViewd.value = true
  }
}

const skipAnimation = () => {
  // 当用户点击动画时，立即显示登录表单
  scrollViewd.value = true;
};

onReady(() => {
	// 严格的登录状态检查：必须同时满足3个条件
	const authStore = $stores('user');
	const hasUserInfo = authStore.getUserInfo();
	const hasToken = !!uni.getStorageSync('token');
	const isLoginState = authStore.isLogin;

	// 只有当三个条件都满足时，才认为用户已登录
	if (hasUserInfo && hasToken && isLoginState) {
		console.log('✅ [登录页] 检测到有效登录状态，跳转首页');
		sheep.$router.go('/pages/game/home/index');
		return
	} else if (hasUserInfo || hasToken || isLoginState) {
		// 检测到不完整的登录状态，强制清理
		console.warn('⚠️ [登录页] 检测到不完整的登录状态，进行强制清理');
		authStore.clearUserInfo();
	}
  
  // 监听屏幕方向准备就绪事件
  uni.$on('orientationReady', () => {
    state.isOrientationReady = true;
    startIntroAnimation();
  });
  
  // 如果事件已经发生,则直接执行
  // (此处的 getApp().globalData.orientationReady 需要在 App.vue onShow 中设置)
  // 为简化,我们暂时只用延时处理
  setTimeout(() => {
    // 如果动画仍未开始,则主动开始,以防事件丢失
    if (!state.isOrientationReady) {
      state.isOrientationReady = true;
      startIntroAnimation();
    }
  }, 800); // 确保在屏幕方向切换完成后再开始动画
})

const playVideo = (src, closeOnClickOption, onEndCallback) => {
  closeOnClick.value = closeOnClickOption;
  if (videoPlayer.value) {
    videoPlayer.value.isPlaying = true;
  }
  videoPlayer.value.startVideo(src)
  // 增加延迟,确保屏幕方向已经切换完成
  setTimeout(() => {
     scrollViewd.value = true
  }, 1500)
};
const handleSingleClick = () => {
  console.log('仅触发一次');
};

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

const changOAuthLogin = (code) => {
  if (!state.isAgreed) {
    showToast({message: t('please_agree_terms'), icon: 'none'});
    return;
  }
  OAuthLogin(code)
}
</script>


<template>
  <view class="page-wrapper" :style="pageStyle">
    <!-- 加载提示,在屏幕方向未就绪时显示 -->
    <view v-if="!state.isOrientationReady" class="loading-overlay">
      <view class="loading-content">
        <text class="loading-text">加载中...</text>
      </view>
    </view>
    
    <VideoPlayback ref="videoPlayer" :closeOnClick="closeOnClick" @click="skipAnimation"/>
    <Background/>
    <scroll-view class="container" v-if="scrollViewd && state.isOrientationReady" >
      <view class="content-wrapper" >
        <view class="form content">
          <view style="text-align: center">
            <image class="logo" src="@/static/logo.png" mode="aspectFit"/>
          </view>
          <!-- 输入框组 -->
          <input
              class="uni-input text_align"
              type="email"
              v-model="state.email"
              :placeholder="$t('enter_email')"
          />
          <input
              class="uni-input text_align"
              type="password"
              v-model="state.password"
              :placeholder="$t('enter_password')"
          />
          <view class="actions">
            <span style="color: white;font-size: 13.49rpx">{{ $t('no_account') }}</span>
            <a  @click="sheep.$router.go('/pages/player/account/registerAndForgot',{type:1})"
                style="margin-left: -90rpx;font-size: 13.49rpx"
               class="text_yellow">{{ $t('register') }}</a>
            <a @click="sheep.$router.go('/pages/player/account/registerAndForgot',{type:2})"
               style="font-size: 13.49rpx;color: white"
               class="text_yellow">{{ $t('forgot_password') }}</a>
          </view>

          <!-- 登陆按钮 -->
          <sub-button v-clickSound :text="$t('login')" @onClick="onLogin"/>
<!--          <sub-button text="播放视频" @onClick="videoStart"/>-->
          <!-- 协议选择 -->
          <view class="agreement" >
            <checkbox-group @change="e => state.isAgreed = e.detail.value.length > 0">
              <label class="checkbox-label" style="font-size: 13.49rpx">
                <checkbox
                    :value="'agreed'"
                    :checked="state.isAgreed"
                    color="#2196f3"
                    style="transform: scale(0.6)"
                />
                <template v-if="locale === 'zh'">
                  我已阅读并同意<a data-v-1cf27b2a @click="PrivacyPolicy()" class="text_yellow">《隐私政策》</a>和<a @click="TermsOfService()" data-v-1cf27b2a class="text_yellow">《服务条款》</a>
                </template>
                <template v-else>
                  I have read and agree to the <a data-v-1cf27b2a @click="PrivacyPolicy()" class="text_yellow">Privacy Policy</a> and <a @click="TermsOfService()" data-v-1cf27b2a class="text_yellow">Terms of Service</a>
                </template>
              </label>
            </checkbox-group>
          </view>

          <!-- 外部登陆按钮 -->
          <oauth @onClick="changOAuthLogin"/>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.actions {
  display: flex;
  justify-content: space-between;
}

.logo {
  width: 201.37rpx;
  height: 64.23rpx
}

.page-wrapper {
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
}

.container {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-wrapper {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin: auto;
  font-size: 12rpx;
}

@media (max-width: 425px) {
  .uni-input {
    font-size: 10px;
  }
}

.code-input-group {
  display: flex;
  gap: 5rpx;

  .uni-input {
    flex: 1;
  }

  .btn-code {
    width: 60rpx;
    text-align: center;
    justify-content: center;
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    border: 2rpx solid rgba(255, 255, 255, 0.2);
    border-radius: 10rpx;
    padding: 0 20rpx;
    color: #fff;
    height: 30rpx;

    &::placeholder {
      color: rgba(255, 255, 255, 0.6);
    }
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

.text_align {
  text-align: center;
}

.font_size {
  font-size: 13.49rpx;
}

// 加载覆盖层样式
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #170746;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  text-align: center;
}

.loading-text {
  color: #fff;
  font-size: 16px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
