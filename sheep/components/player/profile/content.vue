<script setup>
import {ref, watch,computed} from 'vue';
import {useI18n} from 'vue-i18n';
import sheep from "@/sheep";
import PopBackground from "@/sheep/components/common/popBackground.vue";
import $stores from "@/sheep/stores";
import Oauth from "@/sheep/components/common/oauth/oauth.vue";
import player from "@/sheep/api/dart/player";
import countries from '@/sheep/config/countries.json';
import fileUtil from "@/sheep/api/fileUtil";
import {showToast} from "@/sheep/util/toast";
import {preventDuplicateClick} from "@/sheep/common/util";
import Toast from "@/sheep/components/util/toast/toast.vue";
import emitter from '@/sheep/util/eventBus'
import {bindOpenId} from "@/sheep/oauth";
import {closeConnected} from "@/sheep/util/bluetoothUtil";
const {t, locale} = useI18n();

// 获取国家显示名称
const getCountryName = (countryCode) => {
	console.log(countryCode)
  if(countryCode === "" || countryCode === null){
	  countryCode = "CN"
  }
  const country = countries[countryCode] || countries['OTHER'];
  console.log(country)
  return locale.value === 'zh' ? country.zh : country.en;
};
const countryList = computed(() => {
  return Object.entries(countries).map(([code, names]) => ({
    code,
    name: locale.value === 'zh' ? names.zh : names.en
  }));
});

// 用户信息
const userInfo = computed(() => {
	let user = $stores('user').getUserInfo();
	user.headImgUrl = user.headImgUrl || '/static/images/user.png'
	return user
});
// 游戏功能按钮
const gameButtons = [
  {label: t('game_data'),url: '/pages/player/game/gameData'},
  {label: t('practice_score'), width:locale.value === 'zh' ?'130rpx':'170rpx', url: '/pages/player/game/gameTrainData'},
  {label: t('friend_list'),url: '/pages/player/friend/index'},
];

// 社交平台
const socialPlatforms = ['WeChat', 'Google', 'Apple'];

async function logout() {
  await player.Api.updateOnLine(0);
  sheep.$stores('zegoStore').logout();
  sheep.$stores('user').logout();
  closeConnected();
  // sheep.$router.go('/pages/index/index?jumpType=no');
}

const bindAccount = preventDuplicateClick((platform) => {
  if (platform==='weixin' && userInfo.value.openId){
    console.log('该账户已绑定微信')
    showToast({ message: '该账户已绑定微信账号', icon: 'error' });
    return
  }else if (platform==='google' && userInfo.value.googleId){
    showToast({ message: '该账户已绑定谷歌账号', icon: 'error' });
    return;
  }else if (platform==='apple' && userInfo.value.appleId){
    showToast({ message: '该账户已绑定苹果账号', icon: 'error' });
    return;
  }
	// if(userInfo.value.openId||userInfo.value.appleId||userInfo.value.googleId){
	// 	showToast({ message: '已绑定第三方登录', icon: 'error' });
	// 	return false;
	// }
	bindOpenId(platform, userInfo.value.id)
})

// 编辑相关方法
const handleAvatarClick = preventDuplicateClick(() => {
  uni.chooseImage({
    count: 1,
    success: async (res) => {
      try {
        const uploadResult = await fileUtil.upload(
            `${player.PlayerApi}/updateAvatar`,
            {
              filePath: res.tempFilePaths[0],
              name: 'avatarFile'
            }
        );
        if (uploadResult.code === 0) {
          const data = uploadResult.data;
          // 更新本地头像显示
          userInfo.value.headImgUrl = data;
          showToast({message: `头像更新成功`, icon: "none"});
          console.log('头像更新成功开始回调')
          emitter.emit('headImageUpdateSuccess', data);
        } else {
          throw new Error('上传失败');
        }
      } catch (error) {
        console.error('上传错误:', error);
        showToast({
          message: '头像上传失败',
          icon: 'error'
        });
      }
    }
  });
});

// 获取当前语言的国家名称
const getLocalizedCountryName = (country) => {
  return locale.value === 'zh' ? country.zh : country.en;
};

const clickShoHello = (country) => {
 showToast('你好');
  console.log('点击')
};

const handleFieldClick = preventDuplicateClick((field) => {
  // 邮箱不允许修改
  if (field === 'email') {
    showToast({
      message: '邮箱暂不支持修改',
      icon: 'none'
    });
    return;
  }

  // 国家使用选择器
  // if (field === 'country') {
  //   const countryList = Object.entries(countries).map(([code, names]) => ({
  //     code,
  //     name: locale.value === 'zh' ? names.zh : names.en
  //   }));
  //
  //   uni.showActionSheet({
  //     itemList: countryList.map(item => item.name),
  //     success: async (res) => {
  //       const selectedCountry = countryList[res.tapIndex];
  //       userInfo.value.country = selectedCountry.code;
  //
  //       try {
  //         await player.Api.updatePlayer({
  //           id: userInfo.value.id,
  //           country: selectedCountry.code
  //         });
  //         showToast({
  //           message: t('updateSuccess'),
  //           icon: 'success'
  //         });
  //       } catch (error) {
  //         showToast({
  //           message: t('updateFailed'),
  //           icon: 'error'
  //         });
  //       }
  //     }
  //   });
  //   return;
  // }

  if (field === 'playerName'){
    showNameInput.value = true
  }
});

const bindEmail = () =>{
	if(userInfo.value.email){
		return false
	}
	sheep.$router.go('/pages/player/account/bindEamil')
}

const showNameInput = ref(false)
const playerName = ref(userInfo.value.playerName)
const updateName = async () => {
  const newName = playerName.value.trim();

  // 2. 系统不应该允许没有名称，需要限制必须输入名称
  if (!newName) {
    showToast({
      message: '名称不能为空',
      icon: 'none'
    });
    playerName.value = userInfo.value.playerName; // 恢复为原来的名称
    showNameInput.value = false;
    return;
  }

  // 1. 姓名部分显示输入内容过长，一般英文名会比较长，需要重新调整可输入长度。（英文≤12位，中文≤6位）
  let len = 0;
  for (let i = 0; i < newName.length; i++) {
    if (newName.charCodeAt(i) > 255) {
      len += 2; // 中文字符计为2
    } else {
      len += 1; // 英文字符计为1
    }
  }

  if (len > 12) {
    showToast({
      message: '输入内容过长',
      icon: 'none'
    });
    playerName.value = userInfo.value.playerName; // 恢复为原来的名称
    showNameInput.value = false;
    return;
  }

  showNameInput.value = false;

  if (newName === userInfo.value.playerName) {
    return;
  }

  try {
    await player.Api.updatePlayer({
      id: userInfo.value.id,
      playerName: newName,
      country: userInfo.value.country
    })
    showToast({
      message: t('updateSuccess'),
      icon: 'success'
    });
    $stores('user').updateUserData()
  } catch (error) {
    showToast({
      // message: '修改失败',
      message: error.message,
      icon: 'error'
    });
  }
}

const onchange = async (e) => {
  console.log(e)
  try {
    await player.Api.updatePlayer({
      id: userInfo.value.id,
      country: e.detail.value[0].value
    });
    showToast({
      message: t('updateSuccess'),
      icon: 'success'
    });
    $stores('user').updateUserData()
  } catch (error) {
    showToast({
      message: t('updateFailed'),
      icon: 'error'
    });
  }
}

</script>

<template>
  <view class="container">
    <view class="profile-card">
      <PopBackground>
        <view class="user-info-view">
          <!-- 用户基本信息区 -->
          <view class="profile-user-info">
            <view class="avatar-container" @click="handleAvatarClick">
              <image
                  :src="userInfo.headImgUrl"
                  class="avatar"
                  mode="aspectFill"
              />
            </view>

            <view class="info-row">
              <view class="info-item">
                <text class="label">{{ t('country') }}</text>
          <!--      <text class="value editable" @click="handleFieldClick('country')">
                  {{ getCountryName(userInfo.country) }}
                  <text class="edit-icon">▼</text>
                </text> -->
<!--				<text @click="handleFieldClick('country')">-->
<!--				  {{ getCountryName(userInfo.country) }}-->
<!--				  <text class="edit-icon">▼</text>-->
<!--				</text>-->
                <uni-data-picker :placeholder="t('selectCountry')" :popup-title="t('selectCountry')" :localdata="countryList" v-model="userInfo.country" :border="false" :clear-icon="false"
                                 :map="{text:'name',value:'code'}" @change="onchange">
                </uni-data-picker>
              </view>
              <view class="info-item">
                <text class="label">{{$t('name')}}</text>
            <!--    <text class="value editable" @click="handleFieldClick('playerName')">
                  {{ userInfo.playerName }}
                  <text class="edit-icon">✎</text>
                </text> -->
                <input
                    v-if="showNameInput"
                    class="uni-input"
                    v-model="playerName"
                    :focus="showNameInput"
                    :auto-blur="true"
                    @blur="updateName"
                />
                <text v-else>
                  {{ userInfo.playerName }}
                </text>
				 <text class="edit-icon" @click="handleFieldClick('playerName')">✎</text>
              </view>
            </view>
            <view class="info-row">
              <view class="info-item">
                <text class="label">{{ $t('account_id') }}</text>
                <text class="value">{{ userInfo.playerOnly }}</text>
              </view>
			
          <!--    <view class="info-item">
                <text class="label">邮箱</text>
                <text class="value disabled">{{ userInfo.email }}</text>
              </view> -->
			  <view class="info-item">
			    <text class="label">{{ $t('email') }}</text>
			    <text class="" @click="bindEmail">{{ userInfo.email||$t('bind_email') }}</text>
			  </view>
            </view>
          </view>

          <!-- 游戏数据区域 -->
          <view class="profile-game-info  uni-flex center">
            <view class="game-buttons">
              <view  v-clickSound v-for="(btn, index) in gameButtons"
                    :key="index"
                    :style="{width: btn.width || ''}"
                    :class="['game-btn',{'enStyle': btn.label === t(`${btn.label}`)}]" @click="sheep.$router.go(btn.url)">
                <text class="btn-text">{{ btn.label }}</text>
              </view>
            </view>
          </view>

          <!-- 社交平台和退出 -->
          <view class="profile-social-info">
            <view class="social-platforms">
              <oauth @onClick="bindAccount"/>
            </view>

            <view class="logout-btn" @tap="logout">
              <text>{{$t('logout')}}</text>
            </view>

          </view>
        </view>
      </PopBackground>

    </view>
    <toast/>
  </view>
</template>

<style scoped lang="scss">
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  overflow-x: auto;

  .user-info-view {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
  }
}

.profile-card {
  border-radius: 10rpx;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  width: 90%;
  height: 85%;
}

.profile-user-info {
  padding: 20rpx 20rpx 0 20rpx;
  position: relative;

  .avatar-container {
    position: absolute;
    right: 20rpx;
    top: 20rpx;
    width: 60rpx;
    height: 60rpx;
    border-radius: 50%;
    overflow: hidden;
    border: 2rpx solid rgba(136, 86, 255, 0.3);
    cursor: pointer;

    .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &:active {
      transform: scale(0.95);
    }
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 25rpx;
    padding-right: 100rpx;

    .info-item {
      display: flex;
      width: 45%;
      gap: 15rpx;

      .label {
        color: #c7b5f8;
        font-size: 14rpx;
        min-width: 60rpx;
        // width: 60rpx;
        text-align: justify;
        flex-shrink: 0;
      }

      .value {
        color: #FFFFFF;
        font-size: 14rpx;
        flex: 1;
        text-align: left;
        overflow: hidden;
        // text-overflow: ellipsis;
        white-space: nowrap;
        position: relative;
        padding-right: 25rpx; // 为编辑图标留出空间

        &.editable {
          cursor: pointer;
          transition: opacity 0.3s;

          &:active {
            opacity: 0.7;
          }

          .edit-icon {
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            font-size: 12rpx;
            color: #8856FF;
            opacity: 0.8;
          }
        }

        &.disabled {
          opacity: 0.6;
          cursor: not-allowed;

          &:active {
            opacity: 0.6;
          }
        }
      }
    }
  }
}

.profile-game-info {
  padding: 0 20rpx 0 20rpx;

  .game-buttons {
    display: flex;
    gap: 20rpx;
    width: 100%;
    justify-content: space-between;

    .game-btn {
      background-image: url('@/static/images/round_bg.png');
      background-size: 100% 100%;
      background-repeat: no-repeat;
      background-position: center;
      height: 35rpx;
      width: 100rpx;
      display: flex;
      align-items: center;
      padding: 10rpx 20rpx;
      border-radius: 6rpx;

      &.enStyle {
        width: 130rpx;
        .btn-text {
          margin-left: 10%;
        }
      }

      .btn-text {
        margin-left: 15%;
        color: #c7b5f8;
        font-size: 14rpx;
      }

      .arrow {
        color: #8856FF;
        font-size: 14rpx;
      }
    }
  }
}

.profile-social-info {
  height: 30rpx;
  width: 100%;
  margin-bottom: 10rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;

  .social-platforms {
    display: flex;
    justify-content: center;
  }

  .oauth-box {
    display: flex;
    gap: 50rpx;

    .oauth-btn {
      width: 25rpx;
      height: 25rpx;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .logout-btn {
    position: absolute;
    right: 10rpx;
    padding: 6rpx 10rpx;
    color: #c7b5f8;
    font-size: 14rpx;
    border-radius: 6rpx;
    text-align: center;
  }
}

.info-item {
  .value {
    &.editable {
      .edit-icon {
        font-size: 10rpx; // 下拉图标稍微小一
      }
    }
  }
}
.uni-input{
  height: 20rpx;
}
</style>
