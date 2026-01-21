<script setup>
	import {
		reactive,
		computed
	} from "vue";
	import {
		useI18n
	} from 'vue-i18n'
	import sheep from "@/sheep";
	import BattleOptionsPopup from './battleOptionsPopup.vue';
	import HandicapPopup from './handicapPopup.vue';
	import PopBackground from "@/sheep/components/common/popBackground.vue";
	import {
		showToast
	} from "@/sheep/util/toast";
	import $stores from "@/sheep/stores";
	import gameConfig from '@/sheep/config/gameConfig.json';
	import bluetooth from "@/sheep/stores/bluetooth";
	import playerInfo from "@/sheep/api/dart/playerInfo";
	import cacheUtil from "@/sheep/request/util";
	import {
		onLoad,
	} from '@dcloudio/uni-app';
  import player from "@/sheep/api/dart/player";
  import {init} from "@/sheep/config/bluetoothConfig";

	const {
		t,locale
	} = useI18n()

	const props = defineProps({
		params: {
			type: {},
			default: false
		},
		type: {
			type: Number,
		},
	});
	const userInfo = $stores('user').getUserInfo();
	const state = reactive({
		selectedPlayers: {},
		// 小圆点数据
		smallCircles: Array(8).fill(null),

		// 大圆点数据
		largeCircles: [{
				id: 1,
				playerId: userInfo.id || null,
				playerName: "玩家头像",
				selected: false,
				...userInfo,
				headImgUrl: userInfo.headImgUrl || "/static/images/user.png",
				averageColor: '#8338EC',
				ppr: userInfo.ppr || 0,
				ppd: userInfo.ppd || 0
			},
			{
				id: 2,
				playerId: null,
				headImgUrl: "/static/images/profile/player2-1.jpg",
				playerName: locale.value === 'zh' ? '人机玩家2': "Player2",
				selected: false,
				averageColor: '#4ECDC4',
				ppr: 0,
				ppd: 0

			},
			{
				id: 3,
				playerId: null,
				headImgUrl: "/static/images/profile/player3-1.jpg",
				playerName: locale.value === 'zh' ? '人机玩家3': "Player3",
				selected: false,
				averageColor: '#45B7D1',
				ppr: 0,
				ppd: 0

			},
			{
				id: 4,
				playerId: null,
				headImgUrl: "/static/images/profile/player4-1.jpg",
				playerName: locale.value === 'zh' ? '人机玩家4': "Player4",
				selected: false,
				averageColor: '#96CEB4',
				ppr: 0,
				ppd: 0

			},
			{
				id: 5,
				playerId: null,
				headImgUrl: "/static/images/profile/player5-1.jpg",
				playerName: locale.value === 'zh' ? '人机玩家5': "Player5",
				selected: false,
				averageColor: '#FFBE0B',
				ppr: 0,
				ppd: 0

			},
			{
				id: 6,
				playerId: null,
				headImgUrl: "/static/images/profile/player6-1.jpg",
				playerName: locale.value === 'zh' ? '人机玩家6': "Player6",
				selected: false,
				averageColor: '#FF006E',
				ppr: 0,
				ppd: 0

			},
			{
				id: 7,
				playerId: null,
				headImgUrl: "/static/images/profile/player7-1.jpg",
				playerName: locale.value === 'zh' ? '人机玩家7': "Player7",
				selected: false,
				averageColor: '#FF6B6B',
				ppr: 0,
				ppd: 0

			},
			{
				id: 8,
				playerId: null,
				headImgUrl: "/static/images/profile/player8-1.jpg",
				playerName: locale.value === 'zh' ? '人机玩家8': "Player8",
				selected: false,
				averageColor: '#3A86FF',
				ppr: 0,
				ppd: 0

			}
		],

		// 弹出层相关
		modalVisible: false,
		// 让分弹出层状态
		handicapModalVisible: false,
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
      outsideBullEyeScore: 25, //外牛眼分数
			numberOfTeams: 2,
			requiredLines: 1,
			bidSequence: 1, //输赢攻击顺序
			partition:1,//获分区设置
		},

		// 让分相关
		handicap: {
			currentScore: props.params.startingScore || 0,
			selectedTeam: null,
			backupScores: {}, // 用于存储每个团队的临时分数
			mickeyMouseBackupScores: {}
		},
		battleVisible:true
	});

	// 计算当前模式下的队伍大小
	const teamSize = computed(() => state.modalContent.teamSize || 1);

	// 根据队伍大小计算最大队伍数
	const maxTeams = computed(() => {
		if (props.type) {
			switch (props.type) {
				case 6:
					return 2;
				case 7:
					return 1;
				case 8:
					return 2;
			}
		}
		switch (teamSize.value) {
			case 1:
				return 8; // 1v1 模式最多8个队
			case 2:
				return 4; // 2v2 模式最多4个队
			case 3:
				return 3; // 3v3v2 模式3个队
			case 4:
				return 2; // 4v4 模式最多2个队
			default:
				return 8;
		}
	});

	onLoad(() => {
		if (props.type === 4) {
			state.modalContent.customRound = 3;
			state.modalContent.roundNbr = 0;
		}
		if (props.type === 6) {
			state.modalContent.roundNbr = -1;
		}
		
		if (props.type === 7) {
			state.battleVisible = false
			// state.modalContent.teamSize = -1;
		}

		if (props.params.duelMode === 2) {
			state.modalContent.teamSize = 2;
		}
	})

	// 显示弹出层
	const showModal = (position) => {
		console.log("开始点击显示弹出层："+position)
		if(position === 'error') {
			showToast({
				title: locale.value === 'zh' ? '当前模式暂不支持进行选项' : 'The current mode does not support options for the time being',
			    icon: 'none'
			});
			return;
		}
		if (position === 'right' && !hasSelectedPlayers.value) {
			showToast({
				title: locale.value === 'zh' ? '请先选择玩家' : 'Please select the player first',
				icon: 'none'
			});
			return;
		}

		state.modalVisible = true;
		state.modalContent.title = position === "left" ?
			t('selectPlayer.offline.title.battle') :
			t('selectPlayer.offline.title.options');
		state.modalContent.buttonType = position;
	};


	// 选择头像
	const selectAvatar = (avatar) => {
    console.log('选择头像时的数据'+JSON.stringify(avatar))
		if (!avatar.selected) {
			// 获取当前有效的玩家数组（排除null值）
			const validPlayers = state.smallCircles.filter(item => item !== null);

			// 重新计算当前应该分配的队伍
			let currentTeam = 1;
			const teamCounts = {};

			// 统计每个队伍的人数
			validPlayers.forEach(player => {
				teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
			});

			// 找到第一个未满的队伍
			for (let i = 1; i <= maxTeams.value; i++) {
				if (!teamCounts[i] || teamCounts[i] < teamSize.value) {
					currentTeam = i;
					break;
				}
			}

			// 检查是否超过最大队伍数
			if (currentTeam > maxTeams.value) {
				showToast({
					message: locale.value === 'zh' ? "已达到最大队伍数限制":'The maximum team size limit has been reached',
					icon: "none"
				});
				return;
			}

			// 检查当前队伍是否已满
			const currentTeamPlayers = validPlayers.filter(item => item.team === currentTeam).length;
			if (currentTeamPlayers >= teamSize.value) {
				showToast({
					message: locale.value === 'zh' ? "当前队伍已满":'The team is full',
					icon: "none"
				});
				return;
			}

			// 设置选中状态
			avatar.selected = true;
			const emptyIndex = state.smallCircles.findIndex(item => item === null);
			if (emptyIndex !== -1) {
				state.smallCircles[emptyIndex] = {
					headImgUrl: avatar.headImgUrl,
					playerName: avatar.playerName,
					id: avatar.id,
					playerId: avatar.playerId,
					team: currentTeam,
					startingScore: props.params.startingScore || 0,
					averageColor: avatar.averageColor,
          offlineScore: avatar.offlineScore || 0,
          offlineTotal: avatar.offlineTotal || 0,
          offlineGameRound: avatar.offlineGameRound || 0
				};
			}
		} else {
			// 取消选择
			avatar.selected = false;
			state.smallCircles = state.smallCircles.map(item => (item && item.id === avatar.id ? null : item));

			// 重新整理队伍
			const validPlayers = state.smallCircles.filter(item => item !== null);
			const newTeamAssignments = {};
			let currentTeam = 1;
			let currentTeamCount = 0;

			// 重新分配队伍编号
			validPlayers.forEach(player => {
				if (currentTeamCount >= teamSize.value) {
					currentTeam++;
					currentTeamCount = 0;
				}
				newTeamAssignments[player.id] = currentTeam;
				currentTeamCount++;
			});

			// 更新队伍编号
			state.smallCircles = state.smallCircles.map(item => {
				if (item === null) return null;
				return {
					...item,
					team: newTeamAssignments[item.id]
				};
			});
		}
	};

  // 取消头像
  const unselectAvatar = (index) => {
    // 1. 获取点击的 smallCircles 中的头像数据
    const avatarToRemove = state.smallCircles[index];
    console.log("点击的数据为："+avatarToRemove?.id);
    // 检查是否真的有头像要移除
    if (!avatarToRemove) {
      console.warn(`No avatar found at index ${index} in smallCircles.`);
      return;
    }

    // 2. 将 smallCircles 中对应下标的元素设置为 null
    state.smallCircles = state.smallCircles.map((item, i) => (i === index ? null : item));

    // 3. 还原大圆圈中的选中状态
    state.largeCircles.forEach(circle => {
      if (circle?.id === avatarToRemove.id) {
        circle.selected = false;
      }
    });

    // 4. 重新整理队伍
    const validPlayers = state.smallCircles.filter(item => item !== null);
    const newTeamAssignments = {};
    let currentTeam = 1;
    let currentTeamCount = 0;

    // 重新分配队伍编号
    validPlayers.forEach(player => {
      if (currentTeamCount >= teamSize.value) {
        currentTeam++;
        currentTeamCount = 0;
      }
      newTeamAssignments[player.id] = currentTeam;
      currentTeamCount++;
    });

    // 更新队伍编号
    state.smallCircles = state.smallCircles.map(item => {
      if (item === null) return null;
      return {
        ...item,
        team: newTeamAssignments[item.id]
      };
    });
  };

  // 重新计算队伍的函数
  const recalculateTeams = () => {
    const validPlayers = state.smallCircles.filter(item => item !== null);
    const newTeamAssignments = {};
    let currentTeam = 1;
    let currentTeamCount = 0;

    // 重新分配队伍编号
    validPlayers.forEach(player => {
      if (currentTeamCount >= maxTeamSize.value) {
        currentTeam++;
        currentTeamCount = 0;
      }
      newTeamAssignments[player.id] = currentTeam;
      currentTeamCount++;
    });

    // 更新队伍编号
    state.smallCircles = state.smallCircles.map(item => {
      if (item === null) return null;
      return {
        ...item,
        team: newTeamAssignments[item.id]
      };
    });
  };



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

	// 开始游戏
	const startGame = async () => {
    const systemInfo = uni.getSystemInfoSync();
    const platform = systemInfo.platform; // 'ios' 或 'android'
    console.log(platform)
    if (platform === 'ios'|| platform === 'android'){//web端
      if (!bluetooth().isConnected) {
        showToast({
          message: locale.value === 'zh' ? '请先连接蓝牙设备':'Please connect the Bluetooth device first',
          icon: 'none'
        });
        return;
      }
    }else {
      console.log('pc端')
    }
    player.Api.updateInGame(1);


		const selectedPlayers = state.smallCircles.filter(player => player !== null);
		// 检查是否有选择的玩家
		// if (selectedPlayers.length <= 1) {
		//   showToast({
		//     message: '请选择玩家',
		//     icon: 'none'
		//   });
		//   return;
		// }

		// 检查每个队伍的人数是否符合要求
		const teamCounts = {};
		selectedPlayers.forEach(player => {
			teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
		});
		
		// 判断队伍是否正确
		// const teamCountsArray = Object.values(teamCounts);
		// if (teamCountsArray.length <= 1) {
		//   showToast({
		//     message: '必须有两个以上的队伍',
		//     icon: 'none'
		//   })
		//   return;
		// }
		// 检查每个队伍的人数是否正确
		// const isTeamValid = Object.values(teamCounts).every(count => count === teamSize.value);
		// if (!isTeamValid) {
		//   showToast({
		//     title: '每个队伍人数必须相同',
		//     icon: 'none'
		//   });
		//   return;
		// }

		// 如果selectedPlayers长度不大于0的话
		if (!state.selectedPlayers.length || state.selectedPlayers.length === 0) {
			state.selectedPlayers = groupByTeam(selectedPlayers)
		}
		// 准备游戏数据
		const gameData = {
			players: state.selectedPlayers,
			gameSettings: {
				teamSize: state.modalContent.teamSize,
				roundNbr: state.modalContent.roundNbr,
				handicap: state.modalContent.handicap,
				opening: state.modalContent.opening,
				finish: state.modalContent.finish,
				bullEyeFraction: state.modalContent.bullSEyeFraction,
				customRound: state.modalContent.customRound,
				requiredLines: state.modalContent.requiredLines,
				duelMode: props.params.duelMode,
				bidSequence: state.modalContent.bidSequence,
        outsideBullEyeScore: state.modalContent.outsideBullEyeScore,
				partition:state.modalContent.partition

			},
			modes: props.type === 8 ? props.params.value : undefined,
			modeEntity: props.params,
		};
		//获取 玩家的ppr以及dppd
    const promises = [];
    gameData.players.forEach((item, index) => {
			item.players.forEach((player, i) => {
				if(player.playerId != null){
					// 收集所有Promise
					const promise = playerInfo.Api.getPlayerInfo(player.playerId).then(response => {
							if(response){
                // 修复拼写错误：offlineScoer -> offlineScore
                gameData.players[index].players[i].offlineScore = response.offlineScore || 0;
                // 01游戏用：总镖数
                gameData.players[index].players[i].offlineTotal = response.offlineTotal || 0;
                // 米老鼠游戏用：总回合数
                gameData.players[index].players[i].offlineGameRound = response.offlineGameRound || 0;
                console.log(`获取玩家${player.playerId}历史数据:`, response);
							}
						}).catch(err => {
							console.error(`获取玩家${player.playerId}历史数据失败:`, err);
						});
					promises.push(promise);
				}
			})
		})
		
		// 等待所有接口调用完成后再跳转
		await Promise.all(promises);
		console.log('所有玩家历史数据获取完成，准备跳转游戏页面');
		
		const gameConfigElement = gameConfig[props.type];

		let url = gameConfigElement.url;
		if (props.type === 1 && props.params.duelMode === 2) {
			url = gameConfigElement.freezeUrl;
		}
		if (props.type === 8) {
			//    const valueElement = props.params.value[0];
			//    // gameData.modeEntity = valueElement;
			//    const gameConfigElement = gameConfig[valueElement.type];
			//    let url = gameConfigElement.url;

			// gameData.players.forEach(player => {
			//   player.startingScore = valueElement.startingScore;
			// });
			// gameData.modeEntity.type = valueElement.type
			//    sheep.$router.go(url, gameData, 'reLaunch');
			//    return
		}
		
		//联系模式，单人（）
		if (props.type === 7) {
			
		}
		if(props.type===5&&url==='/pages/game/routine/twist/index'){
			url='/pages/game/routine/twist/i2'
		}
		console.log('最终跳转url为：'+url);

    init();
    bluetooth().setScoreCallback(null);
    console.log('初始化：'+bluetooth().scoreCallback)
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
	// 计算是否有选择的玩家
	const hasSelectedPlayers = computed(() => {
		const selectedPlayers = state.smallCircles.filter(player => player !== null);

		// 没有选中的玩家，直接返回 false
		if (!selectedPlayers.length) return false;

		// 统计每个队伍的玩家数量
		const teamCounts = selectedPlayers.reduce((counts, player) => {
			counts[player.team] = (counts[player.team] || 0) + 1;
			return counts;
		}, {});

		// 检查每个队伍的玩家数量是否符合要求
		const allTeamsValid = Object.values(teamCounts).every(count => count === teamSize.value);

		// 如果队伍玩家数量符合要求且不是双人模式，返回 true
		if (allTeamsValid && props.params.duelMode !== 2) return true;

		// 如果队伍数量小于等于1，返回 false
		if (Object.keys(teamCounts).length <= 1) return false;

		// 如果队伍玩家数量符合要求且为双人模式，返回 true
		return allTeamsValid;
	});

	// 让分相关方法
	const handleScoreChange = (newScore) => {
		// 检查是否有选中的队伍
		if (!state.handicap.selectedTeam) {
			showToast({
				message: locale.value === 'zh' ? '请先选择队伍':'Please select the team first',
				icon: 'none'
			});
			return;
		}

		// 检查选中的队伍是否有玩家
		const teamPlayers = state.smallCircles.filter(player => player && player.team === state.handicap.selectedTeam);
		if (teamPlayers.length === 0) {
			showToast({
				message: locale.value === 'zh' ? '当前队伍没有玩家':'There are no players in the current team',
				icon: 'none'
			});
			return;
		}

		if (newScore >= 0) {
			state.handicap.currentScore = newScore;
			// 更新选中团队的临时分数
			if (state.handicap.selectedTeam) {
				state.handicap.backupScores[state.handicap.selectedTeam] = newScore;
			}
		}
	};

	const selectTeamForHandicap = (team) => {
		state.handicap.selectedTeam = team;
		// 如果已有临时分数，使用临时分数
		if (state.handicap.backupScores[team] !== undefined) {
			state.handicap.currentScore = state.handicap.backupScores[team];
		} else {
			// 否则使用团队当前的起始分数
			const teamPlayer = state.smallCircles.find(p => p && p.team === team);
			state.handicap.currentScore = teamPlayer ? teamPlayer.startingScore : props.params.startingScore || 0;
			// 初始化临时分数
			state.handicap.backupScores[team] = state.handicap.currentScore;
		}
	};


	const confirmHandicap = () => {
		// 将所有临时分数应用到实际分数
		Object.entries(state.handicap.backupScores).forEach(([team, score]) => {
			let assigned = false; // 标志位，确保只分配一次
			state.smallCircles.forEach(player => {
				if (!assigned && player && player.team === parseInt(team)) {
					player.startingScore = score;
					assigned = true; // 已分配，跳过后续玩家
				}
			});
		});

		Object.entries(state.handicap.mickeyMouseBackupScores).forEach(([team, score]) => {
			let assigned = false; // 标志位，确保只分配一次
			state.smallCircles.forEach(player => {
				if (!assigned && player && player.team === parseInt(team)) {
					if (!player.mickeyMouseBackupScores) {
						player.mickeyMouseBackupScores = {};
					}
					player.mickeyMouseBackupScores = score;
					assigned = true; // 已分配，跳过后续玩家
				}
			});
		});

		// 清空临时数据
		state.handicap.backupScores = {};
		state.handicapModalVisible = false;
	};

	// 添加取消让分的方法
	const cancelHandicap = () => {
		// 清空临时数据
		state.handicap.backupScores = {};
		state.handicapModalVisible = false;
	};

	// 计算实际显示的队伍数
	const getDisplayTeams = computed(() => {
		if (props.type === 7) {
			return 1
		}
		if (teamSize.value === 3) {
			return 3; // 3v3v2 模式显示3个队伍
		}
		if (props.type === 8) {
			return 2
		}
		return maxTeams.value;
	});

	// 获取每个队伍的实际大小
	const getTeamSize = (teamIndex) => {
		if (props.type === 7) {
			return 1; 
		}
		if (teamSize.value === 3 && teamIndex === 2) {
			return 2; // 第三队只有2个玩家
		}
		return teamSize.value;
	};
</script>

<template>
	<view class="container">
		<!-- 第一行小圆点 - 分组显示 -->
		<view v-clickSound class="team-display" :style="{ width: '100%', height: '40rpx' }">

			<view v-for="(item, index) in state.largeCircles" :key="'large-' + index" class="circle-wrapper">
				<view class="circle large uni-circle bg-989898" :style="{
			  margin:`10rpx`,
		      border: `2px solid ${item.averageColor}`,
		      backgroundImage: `url(${item.headImgUrl})`,
		      backgroundSize: 'cover',
		      filter: item.selected ? 'brightness(50%)' : 'brightness(100%)'
		    }" @click="selectAvatar(item, index)"></view>
				<!-- <text class="avatar-label">{{ item.playerName }}</text> -->
			</view>


		</view>

		<!-- 第二行大圆点 -->
		<view class="row">


			<view v-clickSound v-for="(team, teamIndex) in getDisplayTeams" :key="teamIndex" class="team" style="margin: auto;">
				<view v-for="playerIndex in getTeamSize(teamIndex)"
					:key="'player-' + ((teamIndex * teamSize) + playerIndex - 1)" class="circle smallUnder uni-circle"
					:class="{
		        filled: state.smallCircles[(teamIndex * teamSize) + playerIndex - 1] !== null,
		        selected: state.smallCircles[(teamIndex * teamSize) + playerIndex - 1] !== null
		      }" :style="state.smallCircles[(teamIndex * teamSize) + playerIndex - 1] !== null ?
		        {border: `2px solid ${state.smallCircles[(teamIndex * teamSize) + playerIndex - 1].averageColor}`,
				 backgroundImage: `url(${state.smallCircles[(teamIndex * teamSize) + playerIndex - 1].headImgUrl})`,
				   backgroundSize: `cover`
				  }
				  : {
					  backgroundImage: `url(/static/images/profile/profile_${teamIndex + 1}.png)`,
					  backgroundSize: `cover`,
				    }" @click="unselectAvatar((teamIndex * teamSize) + playerIndex - 1)"></view>
				<!-- <view v-if="teamIndex < getDisplayTeams - 1" class="vs-sign">VS</view> -->
			</view>
		</view>

		<!-- 底部按钮 -->
		<view class="footer">
			<view class="footer-button" >
				<view v-clickSound  v-if="state.battleVisible" @click="showModal('left')">
					{{ $t('selectPlayer.offline.buttons.battle') }}
				</view>
			</view>

			<view v-clickSound class="start-button" @click="startGame" :class="{ disabled: !hasSelectedPlayers }">
				<PopBackground>
					<text style="color: #8856FF;">{{ $t('selectPlayer.offline.buttons.start') }}</text>
				</PopBackground>
			</view>
			<view v-if="type!==3 && type !== 4 && type !== 5 " v-clickSound class="footer-button" @click="showModal('right')" :class="{ disabled: !hasSelectedPlayers}">
				{{ $t('selectPlayer.offline.buttons.options') }}
			</view>
<!--      只有在突然死亡模式下才会出现主要目的是固定css样式-->
      		<view v-if="type===3 || type === 4 || type === 5" class="footer-button"/>


		</view>

		<!-- 对战选项弹出层 -->
		<BattleOptionsPopup  :type="type" :duelMode="params.duelMode" :modalVisible="state.modalVisible"
			:modalContent="state.modalContent" @update:modalVisible="(val) => state.modalVisible = val"
			@selectOption="selectModalOption" v-model:handicapModalVisible="state.handicapModalVisible" />

		<!-- 让分设置弹出层 -->
		<HandicapPopup 
			:type="type" 
			v-if="state.modalContent.handicap === 'manual'"
			:modalVisible="state.handicapModalVisible" 
			:handicap="state.handicap" 
			:maxTeams="maxTeams"
			:players="state.smallCircles" 
			:startingScore="props.params.startingScore || 0"
			@update:modalVisible="(val) => state.handicapModalVisible = val"
			@scoreChange="handleScoreChange" 
			@selectTeam="selectTeamForHandicap" 
			@confirm="confirmHandicap"
			@cancel="confirmHandicap" 
		/>
	</view>
</template>

<style scoped>
	.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	/* 布局容器 */
	.container {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: center;
		height: 100%;
		padding: 20rpx 50rpx 100rpx 50rpx; /* 底部留出空间给按钮 */
		box-sizing: border-box;
		background-size: 30% 70%;
		background-position: center center;
		background-repeat: no-repeat;
		background-image: url('/static/images/vs.png');
		position: relative;
		min-height: 80vh;
	}

	/* 行样式 */
	.row {
		display: flex;
		justify-content: space-between;
		width: 100%;
		margin: 20rpx 0;
	}

	/* 圆点样式 */
	.circle {
		border-radius: 50%;
	}

	.circle.small {
		width: 30rpx;
		height: 30rpx;
		flex-shrink: 0;
	}

	.smallUnder {
		width: 60rpx;
		height: 60rpx;
		flex-shrink: 0;
	}



	.circle.large {
		width: 30rpx;
		height: 30rpx;
		margin-bottom: 5rpx;
	}

	.circle-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.filled {
		border: none;
	}

	/* 底部按钮样式 */
	.footer {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 50rpx; /* 距离底部50rpx */
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 50rpx;
		box-sizing: border-box;
		background: transparent;
	}

	.footer-button {
		width: 60rpx;
		height: 30rpx;
		border-radius: 20rpx;
		text-align: center;
		line-height: 30rpx;
		font-size: 14rpx;
		color: #8856FF;
	}

	.start-button {
		width: 200rpx;
		height: 40rpx;
		border-radius: 20rpx;
		text-align: center;
	}

	.avatar-label {
		margin-top: 5rpx;
		font-size: 12rpx;
		color: white;
	}

	/* 新增的样式 */
	.team-display {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 70%;
		height: 40rpx;
		overflow-x: auto;
		white-space: nowrap;
	}

	.team {
		display: flex;
		align-items: center;
	}

	.vs-sign {
		margin: 0 10rpx;
		font-size: 18rpx;
		font-weight: bold;
		color: #00ccff;
	}

	/* 确保小圆点在一行内紧凑排列 */
	.circle.small {
		width: 30rpx;
		height: 30rpx;
		flex-shrink: 0;
		margin: 0 2rpx;
	}

	/* 添加横向滚动条样式 */
	.team-display::-webkit-scrollbar {
		height: 4rpx;
	}

	.team-display::-webkit-scrollbar-thumb {
		background-color: #00ccff;
		border-radius: 2rpx;
	}

	.team-display::-webkit-scrollbar-track {
		background-color: #f2f2f2;
	}
</style>