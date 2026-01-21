<script setup>
	import {
		computed,
		reactive,
		ref,
		watch
	} from 'vue';
	import PlayerContent from "@/sheep/components/game/01/playerContent.vue";
	import {
		onLoad,
		onReady,
		onUnload
	} from '@dcloudio/uni-app';
	import {
		getParams
	} from "@/sheep/router";
	import {
		useI18n
	} from "vue-i18n";
	import TeamDisplay from "@/sheep/components/game/01/teamDisplay.vue";
	import TransitionScreen from "@/sheep/components/common/transitionScreen.vue";
	import TransitionScreenText from "@/sheep/components/common/transitionScreenText.vue";
	import {
		useGameCommon
	} from "@/sheep/hooks/useGameCommon";
	import bluetooth from "@/sheep/stores/bluetooth";
	import {
		showToast
	} from "@/sheep/util/toast";
	import {
		getGameConfig,
		useAudioPlayerFunIf,
		playAudioPlayerFunIf,
		getScoreConfig,
		getGameConfigGrouping,
		SCORING_AREAS
	} from "@/sheep/config/bluetoothConfig";
	import DebugPanel from "@/sheep/components/debug/debugPanel.vue";
	import {
		useAudioPlayer
	} from "@/sheep/util/useAudioPlayer";

  import agreement from "@/sheep/api/dart/agreement";

	const {
		locale,
		t
	} = useI18n();

	// 🔥 本地参数化翻译函数，避免在非setup上下文中调用useI18n
	const getLocalMessage = (key, values = {}) => {
		let message = t(key);
		// 遍历传入的 values 对象，替换占位符
		for (let [placeholder, replacement] of Object.entries(values)) {
			// 创建一个正则表达式来匹配占位符
			const regex = new RegExp(`\\$\\(${placeholder}\\)`, 'g');
			message = message.replace(regex, replacement);
		}
		return message;
	};

	const state = reactive({
		teamArray: [], // 队伍数组
		gameSettings: {},
		gameState: {
			currentRound: 1, // 当前回合
			currentTeam: 1, // 当前投掷的队伍
			currentPlayerIndex: 0, // 当前队伍中的玩家索引
			currentDart: 0, // 当前投掷的镖数(1-3)
			maxRounds: 20, // 最大回合数
			roundScores: {}, // 每回合的得分记录 {roundId: {teamId: {playerId: [得分数组]}}}
			averageScores: {}, // 每个玩家的平均分记录 {playerId: averageScore}
			forbiddenAreas: [], // 初始化作废区域数组
			// 修改回合结束的判断逻辑
			isRoundEnd: computed(() => {
				// 🔧 修复问题：加时赛中投完1镖就算回合结束，正常游戏投完3镖算回合结束
				if (state.isTieBreaker) {
					return state.gameState.currentDart === 1;
				} else {
					return state.gameState.currentDart === 3;
				}
			}),
			teamSize: 1,
		},
		modeEntity: {},
		delOutFlay: false,
		// 是否加时赛
		isTieBreaker: false,
	});

	const gameCommon = useGameCommon();
	const modeName = ref();
	const playerContentRef = ref(null);
	// 获取路由传递的参数并初始化游戏
	onLoad((options) => {
		const params = getParams(options);
		// 初始化游戏状态
		initGameState(params);
	});

	onReady(() => {
		gameCommon.handleGameStart(modeName.value, state.gameState.currentRound, state.teamArray[0].players[0]
			.playerName,playerContentRef)
	})

	// 防重复处理的标志
	const isProcessingDart = ref(false);
	const isProcessingHandChange = ref(false);

	// 设置蓝牙数据回调函数 - 每次接收数据都会触发
	bluetooth().setScoreCallback((newVal) => {
		if (newVal) {
			// 处理换手按钮（在所有模式下都有效）
			if (newVal === '65' || newVal === 65) {
				// 🔧 防止重复处理换手按钮
				if (isProcessingHandChange.value) {
					return;
				}
				moveToNextPlayer();
				return;
			}

			// 🔧 防止重复处理本地蓝牙投镖
			if (isProcessingDart.value) {
				return;
			}

			// 加时赛中：若已投完1镖，阻止继续投镖，等待手动换手
			if (state.isTieBreaker && state.gameState.currentDart >= 1) {
				console.log('🎯 [加时赛] 已投完1镖，等待手动换手（跳过按钮或设备换手按钮）');
				return;
			}

			if (!state.gameState.isRoundEnd) {
				blurScore(newVal);
				// 🔥 加时赛：打一镖后不再自动换手，等待手动触发
				if (state.isTieBreaker && state.gameState.isRoundEnd) {
					console.log('🎯 [加时赛换手] 投完1镖，显示跳过按钮，等待手动换手');
					// 不再自动换手，让changeTurn属性控制显示跳过按钮
				}
			}
		}
	});

	/**
	 * 正常游戏减分的重投方法
	 */
	const deductionRethrowCurrentRound = () => {
		if (state.isTieBreaker) {
			showToast({
				message: t('suddenDeath_messages.noRethrowInTieBreaker'),
				icon: 'none'
			});
			return 'end';
		}
	};

	// 初始化游戏状态
	const initGameState = async (params) => {
		if (params.gameSettings.customRound) {
			params.gameSettings.roundNbr = params.gameSettings.customRound
		}
		// 根据team分组玩家
		state.teamArray = params.players;

		// 获取最大的玩家团队
		state.gameState.teamSize = params.gameSettings.teamSize
		state.modeEntity = params.modeEntity

		// 设置游戏设置
		// state.gameState.maxRounds = params.gameSettings?.roundNbr || 20;
		// 默认设置为无限局数
		state.gameState.maxRounds = -1;

		// 获取配置
		state.gameSettings = params.gameSettings;

		// 初始化第一个队伍第一个玩家为活动状态
		if (state.teamArray.length > 0 && state.teamArray[0].players.length > 0) {
			state.teamArray[0].players[0].isActive = true;
			state.gameState.currentTeam = state.teamArray[0].team;
		}

		// 初始化回合分数记录
		state.gameState.roundScores = {
			1: {} // 初始化第一回合
		};

		// 初始化每个玩家的平均分记录
		state.teamArray.forEach(team => {
			team.teamRoundNbr = 0;
			team.currentScore = team.startingScore;
			team.players.forEach(player => {
				state.gameState.averageScores[player.id] = [];
				// 确保每个玩家都有scoreHistory
				if (!player.scoreHistory) {
					player.scoreHistory = {
						recentRounds: [],
						currentRound: []
					};
				}
			});
		});
		modeName.value = locale.value === "zh" ? state.modeEntity.chineseModeName : state.modeEntity
			.englishModeName;
	};

	const blurScore = (data) => {
		// 设置处理标志
		isProcessingDart.value = true;

		try {
			const gameConfig = getGameConfig(data);
			gameConfig.gameType = state.modeEntity.type
			handleScore(gameConfig.score, gameConfig);
		} finally {
			// 延迟重置处理标志
			setTimeout(() => {
				isProcessingDart.value = false;
			}, 100);
		}
	}

	// 状态检查和修复函数
	const checkAndFixGameState = () => {
	  // 检查镖数是否异常
	  if (state.gameState.currentDart < 0) {
	    state.gameState.currentDart = 0;
	  }
	  
	  // 🔧 修复问题：根据加时赛状态检查镖数上限
	  if (state.isTieBreaker) {
	    if (state.gameState.currentDart > 1) {
	      state.gameState.currentDart = 0;
	    }
	  } else {
	    if (state.gameState.currentDart > 3) {
	      state.gameState.currentDart = 0;
	    }
	  }

	  // 检查当前队伍和玩家索引
	  const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
	  if (!activeTeam) {
	    state.gameState.currentTeam = 1;
	    state.gameState.currentPlayerIndex = 0;
	  }
	};

	// 投镖得分处理
	const handleScore = (score, gameConfig) => {
		// 状态检查和修复
		checkAndFixGameState();

		// 检查镖数是否已达到上限
		if (state.isTieBreaker) {
			// 🔧 修复问题：加时赛中每个玩家只能投1镖
			if (state.gameState.currentDart >= 1) {
				return;
			}
		} else {
			// 正常游戏中每个玩家可以投3镖
			if (state.gameState.currentDart >= 3) {
				return;
			}
		}

		if (state.gameState.isRoundEnd) return;

		const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
		if (!activeTeam) return;

		const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];
		if (!activePlayer) return;

		// 如果是加时赛，记录临时分数和投镖记录
		if (state.isTieBreaker) {
			activeTeam.tieBreakScore = (activeTeam.tieBreakScore || 0) + score;
			// 临时加到当前分数上（用于显示）
			activeTeam.currentScore += score;

			// 修复显示问题：在效加时赛中也要记录投镖到roundScores，用于右侧显示
			// 初始化记录结构
			if (!state.gameState.roundScores[state.gameState.currentRound]) {
				state.gameState.roundScores[state.gameState.currentRound] = {};
			}
			if (!state.gameState.roundScores[state.gameState.currentRound][activeTeam.team]) {
				state.gameState.roundScores[state.gameState.currentRound][activeTeam.team] = {};
			}
			if (!state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id]) {
				state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id] = [];
			}

			// 记录本次投镖的完整信息（用于右侧显示）
			const throwRecord = {
				area: gameConfig.originalScore === 21 ? 'B' : gameConfig.originalScore,
				score: score,
				originalScore: gameConfig.originalScore,
				multiplier: gameConfig.multiplier,
			};

			// 添加到回合记录
			state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id].push(throwRecord);

			// 获取当前回合分数用于音效
			const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id];

			// 🔥 加时赛也要播放音效
			useAudioPlayerFun(gameConfig, currentRoundScores);

			state.gameState.currentDart++;

			// 🔧 修复问题：加时赛中每个玩家只投一镖，投完后立即增加轮次
			activeTeam.teamRoundNbr++;
			
			// 🔧 加时赛中投完一镖后，不自动换手
			// 需要通过跳过按钮或设备换手按钮手动触发换手
			// isRoundEnd状态会控制跳过按钮的显示
			
			return;
		}

		// 获取实际分区和倍数 - 允许重复打同一区域
		const scoringArea = gameConfig.originalScore;
		let newScore = score;

		// 初始化记录结构
		if (!state.gameState.roundScores[state.gameState.currentRound]) {
			state.gameState.roundScores[state.gameState.currentRound] = {};
		}
		if (!state.gameState.roundScores[state.gameState.currentRound][activeTeam.team]) {
			state.gameState.roundScores[state.gameState.currentRound][activeTeam.team] = {};
		}
		if (!state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id]) {
			state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id] = [];
		}

		// 确保玩家有得分记录结构
		if (!activePlayer.scoreHistory) {
			activePlayer.scoreHistory = {
				recentRounds: [],
				currentRound: []
			};
		}

		// 记录本次投镖的完整信息
		const throwRecord = {
			area: scoringArea === 21 ? 'B' : scoringArea,
			score: score,
			originalScore: gameConfig.originalScore,
			multiplier: gameConfig.multiplier,
		};

		// 添加到回合记录
		state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id].push(throwRecord);

		// 更新历史记录
		const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][
			activePlayer.id
		];
		const roundTotal = currentRoundScores.reduce((sum, item) => sum + item.score, 0);

		const roundRecord = {
			roundNumber: state.gameState.currentRound,
			scores: [...currentRoundScores],
			teamScore: activeTeam.currentScore,
			total: roundTotal,
		};

		// 更新或添加到历史记录
		const existingRecordIndex = activePlayer.scoreHistory.recentRounds.findIndex(
			record => record.roundNumber === state.gameState.currentRound
		);

		if (existingRecordIndex !== -1) {
			activePlayer.scoreHistory.recentRounds[existingRecordIndex] = roundRecord;
		} else {
			activePlayer.scoreHistory.recentRounds.push(roundRecord);
		}

		// 只保留最近4回合的记录
		if (activePlayer.scoreHistory.recentRounds.length > 4) {
			activePlayer.scoreHistory.recentRounds.shift();
		}

		// 统一加分
		if (newScore > 0) {
			activeTeam.currentScore += newScore;
		}

		// 更新当前镖数
		state.gameState.currentDart++;

		// 如果投完三镖
		if (state.gameState.currentDart === 3) {
			activeTeam.teamRoundNbr++;

			// 🔥 检查是否所有队伍都完成了当前回合
			const allTeamsCompleted = checkAllTeamsCompleted();
	
			if(allTeamsCompleted){
				playerElimination();
			}
		}

		useAudioPlayerFun(gameConfig, currentRoundScores);
	};

	// 判断是否是当前回合的最后一名玩家
	function isLastTeamAndLastPlayer(player) {
	    const remainingTeams = state.teamArray.filter(
	        team => !team.isEliminated && !team.tempEliminated
	    );

	    if (remainingTeams.length === 0) return false;

		// 找到最后一个队伍的最后一个玩家
		const lastTeam = remainingTeams[remainingTeams.length - 1];
		const lastPlayer = lastTeam.players[lastTeam.players.length - 1];

		const isLastPlayer = player.id === lastPlayer.id
			&& player.playerId === lastPlayer.playerId
			&& player.playerName === lastPlayer.playerName;

	    return isLastPlayer;
	}

	// 🔥 检查是否所有队伍都完成了当前回合
	function checkAllTeamsCompleted() {
		const remainingTeams = state.teamArray.filter(
			team => !team.isEliminated && !team.tempEliminated
		);

		// 检查每个队伍是否都完成了当前回合
		const allCompleted = remainingTeams.every(team => {
			// 在突然死亡模式中，每个队伍只有一个玩家，完成条件是teamRoundNbr >= 1
			return team.teamRoundNbr >= state.gameState.teamSize;
		});

		return allCompleted;
	}
	
	
	
	

	// 音频动画播放
	const useAudioPlayerFun = (gameConfig, currentRoundScores) => {
		let urlMp4 = useAudioPlayerFunIf(gameConfig, currentRoundScores);
		let urlMp3 = playAudioPlayerFunIf(gameConfig, currentRoundScores);

		if (urlMp4 || urlMp3) {
			urlMp4 ? playerContentRef.value.playVideo(urlMp4, true, () => {}) : "";
			urlMp3 ? useAudioPlayer().playAudio(urlMp3) : "";
		} else {
			useAudioPlayer().playAudio('/static/mp3/jzbk.mp3');
		}
	}

	// 修改获取活动玩家的计算属性
	const getActivePlayer = computed(() => {
		// 确保所有玩家都有完整的数据结构
		state.teamArray.forEach(team => {
			team.players.forEach(player => {
				if (!player.scoreHistory) {
					player.scoreHistory = {
						recentRounds: [],
						currentRound: []
					};
				}
			});
		});

		// 游戏结束后，找到获胜的队伍作为活动玩家显示
		const remainingTeams = state.teamArray.filter(team => !team.isEliminated);
		if (remainingTeams.length === 1) {
			const winningTeam = remainingTeams[0];
			const winningPlayer = winningTeam.players[0];

			return {
				...winningPlayer,
				recentRounds: winningPlayer.scoreHistory?.recentRounds || [],
				currentRoundScores: [],
				currentScore: winningTeam.currentScore
			};
		}

		const activeTeam = state.teamArray.find(team =>
			team.players.find(player => player.isActive)
		);

		if (!activeTeam) return null;

		const activePlayer = activeTeam.players.find(player => player.isActive);
		if (!activePlayer) return null;
		// 确保���分记录结构存在
		if (!activePlayer.scoreHistory) {
			activePlayer.scoreHistory = {
				recentRounds: [],
				currentRound: []
			};
		}

		// 获取当前回合的镖得分
		const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound]?.[activeTeam.team]?.[
			activePlayer.id
		] || [];

		return {
			...activePlayer,
			// 🔧 修复问题1：在加时赛期间显示原始历史记录，而不是清空的记录
			recentRounds: state.isTieBreaker && activePlayer.originalScoreHistory 
				? activePlayer.originalScoreHistory.recentRounds || []
				: activePlayer.scoreHistory?.recentRounds || [],
			// 🔧 修复显示问题：在加时赛期间也要显示当前回合的投镖记录
			currentRoundScores: currentRoundScores,
			currentScore: activeTeam.currentScore
		};
	});

	// 重新开始游戏
	const restart = () => {
		state.teamArray.forEach(team => {
			team.currentScore = team.startingScore;
			team.teamRoundNbr = 0;
			team.isEliminated = false;
			team.tempEliminated = false;
			team.players.forEach(player => {
				// 确保玩家有scoreHistory结构
				if (!player.scoreHistory) {
					player.scoreHistory = {
						recentRounds: [],
						currentRound: []
					};
				} else {
					// 清空玩家的得分记录
					player.scoreHistory.recentRounds = [];
					player.scoreHistory.currentRound = [];
				}
			});
		});

		// 重置游戏状态
		state.gameState.currentRound = 1;
		state.gameState.currentDart = 0;
		state.gameState.roundScores = {
			1: {}
		};

		// 重置第一个玩家为活动状态
		state.teamArray.forEach(team => {
			team.isEliminated = false;
			team.players.forEach(player => {
				player.isActive = false;
			});
		});
		state.teamArray[0].players[0].isActive = true;
		state.gameState.currentTeam = state.teamArray[0].team;
		state.gameState.currentPlayerIndex = 0;

		// 重置作废区域
		state.gameState.forbiddenAreas = [];

		gameCommon.handleGameStart(modeName.value, state.gameState.currentRound, state.teamArray[0].players[0]
			.playerName,playerContentRef)
	};

	// 添加更新分数的方法
	const updateTeamScore = ({
		teamId,
		newScore
	}) => {
		const team = state.teamArray.find(t => t.team === teamId);
		if (team && newScore >= 1) {
			team.currentScore = newScore;
		}
	};

	// 添加计算方法
	const calculateGameResult = (players) => {
		// 深拷贝防止影响原数据
		const sortedPlayers = JSON.parse(JSON.stringify(players));

		// 确保每个玩家都有完整的数据结构
		sortedPlayers.forEach(team => {
			team.players.forEach(player => {
				if (!player.scoreHistory) {
					player.scoreHistory = {
						recentRounds: [],
						currentRound: []
					};
				}
			});
		});

		// 按分数从大到小排序，分数相同时按队伍顺序排序
		return sortedPlayers.sort((a, b) => {
			// 如果分数相同，按队伍编号排序（前面的队伍排在前面）
			if (a.currentScore === b.currentScore) {
				return a.team - b.team;
			}
			// 分数高的排在前面
			return b.currentScore - a.currentScore;
		});
	};

	// 修改玩家每回合淘汰逻辑
	const playerElimination = () => {
    // 过滤出未淘汰且非临时淘汰的队伍
    const activeTeams = state.teamArray.filter(team =>
        !team.isEliminated && !team.tempEliminated
    );

    if (activeTeams.length <= 1) {
        // 如果只剩一个队伍，游戏结束
        const winningTeam = activeTeams[0];
        const playerNames = winningTeam.players.map(player => player.playerName).join('、');
        gameCommon.handleGameEnd('score', playerNames, playerContentRef, true);
        return;
    }

    // 找出总分最低的队伍
    let lowestScore = Infinity;
    let lowestTeams = [];

    activeTeams.forEach(team => {
        if (team.currentScore < lowestScore) {
            lowestScore = team.currentScore;
            lowestTeams = [team];
        } else if (team.currentScore === lowestScore) {
            lowestTeams.push(team);
        }
    });

    // 如果所有队伍分数相同，当前回合不算，继续下一回合
    if (lowestTeams.length === activeTeams.length) {

        showToast(t('suddenDeath_messages.allPlayersSameScore'));

        // 重置所有队伍的轮数，准备下一回合
        state.teamArray.forEach(team => {
            if (!team.isEliminated && !team.tempEliminated) {
                team.teamRoundNbr = 0;
                // 重置玩家状态
                team.players.forEach(player => {
                    player.isActive = false;
                });
            }
        });

        // 重置游戏状态，从第一个存活的队伍开始
        const firstActiveTeam = state.teamArray.find(team => !team.isEliminated && !team.tempEliminated);
        if (firstActiveTeam) {
            state.gameState.currentTeam = firstActiveTeam.team;
            state.gameState.currentPlayerIndex = 0;
            state.gameState.currentDart = 0;
            firstActiveTeam.players[0].isActive = true;

            // 显示新回合开始的提示
            if (bluetooth().isGameStart) {
                // 先增加回合数，然后显示
                const nextRound = state.gameState.currentRound + 1;
                setTimeout(() => {
                    // 等待淘汰弹窗消失后播放新回合动画和音效
                    useAudioPlayer().playAudio('/static/mp3/round1.mp3');
                    gameCommon.showPlayerTransitionText(`ROUND${nextRound}`);
                }, 2000); // 延迟2秒，让弹窗消失
            }
        }

        state.gameState.currentRound++;
        state.delOutFlay = true;
        return;
    }

    // 🔥 新逻辑：一个回合只淘汰一名玩家，多个最低分时加赛
    if (lowestTeams.length === 1) {
        // 只有一个最低分队伍，直接淘汰
        const eliminatedTeam = lowestTeams[0];
        eliminatedTeam.isEliminated = true;
        const eliminatedPlayerNames = eliminatedTeam.players.map(player => player.playerName);
        showToast(getLocalMessage('suddenDeath_messages.teamEliminated', { teamNames: eliminatedPlayerNames.join('、') }));

        console.log(`🎯 [淘汰] 队伍${eliminatedTeam.team}(${eliminatedPlayerNames.join('、')})被淘汰，分数：${eliminatedTeam.currentScore}`);
    } else {
        // 多个队伍同样最低分，进行加赛
        console.log(`🎯 [加赛] ${lowestTeams.length}个队伍同样最低分(${lowestScore}分)，开始加赛`);
        handleTieBreaker(lowestTeams, true); // 第一次加时赛
        return; // 加赛处理中，不继续执行后续逻辑
    }

    // 不在这里增加回合数，在后续的新回合设置中统一处理
    state.delOutFlay = true;
    state.isTieBreaker = false;

    // 淘汰后重新检查剩余队伍
    const remainingTeams = state.teamArray.filter(team => !team.isEliminated);

    // 如果只剩一个队伍，游戏结束
    if (remainingTeams.length === 1) {
        const winningTeam = remainingTeams[0];
        const playerNames = winningTeam.players.map(player => player.playerName).join('、');
        // 延迟播放结束动画，让淘汰弹窗先消失
        setTimeout(() => {
            gameCommon.handleGameEnd('score', playerNames, playerContentRef, true);
        }, 2000);
    } else if (remainingTeams.length > 1) {
        // 还有多个队伍，重置状态并开始新回合
        // 重置所有剩余队伍的状态
        remainingTeams.forEach(team => {
            team.teamRoundNbr = 0;
            team.players.forEach(player => {
                player.isActive = false;
            });
        });

        // 设置第一个剩余队伍的第一个玩家为活动玩家
        const firstRemainingTeam = remainingTeams[0];
        state.gameState.currentTeam = firstRemainingTeam.team;
        state.gameState.currentPlayerIndex = 0;
        state.gameState.currentDart = 0;
        firstRemainingTeam.players[0].isActive = true;

        // 增加回合数
        state.gameState.currentRound++;

        // 显示新回合开始的提示
        if (bluetooth().isGameStart) {
            setTimeout(() => {
                // 等待淘汰弹窗消失后播放新回合动画和音效
                useAudioPlayer().playAudio('/static/mp3/round1.mp3');
                gameCommon.showPlayerTransitionText(`ROUND${state.gameState.currentRound}`);
            }, 2000); // 延迟2秒，让弹窗消失
        }
    }
};

	// 修改处理平局加赛的方法
	const handleTieBreaker = (tieTeams, isFirstTieBreaker = true) => {
		state.isTieBreaker = true;

		// 🔥 只在第一次加时赛时保存原始状态
		if (isFirstTieBreaker) {
			// 保存原始分数和状态
			const originalState = {
				scores: {},
				eliminated: {},
				tempEliminated: {}
			};

			// 保存所有队伍的原始状态
			state.teamArray.forEach(team => {
				originalState.scores[team.team] = team.currentScore;
				originalState.eliminated[team.team] = team.isEliminated;
				originalState.tempEliminated[team.team] = team.tempEliminated || false;

				// 重置临时淘汰状态
				team.tempEliminated = false;

				// 临时标记非平局队伍
				if (!tieTeams.includes(team)) {
					team.tempEliminated = true;
				}
			});

			// 保存原始状态
			state.gameState.originalState = originalState;

			// 🔥 第一次加时赛时重置分数和历史记录
			tieTeams.forEach(team => {
				team.teamRoundNbr = 0;
				team.tieBreakScore = 0;
				
				// 🔧 修复问题1：清理加时赛时的历史记录显示
				team.players.forEach(player => {
					if (player.scoreHistory) {
						// 保存原始历史记录，用于加时赛结束后恢复
						if (!player.originalScoreHistory) {
							player.originalScoreHistory = JSON.parse(JSON.stringify(player.scoreHistory));
						}
						// 清空当前显示的历史记录
						player.scoreHistory.recentRounds = [];
						player.scoreHistory.currentRound = [];
					}
				});
			});

			showToast(t('suddenDeath_messages.startTieBreaker'));
		} else {
			// 🔥 继续加时赛时，只标记非平局队伍为临时淘汰
			state.teamArray.forEach(team => {
				team.tempEliminated = false;
				if (!tieTeams.includes(team)) {
					team.tempEliminated = true;
				}
			});

			// 🔧 修复问题1：继续加时赛时也要清理历史记录
			tieTeams.forEach(team => {
				team.tieBreakScore = 0;
				// 🔧 修复关键问题：重置队伍回合数，防止第一个玩家打两轮
				team.teamRoundNbr = 0;
				team.players.forEach(player => {
					if (player.scoreHistory) {
						player.scoreHistory.recentRounds = [];
						player.scoreHistory.currentRound = [];
					}
				});
			});

			showToast(t('suddenDeath_messages.continueTieBreaker'));
		}

		// 🔧 修复显示问题：清理当前回合的投镖记录，确保加时赛重新开始
		if (state.gameState.roundScores[state.gameState.currentRound]) {
			tieTeams.forEach(team => {
				if (state.gameState.roundScores[state.gameState.currentRound][team.team]) {
					team.players.forEach(player => {
						if (state.gameState.roundScores[state.gameState.currentRound][team.team][player.id]) {
							state.gameState.roundScores[state.gameState.currentRound][team.team][player.id] = [];
						}
					});
				}
			});
		}

		// 重置所有参与队伍的玩家状态
		tieTeams.forEach(team => {
			team.players.forEach(player => {
				player.isActive = false;
			});
		});

		// 设置第一个队伍的第一个玩家为活动状态
		tieTeams[0].players[0].isActive = true;
		state.gameState.currentTeam = tieTeams[0].team;
		state.gameState.currentPlayerIndex = 0;
		// 🔧 修复问题2：加时赛开始时镖数应该从0开始，而不是2
		state.gameState.currentDart = 0;

		state.delOutFlay = true;
	};

	// 修改加时赛结束处理
	const endTieBreaker = (eliminatedTeam = null) => {
		// 恢复所有队伍的原始分数和状态
		state.teamArray.forEach(team => {
			if (state.gameState.originalState.scores[team.team] !== undefined) {
				team.currentScore = state.gameState.originalState.scores[team.team];
				team.tieBreakScore = 0;
			}
			// 恢复原始淘汰和临时淘汰状态
			team.isEliminated = state.gameState.originalState.eliminated[team.team];
			team.tempEliminated = false; // 清除所有临时淘汰状态

			// 🔧 重置队伍回合数，为新回合做准备
			team.teamRoundNbr = 0;

			// 🔧 重置所有玩家的活动状态
			team.players.forEach(player => {
				player.isActive = false;
				
				// 🔧 修复问题1：恢复原始历史记录
				if (player.originalScoreHistory) {
					player.scoreHistory = JSON.parse(JSON.stringify(player.originalScoreHistory));
					delete player.originalScoreHistory; // 清理临时保存的数据
				}
			});
		});

		// 如果有指定的淘汰队伍，标记其为淘汰
		if (eliminatedTeam) {
			eliminatedTeam.isEliminated = true;
			state.gameState.currentRound++;
			state.delOutFlay = true;
			showToast(getLocalMessage('suddenDeath_messages.teamEliminatedInTieBreaker', { teamNames: eliminatedTeam.players.map(p => p.playerName).join('、') }));
		}

		// 清理加时赛状态
		state.isTieBreaker = false;
		state.gameState.originalState = null;
		state.gameState.currentDart = 0;

		// 🔧 重新设置下一个活动玩家
		const remainingTeams = state.teamArray.filter(team => !team.isEliminated);
		if (remainingTeams.length === 1) {
			// 游戏结束
			const winningTeam = remainingTeams[0];
			const playerNames = winningTeam.players.map(player => player.playerName).join('、');
			setTimeout(() => {
				gameCommon.handleGameEnd('score', playerNames, playerContentRef, true);
			}, 500);
		} else {
			// 🔧 游戏继续，设置下一个活动玩家并播放新回合动画
			// 找到第一个未被淘汰的队伍和玩家
			const nextTeam = remainingTeams[0];
			if (nextTeam && nextTeam.players.length > 0) {
				state.gameState.currentTeam = nextTeam.team;
				state.gameState.currentPlayerIndex = 0;
				state.gameState.currentDart = 0;

				// 设置第一个玩家为活动状态
				nextTeam.players[0].isActive = true;

				// 🔥 播放新回合开始的动画和音效
				if (bluetooth().isGameStart) {
					setTimeout(() => {
						// 等待淘汰弹窗消失后播放新回合动画和音效
						useAudioPlayer().playAudio('/static/mp3/round1.mp3');
						gameCommon.showPlayerTransitionText(`ROUND${state.gameState.currentRound}`);
					}, 2000); // 延迟2秒，让弹窗消失
				}
			}
		}
	};

	// 修改换手逻辑
	const moveToNextPlayer = () => {
		// 🔧 防止重复处理换手按钮
		if (isProcessingHandChange.value) {
			return;
		}

		// 设置处理标志
		isProcessingHandChange.value = true;

		try {
			const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
			if (!activeTeam) return;

			const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];
			if (!activePlayer) return;

		// 记录当前玩家是否是最后一名玩家
		const isLastPlayer = isLastTeamAndLastPlayer(activePlayer);

		// 处理跳过投镖的情况
		if (state.isTieBreaker) {
			// 🔧 修复问题：加时赛中如果玩家跳过（没有投镖），记录0分
			if (state.gameState.currentDart === 0) {
				activeTeam.teamRoundNbr++;

				// 初始化回合分数记录
				if (!state.gameState.roundScores[state.gameState.currentRound]) {
					state.gameState.roundScores[state.gameState.currentRound] = {};
				}
				if (!state.gameState.roundScores[state.gameState.currentRound][activeTeam.team]) {
					state.gameState.roundScores[state.gameState.currentRound][activeTeam.team] = {};
				}
				if (!state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id]) {
					state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id] = [];
				}

				// 记录0分投镖
				state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id].push({
					area: 0,
					score: 0,
					originalScore: 0,
					multiplier: 0,
				});

				// 加时赛跳过也要记录到tieBreakScore（0分）
				activeTeam.tieBreakScore = activeTeam.tieBreakScore || 0;
			}
		} else {
			// 正常游戏：如果投掷数量不等于3的话团队轮数+1，并填充剩余镖数为0分
			if (state.gameState.currentDart !== 3) {
				activeTeam.teamRoundNbr++;

				// 初始化回合分数记录
				gameCommon.initializeRoundScore(state, state.gameState.currentRound, activeTeam, activePlayer);

				// 填充剩余的镖数为0分
				const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id];
				const remainingDarts = 3 - state.gameState.currentDart;
				for (let i = 0; i < remainingDarts; i++) {
					currentRoundScores.push({
						area: 0,
						score: 0,
						originalScore: 0,
						multiplier: 0,
					});
				}

				// 🔧 修复问题：更新玩家的scoreHistory，确保左侧回合记录显示0分
				// 确保玩家有得分记录结构
				if (!activePlayer.scoreHistory) {
					activePlayer.scoreHistory = {
						recentRounds: [],
						currentRound: []
					};
				}

				// 计算回合总分（跳过的情况下应该是已投镖的分数）
				const roundTotal = currentRoundScores.reduce((sum, item) => sum + item.score, 0);

				const roundRecord = {
					roundNumber: state.gameState.currentRound,
					scores: [...currentRoundScores],
					teamScore: activeTeam.currentScore,
					total: roundTotal,
				};

				// 更新或添加到历史记录
				const existingRecordIndex = activePlayer.scoreHistory.recentRounds.findIndex(
					record => record.roundNumber === state.gameState.currentRound
				);

				if (existingRecordIndex !== -1) {
					activePlayer.scoreHistory.recentRounds[existingRecordIndex] = roundRecord;
				} else {
					activePlayer.scoreHistory.recentRounds.push(roundRecord);
				}

				// 只保留最近4回合的记录
				if (activePlayer.scoreHistory.recentRounds.length > 4) {
					activePlayer.scoreHistory.recentRounds.shift();
				}
			}
		}

		activePlayer.isActive = false;

		// 计算当前回合中每个团队已完成的投掷轮数
		const currentRoundThrows = {};
		state.teamArray.forEach(team => {
			if (!team.isEliminated && !team.tempEliminated) {
				const teamScores = state.gameState.roundScores[state.gameState.currentRound]?.[team.team] ||
				{};
				currentRoundThrows[team.team] = Object.values(teamScores)
					.filter(scores => Array.isArray(scores) && scores.length === 3)
					.length;
			}
		});

		// 检查是否所有未淘汰队伍都完成了当前回合
		const allTeamsCompleted = state.teamArray
			.filter(team => !team.isEliminated && !team.tempEliminated)
			.every(team => {
				// 在加时赛中，每个玩家只投一镖就算完成
				if (state.isTieBreaker) {
					return team.teamRoundNbr >= team.players.length;
				}
				// 正常比赛需要完成所有镖
				return team.teamRoundNbr >= state.gameState.teamSize;
			});

		// 如果是最后一名玩家，执行回合结算
		if (isLastPlayer) {
			if (state.isTieBreaker) {
				// 加时赛回合结束，进行加时赛淘汰判断
				const tieTeams = state.teamArray.filter(team => !team.isEliminated && !team.tempEliminated);
				let lowestScore = Infinity;
				let lowestTeams = [];

				tieTeams.forEach(team => {
					const teamScore = team.tieBreakScore || 0;
					if (teamScore < lowestScore) {
						lowestScore = teamScore;
						lowestTeams = [team];
					} else if (teamScore === lowestScore) {
						lowestTeams.push(team);
					}
				});

				if (lowestTeams.length === 1) {
					// 有明确的最低分队伍，结束加时赛
					endTieBreaker(lowestTeams[0]);
				} else {
					// 多个队伍同分，继续加时赛
					handleTieBreaker(lowestTeams, false); // 继续加时赛，不重置分数
				}
			} else {
				playerElimination();
			}
			return;
		}

		let nextTeam, nextPlayerIndex;
		if (allTeamsCompleted) {
			// 🔥 加时赛的统计逻辑已经移到blurScore函数中处理
			// 这里只处理正常回合
			if (!state.isTieBreaker) {
				// 正常回合结束，进行淘汰判断
				playerElimination();
			}
			// 加时赛的情况在blurScore中已经处理，这里不需要额外处理

			// 找到第一个未淘汰的队伍
			nextTeam = state.teamArray.find(team => !team.isEliminated && !team.tempEliminated);
			nextPlayerIndex = 0;

			// 重置所有未淘汰队伍的投掷轮数
			state.teamArray.forEach(team => {
				if (!team.isEliminated && !team.tempEliminated) {
					team.teamRoundNbr = 0;
				}
			});
		} else {
			// 突然死亡模式：每个队伍只有一个玩家，直接找下一个未淘汰的队伍
			let currentTeamIndex = state.teamArray.findIndex(t => t.team === state.gameState.currentTeam);
			
			// 🔧 修复问题2：在加时赛中，需要找到下一个还没投过的队伍
			if (state.isTieBreaker) {
				// 加时赛中，找下一个还没投过的队伍
				do {
					currentTeamIndex = (currentTeamIndex + 1) % state.teamArray.length;
					nextTeam = state.teamArray[currentTeamIndex];
				} while (nextTeam.isEliminated || nextTeam.tempEliminated || nextTeam.teamRoundNbr >= 1);
			} else {
				// 正常游戏中，找下一个未淘汰的队伍
				do {
					currentTeamIndex = (currentTeamIndex + 1) % state.teamArray.length;
					nextTeam = state.teamArray[currentTeamIndex];
				} while (nextTeam.isEliminated || nextTeam.tempEliminated);
			}

			// 突然死亡模式每个队伍只有一个玩家，索引始终为0
			nextPlayerIndex = 0;
		}

		// 确保找到了有效的下一个队伍和玩家
		if (nextTeam && nextTeam.players && nextTeam.players[nextPlayerIndex]) {
			// 设置下一个投掷者
			state.gameState.currentTeam = nextTeam.team;
			state.gameState.currentPlayerIndex = nextPlayerIndex;
			nextTeam.players[nextPlayerIndex].isActive = true;

			// 🔧 修复问题2：加时赛状态下镖数也应该从0开始
			state.gameState.currentDart = 0;

			// 显示过场动画
			if (bluetooth().isGameStart) {
				// 总是播放换手动画和音效（除非是游戏刚开始）
				console.log('🎯 [换手动画] 播放换手动画和音效, delOutFlay:', state.delOutFlay);
				useAudioPlayer().playAudio('/static/mp3/nextPalyer.mp3');
				if (playerContentRef.value) {
					playerContentRef.value.playVideo("/static/gif/NEXT-PALYER-2S.gif", true, () => {});
				}

				// 重置新回合标志
				if (state.delOutFlay) {
					state.delOutFlay = false;
				}
			}
		}
	} finally {
		// 延迟重置换手处理标志
		setTimeout(() => {
			isProcessingHandChange.value = false;
		}, 500);
	}
};
  const getDomMessage  = async (id) => {
    await agreement.Api.findById(id)
        .then((res=>{
          showToast({
            title: res.title,
            message: res.content,
            isSticky: true
          });
        }))
  }

  // 页面卸载时清理资源
  onUnload(() => {
    // 🔧 优化：退出游戏时保持蓝牙连接，提升用户体验
    // 用户可以在不同游戏之间切换而无需重新连接蓝牙

  });
</script>

<template>

	<view class="uni-body container backgroundImageByType">
		<view class="uni-flex uni-column uni-h-full uni-space-between">
			<view class="uni-h-full">
				<PlayerContent :calculateResult="calculateGameResult" ref="playerContentRef"
					:forbiddenAreas="state.gameState.forbiddenAreas" :type="state.modeEntity.type"
					@restart="gameCommon.restartGame(restart)" @endGame="gameCommon.endGame('/pages/game/home/index')"
					@rethrow="gameCommon.routineRethrowCurrentRound(state,deductionRethrowCurrentRound)"
					@showRules="getDomMessage(9)" @updateScore="updateTeamScore"
					@move-to-next-player="moveToNextPlayer" :teams="state.teamArray"
					:change-turn="state.gameState.isRoundEnd" :mode="modeName" :player="getActivePlayer"
					:max-round="state.gameState.maxRounds" :round="state.gameState.currentRound" />
			</view>
			<team-display :players="state.teamArray" />
		</view>

		<!-- 加过场动画组件 -->
		<transition-screen v-model:show="gameCommon.gameCommonState.transitionState.show"
			:text="gameCommon.gameCommonState.transitionState.text" />
		<transition-screen-text v-model:show="gameCommon.gameCommonState.transitionStateText.show"
			:text="gameCommon.gameCommonState.transitionStateText.text" />
		<!-- 调试面板 -->
<!-- 		 <debug-panel-->
<!--       :current-round="state.gameState.currentRound"-->
<!--       :current-dart="state.gameState.currentDart"-->
<!--       @throw-dart="(data)=>bluetooth().setScoreCallback(data)"-->
<!--   />-->
	</view>
</template>

<style scoped lang="scss">
.backgroundImageByType{
//   background-image: url("@/static/images/game/suddenDeath/suddenDeathBackground.png");
  background-size: 310rpx 310rpx;
  background-repeat: no-repeat;
  background-position: center;
}
</style>