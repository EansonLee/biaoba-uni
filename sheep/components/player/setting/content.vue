<script setup>
import {ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import agreement from "@/sheep/api/dart/agreement";
import {showToast} from "@/sheep/util/toast";
import Toast from "@/sheep/components/util/toast/toast.vue";

const {t, locale} = useI18n()

// 设置项数据
const settings = ref([
  {
    title: 'userAgreement',
    icon: '/static/images/setting/user.png',
    value: ''  // 初始为空，通过 watch 更新
  },
  {
    title: 'contactUs',
    icon: '/static/images/setting/contact.png',
    link: '/contact-us'
  },
  {
    title: 'gamePlay',
    icon: '/static/images/setting/rules.png',
    link: '/game-play'
  }
])

// 语言选项
const languages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' }
]

// 监听语言变化，更新协议文本
watch(() => locale.value, () => {
  settings.value[0].value = `《${t('privacyPolicy')}》 《${t('servicePolicy')}》`;
}, { immediate: true });  // immediate: true 确保初始化时也执行

// 导航跳转函数
const navigateTo = (link) => {
  console.log(`Navigating to ${link}...`)
}

// 切换语言方法
const switchLanguage = (code) => {
  locale.value = code;
  uni.setStorageSync('locale', code);

}

const getDomMessage  = async (id) => {
  console.log('点击：'+id)
  await agreement.Api.findById(id)
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
  <view class="container">
    <!-- 设置项列表 -->
<!--    <view class="settings-list">-->
<!--      <view v-for="(item, index) in settings"-->
<!--            :key="index"-->
<!--            class="setting-item"-->
<!--            @tap="navigateTo(item.link)"-->
<!--      >-->
<!--        <view class="item-left">-->
<!--          &lt;!&ndash;          <image :src="item.icon" class="item-icon" mode="aspectFit"/>&ndash;&gt;-->
<!--          <text class="item-text">{{ t(item.title) }}</text>-->
<!--        </view>-->
<!--        <view class="item-right">-->
<!--          <text v-if="item.value" class="value-text text_yellow">{{ item.value }}</text>-->
<!--        </view>-->
<!--      </view>-->
<!--    </view>-->

    <view class="settings-list">
      <view class="setting-item">
        <view class="item-left">
          <!--          <image :src="item.icon" class="item-icon" mode="aspectFit"/>-->
          <text class="item-text">{{t('userAgreement')}}</text>
        </view>
        <view class="item-right">
          <text  class="value-text text_yellow" @click="getDomMessage(4)">{{`《${t('privacyPolicy')}》`}}</text>
          <text class="item-texts">{{locale === 'zh' ? '和': 'and'}}</text>
          <text  class="value-text text_yellow" @click="getDomMessage(5)">{{`《${t('servicePolicy')}》`}}</text>
        </view>
      </view>
      <view class="setting-item">
        <view class="item-left" @click="getDomMessage(6)">
          <!--          <image :src="item.icon" class="item-icon" mode="aspectFit"/>-->
          <view class="item-text">{{t('contactUs')}}</view>
          <uni-icons type="arrowright" size="30" color="#A079FF"></uni-icons>
        </view>
      </view>
      <view class="setting-item">
        <view class="item-left" @click="getDomMessage(3)">
          <!--          <image :src="item.icon" class="item-icon" mode="aspectFit"/>-->
          <text class="item-text">{{t('gamePlay')}}</text>
          <uni-icons type="arrowright" size="30" color="#A079FF"></uni-icons>
        </view>
      </view>
    </view>

    <!-- 语言切换 -->
    <view class="language-section">
      <text class="section-title">{{ t('language') }}</text>
      <view class="language-options">
        <view v-for="lang in languages"
              :key="lang.code"
              class="language-item"
              :class="{ 'active': locale === lang.code }"
              @tap="switchLanguage(lang.code)"
        >
          <text>{{ lang.name }}</text>
        </view>
      </view>
    </view>
  </view>
  <toast/>
</template>

<style scoped lang="scss">
::v-deep.without {
  /* 之前是 transparent，导致底层内容透出产生“残影” */
  background-color: var(--popup-bg, #0b0b0b); 
}
.container {
  padding: 0 50rpx;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10rpx 30rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.2);

  .item-left {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20rpx;
  }

  .item-icon {
    width: 20rpx;
    height: 20rpx;
  }

  .item-text {
    color: #c7b5f8;
    font-size: 16rpx;
  }

  .item-right {
    display: flex;
    align-items: center;
    // gap: 10rpx;
  }

  .item-texts {
    color: #8856ff;
    font-size: 16rpx;
  }

  .value-text {
    font-size: 16rpx;
  }

  .arrow-icon {
    width: 32rpx;
    height: 32rpx;
  }
}

.language-section {
  margin-top: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  .section-title {
    text-align: center;
    width: 100rpx;
    color: #c7b5f8;
    font-size: 16rpx;
  }

  .language-options {
    display: flex;
    gap: 20rpx;
  }

  .language-item {
    width: 100rpx;
    flex: 1;
    height: 40rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6rpx;
    border: 2rpx solid transparent;
    color: #c7b5f8;
    font-size: 16rpx;
    transition: all 0.3s ease;

    &.active {
      border:2px solid #8856FF;
    }

    &:not(.active):hover {
      border-color: rgba(255, 255, 255, 0.4);
    }
  }
}
</style>
