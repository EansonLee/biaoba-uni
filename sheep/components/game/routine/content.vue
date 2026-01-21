<script setup>
// 模拟一些数据
import {useI18n} from 'vue-i18n';
import sheep from "@/sheep";
import {
  onLoad,
} from '@dcloudio/uni-app';
import {ref, computed} from "vue"
import games from "@/sheep/api/dart/games";
import cacheUtil from "@/sheep/request/util";

const {t, locale} = useI18n();

const gameList = ref([]);

// 颜对象
const colors = {
  3: {color: '#FF290D', url: '/sheep/components/game/routine/suddenDeath'},
  4: {color: '#62AAFF', url: '/sheep/components/game/routine/highScore'},
  5: {color: '#F0C422', url: '/sheep/components/game/routine/shanghaiThrill'},
  6: {color: '#FF25FB', url: '/sheep/components/game/routine/connect'},
  7: {color: '#67FE50', url: '/sheep/components/game/routine/practiceMode'}
}

onLoad(async () => {
  const gameShowList = await cacheUtil.fetchWithCache('routine_game_project', games.Api.getGames, {
    types: [3, 4, 5, 6, 7]
  }, 1800, false);
  gameList.value = gameShowList.map(item => {
    const color = colors[item.type];
    const chineseModeName = shanghaiThrill(item.chineseModeName) || '';
    if (!color) {
      return null
    }
    return {
      ...item,
      imgSrc: `/static/images/game/type_${item.type}.png`,
      color: color.color,
      url: color.url,
      text: locale.value === 'zh' ? chineseModeName : item.englishModeName
    }
  });
})

function shanghaiThrill(item) {
  if(item === '上海TWIST'){
    return  '上海挑战'
  }else{
    return item
  }
}

const items = computed(() => [
  ...gameList.value,
/*  {
    id: 7,
    imgSrc: '/static/images/game/practiceMode.png',
    url: '/sheep/components/game/routine/',
    text: t('practiceMode'),
    color: '#67FE50'
  },*/
]);
</script>

<template>
  <view class="uni-h-full center hidden-scrollbar uni-justify-content-center uni-flex">
    <!-- 横向可滑动的容器 -->
    <scroll-view class="scroll-view_H scroll-container" scroll-x="true">
      <view class="uni-flex uni-space-between" style="padding: 0 3rem">
        <view  v-clickSound   class="scroll-view-item_H item " v-for="(item, index) in items" :key="index"
               @click="sheep.$router.go('/pages/game/selectPlayer/offline/index',item)">
          <view class="content">
            <image :src="item.imgSrc" class="circle-img uni-circle"/>
            <text class="item-text" :style="{color:item.color}">{{ item.text }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
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
