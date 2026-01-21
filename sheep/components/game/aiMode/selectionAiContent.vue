<script setup>
	import {
		ref,
		reactive,
		watch
	} from 'vue';
	import aigames from "@/sheep/api/dart/aigames";
	import games from "@/sheep/api/dart/games";
	import {
		useI18n
	} from "vue-i18n";
	import cacheUtil from "@/sheep/request/util";
	import BattleOptionsPopup from '@/sheep/components/game/selectPlayer/offline/battleOptionsPopup.vue';
	import gameConfig from '@/sheep/config/gameConfig.json';
	import $stores from "@/sheep/stores";
	import sheep from "@/sheep";
	import bluetooth from "@/sheep/stores/bluetooth";
	const userInfo = $stores('user').getUserInfo();
  const {t,locale} = useI18n();
	const state = reactive({
		options: [],
		gameOptions: [],
		selectAiDifficultyInfo: {},
		gameMode: {},
		// 弹出层相关
		modalVisible: false,
		modalButtomVisible: false,
		// 让分弹出层状态
		handicapModalVisible: false,
		modeEntity: {
			chineseModeName: null,
			englishModeName: null,
			startingScore: null,
			type: null,
			id: null,
		},
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
		},
		type: 0,
		duelMode: 0,
		// 让分相关
		handicap: {
			currentScore: 0,
			selectedTeam: null,
			backupScores: {}, // 用于存储每个团队的临时分数
			mickeyMouseBackupScores: {}
		},
		selectedPlayers: [],
		smallCircles: [{
				id: 1,
				playerName: "玩家头像",
				selected: false,
				...userInfo,
				headImgUrl: userInfo.headImgUrl || "/static/images/user.png",
				averageColor: '#8338EC',
			},
			{
				id: 2,
				headImgUrl: "/static/images/profile/player2-1.jpg",
				playerName: locale.value === 'zh' ? '人机玩家': "Player",
				selected: false,
				averageColor: '#4ECDC4',

			},
		]
	})

	// 获取AI难度显示名称
	const getAiDifficultyDisplayName = (item) => {
		if (locale.value === 'zh') {
			return item.name;
		} else {
			// const translationKey = `ai_difficulty.${item.hittingAccuracy}`;
			// const translatedName = t(translationKey);
			// return translatedName !== translationKey ? translatedName : item.name;
			return item.englishName;
		}
	};

	// 初始化方法
	const init = async () => {
		try {
			state.options = await cacheUtil.fetchWithCache('aiGameList', aigames.Api.getList, {
				type: 1,
				status: 1,
			}, 1800, false);
			if (state.options) {
				state.options.forEach((item, index) => {
					item.displayName = getAiDifficultyDisplayName(item);
					if (index === 0) {
						state.selectAiDifficultyInfo = item
						item.isActive = true;
					} else {
						item.isActive = false;
					}
				})
			}
		} catch (err) {
			console.error("加载数据失败", err);
		}
		console.log(state)
	}

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
			if (i === 0) {
				state.gameMode = item
				state.type = item.type
				state.duelMode = item.duelMode
			}
			return newVar;
		})
	}

	// 选择游戏模式
	const selectMode = (item) => {
		state.gameOptions.forEach((info, index) => {
			if (item.id === info.id) {
				state.type = info.type
				state.duelMode = info.duelMode
				state.gameMode = info
				info.selected = true;
			} else {
				info.selected = false;
			}
		})
	}


	const selectDifficulty = (item) => {
		state.options.forEach((info, index) => {
			if (item.id === info.id) {
				state.selectAiDifficultyInfo = info
				info.isActive = true;
			} else {
				info.isActive = false;
			}
		})
	}


	// 选择选项
	const selectModalOption = (option) => {
		const {
			field,
			value
		} = option;

		if (field === 'teamSize') {
			// 保存旧的团队大小
			const oldTeamSize = state.modalContent.teamSize;
			// 更新新的团队大小
			state.modalContent.teamSize = value;

			// 获取当前已选择的玩家
			const selectedPlayers = state.smallCircles.filter(item => item !== null);

			if (selectedPlayers.length > 0) {
				// 重新分配团队
				selectedPlayers.forEach((player, index) => {
					if (value === 3) {
						// 3v3v2 模式的特殊处理
						if (index < 3) {
							player.team = 1;
						} else if (index < 6) {
							player.team = 2;
						} else {
							player.team = 3;
						}
					} else {
						// 其他模式的常规处理
						player.team = Math.floor(index / value) + 1;
					}
				});

				// 更新小圆点数组，保持原有玩家的选择，只是重新排序
				const newSmallCircles = Array(8).fill(null);
				selectedPlayers.forEach((player, index) => {
					newSmallCircles[index] = player;
				});
				state.smallCircles = newSmallCircles;
			}
		}

		// 处理牛眼分数的切换
		if (field === 'bullSEyeFraction') {
			state.modalContent[field] = state.modalContent[field] === 25 ? 50 : 25;
			return;
		}

		// 处理外牛眼分数的切换
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

	const startGame = () => {
		console.log('🔧 [AI弹窗调试] 显示AI对战弹窗');
		console.log('🔧 [AI弹窗调试] 当前游戏类型 state.type:', state.type);
		console.log('🔧 [AI弹窗调试] modalContent.outsideBullEyeScore:', state.modalContent.outsideBullEyeScore);
		console.log('🔧 [AI弹窗调试] modalContent.buttonType:', state.modalContent.buttonType);

		state.modalVisible = true
		state.modalButtomVisible = true
	}
	const enterGame = () => {
		startGameMode()
	}


	// 开始游戏
	const startGameMode = () => {

		// 准备游戏数据


		state.smallCircles.forEach((player, index) => {
			state.selectedPlayers[index] = {
				headImgUrl: player.headImgUrl,
				playerName: player.playerName,
				id: player.id,
				team: index + 1,
				startingScore: state.gameMode.type === 1 ? state.gameMode.startingScore : 0,
				averageColor: player.averageColor
			};
		});
		const selectedPlayers = state.selectedPlayers
		state.selectedPlayers = groupByTeam(selectedPlayers)
		state.modeEntity = {
			chineseModeName: state.gameMode.chineseModeName,
			englishModeName: state.gameMode.englishModeName,
			startingScore: state.gameMode.startingScore,
			type: state.gameMode.type,
			id: state.gameMode.id
		}
		const selectAiDifficulty = {
			airTarget:state.selectAiDifficultyInfo.airTarget,
			hittingAccuracy:state.selectAiDifficultyInfo.hittingAccuracy,
			multiple:state.selectAiDifficultyInfo.multiple,
			partitionDiff:state.selectAiDifficultyInfo.partitionDiff,
			id:state.selectAiDifficultyInfo.id
		}
		const gameData = {
			players: state.selectedPlayers,
			gameSettings: {
				teamSize: state.modalContent.teamSize,
				roundNbr: state.modalContent.roundNbr,
				handicap: state.modalContent.handicap,
				opening: state.modalContent.opening,
				finish: state.modalContent.finish,
				bullEyeFraction: state.modalContent.bullSEyeFraction,
				outsideBullEyeScore: state.modalContent.outsideBullEyeScore,
				customRound: state.modalContent.customRound,
				requiredLines: state.modalContent.requiredLines,
				duelMode: state.duelMode,
				bidSequence: state.modalContent.bidSequence
			},
			modes: state.type === 8 ? state.value : undefined,
			modeEntity: state.modeEntity,
			type: 10,
			selectAiDifficulty: selectAiDifficulty
		};

		const gameConfigElement = gameConfig[state.gameMode.type];

		let url = gameConfigElement.url;
		if (state.type === 1 && state.duelMode === 2) {
			url = gameConfigElement.freezeUrl;
		}
		// 跳转到游戏页面
		sheep.$router.go(url, gameData, 'reLaunch');
	};

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


	fetchData();
	init();
</script>

<template>
	<view class="container">
		<view class="container_top">
			<view class="container_top_left">
				<view class="container_top_left_top">
					<view class="title"><span class="container_top_left_top_span">{{t('Select Difficulty')}}</span></view>
				</view>
				<view class="container_top_left_buttom">
					<view class="container_top_left_buttomCon">

						<view  v-clickSound   v-for="(item,index) in state.options" class="container_top_left_buttomInfo juzho"
							@click="selectDifficulty(item)">
							<view :class="item.isActive?'title left-titleActive  juzho':'title left-title juzho'"><span
									class="left-title-span">{{item.displayName}}</span></view>
						</view>

					</view>

				</view>

			</view>
			<view class="container_top_ritht">

				<view class="container_top_left_top">
					<view class="title"><span class="container_top_left_top_span">{{ t('Select Game') }}</span></view>
				</view>
				<view class="container_top_left_buttom">
					<view class="container_top_left_buttomCon">
						<view  v-clickSound   v-for="(item,index) in state.gameOptions" class="container_top_left_buttomInfo juzho"
							@click="selectMode(item)">
							<view :class="item.selected?'title left-titleActive  juzho':'title left-title juzho'"><span
									class="left-title-span">{{item.text}}</span></view>
						</view>
					</view>
				</view>
			</view>
		</view>
		<view class="container_buttom">
			<view class="juzho">
				<view  v-clickSound   class="title left-titleActive juzho" style="width: 150rpx;height: 50px" @click="startGame"><span
						class="left-title-span">{{ t('Start Game') }}</span></view>
			</view>
		</view>

		<!-- 对战选项弹出层 -->
		<BattleOptionsPopup :modalButtomVisible="state.modalButtomVisible" :type="state.type" :duelMode="state.duelMode"
			:modalVisible="state.modalVisible" :modalContent="state.modalContent"
			@update:modalVisible="(val) => {state.modalVisible = val; state.modalButtomVisible  = val; }"
			@selectOption="selectModalOption" @startGame="enterGame"
			v-model:handicapModalVisible="state.handicapModalVisible"  :showHandicap="false"/>

	</view>
</template>

<style scoped lang="scss">
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

	.container_top_left_buttomInfo {
		padding: 1px
	}

	.left-titleActive {
		width: 80%;
		border-radius: 10rpx;
		background: rgba(142, 77, 190, 0.2);
		border: 1rpx solid #8857FF;
		box-shadow: 0 0 1rpx rgba(136, 87, 255, 0.3), 0 0 1rpx rgba(136, 87, 255, 0.2), 0 0 1rpx rgba(136, 87, 255, 0.1);
	}

	.left-title {
		width: 80%;
		border-radius: 10rpx;

	}

	.container_top_left_buttomCon {
		width: 45%;
		height: 80%;
		margin: auto;
		overflow: auto;
	}

	.container_top_left_buttom {
		width: 100%;
		height: 90%;
		background-image: url('/static/images/aikuang.png');
		background-size: 75% 120%;
		background-position: center;
		background-repeat: no-repeat;
		display: flex;
		justify-content: center;
		/* 主轴方向居中 */
		align-items: center;
	}

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

	.container_top_left_top_span {
		display: flex;
		justify-content: center;
		/* 主轴方向居中 */
		align-items: center;
		/* 交叉轴方向居中 */
	}

	.container_top_left {
		height: 100%;
		width: 100%;
	}

	.container_top_ritht {
		height: 100%;
		width: 100%;
	}

	.container_top {
		height: 80%;
		width: 100%;
		display: flex;
		flex-direction: row;
	}

	.container_buttom {
		height: 15%;
		width: 100%;

	}


	.container {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		/* 垂直排列 */
		justify-content: center;
		align-items: center;
	}

	/* 在 style 文件中设置样式 */
	.view_container {
		display: flex;
		flex-wrap: wrap;
		/* 允许换行 */
		justify-content: space-between;
		/* 元素之间的间距 */
		gap: 25rpx;
		/* 元素之间的间距 */
		padding: 0 50rpx;
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		box-sizing: border-box;
		/* 包括内边距和边框 */
		text-align: center;
		width: 120rpx;
		height: 120rpx;
	}
</style>