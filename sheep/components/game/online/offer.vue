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
	import MixedContent from "@/sheep/components/game/mixed/mixedContent.vue";
	import BattleOptionsPopup from '@/sheep/components/game/selectPlayer/offline/battleOptionsPopup.vue';
	import bluetooth from "@/sheep/stores/bluetooth";
	
    const emit = defineEmits(['close','sure','automaticSure']);
	const {
		t,
		locale
	} = useI18n();
	const props = defineProps({
		modalVisible: {
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
    isOnline: {
      type: Number,
      default: 0
    },
	});
	
	const mixedContentRef = ref(null)
	const state = reactive({
		modalBattleVisible:false,
		handicapModalVisible:false,
		mixGame:[],
		mixedVisible:false,
		gameOptions : [],
		selectiveGame:{},
		round:3,
		mixGameList:[
			{
			 text:"3LEG",	
			 selected:false,
			 type:8,
			 round:3
			},
			{
			 text:"5LEG",	
			 selected:false,
			 type:8,
			 round:5
			},
			{
			 text:"7LEG",	
			 selected:false,
			 type:8,
			 round:7
			}
		],
		modalContent: {
			title: "",
			teamSize: 1,
			buttonType: 'right',
			roundNbr: 10,
			handicap: '',
			customRound: '',
			opening: 0,
			finish: 0,
			bullSEyeFraction: 25, //牛眼分数
      outsideBullEyeScore: 25, //外牛眼分数
			numberOfTeams: 2,
			requiredLines: 1,
			bidSequence: 1, //输赢攻击顺序
			partition:1,//获分区设置
		},
	})
	
	// 请求数据
	const fetchData = async () => {
		const newVar = await cacheUtil.fetchWithCache('mixed_game_project', games.Api.getGames, {
			types: [1, 2],
			duelMode: 1,
			status: 1,
		}, 1800, false);
		newVar.forEach((item, i) => {
			state.gameOptions[i] = {
				...item,
				text: locale.value === 'zh' ? item.chineseModeName : item.englishModeName,
				selected: i === 0 ? true : false
			};
			if(i === 0){
				state.selectiveGame = item;
			}
			
			return newVar;
		})
		if(state.mixGameList){
			state.mixGameList.forEach((item, i) => {
				state.gameOptions.push(item);
			})
		}
	}
	fetchData()
	const close =  () =>{
	    emit('close')
	}
	
	
	const update =  () =>{
	}
	
	const handleOptionSelect =  (info) =>{
		state.selectiveGame = info;
		state.gameOptions.forEach((item, i) => {
			
			if(item === info){
				item.selected =true;
			}else{
				item.selected = false;
			}
		})
		
		if(info.type === 8){
			state.round = info.round
			state.mixedVisible = true
			console.log(mixedContentRef)
			mixedContentRef.value.init(info.round);
		}else{
			state.mixedVisible = false
		}
	
	}
	
	const internetOptions =  () =>{
		state.modalBattleVisible = true;
	}
	
	//确定，开始邀请
	const startInviteGame =  () =>{
		// 检查蓝牙连接状态
		if(!bluetooth().isConnected){
			showToast({
				message: locale.value === 'en' ? 'Please connect Bluetooth device first' : '请先连接蓝牙设备',
				icon: "none"
			});
			return;
		}
		
		state.modalBattleVisible = false;
		let data = {
			selectiveGame : state.selectiveGame,
			mixGame: state.mixGame,
			player: props.player,
			modalContent: state.modalContent
		}
    console.log('playerNot:'+props.playerNot)
		if(props.playerNot){
			emit('sure',data);
		}else{
			emit('automaticSure',data);
		}
	}
	//接收混合模式选择的游戏内容
	const mixGameAccept =  (data) =>{
		state.mixGame = data;
		state.mixedVisible = false;
	}
	
	// 选择选项
	const selectModalOption = (option) => {
		const {
			field,
			value
		} = option;
	
		// 处理牛眼分数的切换
		if (field === 'bullSEyeFraction') {
			state.modalContent[field] = state.modalContent[field] === 25 ? 50 : 25;
			return;
		}

    if (field === 'outsideBullEyeScore') {
      state.modalContent[field] = state.modalContent[field] === 25 ? 50 : 25;
      return;
    }
	
		// 处理开局和结束的选项
		if (field === 'opening' || field === 'finish') {
			if (state.modalContent[field] === value) {
				state.modalContent[field] = 0;
			} else {
				state.modalContent[field] = value;
			}
			return;
		}
	
		// 处理让分机制选项
		if (field === 'handicap') {
			if (state.modalContent[field] === value) {
				state.modalContent[field] = '';
				state.handicapModalVisible = false;
			} else {
				state.modalContent[field] = value;
				if (value !== 'manual') {
					// 将所有团队起始分数修改
					state.smallCircles.forEach(player => {
						if (player) {
							player.startingScore = props.params.startingScore;
						}
					});
				}
			}
			return;
		}
	
		// 处理其他选项
		state.modalContent[field] = value;
	};

  const cancel=()=>{
    console.log('取消');
    state.mixedVisible=false;
  }
</script>

<template>
	<view v-if="modalVisible" class="container" @click="close">
		<view class="ios-safe-wrapper">
			<view class="offer-title juzho">
				{{$t('invite')}}
			</view>
			<view class="contiainer-info" @click.stop>
				<view :class="playerNot?'contiainer-left':'contiainer-left-not'">
					<!-- <scroll-view class="scroll-view_H scroll-container" scroll-x="true"> -->
						<player-box v-if="modalVisible" :clickStop="true" :player="props.player"></player-box>
					<!-- </scroll-view> -->
				</view>
				<view :class="playerNot?'contiainer-right':'contiainer-right-not'">
					<view class="contiainer-right-info">
						<view class="button-group">
							<button v-for="(item,index) in state.gameOptions"  v-clickSound   class="uni-button pattern-button"
								@click="handleOptionSelect(item)"
								:class="{ 'pattern-active-button': item.selected }"> 
								{{item.text}}
							</button>
						</view>
						
					</view>
				</view>
			</view>

			<view class="container_buttom">
				<view class="juzho">
					<view  v-clickSound   class="left-titleActive juzho" style="width: 100rpx;height: 30rpx" @click.stop="internetOptions">
						<span class="left-title-span">{{$t('selectPlayer.offline.options.sure')}}</span>
					</view>
				</view>
			</view>
		</view>
    </view>
	 <view v-if="state.mixedVisible">
		 <mixed-content
		    ref="mixedContentRef"
		    :buttomText="$t('selectPlayer.offline.buttons.sure')"
		    :mixedVisible="state.mixedVisible"
        @cancel="cancel"
		 	@mixGameAccept="mixGameAccept"
		 	:sureOrStart="true"
		 	:round="state.round"/>
	</view>
	<view v-if="state.modalBattleVisible">
		<BattleOptionsPopup :is-online="props.isOnline" :manualHandicapButton="1" :type="state.selectiveGame.type" :duelMode="1" :modalVisible="state.modalBattleVisible"
			:modalContent="state.modalContent" @update:modalVisible="(val) => state.modalBattleVisible = val"
			@selectOption="selectModalOption" v-model:handicapModalVisible="state.handicapModalVisible"
			:modalButtomVisibleSure="state.modalBattleVisible"
			@startInviteGame="startInviteGame"

			 />
	</view>
	<!-- 对战选项弹出层 -->
	
	
	<!-- 让分设置弹出层 -->
	<!-- <HandicapPopup :type="type" v-if="state.modalContent.handicap === 'manual'"
		:modalVisible="state.handicapModalVisible" :handicap="state.handicap" :maxTeams="maxTeams"
		:players="state.smallCircles" @update:modalVisible="(val) => state.handicapModalVisible = val"
		@scoreChange="handleScoreChange" @selectTeam="selectTeamForHandicap" @confirm="confirmHandicap"
		@cancel="confirmHandicap" /> -->
		
	
</template>

<style  lang="scss" scoped>
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
		text-shadow: 0 0 3px #8856FF,
			/* 核心光晕，减小扩散半径 */
			0 0 6px #8856FF,
			/* 外层光晕 */
			0 0 10px #8856FF,
			/* 更外层散光 */
			0 0 20px #8856FF;
	}
	.container_buttom {
		height: 15%;
		width: 100%;
		margin-top: 10rpx;
		/* iOS特定修复 */
		position: relative;
		z-index: 10;
		min-height: 60rpx;
	}
	.offer-title{
		margin-top: 15rpx;
		margin-bottom: 15rpx;
		font-size: 0.5625rem;
		font-weight: 300;
		color: #ffffff;
		// -webkit-text-stroke: 0.00938rem #8856FF;
		//text-shadow: 0 0 3px #8856FF, 0 0 6px #8856FF, 0 0 10px #8856FF, 0 0 20px #8856FF;
		/* iOS特定修复 */
		position: relative;
		z-index: 10;
	}
	.contiainer-left-not{
		display: none !important;
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
		border:2px solid #8856FF;
		margin: auto;
		// -webkit-text-stroke: 0.00938rem #8856FF;
		text-shadow: 0 0 3px #8856FF, 0 0 6px #8856FF, 0 0 10px #8856FF, 0 0 20px #8856FF;
		/* iOS特定修复 */
		position: relative;
		z-index: 10;
		/* 确保内容在iOS上正确显示 */
		min-height: 200rpx;
	}
	.ios-safe-wrapper {
		/* iOS安全区域包装器 */
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		position: relative;
		z-index: 10;
	}

	.container {
		background-color: #000000;
		position: fixed;
		top: 0;
		left: 0;
		z-index: 49;
		opacity: 0.9;
		transition: all 0.3s ease;
		width: 100%;
		height: 100%;
	}
</style>