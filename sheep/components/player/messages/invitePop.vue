<script setup>
	import {
		ref,
		reactive,
		computed
	} from 'vue';
	import PlayerBox from "@/sheep/components/game/online/PlayerBox.vue";
	import player from "@/sheep/api/dart/player";
	import {showToast} from "@/sheep/util/toast";
	import PopUpLayer from "@/sheep/components/util/popUp/popUpLayer.vue";
	import games from "@/sheep/api/dart/games";
	import cacheUtil from "@/sheep/request/util";
	import {useI18n} from "vue-i18n";
	
	import gameInvitation from "@/sheep/api/dart/gameInvitation";
	import gameConfig from '@/sheep/config/gameConfig.json';
	import $stores from "@/sheep/stores";
	import sheep from "@/sheep";
	import bluetooth from "@/sheep/stores/bluetooth";
	import {onLoad, onReady} from '@dcloudio/uni-app';
	import {getParams} from "@/sheep/router";
  import Toast from "@/sheep/components/util/toast/toast.vue";
    const emit = defineEmits(['close','sure','automaticSure','refreshData']);
	const {
		t,
		locale
	} = useI18n();
	const props = defineProps({
		modalVisible: {
			type: Boolean,
			default: true
		},
    isShowToast: {
      type: Boolean,
      default: false
    },
		player: {
			type: Object,
			default: {}
		},
		playerNot: {
			type: Boolean,
			default: true
		},
		id: {
			type: Number,
			default: 0
		}
	});
	onLoad((options) => {
	  const params = getParams(options);
	  // if(params !== null){
		 //  getInviteInfo(params.id);
	  // }
	});
	const state = reactive({
		id:null,
		selectedPlayers:[],
		player:{},
		mixedGame:{},
		gameInfo:{},
		modalContent: {
			title: "",
			teamSize: 1,
			buttonType: 'left',
			roundNbr: 10,
			handicap: '',
			customRound: '',
			opening: 0,
			finish: 0,
			bullSEyeFraction: 25, //牛眼分数
			numberOfTeams: 2,
			requiredLines: 1,
			bidSequence: 1, //输赢攻击顺序
			partition:1,//获分区设置
		},
	})
	
	
	// 获取邀请的详情信息
	const getInviteInfo = async (id) => {
		state.id = id
		const newVar = await cacheUtil.fetchWithCache('mixed_game_project', gameInvitation.Api.get,id , 1800, false);
		
		
		// 尝试不同的字段名组合
		const possibleModes = newVar.legList || newVar.legGame || newVar.mixGame || newVar.modes;
		
		state.player = newVar.player
		// state.mixedGame = newVar.legList
		state.mixedGame = possibleModes
		state.gameInfo = newVar
		
		// 如果是混合模式，确保modes字段正确设置
		if (newVar.gameType === 8) {
			state.gameInfo.legList = possibleModes;
			state.gameInfo.legGame = possibleModes;
		}
		
		
    if (props.isShowToast) {
      showToast({
        message: state.player.playerName+"邀请你对战",
        icon: "none",
        duration: 5000
      })
    }
	}
	
	// 请求数据
	const fetchData = async () => {
	
		// console.log(newVar)
	}
	fetchData()
	const close =  () =>{
	    emit('close')
	}
	
	const update = async (data)=>{
		await gameInvitation.Api.update(data);
	}

	//邀请过期
	const timeout =  () =>{
		update({id:state.id,state:2}).then(() => {
			// 🔧 拒绝后通知父组件刷新数据和红点状态
			emit('refreshData');
			emit('close');
		}).catch(err => {
			console.error('更新邀请状态失败:', err);
		});
	}
	
	//拒绝
	const refuse =  () =>{
		//发送拒绝消息
		let msg = {
			msgType:"refuse",
			invitationId:state.id
		}
		var messageTextObj = { type: 1, message:  JSON.stringify(msg), extendedData: {msgType:"refuse"} };
		$stores('zegoStore').sendMessage(state.player.playerOnly,messageTextObj);
		update({id:state.id,state:2}).then(() => {
			// 🔧 拒绝后通知父组件刷新数据和红点状态
			emit('refreshData');
			emit('close');
		}).catch(err => {
			console.error('更新邀请状态失败:', err);
			emit('close');
		});
	}
	
	//接受，开始进入游戏
	const startInviteGame = async () =>{
		// 检查蓝牙连接状态
		if(!bluetooth().isConnected){
			// 如果未连接蓝牙设备，自动拒绝邀请
			state.id = id;
			// 更新邀请状态为拒绝
			await update({id:id,state:2});
			// 通知父组件刷新数据
			emit('refreshData');
			emit('close');
			// 提示用户
			showToast({
				message: locale.value === 'en' ? 'Please connect Bluetooth device first' : '请先连接蓝牙设备',
				icon: "none"
			});
			return;
		}
		
		
		const returnData =  gameInvitation.Api.get(state.id)
		.then(newVar => { 
			if(newVar.state === 3){
				showToast({
					message: locale.value === 'en' ? "The other party has canceled" : '对方已取消',
					icon: "none"
				});
				close()
				return;
			}
				
			if(newVar.state === 2){
				showToast({
					message: locale.value === 'en' ? "Has been rejected" : '已拒绝',
					icon: "none"
				});
				close()
				return;
			}
			if(newVar.state === 1){
				showToast({
					message: locale.value === 'en' ? "Invitation has expired" : '邀请已过期',
					icon: "none"
				});
				close()
				return;
			}

			// 🔧 检查邀请是否已完成
			if(newVar.state === 4){
				showToast({
					message: locale.value === 'en' ? "Game has been completed" : '游戏已完成',
					icon: "none"
				});
				close()
				return;
			}
			
			// 尝试不同的字段名组合
			const possibleModes = newVar.legList || newVar.legGame || newVar.mixGame || newVar.modes;
			
			// 更新gameInfo确保包含混合模式数据
			state.gameInfo = newVar;
			if (newVar.gameType === 8) {
				state.gameInfo.legList = possibleModes;
				state.gameInfo.legGame = possibleModes;
			}
				
			//发送接受消息
			let msg = {
				msgType:"accept",
				invitationId:state.id
			}
			var messageTextObj = { type: 1, message:  JSON.stringify(msg), extendedData: {msgType:"accept"} };
			$stores('zegoStore').sendMessage(state.player.playerOnly,messageTextObj);

      startGame()
			
			
		}).catch(err => {
			console.error('获取邀请信息失败:', err);
			showToast({
				message: locale.value === 'en' ? "Failed to get invitation info" : '获取邀请信息失败',
				icon: "none"
			});
			close();
		});
		
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
	
	const userInfo = $stores('user').getUserInfo();
	
	// 开始游戏
	const startGame = () => {
		const selectedPlayers = [];
		// 被邀请端：发起者（state.player）在左边（索引0），自己在右边（索引1）
		selectedPlayers[0] = {
			averageColor:"#8338EC",
			headImgUrl:state.player.headImgUrl,
			id:state.player.id,
			playerId:state.player.playerId,
			playerName:state.player.playerName,
			startingScore:state.gameInfo.startingScore,
			playerOnly:state.player.playerOnly,
			onlinePpd: state.player.onlinePpd,
			onlinePpr: state.player.onlinePpr
		}
		selectedPlayers[1] = {
			averageColor:"#4ECDC4",
			headImgUrl:userInfo.headImgUrl,
			id:userInfo.id,
			playerId:userInfo.id,
			playerName:userInfo.playerName,
			startingScore:state.gameInfo.startingScore,
			playerOnly:userInfo.playerOnly,
			onlinePpd: userInfo.onlinePpd,
			onlinePpr: userInfo.onlinePpr
		}
		
		//是否开启了自动计分
		if(state.gameInfo.handicap === "auto"){
			if(userInfo.onlinePpd !== 0 && state.player.onlinePpd !== 0){
				// 现在索引0是发起者(state.player)，索引1是自己(userInfo)
				if(state.player.onlinePpd > userInfo.onlinePpd){
					selectedPlayers[1].startingScore =  state.gameInfo.startingScore * userInfo.onlinePpd / state.player.onlinePpd + 0.5
				}
				if(userInfo.onlinePpd > state.player.onlinePpd){
					selectedPlayers[0].startingScore =  state.gameInfo.startingScore * state.player.onlinePpd / userInfo.onlinePpd + 0.5
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
			// 发起邀请者先手：在被邀请端，先手方是对手（state.player）
			firstTurnPlayerOnly: state.player.playerOnly,
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
			modes: state.gameInfo.gameType === 8 ? (state.gameInfo.legList || state.gameInfo.legGame || []) : undefined,
			modeEntity: modeEntity,
		};
	

		const gameConfigElement = gameConfig[state.gameInfo.gameType];
		let url = gameConfigElement.url;
		if (state.gameInfo.gameType === 1 && gameData.gameSettings.duelMode === 2) {
			url = gameConfigElement.freezeUrl;
		}
		// if (props.type === 8) {

		// }

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
					console.log('📝 [invitePop] 从zeGoToken复制到zeGoTokenThird:', zeGoTokenThird);
				} else {
					console.warn('📝 [invitePop] ⚠️ 未找到任何Zego Token，需要重新登录获取');
				}
			}

			console.log('📝 [invitePop] 准备设置远程视频数据:', {
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
				console.log('📝 [invitePop] 兜底设置远程视频数据:', { roomId, remoteUserId, hasToken: !!zeGoTokenThird });
			}

			// 确保数据在跳转前已经设置完成
			console.log('📝 [invitePop] 跳转前最终数据检查:', {
				roomID: uni.getStorageSync('roomID'),
				remoteUserId: uni.getStorageSync('remoteUserId'),
				zeGoTokenThird: !!uni.getStorageSync('zeGoTokenThird')
			});
		}

		// 🔧 存储邀请ID，用于游戏结束时更新状态
		uni.setStorageSync('currentInvitationId', state.id);

		// 跳转到游戏页面
		sheep.$router.go(url, gameData, 'reLaunch');
	};
	
	
	// 展示用计算字段：模式与局数
	const modeMainLabel = computed(() => {
		const type = state.gameInfo?.gameType;
		const name = state.gameInfo?.gameName;
		if (type === 8) return 'LEG';
		if (type === 1) return '01';
		if (name === '米老鼠') return locale.value === 'zh' ? '米老鼠' : 'CRICKET';
		return name || '';
	});
	const modeDetailLabel = computed(() => {
		const type = state.gameInfo?.gameType;
		if (type === 8) return `${state.gameInfo?.legType || 0} LEG`;
		if (state.gameInfo?.gameName === '米老鼠') return locale.value === 'zh' ? '米老鼠' : 'CRICKET';
		return state.gameInfo?.gameName || '';
	});
	const roundsLabel = computed(() => {
		const r = state.gameInfo?.roundNbr;
		if (r === -1) return t('selectPlayer.offline.options.unlimited');
		if (r === 0 && state.gameInfo?.customRound) return `${state.gameInfo.customRound}${' '+t('round')}`;
		return `${r || 0}${' '+t('round')}`;
	});

	// 获取当前邀请ID的方法
	const getCurrentInvitationId = () => {
		return state.id;
	}

	// 暴露给父组件的方法
	defineExpose({
		getInviteInfo,
		getCurrentInvitationId
	});

</script>

<template>
	<view v-if="modalVisible&&!isShowToast" class="container">
		<!-- <view  @click="close" v-clickSound   class="icon-size-30 overflow-hidden" style="padding: 15rpx;position: fixed;left: 0;">
		  <image class="uni-img uni-img-scale2" src="@/static/images/back.png"></image>
		</view> -->
		<view class="offer-title juzho">
			{{$t('receiveInvite')}}
		</view>
		<view class="contiainer-info" @click.stop>
			<view class="contiainer-left">
				<scroll-view class="scroll-view_H scroll-container" scroll-x="true">
				    <player-box v-if="modalVisible" :clickStop="true" :player="state.player"></player-box>
				</scroll-view>
			</view>
			<view class="contiainer-right">
				<view class="contiainer-right-info">
					<view class="button-group">
						<button class="uni-button pattern-button pattern-active-button">
							{{ modeMainLabel }}
						</button>
						<button class="uni-button pattern-button">
							GAME
						</button>
						<button class="uni-button pattern-button pattern-active-button">
							{{ modeDetailLabel }}
						</button>
						<button style="width: 150rpx;" class="uni-button pattern-button pattern-active-button">
							{{ roundsLabel }}
						</button>
						<button  v-if="state.gameInfo.doubleStart === 1" class="uni-button pattern-button pattern-active-button">
							{{ $t('selectPlayer.offline.options.doubleStart') }}
						</button>
						<button  v-if="state.gameInfo.finish === 1" class="uni-button pattern-button pattern-active-button">
							{{ $t('selectPlayer.offline.options.doubleEnd') }}
						</button>
						
						<button    class="uni-button pattern-button pattern-active-button" style="width: 150rpx;">
						{{ $t('selectPlayer.offline.options.bullEyeScore') }}:{{state.gameInfo.bullsEyeFraction}}
						</button>
						
						<button  v-if="state.gameInfo.gameType === 8 && state.gameInfo.bidSequence === 1"   class="uni-button pattern-button pattern-active-button" style="width: 160rpx;">
						{{ $t('selectPlayer.offline.options.exchangeFirstAttack') }}
						</button>
						<button  v-if="state.gameInfo.gameType === 8 && state.gameInfo.bidSequence === 2"   class="uni-button pattern-button pattern-active-button" style="width: 100rpx;">
						{{ $t('selectPlayer.offline.options.loserFirst') }}
						</button>
						
						
					</view>
					
				</view>
			</view>
		</view>

		<view class="container_buttom">
			<view class="juzho" style="width: 50%;">
				<view v-if="state.gameInfo.state === 0" v-clickSound   class="left-titleActive juzho" style="width: 100rpx;height: 30rpx" @click.stop="refuse">
					<span class="left-title-span">{{ $t('selectPlayer.offline.options.refuse') }}</span>
				</view>
			</view>
			<view class="juzho" style="width: 50%;">
				<view v-if="state.gameInfo.state === 0"  v-clickSound   class="left-titleActive juzho" style="width: 100rpx;height: 30rpx" @click.stop="startInviteGame">
					<span class="left-title-span">{{$t('selectPlayer.offline.options.sure')}}</span>
				</view>
			</view>
			<view v-if="state.gameInfo.state !== 0" class="juzho" style="width: 50%;">
				<view v-clickSound   class="left-titleActive juzho" style="width: 100rpx;height: 30rpx" @click.stop="timeout">
					<span class="left-title-span">{{locale === 'en'?'Confirm':'确定'}}</span>
				</view>
			</view>
			
			
		</view>
    </view>
		<toast/>
	
</template>

<style scoped lang="scss">
	.contiainer-right-info{
		height: 100%;
		align-items: center;
		display: flex;
	}
	.button-group {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 10rpx;
		margin: 10rpx 0;
		align-items: center;
	}
	.juzho {
		justify-content: center;
		align-items: center;
		display: flex;
	}
	.left-title-span {
		font-size: 14rpx;
		padding: 10rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		/* 关键属性：显示省略号 */
	}
	.left-titleActive {
		width: 80%;
		border-radius: 10rpx;
		background: rgba(142, 77, 190, 0.2);
		border: 2rpx solid #8857FF;
		box-shadow: 0 0 1rpx rgba(136, 87, 255, 0.3), 0 0 1rpx rgba(136, 87, 255, 0.2), 0 0 1rpx rgba(136, 87, 255, 0.1);
		font-size: 18rpx;
		font-weight: 300;
		/* 适当减小字体粗细 */
		color: #ffffff;
		// -webkit-text-stroke: 0.3rpx #8856FF;
		/* 更细的描边 */
		text-shadow: 0 0 3rpx #8856FF,
			/* 核心光晕，减小扩散半径 */
			0 0 6rpx #8856FF,
			/* 外层光晕 */
			0 0 10rpx #8856FF,
			/* 更外层散光 */
			0 0 20rpx #8856FF;
	}
	.container_buttom {
		height: 15%;
		width: 100%;
		margin-top: 10rpx;
		width: 50%;
		margin: auto;
		display: flex;
	}
	.offer-title{
		width:100%;
		margin-top: 15rpx;
		margin-bottom: 15rpx;
		font-size: 0.5625rem;
		font-weight: 300;
		color: #ffffff;
		// -webkit-text-stroke: 0.00938rem #8856FF;
		//text-shadow: 0 0 3rpx #8856FF, 0 0 6rpx #8856FF, 0 0 10rpx #8856FF, 0 0 20rpx #8856FF;
	}
	.contiainer-left-not{
		width:0%;
		align-items: center;
		height: 100%;
		display: flex;
		float: left;
	}
	.contiainer-right-not{
		width:90%;
		height:100%;
		margin:auto;
	}
	.contiainer-left{
		width:40%;
		align-items: center;
		height: 100%;
		display: flex;
		float: left;
	}
	.contiainer-right{
		width:60%;
		height:100%;
		float: right;
	}
	.contiainer-info{
		width: 80%;
		height: 65%;
		border-radius: 20rpx;
		border:2rpx solid #8856FF;
		margin: auto;
		// -webkit-text-stroke: 0.00938rem #8856FF;
		text-shadow: 0 0 3rpx #8856FF, 0 0 6rpx #8856FF, 0 0 10rpx #8856FF, 0 0 20rpx #8856FF;
	}
	.container {
		background-color: #b0b0b0;
		position: fixed;
		top: 0;
		left: 0;
		z-index: 50;
		opacity: 0.8;
		transition: all 0.3s ease;
		background-color: #000000;
		width: 100%;
		height: 100%;
	}
</style>