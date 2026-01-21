<script setup>
import {
	ref,
	reactive, watch, nextTick,
} from 'vue';
import gameInvitation from "@/sheep/api/dart/gameInvitation";
import playerFriends from "@/sheep/api/dart/playerFriends";
import notice from "@/sheep/api/dart/notice";
import cacheUtil from "@/sheep/request/util";
import { useI18n } from "vue-i18n";
import invitePop from "@/sheep/components/player/messages/invitePop.vue";
import friendPop from "@/sheep/components/player/messages/friendPop.vue";
import sysMsg from "@/sheep/components/player/messages/sysMsg.vue";
import zimStore from '@/sheep/stores/zegoStore';
import {showToast} from "@/sheep/util/toast";
const emit = defineEmits(['close', 'sure', 'automaticSure', 'closeRed']);
const {
	t,
	locale
} = useI18n();
const zimStores = zimStore();

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
	duiZhanRedDots: {
		type: Boolean,
		default: false
	},
	friendRed: {
		type: Boolean,
		default: false
	},
	xiTonRed: {
		type: Boolean,
		default: false
	}
});
const invitePopRef = ref(null);
const friendPopRef = ref(null);


const state = reactive({
	switchState: 1,
	dataList: [],
	invitePopModalVisible: false,
	friendPopModalVisible: false,
	sysMsgModalVisible: false,
	content: ""
})

// 显示弹窗
const showDialog = () => {
	props.modalVisible = true

}

// 获取邀请数据列表
const fetchData = async (forceRefresh = false) => {

	state.dataList = []
	if (state.switchState === 1) {
		// 🔧 支持强制刷新，移除status参数让后端返回所有邀请
		const newVar = await cacheUtil.fetchWithCache('', gameInvitation.Api.getList, {
			types: [1, 2],
			duelMode: 1,
		}, forceRefresh ? 0 : 1800, forceRefresh);

		// 🔧 过滤掉无效的邀请：只显示待接受的邀请 (state: 0)
		const filteredInvitations = newVar.filter(item => item.state === 0);
		filteredInvitations.forEach((item, i) => {
			state.dataList[i] = {
				...item,
				playerName: item.playerName,
				title: "game_invitation_text",
				// title:$t('game_invitation_text'),
				type: 1
			};
			return filteredInvitations;
		})
	}

	if (state.switchState === 2) {
		const newVar = await cacheUtil.fetchWithCache('', playerFriends.Api.getList, { status: 0 }, 1800, false);
		newVar.forEach((item, i) => {
			state.dataList[i] = {
				...item,
				playerName: item.playerName,
				playerHeadImgUrl: item.playerHeadImgUrl,
				title: "friend_request_text",
				// title:$t('friend_request_text'),
				type: 2
			};
			return newVar;
		})
	}


	if (state.switchState === 3) {
		const newVar = await cacheUtil.fetchWithCache('', notice.Api.getNoticeList, {}, 1800, false);
		newVar.forEach((item, i) => {
			state.dataList[i] = {
				...item,
				title: item.title,
				type: 3
			};
			return newVar;
		})
	}



}
fetchData();

// 🔧 监听消息中心打开，确保正确初始化到对战邀请标签
watch(() => props.modalVisible, (newVal) => {
	if (newVal) {
		// 确保默认选中对战邀请标签
		if (state.switchState !== 1) {
			state.switchState = 1;
			switchNumber = 1;
		}
		// 刷新数据
		fetchData(true);
	}
});

// 监听取消邀请消息
watch(zimStores.message.cancel, (New, Old) => {
	if (New && New.length > 0) {
		const newValue = New[New.length - 1];
		console.warn("🚫 [MessageCenter] 收到取消邀请消息", {
			invitationId: newValue.invitationId,
			timestamp: new Date().toISOString()
		});

		// 如果当前正在显示邀请弹窗，且是被取消的邀请，则关闭弹窗
		if (state.invitePopModalVisible && invitePopRef.value) {
			const currentInvitationId = invitePopRef.value.getCurrentInvitationId?.();
			if (currentInvitationId === newValue.invitationId) {
				state.invitePopModalVisible = false;
				showToast({
					message: locale.value === 'zh' ? '对方已取消邀请':'The other party has canceled.',
					icon: 'none'
				});
			}
		}

		// 刷新消息列表数据
		if (state.switchState === 1) {
			fetchData(true); // 🔧 强制刷新，避免缓存问题
		}

		// 清空取消消息数组，避免重复处理
		zimStores.message.cancel = [];
	}
}, {deep: true})

const close = () => {
	state.invitePopModalVisible = false;
	state.friendPopModalVisible = false;
	state.sysMsgModalVisible = false
	emit('close')
}
const closeCurrent = () => {
	console.log('触发：关闭按钮')
	state.invitePopModalVisible = false;
	state.friendPopModalVisible = false;
	state.sysMsgModalVisible = false
	switchTest(switchNumber);
}

// 🔧 处理邀请弹窗的数据刷新请求
const handleInvitePopRefresh = async () => {
	// 🔧 强制切换到对战邀请标签并刷新数据
	// 使用 nextTick 确保 DOM 更新
	await nextTick();
	await switchTest(1);
}



const update = () => {
}

let switchNumber = null;



const switchTest = async (index) => {
	state.switchState = index;
	switchNumber = index;
	await fetchData(true); // 🔧 切换标签时强制刷新，确保数据最新

	if (state.switchState === 1 && state.dataList.length === 0) {
		emit('closeRed', 1)
	}
	if (state.switchState === 2 && state.dataList.length === 0) {
		emit('closeRed', 2)
	}
	if (state.switchState === 3 && state.dataList.length === 0) {
		emit('closeRed', 3)
	}
}

const viewInfo = (item) => {
	if (state.switchState === 1) {
		state.invitePopModalVisible = true;
		invitePopRef.value.getInviteInfo(item.id)
	}
	if (state.switchState === 2) {
		state.friendPopModalVisible = true;
		friendPopRef.value.getInviteInfo(item)
	}

	if (state.switchState === 3) {
		state.sysMsgModalVisible = true
		state.content = item.content
		let flag = notice.Api.view(item.id);
	}


}


// 暴露给父组件的方法
defineExpose({
	showDialog
});

</script>

<template>
	<view v-if="modalVisible" class="container">
		<view @click="close" v-clickSound class="icon-size-30 overflow-hidden returnImage" style="">
			<image class="uni-img uni-img-scale2" src="@/static/images/back.png"></image>
		</view>
		<view class="container_top">
			<view class="offer-title juzho">
				{{ $t('message_center') }}
			</view>
		</view>
		<view class="container_bottom">
			<view class="bottom_left">
				<view v-clickSound :class="[state.switchState === 1 ? 'bottom_buttom' : '', locale === 'en' ? 'bottom_buttom_en' : '']"
					@click="switchTest(1)">
					<view class="bottom_test" style="position: relative">
						<span class="bottom_test_span">{{ $t("game_invitation") }}</span>
						<view class="red-dot" v-if="props.duiZhanRedDots"></view>
					</view>
				</view>
				<view v-clickSound :class="[state.switchState === 2 ? 'bottom_buttom' : '', locale === 'en' ? 'bottom_buttom_en' : '']"
					@click="switchTest(2)">
					<view class="bottom_test" style="position: relative">
						<span class="bottom_test_span">{{ $t('friend_request') }}</span>
						<view class="red-dot" v-if="props.friendRed"></view>
					</view>
				</view>
				<view v-clickSound :class="[state.switchState === 3 ? 'bottom_buttom' : '', locale === 'en' ? 'bottom_buttom_en' : '']"
					@click="switchTest(3)">
					<view class="bottom_test" style="position: relative">
						<span class="bottom_test_span">{{ $t('system_message') }}</span>
						<view class="red-dot" v-if="props.xiTonRed"></view>
					</view>
				</view>

			</view>
			<view class="bottom_right">
				<view class="right_container">
					<view class="right_content">
						<view class="content_info" v-for="(item, index) in state.dataList">
							<view v-if="item.type !== 3" class="content_info_box">
								<view class="info_image">
									<image class="info_image_class"
										:src="item.playerHeadImgUrl ? item.playerHeadImgUrl : '/static/images/user.png'">
									</image>
								</view>
								<view class="info_name">
									<span>{{ item.playerName }}</span>
								</view>
								<view class="info_title">
									<span>{{ $t(item.title) }}</span>
								</view>
								<view v-clickSound class="info_ck" @click="viewInfo(item)">
									<span>{{ $t('View') }}</span>
								</view>
							</view>

							<view v-if="item.type === 3" class="content_info_box">
								<view class="info_title" style="width:90%;margin-left:20rpx">
									<span>{{ $t(item.title) }}</span>
								</view>
								<view v-clickSound class="info_ck" @click="viewInfo(item)">
									<span>{{ $t('View') }}</span>
								</view>
							</view>

						</view>
					</view>

				</view>

			</view>
		</view>


	</view>
	<invitePop ref="invitePopRef" @close="closeCurrent" @refreshData="handleInvitePopRefresh" :modalVisible="state.invitePopModalVisible"></invitePop>

	<friendPop ref="friendPopRef" @close="closeCurrent" :modalVisible="state.friendPopModalVisible"></friendPop>
	<sysMsg ref="sysMsgRef" @close="closeCurrent" :content="state.content" :modalVisible="state.sysMsgModalVisible">
	</sysMsg>
</template>

<style scoped lang="scss">
.info_ck {
	width: 10%;
	color: #FFF;
	display: flex;
	align-items: center;
}

.info_name {
	width: 30%;
	color: #FFF;
	display: flex;
	align-items: center;
	padding: 15rpx;
}

.info_title {
	width: 40%;
	color: #FFF;
	display: flex;
	align-items: center;
}

.info_image_class {
	width: 40rpx;
	height: 40rpx;
	border-radius: 50%;
	border: 1rpx solid #FFF;
}

.info_image {
	height: 100%;
	display: flex;
	align-items: center;
	margin-left: 20rpx;
}

.content_info_box {
	height: 100%;
	display: flex;
	flex-direction: row;
}

.content_info {
	height: 45rpx;
	width: 100%;
	border: 2rpx solid #8856FF;
	margin-top: 15rpx;
	border-radius: 15rpx 15rpx 15rpx 15rpx;
}

.right_content {
	width: 90%;
	margin: auto;
	height: 100%;

}

.back {

	box-shadow: 0 0 1rpx rgba(136, 87, 255, 0.3), 0 0 1rpx rgba(136, 87, 255, 0.2), 0 0 1rpx rgba(136, 87, 255, 0.1);
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

.right_container {
	background-color: rgba(118, 76, 225, 0.2);
	border: 2rpx solid #8856FF;
	height: 100%;
	border-radius: 14rpx 14rpx 14rpx 14rpx;
	overflow: auto;
}

.bottom_test_span {
	color: #FFF;
	justify-content: center;
	align-items: center;
	display: flex;
	line-height: 50rpx;
}


.bottom_buttom {
	background-image: url("/static/images/ditubuttom.png");
	background-size: 100% 80rpx;
	background-position: center;
	background-repeat: no-repeat;
}

.bottom_test {
	width: 80%;
	height: 50rpx;
	margin: auto;
	// padding: 20rpx;
	color: #FFF;

}

.container_bottom {
	width: 100%;
	height: 70%;
	display: flex;
	flex-direction: row;
	font-size: 18rpx
}

.bottom_left {
	width: 20%;
	height: 100%;
}

.bottom_right {
	width: 70%;
	height: 100%;
	border-radius: 14rpx 14rpx 14rpx 14rpx;
}

.contiainer-right-info {
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
	//text-shadow: 0 0 3rpx #8856FF,
	//	/* 核心光晕，减小扩散半径 */
	//	0 0 6rpx #8856FF,
	//	/* 外层光晕 */
	//	0 0 10rpx #8856FF,
	//	/* 更外层散光 */
	//	0 0 20rpx #8856FF;
}

.container_buttom {
	height: 15%;
	width: 100%;
	margin-top: 10rpx;
}

.offer-title {
	margin-top: 15rpx;
	margin-bottom: 15rpx;
	font-size: 0.5625rem;
	font-weight: 300;
	color: #ffffff;
	// -webkit-text-stroke: 0.00938rem #8856FF;
	//text-shadow: 0 0 3rpx #8856FF, 0 0 6rpx #8856FF, 0 0 10rpx #8856FF, 0 0 20rpx #8856FF;
}

.contiainer-left-not {
	width: 0%;
	align-items: center;
	height: 100%;
	display: flex;
	float: left;
}

.contiainer-right-not {
	width: 90%;
	height: 100%;
	margin: auto;
}

.contiainer-left {
	width: 40%;
	align-items: center;
	height: 100%;
	display: flex;
	float: left;
}

.contiainer-right {
	width: 60%;
	height: 100%;
	float: right;
}

.contiainer-info {
	width: 80%;
	height: 65%;
	border-radius: 20rpx;
	border: 2rpx solid #8856FF;
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

.red-dot {
	position: absolute;
	width: 8rpx;
	/* 红点大小 */
	height: 8rpx;
	background-color: #ff4d4f;
	/* 小红点颜色 */
	border-radius: 50%;
	/* 圆形 */
	border: 1rpx solid white;
	/* 白色边框，让红点更突出 */
	z-index: 10;
	/* 确保显示在图标上方 */
	top: 0rpx;
	right: -2rpx;
}

.returnImage {
	padding: 15rpx;
	position: fixed;
	left: 0;
}

.bottom_buttom_en {
	background-size: 100% 100rpx;
	background-position: center;
	background-repeat: no-repeat;
	margin-bottom: 20rpx;

	.bottom_test {
		width: 50%;

		.bottom_test_span {
			line-height: 1.3;
		}

		.red-dot {
			top: -6rpx;
			right: -20rpx;
		}
	}
}

@media (max-width: 425px) {
	.returnImage {
		padding: 6rpx;
		position: fixed;
		left: 0;
	}
}
</style>