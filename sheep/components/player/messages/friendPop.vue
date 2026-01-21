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
	import playerFriends from "@/sheep/api/dart/playerFriends";
	import gameInvitation from "@/sheep/api/dart/gameInvitation";
	import gameConfig from '@/sheep/config/gameConfig.json';
	import $stores from "@/sheep/stores";
	import sheep from "@/sheep";
	import bluetooth from "@/sheep/stores/bluetooth";
	import {onLoad, onReady} from '@dcloudio/uni-app';
	import {getParams} from "@/sheep/router";
    const emit = defineEmits(['close','sure','automaticSure']);
	const {
		t,
		locale
	} = useI18n();
	const props = defineProps({
		modalVisible: {
			type: Boolean,
			default: true
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
	  // if(params != null){
		 //  getInviteInfo(params.id);
	  // }
	});
	const state = reactive({
		selectedPlayers:[],
		player:{},
		mixedGame:{},
		gameInfo:{},

	})
	
	
	const getInviteInfo = async (item) => {
		state.player = item
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
	
	
	const agreeOrRefuse =  (status)=>{
		agreeOrRefusePost(status).then(()=>{
      console.log('拒绝好友申请调用成功');
      emit('close');
    })

	}
	const agreeOrRefusePost = async (status)=>{
		console.log("开始同意好友",state.player)
		let data = {
			friendId :state.player.id,
			status :status
		}
		await playerFriends.Api.agreeOrRefuse(data);
	}
	
	
	//拒绝
	const refuse =  () =>{
		update({id:state.id,state:2})
		emit('close')
	}
	
	//接受，开始进入游戏
	const startInviteGame =  () =>{
		if(state.gameInfo.state === 3){
			showToast({
				message: locale.value === 'en' ? "The other party has canceled" : '对方已取消',
				icon: "none"
			});
			return;
		}
		
		if(state.gameInfo.state === 2){
			showToast({
				message: locale.value === 'en' ? "Has been rejected" : '已拒绝',
				icon: "none"
			});
			return;
		}
		if(state.gameInfo.state === 1){
			showToast({
				message: locale.value === 'en' ? "Invitation has expired" : '邀请已过期',
				icon: "none"
			});
			return;
		}
	   startGame()
	}
	
	
	
	// 暴露给父组件的方法
	defineExpose({
		getInviteInfo
	});

</script>

<template>
	<view v-if="modalVisible" class="container">
		<view  @click="close" v-clickSound   class="icon-size-30 overflow-hidden" style="padding: 15rpx;position: fixed;left: 0;">
		  <image class="uni-img uni-img-scale2" src="@/static/images/back.png"></image>
		</view>
		<view class="offer-title juzho">
      {{$t('friendInvite')}}
		</view>
		<view class="contiainer-info" @click.stop style="padding: 0rpx">
			<scroll-view class="scroll-view_H scroll-container" scroll-x="true">
			    <player-box v-if="modalVisible" :clickStop="true" :player="state.player"></player-box>
			</scroll-view>
		</view>

		<view class="container_buttom" style="margin-top: -120rpx">
			<view class="juzho" style="width: 50%;">
				<view v-clickSound   class="left-titleActive juzho" style="width: 100rpx;height: 30rpx" @click.stop="agreeOrRefuse(2)">
					<span class="left-title-span">{{ $t('selectPlayer.offline.options.refuse') }}</span>
				</view>
			</view>
			<view class="juzho" style="width: 50%;">
				<view  v-clickSound   class="left-titleActive juzho" style="width: 100rpx;height: 30rpx" @click.stop="agreeOrRefuse(1)">
					<span class="left-title-span">{{$t('selectPlayer.offline.options.sure')}}</span>
				</view>
			</view>
			
			
		</view>
    </view>
		
	
</template>

<style scoped lang="scss">
.container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: center;
}

:deep(.uni-scroll-view-content){
  justify-content: center;
  align-items: center;
  display: flex;
}

.contiainer-info {
  width: 90%;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 20rpx;
  padding: 20rpx;
  height: 100%;
}

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
}

.left-titleActive {
  width: 80%;
  border-radius: 10rpx;
  background: rgba(142, 77, 190, 0.2);
  border: 2rpx solid #8857FF;
  box-shadow: 0 0 1rpx rgba(136, 87, 255, 0.3), 0 0 1rpx rgba(136, 87, 255, 0.2), 0 0 1rpx rgba(136, 87, 255, 0.1);
  font-size: 18rpx;
  font-weight: 300;
  color: #ffffff;
//   -webkit-text-stroke: 0.3rpx #8856FF;
  text-shadow: 0 0 3rpx #8856FF,
    0 0 6rpx #8856FF,
    0 0 10rpx #8856FF,
    0 0 20rpx #8856FF;
}

.container_buttom {
  width: 50%;
  margin: 20rpx auto;
  display: flex;
}

.offer-title {
  width: 100%;
  margin-top: 15rpx;
  margin-bottom: 15rpx;
  font-size: 0.5625rem;
  font-weight: 300;
  color: #ffffff;
//   -webkit-text-stroke: 0.00938rem #8856FF;
  //text-shadow: 0 0 3rpx #8856FF, 0 0 6rpx #8856FF, 0 0 10rpx #8856FF, 0 0 20rpx #8856FF;
}
</style>