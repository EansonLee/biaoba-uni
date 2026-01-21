<script setup>
import {computed} from 'vue'
import Count from "@/sheep/components/game/mickeyMouse/count.vue";
import {SCORING_AREAS} from "@/sheep/config/bluetoothConfig";

const props = defineProps({
  teams: {
    type: Array,
    required: true
  },
  forbiddenAreas: {
    type: Array,
    default: () => []
  },
  teamLocks: {
    type: Object,
    default: () => ({})
  },
  swapSides: {
    type: Boolean,
    default: false
  },
  // 新增：用于判断是否为线上对战（11）
  gameSettingsType: {
    type: Number,
    default: 0
  }
});

// 检查区域是否作废
const isAreaForbidden = (area) => {
  const checkArea = area === 'B' ? 21 : area;
  return props.forbiddenAreas.includes(checkArea);
};

// 处理团队数据（严格按 props.teams 的顺序渲染，确保与底部一致）
const processedTeams = computed(() => {
  const orderedTeams = (props.teams || []).map(teamObj => {
    const teamId = teamObj.team;
    const lock = props.teamLocks ? props.teamLocks[teamId] : null;
    const fallbackColor = teamObj.players?.[0]?.averageColor || '#8856FF';
    const color = lock?.averageColor || fallbackColor;
    return {
      id: teamId,
      color,
      scores: SCORING_AREAS.map(area => {
        const key = area.score === 'B' ? '21' : area.score;
        const tl = lock ? lock[key] : null;
        return {
          score: area.score,
          count: tl?.count || 0,
          locked: tl?.locked
        };
      })
    }
  });

  // 根据团队数分配左右两侧
  const totalTeams = orderedTeams.length;
  let leftTeams, rightTeams;

  switch (totalTeams) {
    case 2:
      // 两队：
      // 线上对战（type===11）：遵循传入顺序（左对方/右自己，通过 swapSides 控制）
      // 离线对战：固定左=队伍1，右=队伍2，保持与底部 TeamDisplay 逻辑一致
      if (props.gameSettingsType === 11) {
        leftTeams = orderedTeams.slice(0, 1);
        rightTeams = orderedTeams.slice(1, 2);
      } else {
        const t1 = orderedTeams.find(t => String(t.id) === '1');
        const t2 = orderedTeams.find(t => String(t.id) === '2');
        leftTeams = t1 ? [t1] : orderedTeams.slice(0, 1);
        rightTeams = t2 ? [t2] : orderedTeams.slice(1, 2);
      }
      break;
    case 3:
      leftTeams = orderedTeams.slice(0, 2);
      rightTeams = orderedTeams.slice(2, 3);
      break;
    case 4:
      leftTeams = orderedTeams.slice(0, 2);
      rightTeams = orderedTeams.slice(2, 4);
      break;
    case 5:
      leftTeams = orderedTeams.slice(0, 3);
      rightTeams = orderedTeams.slice(3, 5);
      break;
    default:
      // 6个及以上，左边保持3个，其余都放右边
      leftTeams = orderedTeams.slice(0, 3);
      rightTeams = orderedTeams.slice(3);
      break;
  }

  // 若需要交换左右列（邀请方视角）
  if (props.swapSides) {
    const tmp = leftTeams;
    leftTeams = rightTeams;
    rightTeams = tmp;
  }

  return {leftTeams, rightTeams};
});

// 计算横线宽度
const getLineWidth = computed(() => {
  const {leftTeams, rightTeams} = processedTeams.value;
  const teamWidth = 75; // 每个团队的实际宽度
  const gap = 10; // 团队之间的间距

  // 计算左右两侧的实际宽度（包含间距）
  const leftWidth = Math.min(leftTeams.length, 3) * teamWidth +
      (Math.min(leftTeams.length, 3) - 1) * gap;
  const rightWidth = Math.min(rightTeams.length, 3) * teamWidth +
      (Math.min(rightTeams.length, 5) - 1) * gap;

  // 取左右两侧中较大的宽度
  const maxWidth = Math.max(leftWidth, rightWidth);

  // 返回计算后的宽度（加上一些边距）
  return `${maxWidth}rpx`;
});

const getLeft = computed(() => {
  const {leftTeams, rightTeams} = processedTeams.value;
  if (rightTeams.length === 5) {
    return '55rpx'
  } else if (leftTeams.length >= 3) {
    return "30rpx"
  }
  return '0'
})
</script>

<template>
  <view class="backdrop">
    <view class="score-container">
      <!-- 添加一个横线容器 -->
      <view class="forbidden-lines-container">
        <view v-for="area in SCORING_AREAS"
              :key="area.score"
              :class="['forbidden-line-row', { 'show': isAreaForbidden(area.score) }]"
              :style="{ '--line-width': getLineWidth,marginLeft:getLeft }">
        </view>
      </view>

      <!-- 左侧团队 -->
      <view class="teams-column left">
        <view v-for="team in processedTeams.leftTeams"
              :key="team.id"
              class="team-row"
              :style="{
                backgroundColor: team.color + '40',
                borderColor: 'transparent'
              }">
          <view class="uni-flex uni-h-full uni-column item-row center">
            <view v-for="scoreData in team.scores"
                  :key="scoreData.score"
                  :class="['item', { 'forbidden': isAreaForbidden(scoreData.score) }]">
              <count :lineWidth="3" :circle-width="3" style="height: 37rpx" :count="scoreData.count" :color="team.color" :area="scoreData.score"/>
            </view>
          </view>
        </view>
      </view>

      <!-- 中间分数列 -->
      <view class="score-column">
        <view class="uni-flex uni-h-full uni-column item-row center">
          <view v-for="area in SCORING_AREAS"
                :key="area.score"
                :class="['item', { 'forbidden': isAreaForbidden(area.score) }]">
            <text class="score">{{ area.score }}</text>
          </view>
        </view>
      </view>

      <!-- 右侧团队 -->
      <view class="teams-column right">
        <view v-for="team in processedTeams.rightTeams"
              :key="team.id"
              class="team-row"
              :style="{
                backgroundColor: team.color + '40',
                borderColor: 'transparent'
              }">
          <view class="uni-flex uni-h-full uni-column item-row center">
            <view v-for="scoreData in team.scores"
                  :key="scoreData.score"
                  :class="['item', { 'forbidden': isAreaForbidden(scoreData.score) }]">
              <count style="height: 37rpx" :lineWidth="3" :circle-width="3" :count="scoreData.count" :color="team.color" :area="scoreData.score"/>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.backdrop {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.score-container {
  width: 100%;
  height: 274rpx;
  display: flex;
  justify-content: center;
  position: relative;
}

// 分数列样式
.score-column {
  height: 100%;
  width: 45rpx;
  display: flex;
  justify-content: center;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

// 团队列样式
.teams-column {
  display: flex;
  gap: 10rpx;
  position: absolute;
  height: 100%;

  &.left {
    right: calc(50% + 30rpx); // 分数列宽度的一半加上间距
    display: flex;
    justify-content: flex-end;
  }

  &.right {
    left: calc(50% + 30rpx); // 分数列宽度的一半加上间距
    display: flex;
    justify-content: flex-start;
  }
}

.team-row {
  border: 2rpx solid transparent;
  border-radius: 3rpx;
  transition: all 0.3s ease;
}

.item-row {
  width: 45rpx;
}

.item {
  flex: 1;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #FFFFFF;
  width: 40rpx;
  height: 40rpx;

  &.forbidden {
    opacity: 0.5;
    color: #999;
  }
}

.forbidden-lines-container {
  position: absolute;
  top: 0;
  height: 100%;
  left: 0;
  width: 100%;
  z-index: 1;
  pointer-events: none;
}

.forbidden-line-row {
  position: absolute;
  width: 100%;
  height: calc(100% / 7);
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s;

  &::before {
    content: '';
    position: absolute;
    left: calc(50% - var(--line-width));
    right: calc(50% - var(--line-width));
    height: 2rpx;
    background-color: #999;
  }

  &.show {
    opacity: 1;
  }

  @for $i from 0 through 6 {
    &:nth-child(#{$i + 1}) {
      top: calc(#{$i} * (100% / 7));
    }
  }
}

.score {
  font-weight: bold;
  font-size: 24rpx;
  position: relative;
  z-index: 2;
}
</style>