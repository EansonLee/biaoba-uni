<script setup>
import {reactive, ref, watch} from 'vue'
import PopUpLayer from "@/sheep/components/util/popUp/popUpLayer.vue";
import NumberRoll from "@/sheep/components/common/numberRoll.vue";
import {SCORING_AREAS} from "@/sheep/config/bluetoothConfig";
import Count from "@/sheep/components/game/mickeyMouse/count.vue";
import {showToast} from "@/sheep/util/toast";

	import {useI18n} from 'vue-i18n';
	const {t, locale} = useI18n();

const props = defineProps({
  modalVisible: {
    type: Boolean,
    default: false
  },
  handicap: {
    type: Object,
    default: () => ({
      currentScore: 0,
      selectedTeam: null,
      backupScores: {},
      mickeyMouseBackupScores: {},
    })
  },
  maxTeams: {
    type: Number,
    default: 8
  },
  players: {
    type: Array,
    default: () => []
  },
  type: {
    type: Number,
  },
  startingScore: {
    type: Number,
    default: 0
  }
});

const state = reactive({
  averageColor: "#3A86FF",
  // 米老鼠让分处理
  backupScores: {
    type: Object,
    default: () => ({})
  },
  team: undefined
})
const emit = defineEmits(['update:modalVisible', 'scoreChange', 'selectTeam', 'confirm', 'cancel']);
const maxNumber = ref(props.handicap.currentScore);

// 处理分数变化
const handleScoreChange = (change) => {
  const newScore = parseInt(props.handicap.currentScore) + change;
  if (props.type === 1) {
    if (newScore > props.startingScore) {
      showToast({
        message: locale.value === "zh" ? '让分项不允许超过最大值' : 'Cannot exceed maximum',
        icon: 'none'
      });
      return;
    }
  }
  if (newScore >= 0) {
    emit('scoreChange', newScore);
    
    // 强制更新视图
    setTimeout(() => {
      console.log('强制刷新后的分数:', props.handicap.currentScore);
      console.log('团队分数:', props.handicap.backupScores ? props.handicap.backupScores[props.handicap.selectedTeam] : undefined);
    }, 0);
  }
};


// 处理团队选择
const handleTeamSelect = (team) => {
  state.team = team;
  const filter = props.players.filter(p => p && p.team === team);
  state.averageColor = filter[0]?.averageColor;
  // 检查团队是否有玩家
  const hasPlayers = props.players.some(p => p && p.team === team);
  if (!hasPlayers) return;

  emit('selectTeam', team);
};

// 确认让分设置
const handleConfirm = () => {
  emit('confirm');
};

// 取消让分设置
const handleCancel = () => {
  emit('cancel');
};

// 米老鼠让分方法
const handleLetting = (score) => {
  if (!state.team) return;

  // 初始化 backupScores 的结构
  if (!props.handicap.mickeyMouseBackupScores[state.team]) {
    props.handicap.mickeyMouseBackupScores[state.team] = {};
  }

  // 如果当前分数未定义，初始化为 1
  if (!props.handicap.mickeyMouseBackupScores[state.team][score]) {
    props.handicap.mickeyMouseBackupScores[state.team][score] = 1;
  } else {
    // 后续+1，最多到3；到3后重置为0
    props.handicap.mickeyMouseBackupScores[state.team][score] = (props.handicap.mickeyMouseBackupScores[state.team][score] + 1) % 4;
  }
};

// 获取团队让分数量
const getLettingCount = (score) => {
  // 初始化 backupScores 的结构
  if (!state.team) {
    return 0
  }
  if (!props.handicap.mickeyMouseBackupScores[state.team]) {
    props.handicap.mickeyMouseBackupScores[state.team] = {};
  }
  // 获取state.backupScores[state.team]中和score对应的数据
  return props.handicap.mickeyMouseBackupScores[state.team][score] ? props.handicap.mickeyMouseBackupScores[state.team][score] : 0;
};

// 自动选择第一个有玩家的团队
const autoSelectFirstTeam = () => {
  for (let i = 1; i <= props.maxTeams; i++) {
    const hasPlayers = props.players.some(p => p && p.team === i);
    if (hasPlayers) {
      handleTeamSelect(i);
      break;
    }
  }
};

// 监听 modalVisible 变化，当弹窗打开时自动选择第一个团队
watch(() => props.modalVisible, (newVal) => {
  if (newVal) {
    autoSelectFirstTeam();
  }
}, { immediate: true });
</script>

<template>
  <PopUpLayer
      :modalVisible="modalVisible"
      :confirm="false"
      :showClose="true"
      width="100%"
      height="100%"
      :zIndex="100"
      @update:modalVisible="(val) => emit('update:modalVisible', val)"
      @confirm="handleConfirm"
      @close="handleCancel"
  >
    <view class="handicap-container">
      <!-- 区域处理 -->
      <view v-if="type===2" class="region">
        <template v-for="(item,index) in SCORING_AREAS" :key="index">
          <view>
            <text style="font-size: 16rpx;font-weight: bold">{{ item.score }}</text>
            <view class="region-number" @click="handleLetting(item.score)">
              <count :color="state.averageColor" :count="getLettingCount(item.score)" :is-letting="true"/>
            </view>
          </view>
        </template>
      </view>
      <!-- 分数显示 -->
      <view class="score-display">
        <view class="score-btn minus stroke-text" :class="{ 'disabled': !handicap.selectedTeam }" @tap="handleScoreChange(-10)">
          <image class="uni-img" src="/static/images/figure/reduction.png"/>
        </view>
        <view class="score-text stroke-text">
          <NumberRoll :key="'score-' + handicap.currentScore" :number="Number(handicap.currentScore)" :height="type===2?80:130"/>
        </view>
        <view class="score-btn plus stroke-text" :class="{ 'disabled': !handicap.selectedTeam }" @tap="handleScoreChange(10)">
          <image class="uni-img" src="/static/images/figure/add.png"/>
        </view>
      </view>
      <!-- 团队列表 -->
      <view class="teams-container">
        <view
            v-for="team in maxTeams"
            :key="team"
            class="team-item"
            :class="{
              'pattern-active-button': handicap.selectedTeam === team,
              'pattern-button': !players.some(p => p && p.team === team)
            }"
            @tap="handleTeamSelect(team)"
        >
          <view class="team-avatars">
            <image
                v-for="player in players.filter(p => p && p.team === team)"
                :key="player.id"
                :src="player.headImgUrl"
                class="avatar uni-circle"
                :style="{
                  border: `2px solid ${player.averageColor}`
                }"
            />
          </view>
          <text v-if="players.some(p => p && p.team === team)" class="team-score">
            {{
              // 如果是当前选中的团队，显示最新的分数
              handicap.selectedTeam === team 
                ? handicap.currentScore
                : (handicap.backupScores[team] ||
                  (players.find(p => p && p.team === team)?.startingScore))
            }}
          </text>
        </view>
      </view>
    </view>
  </PopUpLayer>
</template>

<style scoped lang="scss">
:deep(.content-show){
  transform: scale(1) translateY(5%);
}
.handicap-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-around;

  .region {
    width: 100%;
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 10rpx;

    .region-number {
      width: 40rpx;
      height: 40rpx;
    }
  }

  .score-display {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 40rpx;

    .score-btn {
      width: 50rpx;
      height: 50rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 80rpx;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;

      &:active {
        transform: scale(0.95);
      }

      &.disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    }

    .minus {
      width: 50rpx;
      height: 25rpx;
    }

    .score-text {
      font-size: 180rpx;
      font-weight: 900;
      line-height: 170rpx;
      text-align: center;
      position: relative;
      min-width: 400rpx;
      transition: all 0.3s ease;
    }
  }

  .teams-container {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10rpx;

    .team-item {
      transition: all 0.3s ease-in-out;
      height: 50rpx;
      min-width: 40rpx;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8rpx;
      border-radius: 8rpx;
      border: 3rpx solid transparent;
      justify-content: space-between;

      &.selected {
        background-color: #00ccff;

        .avatar {
          border-color: white;
        }

        .team-score {
          color: white;
        }
      }

      &.empty {
        opacity: 0.5;
        pointer-events: none;
      }

      .team-avatars {
        display: flex;
        gap: 5rpx;

        .avatar {
          width: 25rpx;
          height: 25rpx;
          border: 1rpx solid transparent;
        }
      }

      .team-score {
        font-size: 14rpx;
        font-weight: bold;
        color: #f5f5f5;
      }
    }
  }
}

// 添加数字变化的过渡动画
@keyframes numberChange {
  0% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.score-text {
  animation: numberChange 0.3s ease-out;
}
</style>