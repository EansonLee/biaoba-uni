<script setup>
	import {
		ref,
		reactive,
		computed
	} from 'vue';
	import player from "@/sheep/api/dart/player";
	import {showToast} from "@/sheep/util/toast";
	import games from "@/sheep/api/dart/games";
	import cacheUtil from "@/sheep/request/util";
	import {useI18n} from "vue-i18n";
	
    const emit = defineEmits(['close','sure','cancel']);
	const {
		t,
		locale
	} = useI18n();
	const props = defineProps({
		modalVisible: {
			type: Boolean,
			default: false
		},
		data: {
			type: Object,
			default: {}
		}
	});
	const state = reactive({
	})
	const cancel = ()=>{
		emit('cancel')
	}
	

</script>

<template>
	<view v-if="modalVisible" class="container" @click="close">
		<view class="container-info">
			<image class="container-image" src="/static/gif/jiaozhai.gif"></image>
			<view class="container_buttom">
				<view class="juzho">
					<view  v-clickSound  @click="cancel"   class="left-titleActive juzho" style="width: 100rpx;height: 30rpx">
						<span class="left-title-span">{{ $t('selectPlayer.offline.buttons.cancel') }}</span>
					</view>
				</view>
			</view>
		</view>
    </view>
	
</template>

<style scoped lang="scss">
	.left-title-span {
		font-size: 14rpx;
		padding: 10rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		/* 关键属性：显示省略号 */
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
	}
	.container-image{
		width: 100rpx;
		height: 100rpx;
		margin: auto;
		margin-top: 30vh;
	}
	.container {
		height: 100% !important;
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