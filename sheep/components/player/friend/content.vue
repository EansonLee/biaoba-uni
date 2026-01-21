<script setup>
import {
  ref,
  reactive,
  computed, watch
} from 'vue';
import PlayerBox from "@/sheep/components/game/online/PlayerBox.vue";
import AddFriend from "@/sheep/components/player/friend/addFriend.vue";
import playerFriends from "@/sheep/api/dart/playerFriends";
import $stores from "@/sheep/stores";
import gameInvitation from "@/sheep/api/dart/gameInvitation";
import waiting from "@/sheep/components/game/online/waiting.vue";
import grade from "@/sheep/api/dart/grade";
import eventBus from "@/sheep/util/eventBus";
import {showToast} from "@/sheep/util/toast";
import zimStore from "@/sheep/stores/zegoStore";
import gameConfig from "@/sheep/config/gameConfig.json";
import sheep from "@/sheep";
import bluetooth from "@/sheep/stores/bluetooth";
import player from "@/sheep/api/dart/player";
import {useI18n} from "vue-i18n";
const {
	t,
	locale
} = useI18n();
const userInfo = $stores('user').getUserInfo();
$stores('zegoStore').initLogin();

eventBus.on('sendMessageError', (payload) => {
  const type = payload && payload.msgType;
  if (type === 'yaoqing') {
    state.waitingVisible = false;
    showToast({
      message: locale.value === 'en' ? "Invitation failed" : "邀请失败",
      icon: "none"
    });
  } else if (type === 'addFriend') {
    showToast({
      message: locale.value === 'en' ? "Add friend failed" : "添加好友失败",
      icon: "none"
    });
  }
})

const zimStores = zimStore();
watch(zimStores.message.accept, (New, Old) => {
      const newValue = New[New.length - 1];
      getInviteInfo();
    },
    {deep: true}
)

const startGame = () => {
  const selectedPlayers = [];
  // 好友列表发起端：自己（userInfo）在左边（索引0），对手在右边（索引1）
  selectedPlayers[0] = {
    averageColor: "#8338EC",
    headImgUrl: userInfo.headImgUrl,
    id: userInfo.id,
    playerId: userInfo.id,
    playerName: userInfo.playerName,
    startingScore: state.gameInfo.startingScore,
    playerOnly: userInfo.playerOnly,
    onlinePpd: userInfo.onlinePpd,
    onlinePpr: userInfo.onlinePpr
  }
  selectedPlayers[1] = {
    averageColor: "#4ECDC4",
    headImgUrl: state.player.headImgUrl,
    id: state.player.id,
    playerId: state.player.playerId,
    playerName: state.player.playerName,
    startingScore: state.gameInfo.startingScore,
    playerOnly: state.player.playerOnly,
    onlinePpd: state.player.onlinePpd,
    onlinePpr: state.player.onlinePpr
  }

  //是否开启了自动计分
  if (state.gameInfo.handicap === "auto") {
    if (userInfo.onlinePpd !== 0 && state.player.onlinePpd !== 0) {
      if (userInfo.onlinePpd > state.player.onlinePpd) {
        selectedPlayers[1].startingScore = state.gameInfo.startingScore * state.player.onlinePpd / userInfo.onlinePpd + 0.5
      }
      if (userInfo.onlinePpd < state.player.onlinePpd) {
        selectedPlayers[0].startingScore = state.gameInfo.startingScore * userInfo.onlinePpd / state.player.onlinePpd + 0.5
      }
    }

  }

  // 不再按ID排序，保持发起者在前的顺序
  // selectedPlayers.sort(function (a, b) {
  //   return a.id - b.id
  // })
  selectedPlayers.forEach((item, index) => {
    item.team = index + 1
  })


  console.log(state.selectedPlayers)
  state.selectedPlayers = [];
  // 如果selectedPlayers长度不大于0的话
  if (!state.selectedPlayers.length || state.selectedPlayers.length === 0) {
    state.selectedPlayers = groupByTeam(selectedPlayers)
  }
  const modeEntity = {
    type: state.gameInfo.gameType,
    chineseModeName: state.gameInfo.gameName,
    startingScore: state.gameInfo.startingScore,
    englishModeName: state.gameInfo.startingScore,
    duelMode: 1
  }
  // 兼容后端不同字段命名（doubleStart/doubleEnd），优先使用非0的 doubleStart/doubleEnd
  const toInt = (v) => (v === undefined || v === null || v === '' ? 0 : parseInt(v, 10));
  const openingVal = (() => {
    const o = toInt(state.gameInfo.opening);
    const ds = toInt(state.gameInfo.doubleStart);
    return ds !== 0 ? ds : o;
  })();
  const finishVal = (() => {
    const f = toInt(state.gameInfo.finish);
    const de = toInt(state.gameInfo.doubleEnd);
    return de !== 0 ? de : f;
  })();

  // 准备游戏数据
  const gameData = {
    players: state.selectedPlayers,
    // 发起邀请者先手：在好友列表发起的一方就是当前用户
    firstTurnPlayerOnly: userInfo.playerOnly,
    gameSettings: {
      teamSize: 1,
      roundNbr: state.gameInfo.roundNbr,
      handicap: state.gameInfo.handicap,
      opening: openingVal,
      finish: finishVal,
      bullEyeFraction: state.gameInfo.bullsEyeFraction,
      customRound: state.gameInfo.customRound,
      requiredLines: state.gameInfo.requiredLines,
      duelMode: 1,
      bidSequence: state.gameInfo.bidSequence,
      partition: state.gameInfo.partition,
      type: 11
    },
    // modes: state.gameInfo.gameType === 8 ? state.gameInfo.gameType : undefined,
    modes: state.gameInfo.gameType === 8 ? (state.gameInfo.legList || state.gameInfo.legGame || []) : undefined,
    modeEntity: modeEntity,
  };


  const gameConfigElement = gameConfig[state.gameInfo.gameType];
  let url = gameConfigElement.url;
  if (state.gameInfo.gameType === 1 && gameData.gameSettings.duelMode === 2) {
    url = gameConfigElement.freezeUrl;
  }

  // 设置房间号和对手ID（对战模式需要）
  if (gameData.gameSettings.type === 11) {
    // 房间ID保持一致性：始终使用较小ID在前
    const ids = [selectedPlayers[0].id, selectedPlayers[1].id].sort((a,b) => a-b);
    const roomId = ids[0] + "" + ids[1];
    const remoteUserId = state.player.playerOnly;
    let zeGoTokenThird = uni.getStorageSync('zeGoTokenThird');

    // 如果没有zeGoTokenThird，尝试从其他地方获取
    if (!zeGoTokenThird) {
      const zeGoToken = uni.getStorageSync('zeGoToken');
      if (zeGoToken) {
        zeGoTokenThird = zeGoToken;
        uni.setStorageSync('zeGoTokenThird', zeGoTokenThird);
        console.log('📝 [friend-content] 从zeGoToken复制到zeGoTokenThird:', zeGoTokenThird);
      } else {
        console.warn('📝 [friend-content] ⚠️ 未找到任何Zego Token，需要重新登录获取');
      }
    }

    console.log('📝 [friend-content] 准备设置远程视频数据:', {
      roomId,
      remoteUserId,
      hasZeGoTokenThird: !!zeGoTokenThird
    });

    // 使用统一的数据设置方法
    const app = getApp();
    if (app && app.setRemoteVideoData) {
      app.setRemoteVideoData({
        roomId,
        remoteUserId,
        zeGoTokenThird
      });
    } else {
      // 兜底方案，直接设置
      uni.setStorageSync('roomID', roomId);
      uni.setStorageSync('remoteUserId', remoteUserId);
      if (zeGoTokenThird) {
        uni.setStorageSync('zeGoTokenThird', zeGoTokenThird);
      }
      console.log('📝 [friend-content] 兜底设置远程视频数据:', { roomId, remoteUserId, hasToken: !!zeGoTokenThird });
    }
  }

  // 跳转到游戏页面
  sheep.$router.go(url, gameData, 'reLaunch');
};


const state = reactive({
  listData: [],
  addFriendState: false,
  waitingVisible: false,
  invitationId: null,
})
//获取好友列表

const getList = async () => {
  state.listData = await playerFriends.Api.getList({status: 1});
  state.grade = await grade.Api.getAllGrade();
  for (let i in state.listData) {
    state.listData[i].online01 = findGradeImage(state.listData[i].onlinePpr, 1);
    state.listData[i].onlineCr = findGradeImage(state.listData[i].onlinePpd, 2);
  }
}

const findGradeImage = (number, type) => {
  //numder代表传递的分数   type判断是01还是cr 1.01 2.cr
  for (let i in state.grade) {
    if (number >= state.grade[i].upperInterval && number <= state.grade[i].lowerRange && type == state.grade[i].gameType) {
      return state.grade[i].gradeImage;
    }
  }
  return  locale.value === 'en' ? "No matching grade" : "没有匹配到相应的段位";
}

const friendState = () => {
  state.addFriendState = true
}
const close = () => {
  state.addFriendState = false
}
const update = async (data) => {
  await gameInvitation.Api.update(data);
}


const sure = (data) => {
  state.player = data.player
  //开始邀请
  let postData = {
    beInvitedPlayerId: data.player.id,
    gameName: data.selectiveGame.chineseModeName,
    gameType: data.selectiveGame.type,
    legType: data.mixGame.length,
    legGame: data.mixGame,
    roundNbr: data.modalContent.roundNbr,
    handicap: data.modalContent.handicap,
    customRound: data.modalContent.customRound,
    opening: data.modalContent.opening,
    finish: data.modalContent.finish,
    // 兼容后端字段
    doubleStart: data.modalContent.opening,
    doubleEnd: data.modalContent.finish,
    bullsEyeFraction: data.modalContent.bullSEyeFraction, //牛眼分数
    numberOfTeams: data.modalContent.numberOfTeams,
    requiredLines: data.modalContent.requiredLines,
    bidSequence: data.modalContent.bidSequence, //输赢攻击顺序
    partition: data.modalContent.partition,//获分区设置
    startingScore: data.selectiveGame.startingScore
  }
  const returnData = gameInvitation.Api.postCreate(postData)
      .then(response => {
        state.invitationId = response;
        state.waitingVisible = true;

        let userId = data.player.playerOnly
        console.log('邀请用户ID：'+userId);
        let msg = {
          msgType: "yaoqing",
          invitationId: state.invitationId,
        }
        var messageTextObj = {type: 1, message: JSON.stringify(msg), extendedData: {msgType: "yaoqing"}};
        $stores('zegoStore').sendMessage(userId, messageTextObj);
        //一分钟后取消关闭
        setTimeout(() => {
          state.waitingVisible = false;
          update({id: state.invitationId, state: 3})

          // 超时时也发送取消邀请消息
          if (state.invitationId && data && data.player) {
            let msg = {
              msgType: "cancel",
              invitationId: state.invitationId
            }
            var messageTextObj = { type: 1, message: JSON.stringify(msg), extendedData: {msgType: "cancel"} };
            $stores('zegoStore').sendMessage(data.player.playerOnly, messageTextObj);
            console.warn("⏰ [Friend] 邀请超时，发送取消消息", {
              invitationId: state.invitationId,
              targetPlayer: data.player.playerOnly,
              timestamp: new Date().toISOString()
            });
          }
        }, 60000);
      }).catch(err => {
        error.value = err;
      });
  ;

}
const cancel = (data) => {
  state.waitingVisible = false;
  update({id: state.invitationId, state: 3})

  // 发送取消邀请消息给被邀请的玩家
  if (state.invitationId && data && data.player) {
    let msg = {
      msgType: "cancel",
      invitationId: state.invitationId
    }
    var messageTextObj = { type: 1, message: JSON.stringify(msg), extendedData: {msgType: "cancel"} };
    $stores('zegoStore').sendMessage(data.player.playerOnly, messageTextObj);
    console.warn("🚫 [Friend] 发送取消邀请消息", {
      invitationId: state.invitationId,
      targetPlayer: data.player.playerOnly,
      timestamp: new Date().toISOString()
    });
  }
}


//监听对方是否拒绝
watch(zimStores.message.refuse, (New, Old) => {
      const newValue = New[New.length - 1];
      if (newValue.invitationId === state.invitationId) {
        state.waitingVisible = false;
        showToast({
          message: locale.value === 'en' ? "The other party has rejected" : '对方已拒绝',
          icon: 'none'
        });
      }
    },
    {deep: true}
)


// 将玩家按队伍分组
const groupByTeam = (players) => {
  const grouped = {};
  players.forEach((player) => {
    if (!grouped[player.team]) {
      grouped[player.team] = {
        team: player.team,
        mickeyMouseBackupScores: player.mickeyMouseBackupScores,
        players: [],
        // 起始分数
        startingScore: parseInt(player.startingScore),
      };
      delete player.startingScore
      // 删除mickeyMouseBackupScores
      delete player.mickeyMouseBackupScores;
    }
    // 添加玩家初始状态
    grouped[player.team].players.push({
      ...player,
      currentScore: parseInt(player.startingScore), // 当前分数
      roundScores: [], // 每回合得分记录
      averageScore: 0, // 平均分
      isActive: false // 是否当前投掷玩家
    });
  });

  // 设置状态为游戏开始
  bluetooth().isGameStart = true;

  // 转换为数组并排序
  return Object.values(grouped).sort((a, b) => a.team - b.team);
};


getList();

// 获取邀请的详情信息
const getInviteInfo = async () => {
  const returnData = gameInvitation.Api.get(state.invitationId)
      .then(newVar => {
        const possibleModes = newVar.legList || newVar.legGame || newVar.mixGame || newVar.modes;
        
        state.mixedGame = possibleModes;
        state.gameInfo = newVar;
        
        // 如果是混合模式，确保modes字段正确设置
        if (newVar.gameType === 8) {
          state.gameInfo.legList = possibleModes;
          state.gameInfo.legGame = possibleModes;
        }
        
        startGame()
      }).catch(err => {
        console.log('获取邀请详情失败:', err)
      });
  ;

}


getList()
</script>

<template>
  <view class="container">
    <view v-clickSound class="xinzheng" @click="friendState">
      {{ $t('addFriends') }}
    </view>
    <!-- //v-clickSound -->
    <view class="friend-list-container">
      <scroll-view class="friend-scroll-view" scroll-x="true">
        <player-box :isOnline="1" @sure="sure" v-for="(item, index) in state.listData" :key="index" :player="item"></player-box>
      </scroll-view>
    </view>
  </view>
  <AddFriend @close="close" :modalVisible="state.addFriendState"/>
  <waiting @cancel="cancel" :modalVisible="state.waitingVisible"></waiting>
</template>

<style scoped lang="scss">
.xinzheng {
  color: #8856FF;
  position: fixed;
  top: 0;
  right: 0;
  padding-right: 20rpx;
  padding-top: 5rpx;
  font-size: 15rpx;
  // -webkit-text-stroke: 0.00938rem #8856FF;
  //text-shadow: 0 0 3px #8856FF, 0 0 6px #8856FF, 0 0 10px #8856FF, 0 0 20px #8856FF;
}

.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}

.friend-list-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.friend-scroll-view {
  width: 100%;
  height: auto;
  white-space: nowrap;
}

.auto {
  width: 100%;
  height: 53rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .autoText {
    flex: 1;

    .friendListText {
      width: 180rpx;
      height: 53rpx;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
      background-image: url("/static/images/game/online/friends.png");

      font-weight: 400;
      font-size: 19rpx;
      color: #FFFFFF;
      line-height: 27rpx;
      text-align: center;
      font-style: normal;
      text-transform: none;
      // -webkit-text-stroke: 0.00938rem #8856FF;
      text-shadow: 0 0 3px #8856FF, 0 0 6px #8856FF, 0 0 10px #8856FF, 0 0 20px #8856FF;
    }
  }

  .autoPk {
    font-weight: bold;
    font-size: 20rpx;
    color: #FFFFFF;
    line-height: 28rpx;
    text-align: center;
    font-style: normal;
    text-transform: none;
    // -webkit-text-stroke: 1px #8856FF;
  }

  .blank {
    flex: 1;
  }
}
</style>