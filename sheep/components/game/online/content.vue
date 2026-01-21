<script setup>
	import {
		ref,
		reactive,
		computed,
		watch
	} from 'vue';
	import PlayerBox from "@/sheep/components/game/online/PlayerBox.vue";
	import player from "@/sheep/api/dart/player";
	import sheep from "@/sheep";
	import waiting from "@/sheep/components/game/online/waiting.vue";
	import {showToast} from "@/sheep/util/toast";
	import Offer from "@/sheep/components/game/online/offer.vue";
	import $stores from "@/sheep/stores";
	import gameInvitation from "@/sheep/api/dart/gameInvitation";
	import zimStore from '@/sheep/stores/zegoStore'
	const userInfo = $stores('user').getUserInfo();
	import bluetooth from "@/sheep/stores/bluetooth";
	import cacheUtil from "@/sheep/request/util";
	import gameConfig from '@/sheep/config/gameConfig.json';
import grade from '@/sheep/api/dart/grade';
const zimStores = zimStore();
import {useI18n} from "vue-i18n";
import invitePop from "@/sheep/components/player/messages/invitePop.vue";
const {
		t,
		locale
	} = useI18n();
	//监听对方是否接受邀请
	watch(zimStores.message.accept, (New, Old) => {
		const newValue = New[New.length - 1];
		if(newValue.invitationId === state.invitationId){
			getInviteInfo()
		}
	},
	{deep: true}
	)
	
	//监听对方是否拒绝
	watch(zimStores.message.refuse, (New, Old) => {
		  const newValue = New[New.length - 1];
		  if(newValue.invitationId === state.invitationId){
			  state.waitingVisible = false;
			  showToast({
			    message: locale.value === 'en' ? "The other party has rejected" : '对方已拒绝',
			    icon: 'none'
			  });
		  }
	},
	
	{deep: true}
	)
const state = reactive({
		selectedPlayers:[],
		invitationId:0,
		waitingVisible:false,
		offerVisible:false,
		playerNot:true,
		listData: [],
		player:{},
		mixedGame:[],
		gameInfo:{},
		invitePopModalVisible:false
	})
	

	
	//自动匹配
	const automatic = () => {
		state.playerNot = false;
		state.offerVisible = true;
	}

	//自动匹配
	const automaticSure = (data) => {
			state.offerVisible = false;
			sheep.$router.go('/pages/game/online/automatic',data)
	}
	const postCreate = async (data) =>{
		const returnData = await gameInvitation.Api.postCreate(data);
		return returnData;
	}
	const update = async (data)=>{
		await gameInvitation.Api.update(data);
	}
	
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
	
	const sure = (data) => {
		state.player = data.player
		//开始邀请
const isMixedMode = data.selectiveGame.type === 8;
		let postData = {
			beInvitedPlayerId : data.player.id,
			gameName : data.selectiveGame.chineseModeName,
			gameType : data.selectiveGame.type,
			// 仅混合模式才需要传 legType/legGame，避免普通模式出现 0LEG
			...(isMixedMode ? { legType: data.mixGame.length, legGame: data.mixGame } : {}),
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
			partition:data.modalContent.partition,//获分区设置
			startingScore:data.selectiveGame.startingScore
		}

		const returnData =  gameInvitation.Api.postCreate(postData)
		.then(response => {
			state.invitationId = response;
			state.offerVisible = false;
			state.waitingVisible = true;
			let userId = data.player.playerOnly
			let msg = {
				msgType:"yaoqing",
				invitationId:state.invitationId
			}
			var messageTextObj = { type: 1, message:  JSON.stringify(msg), extendedData: {msgType:"yaoqing"} };
			$stores('zegoStore').sendMessage(userId,messageTextObj);
			//一分钟后取消关闭
			setTimeout(() => {
				state.waitingVisible = false;
				update({id:state.invitationId,state:3})

				// 超时时也发送取消邀请消息
				if (state.invitationId && data && data.player) {
					let msg = {
						msgType: "cancel",
						invitationId: state.invitationId
					}
					var messageTextObj = { type: 1, message: JSON.stringify(msg), extendedData: {msgType: "cancel"} };
					$stores('zegoStore').sendMessage(data.player.playerOnly, messageTextObj);
					console.warn("⏰ [Online] 邀请超时，发送取消消息", {
						invitationId: state.invitationId,
						targetPlayer: data.player.playerOnly,
						timestamp: new Date().toISOString()
					});
				}
			}, 60000);
		}).catch(err => {
			error.value = err;
		});;
		
	}
	const cancel = (data) => {
		state.waitingVisible = false;
		update({id:state.invitationId,state:3})

		// 发送取消邀请消息给被邀请的玩家
		if (state.invitationId && data && data.player) {
			let msg = {
				msgType: "cancel",
				invitationId: state.invitationId
			}
			var messageTextObj = { type: 1, message: JSON.stringify(msg), extendedData: {msgType: "cancel"} };
			$stores('zegoStore').sendMessage(data.player.playerOnly, messageTextObj);
			console.warn("🚫 [Online] 发送取消邀请消息", {
				invitationId: state.invitationId,
				targetPlayer: data.player.playerOnly,
				timestamp: new Date().toISOString()
			});
		}
	}

	
	//寻找段位图片
	const findGradeImage = (number,type)=>{
		//numder代表传递的分数   type判断是01还是cr 1.01 2.cr
	   for(let i in state.grade){
		   if(number>=state.grade[i].upperInterval && number<=state.grade[i].lowerRange && type==state.grade[i].gameType){
			  return state.grade[i].gradeImage;
		   }
	   }
		return locale.value === 'en' ? "No matching grade" : "没有匹配到相应的段位";
	}
	
	const getList = async () => {
		state.listData = await player.Api.queryOnLinePlayerList();
		state.grade=await grade.Api.getAllGrade();
		for(let i in state.listData){
			state.listData[i].online01=findGradeImage(state.listData[i].onlinePpd,1);//线上01
			state.listData[i].onlineCr=findGradeImage(state.listData[i].onlinePpr,2);//线上cr
		}
	}
const close = () =>{
		state.playerNot = true;
		state.offerVisible = false;
}
getList();

// ===== 自动弹出对战邀请弹窗（大厅内） =====
const invitePopRef = ref(null);

watch(zimStores.message.yaoqing, async (New, Old) => {
	if (New && New.length > 0) {
		const newValue = New[New.length - 1];
		// 先拉取邀请详情，再展示弹窗，避免空数据渲染
		state.invitationId = newValue.invitationId;
		state.waitingVisible = false;
		state.offerVisible = false;
		if (invitePopRef?.value?.getInviteInfo) {
			try {
				await invitePopRef.value.getInviteInfo(state.invitationId);
			} catch (e) {
				console.warn('[online] 预拉取邀请详情失败，将直接打开弹窗后再更新', e);
			}
		}
		state.invitePopModalVisible = true;
	}
}, { deep: true });

// 收到对方取消邀请时，如果当前弹窗展示的是这条邀请，则关闭弹窗
watch(zimStores.message.cancel, (New, Old) => {
	if (New && New.length > 0) {
		const newValue = New[New.length - 1];
		if (state.invitePopModalVisible && state.invitationId === newValue.invitationId) {
			state.invitePopModalVisible = false;
			showToast({ message: locale.value === 'en' ? 'The other party has canceled.' : '对方已取消邀请', icon: 'none' });
		}
	}
}, { deep: true });
	
	// 获取邀请的详情信息
	const getInviteInfo = async () => {
		const returnData =  gameInvitation.Api.get(state.invitationId)
		.then(newVar => {
			// state.player = newVar.player
			state.mixedGame = newVar.legList
			state.gameInfo = newVar
			startGame()
		}).catch(err => {
			error.value = err;
		});;
		
	}
	
	// 开始游戏
	const startGame = () => {
		const selectedPlayers = [];
		// 发起端：自己（userInfo）在左边（索引0），对手在右边（索引1）
		selectedPlayers[0] = {
			averageColor:"#8338EC",
			headImgUrl:userInfo.headImgUrl,
			id:userInfo.id,
			playerId:userInfo.id,
			playerName:userInfo.playerName,
			startingScore:state.gameInfo.startingScore,
			playerOnly:userInfo.playerOnly,
			onlinePpd: userInfo.onlinePpd,
			onlinePpr: userInfo.onlinePpr
		}
		selectedPlayers[1] = {
			averageColor:"#4ECDC4",
			headImgUrl:state.player.headImgUrl,
			id:state.player.id,
			playerId:state.player.playerId,
			playerName:state.player.playerName,
			startingScore:state.gameInfo.startingScore,
			playerOnly:state.player.playerOnly,
			onlinePpd: state.player.onlinePpd,
			onlinePpr: state.player.onlinePpr
		}
		
		//是否开启了自动计分
		if(state.gameInfo.handicap === "auto"){
			if(userInfo.onlinePpd !== 0 && state.player.onlinePpd !== 0){
				if(userInfo.onlinePpd > state.player.onlinePpd){
					selectedPlayers[1].startingScore =  state.gameInfo.startingScore *  state.player.onlinePpd / userInfo.onlinePpd + 0.5
				}
				if(userInfo.onlinePpd < state.player.onlinePpd){
					selectedPlayers[0].startingScore =  state.gameInfo.startingScore * userInfo.onlinePpd / state.player.onlinePpd   + 0.5
				}
			}
			
		}
		
		// 不再按ID排序，保持发起者在前的顺序
		// selectedPlayers.sort(function(a, b){
		//         return a.id - b.id
		// })
		 selectedPlayers.forEach((item,index) =>{
			 item.team = index + 1
		 })
		
		
	
		// 如果selectedPlayers长度不大于0的话
		if (!state.selectedPlayers.length || state.selectedPlayers.length === 0) {
			state.selectedPlayers = groupByTeam(selectedPlayers)
		}
	const modeEntity ={
			type:state.gameInfo.gameType,
			chineseModeName:state.gameInfo.gameName,
			startingScore:state.gameInfo.startingScore,
			englishModeName:state.gameInfo.gameName === '米老鼠' ? 'CRICKET' : state.gameInfo.gameName,
			duelMode:1
		}
		
		const modesValue = state.gameInfo.gameType === 8 ? (state.mixedGame || state.gameInfo.legList || state.gameInfo.legGame || []) : undefined;
		
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
			// 发起邀请者先手：在大厅发起的一方就是当前用户
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
				partition:state.gameInfo.partition,
				type:11
			},
			// modes: state.gameInfo.gameType === 8 ? state.gameInfo.gameType : undefined,
			modes: modesValue,
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
					console.log('📝 [content] 从zeGoToken复制到zeGoTokenThird:', zeGoTokenThird);
				} else {
					console.warn('📝 [content] ⚠️ 未找到任何Zego Token，需要重新登录获取');
				}
			}

			console.log('📝 [content] 准备设置远程视频数据:', {
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
				console.log('📝 [content] 兜底设置远程视频数据:', { roomId, remoteUserId, hasToken: !!zeGoTokenThird });
			}
		}

		// 跳转到游戏页面
		sheep.$router.go(url, gameData, 'reLaunch');
	};

	
</script>

<template>
	<view class="container">

		<view class="player-list-container">
			<scroll-view class="player-scroll-view" scroll-x="true">
				<player-box :isOnline="1" :inOnlineHall="true" :playerNot="state.playerNot" @sure="sure" v-for="(item, index) in state.listData" :key="index" :player="item"></player-box>
			</scroll-view>
		</view>

		<view class="auto">
			<view v-clickSound class="autoText">
				<view @click="sheep.$router.go('/pages/player/friend/index')" class="friendListText">
					{{$t('friendList')}}</view>
			</view>
			<view v-clickSound class="autoPk" @click="automatic">{{$t('autoPK')}}</view>
			<view class="blank"></view>
		</view>

	</view>
<waiting @cancel="cancel"  :modalVisible="state.waitingVisible"></waiting>
<Offer @close="close" :playerNot="state.playerNot" @automaticSure="automaticSure"  @sure="sure" :modalVisible="state.offerVisible" />
<invitePop ref="invitePopRef" @close="() => state.invitePopModalVisible = false" :modalVisible="state.invitePopModalVisible" />
</template> 

<style scoped lang="scss">
	.container {
		width: 100%;
		height: 80%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
	}

	.player-list-container {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.player-scroll-view {
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
				line-height: 27rpx;
				text-align: center;
				font-style: normal;
				text-transform: none;
				font-weight: 300;
				color: #ffffff;
				// -webkit-text-stroke: 0.00938rem #8856FF;
				text-shadow: 0 0 3px #8856FF, 0 0 6px #8856FF, 0 0 10px #8856FF, 0 0 20px #8856FF;
			}
		}

		.autoPk {
			font-weight: 300;
			font-size: 20rpx;
			color: #FFFFFF;
			line-height: 28rpx;
			text-align: center;
			font-style: normal;
			text-transform: none;
			color: #ffffff;
			// -webkit-text-stroke: 0.00938rem #8856FF;
			text-shadow: 0 0 3px #8856FF, 0 0 6px #8856FF, 0 0 10px #8856FF, 0 0 20px #8856FF;
		}

		.blank {
			flex: 1;
		}
	}
</style>