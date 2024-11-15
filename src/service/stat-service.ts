import axios from 'axios';
import * as Math from 'mathjs';
import moment from 'moment';
import PickTeams from '../models/pick-teams';

export class StatService {
  public static async calculateStats(players: Player[]): Promise<Stat[]> {
    const stats: Stat[] = [];

    // Retrieve player data from API
    for (const player of players) {
      console.log(`Retrieving data for ${player.name} (${player.id})`);

      try {
        const response = await axios.get(
          `https://api.henrikdev.xyz/valorant/v1/by-puuid/mmr-history/na/${player.id}`,
          {
            headers: {
              Authorization: process.env.VALORANT_API_KEY
            }
          }
        );

        if (response.status === 200 && response.data) {
          const playerDataResponse: StatResponse = response.data;
          const playerData: Stat = {
            ...playerDataResponse,
            id: player.id,
            name: playerDataResponse.name ?? player.name,
            last_data: playerDataResponse.data[0]
          };
          playerData.last_data.formatted_date = moment
            .unix(playerData.last_data.date_raw)
            .format('L');

          playerData.mmr_difference_text = this.getDifferenceText(
            playerData.data[0].mmr_change_to_last_game
          );

          stats.push(playerData);
        } else {
          throw response;
        }
      } catch (e) {
        console.error(`Error for ${player.name} (${player.id})`, e);
      }
    }

    return stats;
  }

  public static pickTeams(players: string[], stats: Stat[]): PickTeams {
    const pickTeamsResult = new PickTeams();
    const statPlayers = [];

    for (const stat of stats) {
      const teamPlayer = players.find((player) =>
        player.length > 2
          ? stat.name.toLowerCase().indexOf(player.toLowerCase()) > -1
          : player.toLowerCase() === stat.name.toLowerCase()
      );

      if (teamPlayer) {
        statPlayers.push(stat);
      }
    }

    pickTeamsResult.team1 = [];
    pickTeamsResult.team2 = [];

    let iter = 0;
    while (iter < 100) {
      const tempPlayers: Stat[] = Object.assign([], statPlayers);

      for (let i = tempPlayers.length; i > 0; i--) {
        let randomIndex = Math.floor(Math.random() * i);

        let temp = tempPlayers[i - 1];
        tempPlayers[i - 1] = tempPlayers[randomIndex];
        tempPlayers[randomIndex] = temp;
      }

      let addToTeam1 = true;
      let team1TotalElo = 0;
      let team2TotalElo = 0;
      for (const teamPlayer of tempPlayers) {
        addToTeam1
          ? (team1TotalElo += teamPlayer.last_data.elo)
          : (team2TotalElo += teamPlayer.last_data.elo);
        addToTeam1 = !addToTeam1;
      }

      if (
        !pickTeamsResult.scoreDifference ||
        Math.abs(team2TotalElo - team1TotalElo) <
          pickTeamsResult.scoreDifference
      ) {
        pickTeamsResult.scoreDifference = Math.round(
          Math.abs(team2TotalElo - team1TotalElo),
          2
        );
        pickTeamsResult.strongerTeam = team1TotalElo > team2TotalElo ? 1 : 2;
        pickTeamsResult.team1 = [];
        pickTeamsResult.team2 = [];

        let addToTeam1 = true;
        for (const teamPlayer of tempPlayers) {
          addToTeam1
            ? pickTeamsResult.team1.push(teamPlayer)
            : pickTeamsResult.team2.push(teamPlayer);
          addToTeam1 = !addToTeam1;
        }
      }

      iter++;
    }

    return pickTeamsResult;
  }

  public static sortStats(stats: Stat[]) {
    // Sort by elo
    stats.sort((a, b) => b.last_data.elo - a.last_data.elo);
    for (let i = 0; i < stats.length; i++) {
      if (i > 0 && stats[i - 1].last_data.elo === stats[i].last_data.elo) {
        stats[i].rank = stats[i - 1].rank;
      } else {
        stats[i].rank = i + 1;
      }
    }
  }

  private static getDifferenceText(num: number): string {
    if (num === 0) {
      return null;
    } else if (num > 0) {
      return '<span class="green-text">&#8593;' + Math.abs(num) + '</span>';
    } else {
      return '<span class="red-text">&#8595;' + Math.abs(num) + '</span>';
    }
  }
}
