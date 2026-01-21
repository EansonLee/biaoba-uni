<script setup>
import countries from '@/sheep/config/countries.json';
import {
  useI18n
} from 'vue-i18n';
import playerFriends from "@/sheep/api/dart/playerFriends";
import {showToast} from "@/sheep/util/toast";
import Offer from "@/sheep/components/game/online/offer.vue";
import {ref, reactive, computed} from 'vue';
import $stores from "@/sheep/stores";

const {
  t,
  locale
} = useI18n();
const state = reactive({
  offerVisible: false
})
const emit = defineEmits(['update', 'sure']);
const props = defineProps({
  addVisible: {
    type: Boolean,
    default: false
  },
  playerNot: {
    type: Boolean,
    default: true
  },
  player: {
    type: Object,
    default: {
      id: '',
      playerName: '',
      headImgUrl: '',
      country: '',
      onlinePpr: 0,
      onlinePpd: 0
    }
  },
  playerNull: {
    type: Boolean,
    default: true
  },
  clickStop: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Number,
    default: 0
  },
  inOnlineHall: {
    type: Boolean,
    default: false
  }

})

// 获取国家显示名称
const getCountryName = (countryCode) => {
  if (countryCode === "" || countryCode === null) {
    countryCode = "CN"
  }
  const country = countries[countryCode] || countries['OTHER'];
  return locale.value === 'zh' ? country.zh : country.en;
};
//添加好友
const addFriend = async (info) => {
  const userInfo = $stores('user').getUserInfo();
  let data = {
    friendId: info.id
  }
  let rivalId = info.playerOnly
  //发送投标消息
  let msg = {
    msgType: "addFriend",
    value: userInfo
  }
  let messageTextObj = {type: 1, message: JSON.stringify(msg), extendedData: {msgType: "addFriend"}};
  $stores('zegoStore').sendMessage(rivalId, messageTextObj);
  let post = await playerFriends.Api.postCreate(data);
  if (post != null) {
    emit('update')
  }
}


const close = () => {
  state.offerVisible = false
}
const offerVisible = () => {
  if (!props.clickStop) {
    props.playerNot = true;
    state.offerVisible = true
  }

}

//确定开始游戏
const sure = (data) => {
  state.offerVisible = false
  emit('sure', data)
}


</script>

<template>
  <view v-clickSound class="player-box" @click="offerVisible">
    <view class="player-box-content" v-if="props.playerNull">
      <!-- 允许在非通过且非申请中状态下重试添加好友；申请中仅展示不可点击文案 -->
      <view v-if="props.addVisible && props.player.friendsState === 0"
            style="position: absolute;margin-left: 50rpx;">
        <span>{{ $t('InApplication') }}</span>
      </view>
      <view v-else-if="props.addVisible && props.player.friendsState !== 1"
            @click.stop="addFriend(props.player)"
            style="position: absolute;margin-left: 50rpx;">
        <span>{{ $t('addFriend') }}</span>
      </view>
      <view class="player-box-content-country">
        <view class="player-box-content-country-text"> {{ getCountryName(props.player.country) }}</view>
      </view>
      <view class="player-box-content-avatar">
        <image class="player-box-content-avatar-image" :src="props.player.headImgUrl || '/static/images/user.png'"
               mode="cover"></image>
        <text class="player-box-content-name-text">{{ props.player.playerName }}</text>
      </view>
      <view class="player-box-content-avatar">
        <text v-if="props.inOnlineHall" class="player-box-content-name-text">
          {{ props.player.inGame === 1 ? $t('InGame') : $t('Online') }}
        </text>
      </view>
      <view class="count">
        <view>
          <span class="count-text-1">{{ props.player.onlinePpd === null ? 0 : props.player.onlinePpd }}</span>
          <!-- <span class="count-text-border"></span> -->
          <span>
						<image
                :src="props.player.online01"
                class="gradeImage"
                mode="aspectFill"
            />
						</span>
        </view>
        <view>
          <span class="count-text-1">{{ props.player.onlinePpr === null ? 0 : props.player.onlinePpr }}</span>
          <!-- <span class="count-text-border"></span> -->
          <span>
							<image
                  :src="props.player.onlineCr"
                  class="gradeImage"
                  mode="aspectFill"
              />
						</span>
        </view>
      </view>


    </view>
    <view class="player-box-content-image" v-else>
      <image class="container-image" src="/static/gif/jiaozhai.gif"></image>
    </view>
  </view>
  <view v-if="state.offerVisible" class="offer-breakout">
    <Offer :isOnline="props.isOnline" @close="close" :playerNot="props.playerNot" :player="props.player" @sure="sure"
           :modalVisible="state.offerVisible"/>
  </view>
</template>

<style scoped lang="scss">
.offer-breakout {
  width: 100vw;
  height: 160vh;
}

.gradeImage {
  width: 20rpx;
  height: 20rpx;
}

.player-box-content-image {
  justify-content: center;
  align-items: center;
  display: flex;
  height: 100%;
}

.container-image {
  width: 100rpx;
  height: 100rpx;
  margin: auto;
}

.player-box {
  width: 250rpx;
  height: 220rpx;
  display: inline-block;
  text-align: center;
  font-size: 14rpx;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: all 0.3s;
  background-image: url("/static/images/game/online/friendBorder.png");
  /* iOS特定修复 */
  position: relative;
  z-index: 5;
  /* 确保在iOS上正确显示 */
  -webkit-transform: translateZ(0);
  transform: translateZ(0);

  .player-box-content {
    margin-top: 17%;
    height: 64%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: #ffffff;
    // -webkit-text-stroke: 0.00938rem #8856FF;
    //text-shadow: 0 0 3rpx #8856FF, 0 0 6rpx #8856FF, 0 0 10rpx #8856FF, 0 0 20rpx #8856FF;

    .player-box-content-country {
      width: 78%;
      font-weight: 300;
      font-size: 19rpx;
      font-style: normal;
      text-transform: none;
      display: flex;
      justify-content: flex-end;

      .player-box-content-country-text {
        max-width: 90rpx;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: right;
        font-size: 16rpx;
      }
    }

    .player-box-content {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .player-box-content-avatar {
      margin-left: 20%;
      display: flex;
      align-items: center;

      .player-box-content-avatar-image {
        width: 42rpx;
        height: 42rpx;
        border: 2rpx solid #8856FF;
        border-radius: 50%;
      }

      .player-box-content-name-text {
        font-weight: 300;
        font-size: 19rpx;
        color: #FFFFFF;
        text-align: left;
        font-style: normal;
        text-transform: none;
        margin-left: 4%;
        max-width: 100rpx;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .count {
      margin-left: 20%;
      width: 60%;
      display: flex;
      align-items: center;
      justify-content: space-between;

      font-weight: 300;
      font-size: 24rpx;
      color: #FFFFFF;
      line-height: 37rpx;
      text-align: left;
      font-style: normal;
      text-transform: none;

      .count-text-border {
        display: inline-block;
        border-bottom: 2rpx solid #8856FF;
        box-sizing: border-box;
        background: #ffffff;
        width: 2rpx;
        height: 16rpx;
        margin-left: 10rpx;
      }
    }
  }
}
</style>