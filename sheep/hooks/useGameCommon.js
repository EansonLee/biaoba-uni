import {reactive} from 'vue';
import sheep from "@/sheep";
import {getGameConfig, scoreConfig} from "@/sheep/config/bluetoothConfig";
import games from "@/sheep/api/dart/games";
import cacheUtil from "@/sheep/request/util";
import {showToast} from "@/sheep/util/toast";
import bluetooth from "@/sheep/stores/bluetooth";
import gameConfig from '@/sheep/config/gameConfig.json';
import {useAudioPlayer} from "@/sheep/util/useAudioPlayer";
import eventBus from '@/sheep/util/eventBus';
// 游戏通用状态
const gameCommonState = reactive({
    transitionState: {
        show: false,
        text: ''
    },
    transitionStateText: {
        show: false,
        text: ''
    }
});

export function useGameCommon() {

    // 防重复：结束音效只播放一次
    let finishAudioPlayed = false;

    // 游戏开始动画
    const handleGameStart = (gameName, round, userName,gameResult = null) => {
        bluetooth().isGameStart = true;
        // 重置结束音效的播放标志
        finishAudioPlayed = false;
        // showPlayerTransition(`${gameName}游戏开始`);
        // showPlayerTransition(`第${round}回合`);

        showPlayerTransitionText(`ROUND${round}`)
        if(gameResult && gameResult.value){
            // gameResult.value.playVideo("/static/gif/ROUND1-3s-(1)3.gif", true, () => {});
        }
        if (gameResult && !gameResult.value) {
            // gameResult.playVideo("/static/gif/ROUND1-3s-(1)3.gif", true, () => {});
        }
        useAudioPlayer().playAudio('/static/mp3/round1.mp3')
        // 睡眠一秒
        // 显示过渡动画
        // setTimeout(() => {
        //     showPlayerTransition(`${userName}的回合`);
        // }, 2000)
    };

    // 下一回合动画
    const handleNextRound = (round, roundType) => {
        console.log('下一回合动画：'+roundType)
        // 显示过渡动画
        // showPlayerTransition(`第${round}回合`);
        if(roundType === "Final Round"){
            showPlayerTransitionText(`Final Round`)
        }else{
            showPlayerTransitionText(`ROUND${round}`)
        }
        // 睡眠一秒
        // setTimeout(() => {
        //     // 显示过渡动画
        //     showPlayerTransition(`${userName}的回合`);
        // }, 2000)
    };

    // 从配置里获取对应分数
    const getScore = (gameName) => {
        const score = getGameConfig[gameName];
        return score ? score : {};
    };

    // 显示玩家切换动画
    const showPlayerTransition = (text) => {
        gameCommonState.transitionState.text = text;
        gameCommonState.transitionState.show = true;
    };

    // 显示玩家切换ROUND文字
    const showPlayerTransitionText = (text) => {
        gameCommonState.transitionStateText.text = text;
        gameCommonState.transitionStateText.show = true;
    };


    // 混合模式结束当局并跳转到下一局 游戏处理
    const mixedModeGameEnd = (state) => {
        // 仅在没有统计时才初始化，避免累计胜场被重置
        if (!state.params.tameWin) {
            if (state.params.modeEntity && state.params.modeEntity.tameWin) {
                state.params.tameWin = state.params.modeEntity.tameWin;
            } else {
                state.params.tameWin = {
                    teamIdWin:[], //胜利者id
                    teamIdfail:[], //失败者id
                };
            }
        }

        // 兜底：确保当前这局的模式被标记为完成（避免“下一局”仍回到同一模式）
        try {
            const currentId = state?.modeEntity?.id || state?.params?.modeEntity?.id;
            const currentStart = (state?.modeEntity?.startingScore ?? state?.params?.modeEntity?.startingScore);
            if (Array.isArray(state?.params?.modes) && currentId) {
                state.params.modes.forEach(m => {
                    if (m && m.id === currentId && (currentStart == null || m.startingScore === currentStart)) {
                        m.status = true;
                    }
                });
            }
        } catch(e) {}

        // 防重复：若已记录的胜场数 >= 已完成的模式数，则不再重复写入胜负
        try {
            const finishedCount = Array.isArray(state.params.modes) ? state.params.modes.filter(m => m && m.status).length : 0;
            const recordedWins = Array.isArray(state.params.tameWin.teamIdWin) ? state.params.tameWin.teamIdWin.length : 0;
            if (finishedCount > 0 && recordedWins >= finishedCount) {
                const gameConfigElement = gameConfig[8];
                let url = gameConfigElement.url;
                sheep.$router.go(url, state.params, 'reLaunch');
                return;
            }
        } catch (e) {
            // 忽略防御性判断异常
        }

        // 处理不同游戏类型的胜负记录
        if(state.modeEntity.type === 1){
            // 🔧 修复：01模式直接使用传递的本局胜利者信息
            let currentWinner = null;

            // 首先尝试从直接传递的信息中获取本局胜利者
            if(state.params.currentGameWinner) {
                const winnerTeamId = state.params.currentGameWinner.team;
                currentWinner = state.teamArray.find(team => team.team === winnerTeamId);
                console.log(`[混合模式] 从传递信息获取本局胜利者: 队伍${winnerTeamId}(${state.params.currentGameWinner.playerName})`);
            }

            // 如果没有传递信息，使用备用逻辑
            if(!currentWinner) {
                console.log(`[混合模式] 无传递信息，使用备用逻辑分析本局胜利者`);

                // 找到本局刚刚获得win属性增加的队伍（即本局胜利者）
                const currentGameNumber = state.params.tameWin.teamIdWin.length + 1;

                for(let team of state.teamArray) {
                    const teamWins = team.players[0].win || 0;
                    console.log(`[混合模式] 队伍${team.team}(${team.players[0].playerName}) 当前胜利次数: ${teamWins}`);

                    // 如果这个队伍的win次数等于当前局数，说明它是本局胜利者
                    if(teamWins === currentGameNumber) {
                        currentWinner = team;
                        console.log(`[混合模式] 通过win次数找到本局胜利者: 队伍${team.team}(${team.players[0].playerName})`);
                        break;
                    }
                }

                // 如果还是没有找到，找win次数最多的队伍
                if(!currentWinner) {
                    let maxWins = -1;
                    for(let team of state.teamArray) {
                        const teamWins = team.players[0].win || 0;
                        if(teamWins > maxWins) {
                            maxWins = teamWins;
                            currentWinner = team;
                        }
                    }
                }
            }

            if(currentWinner) {
                // 记录本局胜利者
                state.params.tameWin.teamIdWin.push(currentWinner.team);

                // 记录本局失败者（其他所有队伍）
                state.teamArray.forEach(team => {
                    if (team.team !== currentWinner.team) {
                        state.params.tameWin.teamIdfail.push(team.team);
                    }
                });

                console.log(`[混合模式] 记录本局胜利者: 队伍${currentWinner.team}(${currentWinner.players[0].playerName})`);

                // 清除临时信息
                delete state.params.currentGameWinner;
            } else {
                console.error('[混合模式] 无法确定本局胜利者，使用默认逻辑');
                // 降级处理：使用原来的逻辑
                state.params.tameWin.teamIdWin.push(state.teamArray[0].team);
                state.params.tameWin.teamIdfail.push(state.teamArray[1].team);
            }
        } else if(state.modeEntity.type === 2){
            // 🔧 修复：米老鼠模式直接使用传递的本局胜利者信息（已考虑分数、开区数量和邀请方）
            let currentWinner = null;

            // 首先尝试从直接传递的信息中获取本局胜利者
            if(state.params.currentGameWinner) {
                const winnerTeamId = state.params.currentGameWinner.team;
                currentWinner = state.teamArray.find(team => team.team === winnerTeamId);
                console.log(`[混合模式-米老鼠] 从传递信息获取本局胜利者: 队伍${winnerTeamId}(${state.params.currentGameWinner.playerName})`);
            }

            // 如果没有传递信息，使用备用逻辑
            if(!currentWinner) {
                console.log(`[混合模式-米老鼠] 无传递信息，使用备用逻辑分析本局胜利者`);

                // 找到本局刚刚获得win属性增加的队伍（即本局胜利者）
                const currentGameNumber = state.params.tameWin.teamIdWin.length + 1;

                for(let team of state.teamArray) {
                    const teamWins = team.players[0].win || 0;
                    console.log(`[混合模式-米老鼠] 队伍${team.team}(${team.players[0].playerName}) 当前胜利次数: ${teamWins}`);

                    // 如果这个队伍的win次数等于当前局数，说明它是本局胜利者
                    if(teamWins === currentGameNumber) {
                        currentWinner = team;
                        console.log(`[混合模式-米老鼠] 通过win次数找到本局胜利者: 队伍${team.team}(${team.players[0].playerName})`);
                        break;
                    }
                }

                // 如果还是没有找到，找win次数最多的队伍
                if(!currentWinner) {
                    let maxWins = -1;
                    for(let team of state.teamArray) {
                        const teamWins = team.players[0].win || 0;
                        if(teamWins > maxWins) {
                            maxWins = teamWins;
                            currentWinner = team;
                        }
                    }
                }

                // 如果还是没有，按分数排序（注意：这里不考虑开区数，因为该逻辑应该在游戏页面处理）
                if(!currentWinner) {
                    currentWinner = state.teamArray[0];
                    let maxScore = currentWinner.currentScore || 0;
                    state.teamArray.forEach(team => {
                        if ((team.currentScore || 0) > maxScore) {
                            maxScore = team.currentScore;
                            currentWinner = team;
                        }
                    });
                }
            }

            if(currentWinner) {
                // 记录本局胜利者
                state.params.tameWin.teamIdWin.push(currentWinner.team);

                // 记录本局失败者（其他所有队伍）
                state.teamArray.forEach(team => {
                    if (team.team !== currentWinner.team) {
                        state.params.tameWin.teamIdfail.push(team.team);
                    }
                });

                console.log(`[混合模式-米老鼠] 记录本局胜利者: 队伍${currentWinner.team}(${currentWinner.players[0].playerName})`);

                // 清除临时信息
                delete state.params.currentGameWinner;
            } else {
                console.error('[混合模式-米老鼠] 无法确定本局胜利者，使用默认逻辑');
                // 降级处理：使用原来的逻辑
                state.params.tameWin.teamIdWin.push(state.teamArray[0].team);
                state.params.tameWin.teamIdfail.push(state.teamArray[1].team);
            }
        } else {
            // 🔧 修复：其他游戏类型记录本局的胜利者

            // 找到本局的胜利者
            let currentWinner = null;
            const currentGameNumber = state.params.tameWin.teamIdWin.length + 1;

            for(let team of state.teamArray) {
                const teamWins = team.players[0].win || 0;

                // 如果这个队伍的win次数等于当前局数，说明它是本局胜利者
                if(teamWins === currentGameNumber) {
                    currentWinner = team;
                    break;
                }
            }

            // 如果没有找到明确的本局胜利者，使用备用逻辑
            if(!currentWinner) {

                // 首先尝试根据win属性找到最近的胜利者
                let maxWins = -1;
                for(let team of state.teamArray) {
                    const teamWins = team.players[0].win || 0;
                    if(teamWins > maxWins) {
                        maxWins = teamWins;
                        currentWinner = team;
                    }
                }

                // 如果还是没有，按分数排序
                if(!currentWinner || maxWins === 0) {
                    console.log('[混合模式] 按分数排序确定本局胜利者');
                    const sortedTeams = [...state.teamArray].sort((a, b) => {
                        return (b.currentScore || 0) - (a.currentScore || 0);
                    });
                    if (sortedTeams.length > 0) {
                        currentWinner = sortedTeams[0];
                    }
                }
            }

            if(currentWinner) {
                state.params.tameWin.teamIdWin.push(currentWinner.team);
                state.teamArray.forEach(team => {
                    if (team.team !== currentWinner.team) {
                        state.params.tameWin.teamIdfail.push(team.team);
                    }
                });
                console.log(`[混合模式] 记录本局胜利者: 队伍${currentWinner.team}(${currentWinner.players[0].playerName})`);
            }
        }
        // 🔧 修复：在切换到下一个游戏前，重置所有队伍的HighCheckout相关状态
        state.teamArray.forEach(team => {
            team.inScoreRange = undefined;
            team.dartsInScoreRange = undefined;
            console.log(`[混合模式] 重置队伍${team.team}的HighCheckout状态`);
        });

        const gameConfigElement = gameConfig[8];
        let url = gameConfigElement.url;
        sheep.$router.go(url, state.params, 'reLaunch');
    };

    // 游戏结束处理
    const handleGameEnd = (reason, name = null, gameResult, showFinish, modeEnd) => {
        if (showFinish===undefined || showFinish===null){
            showFinish = true;
        }
        console.log("游戏结束："+showFinish)
        bluetooth().isGameStart = false;
        let message = '';
        if (reason === 'rounds') {
            message = '游戏结束：达到最大回合数';
        } else if (reason === 'score') {
            message = `游戏结束：队伍 ${name} 胜利！`;
        } else if (reason === 'blockade') {
            message = '游戏结束：所有分区都已作废';
        } else if(reason === "opponentEndGame"){
            message = '游戏结束：对手退出了游戏';
        }else if(reason === "endGame"){
            message = '游戏结束';
        }

        const showResultPopup = () => {
            if(gameResult && gameResult.value){
                gameResult.value.gameEndPostStatistics(); //结算统计
                gameResult.value.show();
            } else if (gameResult) {
                gameResult.gameEndPostStatistics(); //结算统计
                gameResult.show();
            }
        };

        if(gameResult && showFinish){
            console.log("播放：/static/gif/finish01.24s.gif");
            // 播放结束音效（防重复）
            if (!finishAudioPlayed) {
                try { useAudioPlayer().playAudio('/static/mp3/finish.mp3'); } catch(e) {}
                finishAudioPlayed = true;
            }
            // 播放结束动画，并依赖其回调来显示结果
            gameResult.value.playVideo("/static/gif/finish01.24s.gif", true, () => {
                showResultPopup();
            });
        } else {
            // 如果没有动画，直接显示结算弹窗（由调用方决定是否播放音效）
            showResultPopup();
        }
    };

    // 重新开始游戏
const restartGame = (onConfirm) => {
        try { eventBus.emit('log:gameEvent', { action: 'RESTART_GAME_UI', source: 'ui', timestamp: Date.now() }); } catch(e) {}
        bluetooth().isGameStart = true;
        onConfirm();
    };

    // 游戏结束
const endGame = (url) => {
        try { eventBus.emit('log:gameEvent', { action: 'END_GAME_UI', source: 'ui', timestamp: Date.now() }); } catch(e) {}
        bluetooth().isGameStart = false;

        if (url) {
            sheep.$router.redirect(url)
        } else {
            sheep.$router.back();
        }
    };

    // 显示游戏规则
    const showGameRules = async (id) => {
        const locale = uni.getStorageSync("locale");
        const data = await cacheUtil.fetchWithCache(id + '_game_project', games.Api.getGameById, id, 1800);
        showToast({
            title: '游戏说明',
            message: locale === 'zh' ? data.chineseDescription : data.englishDescription,
            isSticky: true
        });
    };
    /**
     * 01加分的重投方法
     * @param {Object} gameState 当前游戏状态
     * @param {Array} teamArray 队伍数组
     */
const rethrowCurrentRound = (gameState, teamArray) => {
        try { eventBus.emit('log:gameEvent', { action: 'RETHROW_UI', source: 'ui', timestamp: Date.now() }); } catch(e) {}
        
        
        // 检查回合状态
        if (gameState.currentDart === 0) {
            const locale = uni.getStorageSync("locale");
            showToast({
                message: `${locale === "zh" ? "当前回合还未开始 " : "You have not started the round"  } `,
                icon: 'none',
            });
            return;
        }

        const activeTeam = teamArray.find(t => t.team === gameState.currentTeam);
        if (!activeTeam) return;

        // 减少团队轮数（如果是最后一镖）
        if (gameState.currentDart === 3) {
            activeTeam.teamRoundNbr--;
        }

        const activePlayer = activeTeam.players[gameState.currentPlayerIndex];
        if (!activePlayer) return;

        // 获取当前回合的得分记录
        const currentRoundScores =
            gameState.roundScores[gameState.currentRound]?.[activeTeam.team]?.[activePlayer.id] || [];

        // 恢复开局状态：如果本回合开始前未开区，而本回合中开了区，重投应回到未开区状态（玩家 + 团队）
        if (Object.prototype.hasOwnProperty.call(activePlayer, 'hasStartedAtRoundStart')) {
            activePlayer.hasStarted = !!activePlayer.hasStartedAtRoundStart;
        }
        if (Object.prototype.hasOwnProperty.call(activeTeam, 'teamHasStartedAtRoundStart')) {
            activeTeam.teamHasStarted = !!activeTeam.teamHasStartedAtRoundStart;
        }

        // 🔧 修复：记录当前回合投了多少镖，用于重置AVE统计
        const dartsThrown = gameState.currentDart;
        console.log(`🎯 [重投] 玩家${activePlayer.playerName || activePlayer.name}当前回合已投${dartsThrown}镖`);

        // 以历史记录为准，计算本回合“已计入AVE”的分数（爆镖回合应为0）
        let countedRoundTotal = 0;
        try {
            const rec = (activePlayer.scoreHistory?.recentRounds || []).find(r => r.roundNumber === gameState.currentRound);
            if (rec) countedRoundTotal = Number(rec.total) || 0;
        } catch (e) {}
        // 无历史记录时兜底：用本回合分数总和
        if (countedRoundTotal === 0 && (!activePlayer.scoreHistory || !activePlayer.scoreHistory.recentRounds?.length)) {
            countedRoundTotal = currentRoundScores.reduce((sum, item) => sum + (Number(item?.score) || 0), 0);
        }

        // 恢复团队分数：优先回到回合开始时快照
        const snapshot = Number(activeTeam._scoreAtRoundStart);
        if (!Number.isNaN(snapshot)) {
            activeTeam.currentScore = snapshot;
        } else {
            activeTeam.currentScore += countedRoundTotal;
        }

        // 恢复个人分数（若有）
        if (activePlayer.currentScore) {
            activePlayer.currentScore += countedRoundTotal;
        }

        // 🔧 修复：重置AVE统计 - 回退本回合“已计入”的统计数据（镖数回退，得分按countedRoundTotal回退）
        if (gameState.averageScores && gameState.averageScores[activePlayer.id]) {
            const avgStats = gameState.averageScores[activePlayer.id];
            
            // 减去本回合已投的镖数
            const oldDartCount = avgStats.currentDartAverage || 0;
            avgStats.currentDartAverage = Math.max(0, oldDartCount - dartsThrown);
            
            // 减去本回合“已计入AVE”的得分
            const oldScoreAverage = avgStats.scoreAverage || 0;
            avgStats.scoreAverage = Math.max(0, oldScoreAverage - countedRoundTotal);
            
            // 如果已经投完3镖并且增加了回合数，需要回退
            if (dartsThrown === 3 && avgStats.currentRound > 0) {
                avgStats.currentRound = Math.max(0, avgStats.currentRound - 1);
                console.log(`🎯 [重投-AVE回滚] 回合数从${avgStats.currentRound + 1}回退到${avgStats.currentRound}`);
            }
            
            console.log(`🎯 [重投-AVE重置] 玩家${activePlayer.playerName || activePlayer.name}的镖数从${oldDartCount}减到${avgStats.currentDartAverage}，得分从${oldScoreAverage}减到${avgStats.scoreAverage}（本回合回退=${countedRoundTotal}）`);
        }

        // 清空当前回合的投掷记录
        if (gameState.roundScores[gameState.currentRound]?.[activeTeam.team]) {
            gameState.roundScores[gameState.currentRound][activeTeam.team][activePlayer.id] = [];
        }

        // 重置当前镖数
        gameState.currentDart = 0;

        // 更新玩家的得分历史记录
        if (activePlayer.scoreHistory) {
            const currentRoundIndex = activePlayer.scoreHistory.recentRounds.findIndex(
                round => round.roundNumber === gameState.currentRound
            );
            if (currentRoundIndex !== -1) {
                activePlayer.scoreHistory.recentRounds.splice(currentRoundIndex, 1);
            }
        }

        console.log(`🎯 [重投完成] 玩家${activePlayer.playerName || activePlayer.name}的当前回合已重置，AVE统计已回退`);
        
        // 显示提示
        // showToast({
        //     message: '重投成功',
        //     icon: 'none',
        // });
    };

    /**
     * 常规游戏的重投方法
     */
    const routineRethrowCurrentRound = (state, startOnConfirm, endOnConfirm) => {
        // 检查回合状态
        if (state.gameState.currentDart === 0) {
            const locale = uni.getStorageSync("locale");
            showToast({
                message: `${locale === "zh" ? "当前回合还未开始 " : "You have not started the round"  } `,
                icon: 'none',
            });
            return;
        }

        if (startOnConfirm) {
            const startOnConfirm1 = startOnConfirm();
            if (startOnConfirm1 === 'end') {
                return;
            }
        }

        const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
        const activePlayer = activeTeam?.players[state.gameState.currentPlayerIndex];

        if (!activePlayer) return;

        // 获取当前回合的得分记录
        const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound]?.[activeTeam.team]?.[activePlayer.id] || [];

        // 减少团队轮数（如果是最后一镖）
        if (state.gameState.currentDart === 3) {
            activeTeam.teamRoundNbr--;
        }

        // 减去当前回合的分数
        const scoreToDeduct = currentRoundScores.reduce((sum, score) => sum + score.score, 0);
        activeTeam.currentScore -= scoreToDeduct;

        // 清空当前回合的投掷记录
        state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id] = [];

        // 重置当前镖数
        state.gameState.currentDart = 0;

        // 同步重置左侧回合记录：移除当前回合在recentRounds中的记录
        if (activePlayer.scoreHistory) {
            const currentRoundIndex = activePlayer.scoreHistory.recentRounds.findIndex(
                round => round.roundNumber === state.gameState.currentRound
            );
            if (currentRoundIndex !== -1) {
                activePlayer.scoreHistory.recentRounds.splice(currentRoundIndex, 1);
            }
        }

        if (endOnConfirm) {
            endOnConfirm();
        }
    }
    /**
     * 米老鼠游戏减分的重投方法
     */
    const deductionRethrowCurrentRound = (state) => {
        const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
        const activePlayer = activeTeam?.players[state.gameState.currentPlayerIndex];

        if (!activePlayer) return;

        // 获取当前回合的得分记录
        const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound]?.[activeTeam.team]?.[activePlayer.id] || [];
        
        // 🔧 修复：记录当前回合投了多少镖，用于重置MPR和AVE
        const dartsThrown = state.gameState.currentDart;
        console.log(`🎯 [重投] 玩家${activePlayer.playerName || activePlayer.name}当前回合已投${dartsThrown}镖`);
        
        // 🔧 修复：如果已经投完3镖，需要从completedRounds中移除本回合数据
        if (dartsThrown === 3 && activePlayer.mprStats && activePlayer.mprStats.completedRounds.length > 0) {
            // 检查最后一个完成的回合是否是当前回合（通过检查是否刚刚保存）
            const lastCompletedRound = activePlayer.mprStats.completedRounds[activePlayer.mprStats.completedRounds.length - 1];
            const currentRoundMultiplier = currentRoundScores.reduce((sum, item) => {
                if (item.originalScore >= 15) {
                    if (item.multiplier >= 1 && item.multiplier <= 3) {
                        return sum + item.multiplier;
                    } else if (item.multiplier === 4) {
                        return sum + 2; // 内牛眼算2倍
                    } else if (item.multiplier === 5) {
                        return sum + 1; // 外牛眼算1倍
                    }
                }
                return sum;
            }, 0);
            
            // 如果最后保存的回合倍数与当前回合倍数相同，说明是本回合的数据
            if (lastCompletedRound === currentRoundMultiplier) {
                // 移除最后一个已完成的回合
                const removedMultiplier = activePlayer.mprStats.completedRounds.pop();
                // 更新总倍数
                activePlayer.mprStats.totalMultiplier = activePlayer.mprStats.completedRounds.reduce(
                    (sum, total) => sum + total,
                    0
                );
                console.log(`🎯 [重投-MPR回滚] 玩家${activePlayer.playerName || activePlayer.name}已投完3镖，从completedRounds移除本回合倍数:${removedMultiplier}，剩余回合数:${activePlayer.mprStats.completedRounds.length}`);
            }
        }

        // 遍历当前回合的每个得分记录，撤销其效果
        currentRoundScores.forEach(throwRecord => {
            const scoringArea = throwRecord.area === 'B' ? '21' : throwRecord.area;
            const areaLock = state.teamLocks[activeTeam.team][scoringArea];

            if (areaLock) {
                // 记录原始状态
                const originalCount = areaLock.count;
                const wasLocked = areaLock.locked;

                // 如果是倍数区，需要减去相应的次数
                const multiplier = throwRecord.multiplier || 1;
                areaLock.count = Math.max(0, areaLock.count - multiplier);

                // 如果撤销后命中次数小于3，重置锁定状态
                if (areaLock.count < 3 && !wasLocked) {
                    areaLock.locked = true;
                    // 从作废区域列表中移除（如果存在）
                    const forbiddenIndex = state.gameState.forbiddenAreas.indexOf(parseInt(scoringArea));
                    if (forbiddenIndex !== -1) {
                        state.gameState.forbiddenAreas.splice(forbiddenIndex, 1);
                    }
                }
            }
        });
        
        // 🔧 修复：重置MPR统计 - 将当前回合的预期倍数重置为[0,0,0]
        if (activePlayer.mprStats) {
            const oldExpected = [...activePlayer.mprStats.currentRoundExpected];
            activePlayer.mprStats.currentRoundExpected = [0, 0, 0];
            console.log(`🎯 [重投-MPR重置] 玩家${activePlayer.playerName || activePlayer.name}的currentRoundExpected从[${oldExpected.join(',')}]重置为[0,0,0]`);
        }
        
        // 🔧 修复：重置AVE统计 - 减去本回合已投的镖数和倍数
        if (state.gameState.averageScores && state.gameState.averageScores[activePlayer.id]) {
            const avgStats = state.gameState.averageScores[activePlayer.id];
            
            // 减去本回合已投的镖数
            const oldDartCount = avgStats.currentDartAverage || 0;
            avgStats.currentDartAverage = Math.max(0, oldDartCount - dartsThrown);
            
            // 计算本回合已产生的倍数总和
            let roundMultiplierTotal = 0;
            currentRoundScores.forEach(throwRecord => {
                // 只计算有效区域的倍数
                if (throwRecord.originalScore >= 15) {
                    if (throwRecord.multiplier >= 1 && throwRecord.multiplier <= 3) {
                        roundMultiplierTotal += throwRecord.multiplier;
                    } else if (throwRecord.multiplier === 4) {
                        roundMultiplierTotal += 2; // 内牛眼算2倍
                    } else if (throwRecord.multiplier === 5) {
                        roundMultiplierTotal += 1; // 外牛眼算1倍
                    }
                }
            });
            
            // 减去本回合的倍数总和
            const oldScoreAverage = avgStats.scoreAverage || 0;
            avgStats.scoreAverage = Math.max(0, oldScoreAverage - roundMultiplierTotal);
            
            console.log(`🎯 [重投-AVE重置] 玩家${activePlayer.playerName || activePlayer.name}的镖数从${oldDartCount}减到${avgStats.currentDartAverage}，倍数从${oldScoreAverage}减到${avgStats.scoreAverage}`);
        }

        // 重置得分记录
        state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id] = [];

        // 清除历史记录中的当前回合记录
        if (activePlayer.scoreHistory) {
            activePlayer.scoreHistory.recentRounds = activePlayer.scoreHistory.recentRounds.filter(
                record => record.roundNumber !== state.gameState.currentRound
            );
        }

        // 重置当前镖数
        state.gameState.currentDart = 0;

        // 重新计算总分
        activeTeam.currentScore = 0;
        Object.values(state.gameState.roundScores).forEach(roundData => {
            if (roundData[activeTeam.team]?.[activePlayer.id]) {
                roundData[activeTeam.team][activePlayer.id].forEach(score => {
                    if (!state.teamLocks[activeTeam.team][score.area === 'B' ? '21' : score.area].locked) {
                        activeTeam.currentScore += score.area === 'B' ? 25 : parseInt(score.area);
                    }
                });
            }
        });
        
        console.log(`🎯 [重投完成] 玩家${activePlayer.playerName || activePlayer.name}的当前回合已重置`);
    };
    /**
     * 用于处理空靶问题
     * @param state
     * @param currentRound
     * @param activeTeam
     * @param activePlayer
     */
    const initializeRoundScore = (state, currentRound, activeTeam, activePlayer) => {
        // 确保当前轮次的 roundScores 存在
        if (!state.gameState.roundScores[currentRound]) {
            state.gameState.roundScores[currentRound] = {};
        }

        // 确保当前团队的 roundScores 存在
        if (!state.gameState.roundScores[currentRound][activeTeam.team]) {
            state.gameState.roundScores[currentRound][activeTeam.team] = {};
        }

        // 确保当前玩家的 roundScores 存在
        if (!state.gameState.roundScores[currentRound][activeTeam.team][activePlayer.id]) {
            state.gameState.roundScores[currentRound][activeTeam.team][activePlayer.id] = [];
        }

        const roundScoreElement = state.gameState.roundScores[currentRound][activeTeam.team][activePlayer.id];
        // 将分数数组填充到长度 3
        while (roundScoreElement.length < 3) {
            roundScoreElement.push({
                multiplier: 0,
                originalScore: 0,
                score: 0
            });
        }
    };

    /**
     * 换手处理
     * @param state
     * @param gameResult
     * @param onConfirm
     * @param startOnConfirm
     */
const moveToNextPlayer = (state, gameResult, onConfirm, startOnConfirm) => {
        // 获取当前活动团队
        const activeTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
        if (!activeTeam) return;

        // 获取当前玩家
        const activePlayer = activeTeam.players[state.gameState.currentPlayerIndex];
        if (!activePlayer) return;

        if (startOnConfirm) {
            startOnConfirm(activeTeam, activePlayer);
        }

        // 如果投掷数量不等于 3，团队轮数 +1
        if (state.gameState.currentDart !== 3) {
            activeTeam.teamRoundNbr++;

            // 初始化当前玩家的 roundScore（填充空镖）
            initializeRoundScore(state, state.gameState.currentRound, activeTeam, activePlayer);
            
            // 更新统计数据以包含空镖
            const currentRoundScores = state.gameState.roundScores[state.gameState.currentRound][activeTeam.team][activePlayer.id];
            const missingDarts = 3 - state.gameState.currentDart; // 计算缺失的镖数
            
            // 🔥 修复AVE计算：确保每个回合按3镖计算，但避免重复累加
            console.log(`🎯 [AVE修复] 玩家${activePlayer.name}换手，当前镖数:${state.gameState.currentDart}，当前总镖数:${state.gameState.averageScores[activePlayer.id]?.currentDartAverage}`);
            
            // 计算当前回合应该有的总镖数（当前回合数 × 3）
            const expectedTotalDarts = state.gameState.currentRound * 3;
            
            // 如果当前总镖数少于期望值，补充到期望值
            if (state.gameState.averageScores[activePlayer.id]) {
                const currentTotalDarts = state.gameState.averageScores[activePlayer.id].currentDartAverage;
                if (currentTotalDarts < expectedTotalDarts) {
                    const dartsToAdd = expectedTotalDarts - currentTotalDarts;
                    state.gameState.averageScores[activePlayer.id].currentDartAverage = expectedTotalDarts;
                    console.log(`🎯 [AVE修复] 玩家${activePlayer.name}补充${dartsToAdd}个镖数，总镖数更新为:${expectedTotalDarts}`);
                } else {
                    console.log(`🎯 [AVE修复] 玩家${activePlayer.name}镖数已足够，无需补充`);
                }
                // 不更新总分数，因为空镖不得分
            }
            
            // 确保scoreHistory结构存在
            if (!activePlayer.scoreHistory) {
                activePlayer.scoreHistory = {
                    recentRounds: [],
                    currentRound: []
                };
            }
            
            // 🔧 修复：检查是否已存在回合记录，如果存在且是爆镖记录，则保持爆镖状态
            const existingRecordIndex = activePlayer.scoreHistory.recentRounds.findIndex(
                record => record.roundNumber === state.gameState.currentRound
            );
            
            let roundRecord;
            if (existingRecordIndex !== -1) {
                // 已存在回合记录，检查是否为爆镖
                const existingRecord = activePlayer.scoreHistory.recentRounds[existingRecordIndex];
                if (existingRecord.exceedFlay || existingRecord.isBust) {
                    // 如果是爆镖记录，保持爆镖状态，不覆盖
                    console.log(`🔄 [通用换手] 玩家${activePlayer.playerName || activePlayer.name}回合${state.gameState.currentRound}已是爆镖记录，保持BUST状态`);
                    roundRecord = existingRecord; // 保持原有的爆镖记录
                } else {
                    // 不是爆镖记录，正常更新
                    const roundTotal = currentRoundScores.reduce((sum, item) => sum + item.score, 0);
                    roundRecord = {
                        roundNumber: state.gameState.currentRound,
                        scores: [...currentRoundScores],
                        total: roundTotal,
                        exceedFlay: false,
                        isBust: false,
                    };
                    activePlayer.scoreHistory.recentRounds[existingRecordIndex] = roundRecord;
                }
            } else {
                // 不存在回合记录，创建新记录
                const roundTotal = currentRoundScores.reduce((sum, item) => sum + item.score, 0);
                roundRecord = {
                    roundNumber: state.gameState.currentRound,
                    scores: [...currentRoundScores],
                    total: roundTotal,
                    exceedFlay: false,
                    isBust: false,
                };
                activePlayer.scoreHistory.recentRounds.push(roundRecord);
            }
            
            // 🔥 修复PPR计算：根据游戏最大回合数动态调整记录保留数量
            // 保留所有回合记录，直到游戏设置的最大回合数，确保PPR计算的准确性
            const maxRecordsToKeep = state.gameState.maxRounds || 20; // 使用游戏设置的最大回合数
            if (activePlayer.scoreHistory.recentRounds.length > maxRecordsToKeep) {
                const removedRecord = activePlayer.scoreHistory.recentRounds.shift();
                console.log(`🎯 [通用换手-回合记录] 玩家${activePlayer.playerName || activePlayer.name}回合记录超过${maxRecordsToKeep}个，删除最早的回合${removedRecord?.roundNumber}(得分:${removedRecord?.total})`);
            }
        }

        // 取消当前玩家的活动状态
        activePlayer.isActive = false;

        // 🔥 修复：保存当前镖数用于后续判断，然后再重置
        const currentDartCount = state.gameState.currentDart;

        // 计算当前回合中每个团队已完成的投掷轮数
        const currentRoundThrows = state.teamArray.reduce((acc, team) => {
            const teamScores = state.gameState.roundScores[state.gameState.currentRound]?.[team.team] || {};
            acc[team.team] = Object.values(teamScores).filter(scores => Array.isArray(scores) && scores.length === 3).length;
            return acc;
        }, {});

        // 检查是否所有团队都完成了当前回合
        const allTeamsCompleted = state.teamArray.every(team => team.teamRoundNbr >= state.gameState.teamSize);

        let nextTeam, nextPlayerIndex;
        let currentRound = state.gameState.currentRound;
        if (allTeamsCompleted) {
            // 进入下一回合
            currentRound++
            state.gameState.roundScores[state.gameState.currentRound] = {};

            // 新回合首攻：线上对战固定整局内首攻方不变（使用 firstTurnPlayerOnly）
            if (state.gameSettings && state.gameSettings.type === 11) {
                const starterPO = state.modeEntity?.firstTurnPlayerOnly || state.gameSettings?.firstTurnPlayerOnly || state.firstTurnPlayerOnly;
                let starterTeam = null;
                if (starterPO) {
                    starterTeam = state.teamArray.find(t => t?.players?.[0]?.playerOnly === starterPO) || null;
                }
                nextTeam = starterTeam || state.teamArray[0];
                nextPlayerIndex = 0;
            } else {
                // 线下沿用原逻辑：从第一个团队开始新回合
                nextTeam = state.teamArray[0];
                nextPlayerIndex = 0;
            }

            // 重置所有团队的投掷轮数
            state.gameState.turnCounter = 0; // 对2v2等模式一并重置
            state.teamArray.forEach(item => item.teamRoundNbr = 0);

        } else {
            // 🔧 修复换手逻辑：智能判断团队内换手还是团队间换手
            // 注意：Freeze模式有自己的换手逻辑实现，不使用这个通用逻辑
            const currentTeam = state.teamArray.find(t => t.team === state.gameState.currentTeam);
            const isLastPlayerInTeam = currentTeam && state.gameState.currentPlayerIndex === currentTeam.players.length - 1;
            const isThreeDartsComplete = currentDartCount === 3; // 🔥 使用保存的镖数

            console.log('🔄 [换手判断] 当前镖数:', currentDartCount, '是否团队最后玩家:', isLastPlayerInTeam);

            if (isThreeDartsComplete || isLastPlayerInTeam) {
                // 团队间换手：投完3镖 或 团队最后一个玩家
                const currentTeamIndex = state.teamArray.findIndex(t => t.team === state.gameState.currentTeam);
                const nextTeamIndex = (currentTeamIndex + 1) % state.teamArray.length;
                nextTeam = state.teamArray[nextTeamIndex];

                // 根据已完成的轮数计算玩家索引
                const teamThrowCount = currentRoundThrows[nextTeam.team] || 0;
                nextPlayerIndex = teamThrowCount % nextTeam.players.length;
                console.log('🔄 [团队间换手] 从团队', state.gameState.currentTeam, '切换到团队:', nextTeam.team, '玩家:', nextTeam.players[nextPlayerIndex]?.playerName);
            } else {
                // 团队内换手：切换到同一团队的下一个玩家
                nextTeam = currentTeam;
                nextPlayerIndex = (state.gameState.currentPlayerIndex + 1) % currentTeam.players.length;
                console.log('🔄 [团队内换手] 团队', nextTeam.team, '内切换到玩家:', nextTeam.players[nextPlayerIndex]?.playerName);
            }

            if (nextTeam.players[nextPlayerIndex]) {
                //显示换手动画
                useAudioPlayer().playAudio('/static/mp3/nextPalyer.mp3')
                if(gameResult && gameResult.value){
                    gameResult.value.playVideo("/static/gif/NEXT-PALYER-2S.gif", true, () => {});
                }
                if (gameResult && !gameResult.value) {
                    gameResult.playVideo("/static/gif/NEXT-PALYER-2S.gif", true, () => {});
                }


                // 睡眠一秒
                // setTimeout(() => {
                //    // 显示过场动画
                //    showPlayerTransition(`${nextTeam.players[nextPlayerIndex].playerName} 回合`);
                // }, 2000)
                // // 显示过场动画
                // showPlayerTransition(`${nextTeam.players[nextPlayerIndex].playerName} 回合`);
            }
        }


        // state.averageScores =   state.gameState.averageScores[nextTeam.players[0].id].average  //下一个玩家PPR

        //下一个玩家PPR
        state.averageScores =  state.gameState.averageScores[nextTeam.players[0].id].scoreAverage != 0? (state.gameState.averageScores[nextTeam.players[0].id].scoreAverage
            / state.gameState.averageScores[nextTeam.players[0].id].currentRound).toFixed(2) : 0

        // state.averageScores =   state.gameState.averageScores[nextTeam.players[0].id].average  //下一个玩家平均分

        // 清除所有玩家的活跃状态
        state.teamArray.forEach(team => {
            team.players.forEach(player => {
                player.isActive = false;
            });
        });

        // 设置下一个投掷者
        state.gameState.currentTeam = nextTeam.team;
        state.gameState.currentPlayerIndex = nextPlayerIndex;
        nextTeam.players[nextPlayerIndex].isActive = true;

        // 清理下一位玩家在本回合可能残留的占位记录（全部为0的占位数组），保证右侧为空标识
        try {
            const roundId = state.gameState.currentRound;
            const teamId = nextTeam.team;
            const playerId = nextTeam.players[nextPlayerIndex].id;
            if (!state.gameState.roundScores[roundId]) {
                state.gameState.roundScores[roundId] = {};
            }
            if (!state.gameState.roundScores[roundId][teamId]) {
                state.gameState.roundScores[roundId][teamId] = {};
            }
            const arr = state.gameState.roundScores[roundId][teamId][playerId];
            if (Array.isArray(arr) && arr.length > 0) {
                const allZero = arr.every(it => (Number(it?.score) || 0) === 0 && (Number(it?.multiplier) || 0) === 0 && (Number(it?.originalScore) || 0) === 0);
                if (allZero) {
                    state.gameState.roundScores[roundId][teamId][playerId] = []; // 清空为真正的空数组，界面显示空标识
                }
            }
        } catch (e) {
            console.warn('cleanup placeholder scores failed:', e);
        }
        
        //检查是否AI模式  并且是AI投标 //队伍2是ai
        if(state.params?.type === 10 && nextTeam.team === 2){
            // 延迟AI投标，等待换手动画和音效完成
            // NEXT-PALYER-2S.gif 动画2秒 + nextPalyer.mp3 音效 + 缓冲时间
            setTimeout(() => {
                // 再次检查游戏状态，确保游戏仍在进行
                if (bluetooth().isGameStart) {
                    //调用自动投标
                    if(gameResult && gameResult.value){
                        gameResult.value.automaticBid();
                    }
                    if (gameResult && !gameResult.value) {
                        gameResult.automaticBid();
                    }
                } else {
                    console.log('🤖 [换手AI调试] 游戏已结束，不触发AI');
                }
            }, 2500); // 2.5秒后开始AI投标，确保动画和音效完全播放完毕
        }

        // 检查游戏是否结束
        if (state.gameState.maxRounds !== -1 && currentRound > state.gameState.maxRounds) {
            //判断是否混合模式
            if(state.params?.gameType === 8){
                // 在混合模式中，达到最大回合数时需要先确定胜负
                // 根据游戏类型专门处理胜负判断
                let winningTeam = state.teamArray[0];

                if (state.modeEntity.type === 1) {
                    // 01游戏：分数最低的队伍获胜
                    let minScore = winningTeam.currentScore;
                    state.teamArray.forEach(team => {
                        if (team.currentScore < minScore) {
                            minScore = team.currentScore;
                            winningTeam = team;
                        }
                    });
                } else if (state.modeEntity.type === 2) {
                    // 米老鼠游戏：分数最高的队伍获胜
                    let maxScore = winningTeam.currentScore || 0;
                    state.teamArray.forEach(team => {
                        if ((team.currentScore || 0) > maxScore) {
                            maxScore = team.currentScore;
                            winningTeam = team;
                        }
                    });
                } else {
                    // 其他游戏类型：默认按分数高低判断（可根据需要调整）
                    let maxScore = winningTeam.currentScore || 0;
                    state.teamArray.forEach(team => {
                        if ((team.currentScore || 0) > maxScore) {
                            maxScore = team.currentScore;
                            winningTeam = team;
                        }
                    });
                }

                // 更新胜利次数
                if (winningTeam.players[0].win === null || winningTeam.players[0].win === undefined) {
                    winningTeam.players[0].win = 1;
                } else {
                    winningTeam.players[0].win++;
                }

                // 检查是否应该结束整个混合模式游戏
                let shouldEndMixedMode = false;
                let winNumber = winningTeam.players[0].win;
                let bureau = Math.floor((state.params.modes.length / 2) + 1); // 需要胜利的局数

                if (winNumber >= bureau) {
                    // 某队伍已达到胜利条件，整个混合模式游戏结束
                    shouldEndMixedMode = true;
                } else {
                    // 检查是否还有未完成的游戏
                    let hasUnfinishedGames = false;
                    state.params.modes.forEach(item => {
                        if (!item.status) {
                            hasUnfinishedGames = true;
                        }
                    });

                    if (!hasUnfinishedGames) {
                        // 所有游戏都已完成，但没有队伍达到胜利条件
                        shouldEndMixedMode = true;
                    } else {
                        // 还有游戏未完成，继续下一局
                        shouldEndMixedMode = false;
                    }
                }

                // 构造胜利者名称
                const playerNames = winningTeam.players.map(player => player.playerName).join('、');

                // 设置modeEnd状态（需要通过state传递给游戏组件）
                state.mixedModeEnd = shouldEndMixedMode;

                // 显示结算界面
                handleGameEnd('rounds', playerNames, gameResult, true);
                return;
            }
            handleGameEnd('rounds', null, gameResult);
            return;
        }
        if(allTeamsCompleted){
            state.gameState.currentRound++;
            state.gameState.roundScores[state.gameState.currentRound] = {};
        }

        if (allTeamsCompleted && nextTeam.players[nextPlayerIndex]) {
            if (onConfirm) {
                onConfirm();
            } else {
                if(gameResult && gameResult.value){
                    // gameResult.value.playVideo("/static/gif/ROUND1-3s-(1)3.gif", true, () => {});
                }
                if (gameResult && !gameResult.value) {
                    // gameResult.playVideo("/static/gif/ROUND1-3s-(1)3.gif", true, () => {});
                }

                useAudioPlayer().playAudio('/static/mp3/round1.mp3')
                // 显示过场动画
                let round = "";
                if(currentRound === state.gameState.maxRounds){
                    round = "Final Round"
                }
                handleNextRound(state.gameState.currentRound, round);
                // setTimeout(() => {

                // }, 2500)

            }
        }
        
        // 🔥 在函数最后重置镖数，确保下一个玩家可以正常投镖
        state.gameState.currentDart = 0;
        console.log('🔄 [换手完成] 重置镖数为0，下一个玩家:', nextTeam.players[nextPlayerIndex]?.playerName);
    };

    return {
        gameCommonState,
        initializeRoundScore,
        handleNextRound,
        getScore,
        handleGameStart,
        showPlayerTransition,
        showPlayerTransitionText,
        handleGameEnd,
        restartGame,
        endGame,
        showGameRules,
        rethrowCurrentRound,
        moveToNextPlayer,
        deductionRethrowCurrentRound,
        routineRethrowCurrentRound,
        mixedModeGameEnd
    };
} 