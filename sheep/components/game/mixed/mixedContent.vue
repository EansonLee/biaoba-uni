<script>
	// 游戏模式选项
	export const gameOptions = [{
			text: '301',
			mode: '301',
			selected: false
		},
		{
			text: '501',
			mode: '501',
			selected: false
		},
		{
			text: '701',
			mode: '701',
			selected: false
		},
		{
			text: '901',
			mode: '901',
			selected: false
		},
		{
			text: '米老鼠',
			mode: 'mickey',
			selected: false
		}
	];

	// 背景和颜色配置
	export const styleOptions = [{
			backgroundImage: '/static/images/game/mixed/item-bg-1.png',
			color: '#FFD700' // 金色
		},
		{
			backgroundImage: '/static/images/game/mixed/item-bg-2.png',
			color: '#00BFFF' // 蓝色
		},
		{
			backgroundImage: '/static/images/game/mixed/item-bg-3.png',
			color: '#FF4500' // 红色
		},
		{
			backgroundImage: '/static/images/game/mixed/item-bg-4.png',
			color: '#8252ff' // 紫色
		},
		{
			backgroundImage: '/static/images/game/mixed/item-bg-5.png',
			color: '#56ec42', // 绿色
			fontsizeMine: '10rpx',
			fontsize: '14rpx',
		}
	];
</script>
<script setup>
	import {
		ref,
		reactive,
		computed
	} from 'vue';
	import SubButton from "@/sheep/components/common/subButton.vue";
	import {
		showToast
	} from "@/sheep/util/toast";
	import cacheUtil from "@/sheep/request/util";
	import games from "@/sheep/api/dart/games";
	import {
		useI18n
	} from "vue-i18n";
	import sheep from "@/sheep";
	const {
		locale
	} = useI18n();
	
	const emit = defineEmits(['mixGameAccept']);
	// 传参
	const props = defineProps({
		round: {
			type: Number,
			default: 3
		},
		mixedVisible: {
			type: Boolean,
			default: true
		},
		sureOrStart: {
			type: Boolean,
			default: false
		},
		buttomText: {
			type: String,
			default: ""
		}
	});

	const state = reactive({
		// gameOptions: gameOptions.map((option, i) => ({
		//   ...option,
		//   style: styleOptions[i % styleOptions.length]
		// })),
		gameOptions: [],
		selectedGames: Array(props.round).fill(null) //选择的游戏模式
	});
	// 初始化方法
	const init = (round) => {
		state.selectedGames = Array(round).fill(null) //选择的游戏模式
	}


	// 请求数据
	const fetchData = async () => {
		const newVar = await cacheUtil.fetchWithCache('mixed_game_project1', games.Api.getGames, {
			types: [1, 2],
			duelMode: 1,
			status: 1,
		}, 1800);
		newVar.forEach((item, i) => {
			state.gameOptions[i] = {
				...item,
				text: locale.value === 'zh' ? item.chineseModeName : item.englishModeName,
				selected: false,
				style: styleOptions[i % styleOptions.length]
			};
			return newVar;
		})
	}
	fetchData();
	// 动态生成回合选项
	const roundOptions = computed(() => {
		console.log("props.round", state);
		return Array.from({
			length: props.round
		}, (_, i) => ({
			...state.selectedGames[i],
			text: state.selectedGames[i] ? state.selectedGames[i].text : `${i + 1}LEG`,
			style: state.selectedGames[i] ? state.selectedGames[i].style : {
				color: '#FF24FB',
				backgroundImage: '/static/images/game/mixed/item-bg.png'
			}
		}));
	});

	// 选择游戏模式
	const selectGame = (item) => {
		const emptyIndex = state.selectedGames.indexOf(null);
		if (emptyIndex !== -1) {
			// 🔧 修复：创建深拷贝并添加唯一ID，避免多个相同模式共享同一个对象引用
			const gameClone = JSON.parse(JSON.stringify(item));
			// 为每个选择的模式生成唯一ID（原始ID + 时间戳 + 索引）
			gameClone.id = `${item.id}_${Date.now()}_${emptyIndex}`;
			state.selectedGames[emptyIndex] = gameClone; // 选中
		}
	};

	// 取消选中
	const deselectGame = (index) => {
		state.selectedGames[index] = null;
	};

	// 开始游戏Or确定
	const startGame = () => {
		if (state.selectedGames.every(game => game !== null)) {
			if(props.sureOrStart){
				emit('mixGameAccept',state.selectedGames);
			}else{
				const value = roundOptions.value;
				sheep.$router.go('/pages/game/selectPlayer/offline/index', {
					type: 8,
					value: value
				});
			}

		} else {
			showToast( locale.value === 'zh' ? '请为每个回合选择一个游戏模式': 'Please choose a game mode for each leg.');
		}
	};

  //取消
  const cancel = () =>{
    emit('cancel')
  }
	// 暴露给父组件的方法
	defineExpose({
		init
	});
</script>

<template>

	<view class="container" v-if="mixedVisible">
    <image v-if="sureOrStart" class="onlineIndexImage" @click="cancel()" src="@/static/images/back.png"></image>
		<!-- 当前回合显示 -->
		<view class="round-display">
			<view v-clickSound v-for="(item, index) in roundOptions" :key="'round-' + index" class="item min-item"
				@click="deselectGame(index)">
				<view class="item-bg" :style="{ backgroundImage: `url(${item.style.backgroundImage})` }">
					<text class="item-text" :style="{ color: item.style.color, fontSize: item.style?.fontsizeMine }">
						{{ item.text }}
					</text>
				</view>
			</view>
		</view>

		<!-- 游戏模式选择区域 -->
		<view class="view_container">
			<view v-clickSound v-for="(item, index) in state.gameOptions" :key="'game-' + index" class="item"
				@click="selectGame(item)">
				<view class="item-bg" :style="{ backgroundImage: `url(${item.style.backgroundImage})` }">
					<text class="item-text" :style="{ color: item.style.color, fontSize: item.style?.fontsize }">
						{{ item.text }}
					</text>
				</view>
			</view>
		</view>

		<!-- 开始游戏按钮 -->
		<view class="start-button">
			<view style="width: 200rpx">
				<sub-button v-clickSound
					:text="buttomText === ''? $t('selectPlayer.offline.buttons.startThGame') : buttomText"
					@onClick="startGame" />
			</view>
		</view>
	</view>
</template>

<style scoped lang="scss">
	.container {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
	}

	.round-display {
		height: 75rpx;
		display: flex;
		justify-content: center;
		gap: 10rpx;
	}

	.view_container {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 25rpx;
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		box-sizing: border-box;
		text-align: center;
		width: 100rpx;
		height: 100rpx;
		transition: all 0.3s ease;
	}

	.min-item {
		width: 70rpx;
		height: 70rpx;
	}

	.min-item .item-bg {
		border-radius: 50%; /* 使小光圈也变为圆形 */
	}

	.min-item .item-text {
		font-size: 12rpx;
		transition: all 0.3s ease;
	}

	.item-bg {
		border-radius: 50%; /* 使光圈变为圆形 */
		height: 100%;
		width: 100%;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		display: flex;
		align-items: center;
		justify-content: center;
		// 过渡动画
		transition: all 0.3s;
	}

	.item-text {
		font-size: 16rpx;
		font-weight: 600;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
	}

	.start-button {
		height: 75rpx;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 25rpx;
		cursor: pointer;
	}

	.button-text {
		color: white;
		font-size: 20rpx;
		font-weight: bold;
	}

  .onlineIndexImage{
    position: absolute;
    left: 0;
    top: 0;
    width: 50rpx;
    height: 50rpx;
  }
</style>