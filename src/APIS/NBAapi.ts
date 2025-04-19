// src/services/NBAapi.ts
import axios from 'axios';
import {Player} from "../players/player";

const SCOREBOARD_URL = 'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json';
const BOXSCORE_URL = (gameId: string) =>
  `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`;

export interface LiveStat {
  pts: number;
  reb: number;
  ast: number;
  tov: number;
}
// we have a permanent link to imags: image_url = f"https://cdn.nba.com/headshots/nba/latest/1040x760/{player_id}.png"
export async function getLiveGames(): Promise<any[]> {
  try {
    const { data } = await axios.get(SCOREBOARD_URL);
    const liveGames = data.scoreboard.games.filter((g: any) => g.gameStatus === 2);
    return liveGames;
  } catch (err) {
    console.error('Failed to fetch live games:', err);
    return [];
  }
}

export async function getActivePlayersFromGame(gameId: string): Promise<any[]> {
  try {
    const { data } = await axios.get(BOXSCORE_URL(gameId));
    console.log(gameId);
    console.log(data);
    const homePlayers = data.game?.homeTeam?.players ?? [];
    const awayPlayers = data.game?.awayTeam?.players ?? [];

    // Combine and filter players with stats (i.e., who played)
    const activePlayers = [...homePlayers, ...awayPlayers].filter(
      (p: any) => p.status === 'ACTIVE' && p.statistics
    );

    return activePlayers;

  } catch (err) {
    console.error(`Failed to fetch boxscore for ${gameId}:`, err);
    return [];
  }
}
export async function getLiveScore(gameId: string): Promise<any[]> {
  try {
      const { data } = await axios.get(BOXSCORE_URL(gameId));
      const homeScore = data.game.homeTeam.score;
      const awayScore = data.game.awayTeam.score;
      return [homeScore, awayScore];
  } catch (err) {
      console.error(`Failed to fetch boxscore for ${gameId}:`, err);
      return [0, 0]; // Return default scores in case of failure
  }
}

export async function getLiveStatsForPlayer(personId: string): Promise<LiveStat | null> {
  const liveGames = await getLiveGames();

  for (const game of liveGames) { // try every game, maybe we should pass the game ID into this function as well for efficiency sake - optimisation 
    try {
      const { data } = await axios.get(BOXSCORE_URL(game.gameId));

      const allPlayers = [
        ...(data.game.homeTeam?.players || []),
        ...(data.game.awayTeam?.players || [])
      ];

      const player = allPlayers.find((p: any) => p.personId === personId);

      if (player && player.statistics) {
        return {
          pts: player.statistics.points,
          reb: player.statistics.reboundsTotal,
          ast: player.statistics.assists,
          tov: player.statistics.turnovers,
        };
      }
    } catch (err) {
      console.error(`Error checking boxscore for game ${game.gameId}`, err);
    }
  }

  return null; // player not found or no stats
}

export function startPollingPlayerStats(
  players: Player[],
  callback: (player: Player, stats: LiveStat | null) => void,
  intervalMs: number = 5000
): NodeJS.Timeout {
  return setInterval(async () => {
    for (const player of players) {
      // console.log(player);
      if (player.personId) {
        const stats = await getLiveStatsForPlayer(player.personId);
        callback(player, stats);
        // console.log(`${player.name}:`, stats);
      } else {
        console.warn(`Player ${player.name} does not have a valid personId.`);
      }
    }
  }, intervalMs);
}