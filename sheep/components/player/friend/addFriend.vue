<script setup>
	import {
		ref,
		reactive,
		computed
	} from 'vue';
	import PlayerBox from "@/sheep/components/game/online/PlayerBox.vue";
	import player from "@/sheep/api/dart/player";
	import {showToast} from "@/sheep/util/toast";
    const emit = defineEmits(['close']);
	const props = defineProps({
		modalVisible: {
			type: Boolean,
			default: false
		},
	});
	const state = reactive({
		listData : [],
		keyword: null,
		showInputField: true // 控制输入框显示
	})
	
	const getList = async () =>{
	  state.listData =	await player.Api.queryPlayerByNameOrId(state.keyword);
	}
	

	const update =  () =>{
		getList()
	}
	
	const close =  () =>{
		state.keyword = ""
		state.listData = []
		// 重置搜索框显示状态
		state.showInputField = true
	    emit('close')
	}
	

</script>

<template>
	<view v-if="modalVisible" class="container" @click="close">
		<view class="top-input" v-if="state.showInputField">
			<view class="input-info" @click.stop>
				<input class="uni-input" v-model="state.keyword" @keyup="getList" confirm-type="search" :placeholder="$t('Search by ID and Username')">
				</input>
				<view class="iamge-ttt">
					<image style="margin-left: -10%;width:30rpx;height: 30rpx;" src="/static/images/search.png"></image>
				</view>
			</view>
		</view>
		<view class="user-list" >
			<view class="add-friend-list-container">
				<scroll-view class="add-friend-scroll-view" scroll-x="true">
					<view v-for="(item, index) in state.listData" :key="index" class="player-box-wrapper" @click.stop>
						<player-box @update="update" :addVisible="true" :player="item"></player-box>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<style scoped lang="scss">
	.player-box-wrapper {
		display: inline-block;
		cursor: pointer;
	}
	.iamge-ttt {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 50rpx;
		margin-left: -10%;
	}

	.uni-input {
		width: 90%;
		margin: auto;
		// margin-top: 50rpx;
		border: 2px solid #8856FF !important;
		color: #ffffff;
		// -webkit-text-stroke: 0.00938rem #8856FF;
		//text-shadow: 0 0 3px #8856FF, 0 0 6px #8856FF, 0 0 10px #8856FF, 0 0 20px #8856FF;
	}
    :deep(.uni-input-form){
		width:95%
	}
	:deep(.input-placeholder) {
		font-size: 14rpx;
		font-weight: 300;
		color: #ffffff;
		// -webkit-text-stroke: 0.00938rem #8856FF;
		//text-shadow: 0 0 3px #8856FF, 0 0 6px #8856FF, 0 0 10px #8856FF, 0 0 20px #8856FF;
	}

	.input-info {
		height: 50rpx;
		display: flex;
		flex-direction: row;
	}

	.top-input {
		width: 70%;
		height: 20%;
		margin-top: 40rpx;
		// z-index:100
	}

	.user-list {
		width: 100%;
		height: 100%;
	}
	.add-friend-list-container {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.add-friend-scroll-view {
		width: 100%;
		height: auto;
		white-space: nowrap;
	}

	.container {
		position: fixed;
		top: 0;
		left: 0;
		z-index: 50;
		opacity: 0.9;
		transition: all 0.3s ease;
		background-color: #000000;
	}
	.scroll-view_H {
		white-space: nowrap;
		width: 100%;
		height: 220rpx;
		margin-top: -10%;
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