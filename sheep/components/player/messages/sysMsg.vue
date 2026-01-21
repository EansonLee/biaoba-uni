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
		content: {
			type: String,
			default: ""
		}
	});
	onLoad((options) => {
	});
	const state = reactive({
	
	})
	const close =  () =>{
	    emit('close')
	}

	// 暴露给父组件的方法
	defineExpose({
	});

</script>

<template>
<!-- 	<view v-if="modalVisible" class="container">
		<view  @click="close" v-clickSound   class="icon-size-30 overflow-hidden" style="padding: 15px;position: fixed;left: 0;">
		  <image class="uni-img uni-img-scale2" src="@/static/images/back.png"></image>
		</view>
		<view class="offer-title juzho">
			{{$t('systemMessage')}}
		</view>
		<view class="contiainer-info" @click.stop>
			
		</view>
    </view>
	 -->
	<PopUpLayer  :showClose="true" @close="close" :modalVisible="modalVisible" :title="$t('systemMessage')" width="auto" height="auto" :confirm="false"
		:cancel="false" @update:modalVisible="(val) => emit('update:modalVisible', val)">
		<view style="min-width: 300rpx;min-height:200rpx;max-height: 250rpx;overflow: auto;">
			<rich-text :nodes="props.content"></rich-text>
		</view>
	</PopUpLayer>
	
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
		//text-shadow: 0 0 3px #8856FF, 0 0 6px #8856FF, 0 0 10px #8856FF, 0 0 20px #8856FF;
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
		border:2px solid #8856FF;
		margin: auto;
		// -webkit-text-stroke: 0.00938rem #8856FF;
		text-shadow: 0 0 3px #8856FF, 0 0 6px #8856FF, 0 0 10px #8856FF, 0 0 20px #8856FF;
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