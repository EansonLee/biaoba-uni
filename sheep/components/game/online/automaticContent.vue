<script setup>
	import {
		ref,
		reactive,
		computed,
		onUnmounted
	} from 'vue';
	import PlayerBox from "@/sheep/components/game/online/PlayerBox.vue";
	import player from "@/sheep/api/dart/player";
	import sheep from "@/sheep";
	import waiting from "@/sheep/components/game/online/waiting.vue";
	import {showToast} from "@/sheep/util/toast";
	import Offer from "@/sheep/components/game/online/offer.vue";
	import {useI18n} from "vue-i18n";
	import $stores from "@/sheep/stores";
	import match from "@/sheep/api/dart/match";
	import gameConfig from '@/sheep/config/gameConfig.json';
	import bluetooth from "@/sheep/stores/bluetooth";
	const userInfo = $stores('user').getUserInfo();
	
	const {
		t,
		locale
	} = useI18n();
	const props = defineProps({
		modalVisible: {
			type: Boolean,
			default: false
		},
		selectiveGame: { //选择的游戏模式
			type: Object,
			default: {}
		},
		mixGame: { //混合模式选择的游戏种类
			type: Array,
			default: []
		},
		modalContent:{
			type: Object,
			default: {}
		}
	});

	
	const state = reactive({
		selectedPlayers:[],
		title:locale.value === 'zh' ? "搜寻中": 'Searching',
		cancelVisible:true,
		playerNull: false,
		timerQr:null,
		playerMatch: {},
		player:{},
		postData:{
			gameName : props.selectiveGame.selectiveGame,
			gameType : props.selectiveGame.type,
			legType: props.mixGame.length,
			legGame:null,
			modalContent:props.modalContent
		},
		modalContent: props.modalContent,
	})
	
	const delayRequest =  () =>{
		state.timerQr = setInterval(function() {
		   queryMatch()
		}, 1000);
	}
	
	//加入匹配
	const joinMatch = async () =>{
		return await match.Api.joinMatch(state.postData);
	}
	
	//轮询获取是否匹配到人
	const queryMatch =  () =>{
		// state.postData.legGame = []
	   match.Api.queryMatch(state.postData)
	   .then(response => {
		   
		if(response !== null){
			state.playerMatch = response;
			state.playerNull = true;
			state.cancelVisible = false;
			// clearTimeout(state.timerQr)
			clearInterval(state.timerQr);
			state.title = locale.value === 'zh' ? "匹配成功" : 'Successfully';
			startGame()
			return;
		}else{
			// delayRequest();
		}
	   }).catch(err => {
		  // delayRequest();
	   });;
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
	
	//接收混合模式选择的游戏内容
	const mixGameAccept =  (data) =>{
		state.mixGame = data;
		state.mixedVisible = false
	}
	
	// 开始游戏
	const startGame = () => {
		const selectedPlayers = [];
		selectedPlayers[0] = {
			averageColor:"#8338EC",
			headImgUrl:state.player.headImgUrl,
			id:state.player.id,
			playerId:state.player.id,
			playerName:state.player.playerName,
			startingScore:props.selectiveGame.startingScore,
			playerOnly:userInfo.playerOnly,
			onlinePpd: userInfo.onlinePpd,
			onlinePpr: userInfo.onlinePpr
		}
		selectedPlayers[1] = {
			averageColor:"#4ECDC4",
			headImgUrl:state.playerMatch.headImgUrl,
			id:state.playerMatch.id,
			playerId:state.playerMatch.playerId,
			playerName:state.playerMatch.playerName,
			startingScore:props.selectiveGame.startingScore,
			playerOnly:state.playerMatch.playerOnly,
			onlinePpd: state.playerMatch.onlinePpd,
			onlinePpr: state.playerMatch.onlinePpr
		}

		//是否开启了自动计分
		if(props.modalContent.handicap === "auto"){
			if(userInfo.onlinePpd !== 0 && state.playerMatch.onlinePpd !== 0){
				if(userInfo.onlinePpd > state.playerMatch.onlinePpd){
					selectedPlayers[1].startingScore =  props.selectiveGame.startingScore *  state.playerMatch.onlinePpd / userInfo.onlinePpd + 0.5
				}
				if(userInfo.onlinePpd < state.playerMatch.onlinePpd){
					selectedPlayers[0].startingScore =  props.selectiveGame.startingScore * userInfo.onlinePpd / state.playerMatch.onlinePpd   + 0.5
				}
			}
			
		}
		
		
	selectedPlayers.sort(function(a, b){
	        return a.id - b.id
	 })
	 selectedPlayers.forEach((item,index) =>{
		 item.team = index + 1
	 })
	// 如果selectedPlayers长度不大于0的话
	if (!state.selectedPlayers.length || state.selectedPlayers.length === 0) {
		state.selectedPlayers = groupByTeam(selectedPlayers)
	}
	// 🔧 修复：自动匹配时，ID小的玩家先手（确保双方一致）
	const firstTurnPlayer = selectedPlayers[0]; // ID小的在索引0
	const modeEntity ={
		type:props.selectiveGame.type,
		chineseModeName:props.selectiveGame.chineseModeName,
		startingScore:props.selectiveGame.startingScore,
		englishModeName:props.selectiveGame.chineseModeName === '米老鼠' ? 'CRICKET' : props.selectiveGame.chineseModeName,
		duelMode:1,
		// 添加先手标识，确保双方一致
		firstTurnPlayerOnly: firstTurnPlayer.playerOnly
	}
	// 准备游戏数据
	const gameData = {
		players: state.selectedPlayers,
		// 自动匹配：ID小的玩家先手
		firstTurnPlayerOnly: firstTurnPlayer.playerOnly,
		gameSettings: {
				teamSize: state.modalContent.teamSize,
				roundNbr: state.modalContent.roundNbr,
				handicap: state.modalContent.handicap,
				opening: state.modalContent.opening,
				finish: state.modalContent.finish,
				bullEyeFraction: state.modalContent.bullSEyeFraction,
				customRound: state.modalContent.customRound,
				requiredLines: state.modalContent.requiredLines,
				duelMode: 1,
				bidSequence: state.modalContent.bidSequence,
				partition:state.modalContent.partition,
				type:11
			},
			modes: props.selectiveGame.type === 8 ? props.mixGame  : props.selectiveGame.type,
			modeEntity: modeEntity,
		};
	
	
		const gameConfigElement = gameConfig[props.selectiveGame.type];
		let url = gameConfigElement.url;
		if (props.selectiveGame.type === 1 && gameData.gameSettings.duelMode === 2) {
			url = gameConfigElement.freezeUrl;
		}
		// if (props.type === 8) {
			
		// }

    //设置房间号
    uni.setStorageSync('roomID', state.selectedPlayers[0].players[0].id+""+state.selectedPlayers[1].players[0].id)
    //对手id
    uni.setStorageSync('remoteUserId', state.playerMatch.playerOnly)
    // 跳转到游戏页面
		sheep.$router.go(url, gameData, 'reLaunch');
	};
	
	//取消匹配
	const cancelMatch = async () =>{
		return await match.Api.cancelMatch(state.postData);
	}
	
	const init = () =>{
		console.log(userInfo)
		let player = {
			id: userInfo.id,
			playerName: userInfo.playerName,
			headImgUrl: userInfo.headImgUrl,
			country: userInfo.country,
			onlinePpd: userInfo.onlinePpd,
			onlinePpr: userInfo.onlinePpr
		}
		state.player = player;
		state.postData = {
			gameName : props.selectiveGame.chineseModeName,
			gameType : props.selectiveGame.type,
			legType: props.mixGame.length,
			legGame:null,
			modalContent:props.modalContent
		}
		if(props.mixGame === "[]" ||props.mixGame === null || state.postData.gameType !== 8 ){
			state.postData.legGame = null;
			state.postData.legType = 0
			
		}else{
			state.postData.legGame = props.mixGame
		}
		
		joinMatch()
		
		delayRequest()
	}
	const cancel = () =>{
		cancelMatch()
		clearInterval(state.timerQr);
		sheep.$router.go('/pages/game/online/index')
	}

	onUnmounted(() => {
		cancelMatch()
		clearInterval(state.timerQr);// 清除
	})

	init()
</script>

<template>
	<view class="container">
		
		<view class="content">
			<view class="content-top">
				<view class="content-left" >
					<scroll-view class="scroll-view_H scroll-container" scroll-x="true">
					    <player-box  :clickStop="true"  :player="state.player"></player-box>
					</scroll-view>
				</view>
				<view class="content-auto">
					<view class="auto-text">
						<span>{{state.title}}</span>
					</view>
				</view>
				<view class="content-right" >
					<player-box  :clickStop="true" :playerNull="state.playerNull" :player="state.playerMatch"></player-box>
				</view>
			</view>
		
			<view class="content-bootm">
				<view class="juzho">
					<view  v-clickSound  v-if="state.cancelVisible"  class="title left-titleActive juzho" style="width: 150rpx;height: 50px" @click="cancel">
						<span class="left-title-span"> {{ $t('selectPlayer.offline.buttons.cancel') }}</span>
					</view>
				</view>
			</view>
		</view>

	</view>
</template>

<style scoped lang="scss">
	.title {
		font-size: 18rpx;
		font-weight: 300;
		/* 适当减小字体粗细 */
		color: #ffffff;
		// -webkit-text-stroke: 0.3rpx #8856FF;
		/* 更细的描边 */
		text-shadow: 0 0 3px #8856FF,
			/* 核心光晕，减小扩散半径 */
			0 0 6px #8856FF,
			/* 外层光晕 */
			0 0 10px #8856FF,
			/* 更外层散光 */
			0 0 20px #8856FF;
		/* 扩展散光层，弱化散光 */
	}
	.left-title-span {
		font-size: 14rpx;
		padding: 10rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		/* 关键属性：显示省略号 */
	}
	.content-bootm {
		width: 100%;
		height: 15%;
	}
	.juzho {
		justify-content: center;
		align-items: center;
		display: flex;
	}
	.left-titleActive {
		width: 80%;
		border-radius: 10rpx;
		background: rgba(142, 77, 190, 0.2);
		border: 1rpx solid #8857FF;
		box-shadow: 0 0 1rpx rgba(136, 87, 255, 0.3), 0 0 1rpx rgba(136, 87, 255, 0.2), 0 0 1rpx rgba(136, 87, 255, 0.1);
	}
	.auto-text{
	    height: 100%;
	    line-height: 100%;
	    font-size: 28rpx;
	    font-weight: 600;
	    color: #62E4FF;
	    white-space: nowrap;
		justify-content: center;
		align-items: center;
		display: flex;
	}

	.content-top{
		display: flex;
		flex-direction: row;
	}
	
	:deep(.player-box){
		width: 300rpx;
	}
	:deep(.player-box-content){
		margin-top:10% !important;
	}
	.content-left{
		width: 43%;
		height: 100%;
		margin: auto;
		text-align: center;
	}
	.content-auto{
		width: 24%;
		height: 100%;
	}
	.content-right{
		width: 43%;
		height: 100%;
		margin: auto;
		text-align: center;
	}
	.content{
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}
	.container {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
	}
</style>