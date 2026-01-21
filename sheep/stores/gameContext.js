import { defineStore } from 'pinia';

const useGameContextStore = defineStore('gameContext', {
  state: () => ({
    route: '',
    // 归一化后的玩家与队伍信息
    players: null, // { playerCount, teamCount, players: [{teamId, teamIndex, playerIndex, name, id, score, isActive}] }
    gameState: null, // { currentRound, currentDart, currentTeam, currentPlayerIndex, maxRounds, teamSize, isOnline, gameType, startingScore }
    lastUpdatedAt: 0,
  }),
  actions: {
    setRoute(route = '') {
      this.route = route;
      this.lastUpdatedAt = Date.now();
    },
    setPlayersFromTeamArray(teamArray = [], gs = null) {
      try {
        if (!Array.isArray(teamArray) || teamArray.length === 0) {
          this.players = null;
          this.lastUpdatedAt = Date.now();
          return;
        }
        const allPlayers = [];
        teamArray.forEach((team, teamIndex) => {
          if (team && Array.isArray(team.players)) {
            team.players.forEach((p, pIndex) => {
              allPlayers.push({
                teamId: team.team,
                teamIndex: teamIndex + 1,
                playerIndex: pIndex + 1,
                name: p.playerName || p.name || `玩家${allPlayers.length + 1}`,
                id: p.playerOnly || p.playerId || p.id,
                score: team.currentScore,
                isActive: gs ? (gs.currentTeam === team.team) : undefined,
              });
            });
          }
        });
        this.players = {
          playerCount: allPlayers.length,
          teamCount: teamArray.length,
          players: allPlayers,
        };
      } catch (e) {
        // 失败容错
        this.players = null;
      } finally {
        this.lastUpdatedAt = Date.now();
      }
    },
    setGameState(gs = null) {
      if (!gs) {
        this.gameState = null;
      } else {
        this.gameState = {
          currentRound: gs.currentRound,
          currentDart: gs.currentDart,
          currentTeam: gs.currentTeam,
          currentPlayerIndex: gs.currentPlayerIndex,
          maxRounds: gs.maxRounds,
          teamSize: gs.teamSize,
        };
      }
      this.lastUpdatedAt = Date.now();
    },
    updateFromState(pageState = null) {
      try {
        if (!pageState) return;
        const { teamArray = [], gameState = null } = pageState;
        this.setPlayersFromTeamArray(teamArray, gameState);
        if (gameState) {
          const isOnline = pageState?.gameSettings?.type === 11;
          const gameType = pageState?.params?.gameType;
          const startingScore = pageState?.modeEntity?.startingScore;
          this.gameState = {
            currentRound: gameState.currentRound,
            currentDart: gameState.currentDart,
            currentTeam: gameState.currentTeam,
            currentPlayerIndex: gameState.currentPlayerIndex,
            maxRounds: gameState.maxRounds,
            teamSize: gameState.teamSize,
            isOnline,
            gameType,
            startingScore,
          };
        }
      } catch(_) {
        // ignore
      } finally {
        this.lastUpdatedAt = Date.now();
      }
    },
    getContext() {
      return {
        route: this.route,
        players: this.players,
        gameState: this.gameState,
        lastUpdatedAt: this.lastUpdatedAt,
      };
    }
  }
});

export default useGameContextStore;
