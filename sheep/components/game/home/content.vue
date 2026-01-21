<script setup>
// 模拟一些数据
import {ref,reactive, computed,watch, nextTick, onMounted, onBeforeUnmount} from 'vue';
import {useI18n} from 'vue-i18n';
import sheep from "@/sheep";
import {onLoad, onReady} from '@dcloudio/uni-app';
import cacheUtil from "@/sheep/request/util";
import games from "@/sheep/api/dart/games";
import $stores from "@/sheep/stores";
import invitePop from "@/sheep/components/player/messages/invitePop.vue";
const {t} = useI18n();
const {locale} = useI18n();
$stores('zegoStore').initLogin();
import zimStore from '@/sheep/stores/zegoStore'
import player from '@/sheep/api/dart/player';
import playerFriends from '@/sheep/api/dart/playerFriends';
import friendPop from "@/sheep/components/player/messages/friendPop.vue";
import {showToast} from "@/sheep/util/toast";

// 添加一个加载状态
const isLoading = ref(true);

// 定义游戏列表，使用 ref([]) 确保初始状态是数组
const gameList = ref([]);

// const state = reactive({
// 	invitePopModalVisible : false
// })
const invitePopRef = ref(null);
const friendPopRef = ref(null);
const invitePopModalVisible = ref(false);
const friendPopModalVisible = ref(false);

// 本地轮询兜底：当IM不可用时也能弹出好友申请
const friendPollTimer = ref(null);
const notifiedFriendIds = new Set();

const zimStores = zimStore();
watch(zimStores.message.yaoqing, (New, Old) => {
	  invitePopModalVisible.value = true;
	  const newValue = New[New.length - 1];
	  invitePopRef.value.getInviteInfo(newValue.invitationId)
},
{deep: true}
)


// 实时IM：收到消息即弹窗
watch(zimStores.message.addFriend, (New, Old) => {
      if (New && New.length > 0) {
        const newValue = New[New.length - 1];
        friendPopModalVisible.value = true;
        nextTick(() => {
          friendPopRef.value?.getInviteInfo(newValue.value);
        });
      }
    },
    {deep: true, immediate: true}
)

// 监听取消邀请消息
watch(zimStores.message.cancel, (New, Old) => {
      if (New && New.length > 0) {
        const newValue = New[New.length - 1];
        console.warn("🚫 [Home] 收到取消邀请消息", {
          invitationId: newValue.invitationId,
          timestamp: new Date().toISOString()
        });

        // 如果当前正在显示邀请弹窗，且是被取消的邀请，则关闭弹窗
        if (invitePopModalVisible.value && invitePopRef.value) {
          const currentInvitationId = invitePopRef.value.getCurrentInvitationId?.();
          if (currentInvitationId === newValue.invitationId) {
            invitePopModalVisible.value = false;
            showToast({
              message: locale.value === 'zh' ? '对方已取消邀请' : 'The other party has canceled.',
              icon: 'none'
            });
          }
        }

        // 清空取消消息数组，避免重复处理
        zimStores.message.cancel = [];
      }
    },
    {deep: true}
)

const language=(text)=>{
  if (text==='米老鼠'){
    // let languageTxt=uni.getStorageSync('locale');
    let languageTxt = locale.value;
    console.log('语言为：'+languageTxt)
    if (languageTxt==='zh'){
      return '米老鼠'
    }else {
      return 'CRICKET'
    }
  }
  return text;
}

// 在 onLoad 中异步获取游戏数据并设置默认值
onLoad(async () => {
  try {
	
    const gameShowList = await cacheUtil.fetchWithCache('show_homePage_game_project', games.Api.getGames, {
      showHome: 1
    }, 1800,false);
    // 设置颜色和图片属性
    gameList.value = gameShowList.map(item => ({
      ...item,
      imgSrc: `/static/images/game/type_${item.type}.png`,
      color: '#62AAFF',
      url: '/pages/game/selectPlayer/offline/index',
      text: locale.value === 'zh' ? item.chineseModeName : item.englishModeName
    }));
	console.log('进入页面开始调用改变在线状态方法');
	player.Api.updateOnLine(1);
  } catch (error) {
    console.error('Failed to fetch games:', error);
    gameList.value = []; // 确保失败时仍为一个空数组
  } finally {
    // 确保数据加载完成后，无论成功或失败，都更新加载状态
    isLoading.value = false;
  }
});

// 兜底轮询：每10秒拉取一次待处理好友申请，若发现新的则弹窗
const pollPendingFriends = async () => {
  try {
    const list = await playerFriends.Api.getList({ status: 0 });
    if (Array.isArray(list) && list.length > 0) {
      let firstNew = list.find(item => item && !notifiedFriendIds.has(item.id));
      // 若后端无id字段，退化为取第一条
      if (!firstNew) firstNew = list[0];
      if (firstNew && !friendPopModalVisible.value) {
        if (firstNew && firstNew.id !== undefined) notifiedFriendIds.add(firstNew.id);
        friendPopModalVisible.value = true;
        nextTick(() => friendPopRef.value?.getInviteInfo(firstNew));
      }
    }
  } catch (e) {
    // 忽略
  }
};

onMounted(() => {
  // 先立即检查一次，避免等待首个10s周期
  pollPendingFriends();
  friendPollTimer.value = setInterval(pollPendingFriends, 10000);
});

onBeforeUnmount(() => {
  if (friendPollTimer.value) clearInterval(friendPollTimer.value);
});

// 定义 items，并在 gameList.value 未加载前确保它为一个空数组
const items = computed(() => [
  {
    imgSrc: '/static/images/game/score_deduction.png',
    url: '/pages/game/01/gameSelection',
    text: t('score_deduction'),
    color: '#F0C422',
  },
  ...gameList.value,
  {
    imgSrc: '/static/images/game/regular_game.png',
    url: '/pages/game/routine/index',
    text: t('regular_game'),
    color: '#FF270B',
  },
  {imgSrc: '/static/images/game/round_mode.png', url: '/pages/game/mixed/index', text: t('mixed_mode'), color: '#FF25FB'},
  {imgSrc: '/static/images/game/online_lobby.png', url: '/pages/game/online/index', text: t('online_lobby'), color: '#67FE50'},
  {imgSrc: '/static/images/game/ai_fight.png', url: '/pages/game/aiMode/index', text: t('ai_fight'), color: '#9285FF'},
  // {imgSrc: '/static/images/game/ai_fight.png', url: '/pages/game/online/shipin', text: "视频", color: '#9285FF'},
]); 

const close = (number) =>{
  console.log('数字：'+number);
  invitePopModalVisible.value = false
  if (number===2){
    friendPopModalVisible.value=false;
  }
}
//确定开始游戏
const sure = (data) =>{
	state.offerVisible = false
}


</script>

<template>
  <view v-if="!isLoading" class="uni-flex uni-h-full center hidden-scrollbar">
    <!-- 横向可滑动的容器 -->
    <scroll-view class="scroll-view_H scroll-container" scroll-x="true">
     <view class="uni-flex uni-space-between" style="padding: 0 1rem">
        <view v-clickSound class="scroll-view-item_H item " v-for="(item, index) in items" :key="index"
              @click="sheep.$router.go(item.url,item)">
          <view class="content">
            <image :src="item.imgSrc" class="circle-img uni-circle uni-img"/>
            <text class="item-text" :style="{color:item.color}">{{ language(item.text) }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
  <invitePop ref="invitePopRef" @close="close(1)"   @sure="sure"  :modalVisible="invitePopModalVisible"></invitePop>
  <friendPop ref="friendPopRef" @close="close(2)"  :modalVisible="friendPopModalVisible"></friendPop>
</template>

<style scoped lang="scss">
.scroll-container {
  display: flex;
  flex-direction: row;
  overflow-x: scroll;
  align-items: center; /* 使内容在纵向上居中 */
}

.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* 确保每个 item 在容器中垂直居中 */
}

.content {
  display: flex;
  flex-direction: column;
  justify-content: center; /* 使每个图片和文本上下居中 */
  align-items: center;
}

.circle-img {
  width: 100rpx;
  height: 100rpx;
}

.item-text {
  font-size: 16rpx;
  color: #333;
}

.scroll-view_H {
  white-space: nowrap;
  width: 100%;
}

.scroll-view-item_H {
  display: inline-block;
  text-align: center;
  font-size: 14rpx;
}

</style>
