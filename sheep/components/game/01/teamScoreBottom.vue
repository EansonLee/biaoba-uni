<script setup>
import { computed } from "vue";

const props = defineProps({
  team: {
    type: {},
    default: () => ({}),
  },
  sort: {
    type: String,
    default: "left",
  },
  showScore: {
    type: Boolean,
    default: false,
  },
  padding: {
    type: String,
    default: "5rpx",
  },
  playerlLength: {
    type: Number,
    default: 2,
  },
  freeze: {
    type: Boolean,
    default: false,
  },
  showName: {
    type: Boolean,
    default: true,
  },
});

// 计算是否反向布局
const reverseLayout = computed(() => props.sort === "right");

// 计算分数文字颜色（当总玩家数>=4时显示白色）
const scoreTextColor = computed(() => {
  return props.playerlLength >= 4 ? "#fff" : "inherit";
});

const getStart = (num) => {
  let start = "";
  for (let i = 0; i < (num || 0); i++) {
    start += "⭐";
  }
  return start;
};

// 计算团队胜场（优先使用父级传入的winCount，没有则回退到队内玩家win的最大值）
const getDisplayWin = (team) => {
  if (typeof team?.winCount === 'number') return team.winCount;
  if (!team || !Array.isArray(team.player)) return 0;
  return team.player.reduce((max, p) => {
    const w = typeof p.win === 'number' ? p.win : 0;
    return w > max ? w : max;
  }, 0);
};
</script>

<template>
  <view
    class="team-box"
    :style="{ padding: `${padding}` }"
    :class="{
      right: reverseLayout,
      'team-active': team.isActive,
      eliminated: team.isEliminated || team.tempEliminated,
    }"
  >
    <!-- 判断玩家数量是否为 1 -->
    <template v-if="team.player && team.player.length === 1">
      <view class="single-player" :class="{ reverse: reverseLayout }">
        <!-- 头像 -->
        <!--freeze模式-->
        <image
          v-if="playerlLength <= 2 && freeze"
          :src="team.player[0].headImgUrl"
          class="avatar"
          :class="{ 'player-active': team.isActive }"
          :style="{ borderColor: team.player[0].averageColor }"
        />
        <!--单人模式-->
        <image
          v-if="playerlLength <= 2 && !freeze"
          :src="team.player[0].headImgUrl"
          class="avatar avatar2"
          :class="{ 'player-active': team.isActive }"
          :style="{ borderColor: team.player[0].averageColor }"
        />
        <image
          v-if="playerlLength > 2"
          :src="team.player[0].headImgUrl"
          class="avatar"
          :class="{ 'player-active': team.isActive }"
          :style="{ borderColor: team.player[0].averageColor }"
        />
        <!-- 分数和名称 -->
        <view class="player-info">
          <view
            :style="{ color: scoreTextColor }"
            class="score-text neon-text font-regular"
            style="margin-bottom: 0; font-size: 14px"
            v-if="showScore"
          >
            {{ team.score }}
          </view>

          {{ getStart(team.player[0].win) }}
          <!-- 名字已被注释，如果要隐藏，保持不显示即可 -->
          <!--          <view v-if="props.playerlLength<=2 && freeze" style="font-size: 9rpx" :class="['name', props.playerlLength<=2?'margin-right':'']" >{{ team.player[0].playerName }}</view>-->
          <view
            v-if="props.playerlLength <= 2 && !freeze"
            :class="['name', props.playerlLength <= 2 ? 'margin-right' : '']"
            >{{ team.player[0].playerName }}</view
          >
          <view
            style="font-size: 9rpx"
            v-if="props.playerlLength > 2 && showName"
            :class="['name', props.playerlLength <= 2 ? 'margin-right' : '']"
            >{{ team.player[0].playerName }}</view
          >
        </view>
      </view>
    </template>

    <!-- 如果玩家数量大于 1 -->
    <template v-else>
      <!-- 分数显示 -->
      <view
        :style="{ color: scoreTextColor }"
        class="score-text neon-text font-regular"
        v-if="showScore"
        >{{ team.score }}</view
      >
      <!-- 2v2团队胜场星标显示（位于头像下方） -->
      <view class="team-avatars-wrap">
        <view class="team-win-stars" :class="{ reverse: reverseLayout }">
          {{ getStart(getDisplayWin(team)) }}
        </view>
        <view class="team-avatars" :class="{ reverse: reverseLayout }">
          <view
            v-for="(item, index) in team.player"
            :key="index"
            class="player"
            :class="{ 'player-active': item.isActive }"
          >
            <image
              :src="item.headImgUrl"
              class="avatar uni-h-full uni-w-full"
              :style="{ borderColor: item.averageColor }"
            />
          </view>
        </view>
      </view>
      <!-- 头像列表 -->
      <!-- <view class="team-avatars" :class="{ reverse: reverseLayout }">
        <view
          v-for="(item, index) in team.player"
          :key="index"
          class="player"
          :class="{ 'player-active': item.isActive }"
        >
          <image
            :src="item.headImgUrl"
            class="avatar uni-h-full uni-w-full"
            :style="{ borderColor: item.averageColor }"
          />
        </view>
      </view> -->
    </template>
  </view>
</template>

<style scoped lang="scss">
.team-box {
  border: 2rpx solid transparent;
  border-radius: 10rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s ease;
  justify-content: center;
  overflow: hidden;
  &.right {
    .team-avatars {
      flex-direction: row-reverse;
    }
  }

  &.eliminated {
    opacity: 0.5;
    filter: grayscale(100%);
    position: relative;

    &::after {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ff5656;
      font-size: 24rpx;
      font-weight: bold;
      text-shadow: 0 0 4rpx rgba(0, 0, 0, 0.5);
      z-index: 1;
    }

    .team-info {
      .player-list {
        .player-item {
          &.active {
            border-color: rgba(136, 86, 255, 0.3);
          }
        }
      }

      .score {
        color: rgba(255, 255, 255, 0.5);
      }
    }

    .single-player {
      .avatar {
        opacity: 0.5;
      }

      .player-info {
        opacity: 0.5;
      }
    }

    .team-avatars {
      .player {
        opacity: 0.5;

        &.player-active {
          .avatar {
            box-shadow: none;
          }
        }
      }
    }

    .score-text {
      opacity: 0.5;
    }
  }
}

.team-active {
  background: rgba(142, 77, 190, 0.3); // 增强紫色背景透明度
  border: 3rpx solid #8857ff; // 稍微加粗的紫色边框
  box-shadow: 0 0 15rpx rgba(136, 87, 255, 0.5),
    // 增强的内层光晕
    0 0 30rpx rgba(136, 87, 255, 0.3),
    // 增强的中层光晕
    0 0 45rpx rgba(136, 87, 255, 0.15); // 增强的外层光晕
  animation: glowing 1.2s ease-in-out infinite alternate; // 呼吸动画
  transform: scale(1.05); // 轻微放大
}

@keyframes glowing {
  from {
    box-shadow: 0 0 15rpx rgba(136, 87, 255, 0.5),
      0 0 30rpx rgba(136, 87, 255, 0.3), 0 0 45rpx rgba(136, 87, 255, 0.15);
  }
  to {
    box-shadow: 0 0 25rpx rgba(136, 87, 255, 0.7),
      0 0 40rpx rgba(136, 87, 255, 0.5), 0 0 60rpx rgba(136, 87, 255, 0.25);
  }
}

.score-text {
  font-size: 20rpx;
  text-align: center;
  margin-bottom: 5rpx;
}

.team-avatars-wrap {
  display: flex;
  flex-direction: column;
  // align-items: center;
  width: 100%;
}

.team-avatars {
  order: 1;
  display: flex;
  gap: 8rpx;
  justify-content: center;
  height: 20rpx;

  &.reverse {
    justify-content: flex-end;
  }
}

// 团队胜场星标（2v2显示）
.team-win-stars {
  // margin-top: 6rpx;
  font-size: 20rpx;
  margin-bottom: 4rpx;
  color: #ffd700;
  // text-align: center;
  width: 100%;
  display: flex;
  // justify-content: center;
  letter-spacing: 6rpx;

  &.reverse {
    justify-content: flex-end;
  }
}
.avatar.player-active {
  transform: scale(1.2); // 更大的缩放
  box-shadow: 0 0 15rpx rgba(136, 87, 255, 0.8),
    // 紫色光晕
    0 0 25rpx rgba(136, 87, 255, 0.6),
    0 0 35rpx rgba(136, 87, 255, 0.3);
  animation: avatarPulse 1s ease-in-out infinite alternate; // 脉冲动画
}

@keyframes avatarPulse {
  from {
    transform: scale(1.3);
    box-shadow: 0 0 15rpx rgba(136, 87, 255, 0.8),
      0 0 25rpx rgba(136, 87, 255, 0.6), 0 0 35rpx rgba(136, 87, 255, 0.3);
  }
  to {
    transform: scale(1.4);
    box-shadow: 0 0 20rpx rgba(136, 87, 255, 1),
      0 0 35rpx rgba(136, 87, 255, 0.8), 0 0 50rpx rgba(136, 87, 255, 0.4);
  }
}

.player {
  position: relative;
  width: 23.5rpx;
  height: 20rpx;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
  justify-content: center;

  .avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 2rpx solid transparent;
    transition: all 0.3s ease;
    object-fit: cover;
  }

  &.player-active {
    .avatar {
      transform: scale(1.3); // 更大的缩放
      box-shadow: 0 0 12rpx rgba(136, 87, 255, 0.8),
        // 紫色光晕
        0 0 20rpx rgba(136, 87, 255, 0.6),
        0 0 30rpx rgba(136, 87, 255, 0.3);
      animation: playerGlow 1s ease-in-out infinite alternate; // 添加头像专用动画
    }
  }

  @keyframes playerGlow {
    from {
      box-shadow: 0 0 12rpx rgba(136, 87, 255, 0.8),
        0 0 20rpx rgba(136, 87, 255, 0.6), 0 0 30rpx rgba(136, 87, 255, 0.3);
    }
    to {
      box-shadow: 0 0 18rpx rgba(136, 87, 255, 1),
        0 0 30rpx rgba(136, 87, 255, 0.8), 0 0 45rpx rgba(136, 87, 255, 0.4);
    }
  }
}

// 霓虹文字效果
.neon-text {
  color: #8856ff;
  text-shadow: 0 0 5px rgba(136, 86, 255, 0.8), 0 0 20px rgba(136, 86, 255, 0.2);
}

// 单玩家布局
.single-player {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10rpx;

  .avatar {
    border-radius: 50%;
    width: 35rpx;
    height: 35rpx;
    border: 2rpx solid transparent; // 默认透明边框
    transition: all 0.3s ease;

    &.player-active {
      transform: scale(1.25); // 单人模式下的缩放
      box-shadow: 0 0 15rpx rgba(136, 87, 255, 0.8),
        // 紫色光晕
        0 0 25rpx rgba(136, 87, 255, 0.6),
        0 0 35rpx rgba(136, 87, 255, 0.3);
      animation: singlePlayerGlow 1.1s ease-in-out infinite alternate;
    }
  }

  @keyframes singlePlayerGlow {
    from {
      box-shadow: 0 0 15rpx rgba(136, 87, 255, 0.8),
        0 0 25rpx rgba(136, 87, 255, 0.6), 0 0 35rpx rgba(136, 87, 255, 0.3);
    }
    to {
      box-shadow: 0 0 22rpx rgba(136, 87, 255, 1),
        0 0 35rpx rgba(136, 87, 255, 0.8), 0 0 50rpx rgba(136, 87, 255, 0.4);
    }
  }

  .player-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    text-align: left;
    color: #ffffff;
    font-size: 10rpx;

    .score {
      font-size: 16rpx;
      font-weight: 400;
      color: #ffffff;
      text-align: left;
      font-style: normal;
      text-transform: none;
      // -webkit-text-stroke: 1px #8856FF;
    }

    .name {
      font-size: 12rpx;
      text-wrap-mode: nowrap;
      white-space: nowrap;
    }
  }
}

// 反向布局
.reverse {
  justify-content: flex-end;
  flex-direction: row-reverse !important;
}

.avatar {
  width: 20rpx !important;
  height: 20rpx !important;
}

.avatar2 {
  width: 31.48rpx !important;
  height: 31.48rpx !important;
}

.score-text {
  font-size: 14rpx !important;
  margin-bottom: 0 !important; /* 保持底部间距为0 */
}

.name {
  width: 30rpx;
  text-overflow: ellipsis;
}

.margin-right {
  margin-right: 20rpx;
}

.font-regular {
  font-family: YouSheBiaoTiHei, YouSheBiaoTiHei;
}
</style>
