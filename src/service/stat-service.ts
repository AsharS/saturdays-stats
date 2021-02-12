import * as Math from "mathjs";
import PickTeams from "../models/pick-teams";

export class StatService {
  public static calculateStats(csvFiles: CSVFile[]): Stat[] {
    const stats: Stat[] = [];
    let upToLastGameStats: Stat[] = [];

    // Parse csv-stat to stat
    for (let i = 0; i < csvFiles.length; i++) {
      for (const csvStat of csvFiles[i].csvStats) {
        const existingStat = stats.find((stat) => stat.name === csvStat.Name);

        if (existingStat) {
          existingStat.gp = existingStat.gp + 1;
          existingStat.tMoV = Math.evaluate(
            `${existingStat.tMoV} + ${csvStat.RD}`
          );
          existingStat.tCS = Math.evaluate(
            `${existingStat.tCS} + ${csvStat.CS}`
          );
        } else {
          const newStat: Stat = {
            name: csvStat.Name,
            gp: 1,
            tMoV: Number(csvStat.RD),
            tCS: Number(csvStat.CS),
          };
          stats.push(newStat);
        }
      }

      // Save a snapshot of all games minus the last game
      if (i > 0 && i === csvFiles.length - 2) {
        upToLastGameStats = [];
        stats.forEach((stat) =>
          upToLastGameStats.push(Object.assign({}, stat))
        );
      }
    }

    // Calculate AMoV, ACS, and BOT
    for (const stat of stats) {
      stat.aMoV = Math.round(stat.tMoV / stat.gp, 2);
      stat.aCS = Math.round(stat.tCS / stat.gp, 2);
      stat.bOT = Math.round((stat.aCS * (13 + stat.aMoV)) / 10, 2);
    }

    // Sort by BOT and set ranking
    stats.sort((a, b) => b.bOT - a.bOT);
    for (let i = 0; i < stats.length; i++) {
      if (i > 0 && stats[i - 1].bOT === stats[i].bOT) {
        stats[i].rank = stats[i - 1].rank;
      } else {
        stats[i].rank = i + 1;
      }
    }

    // Do the same for the snapshot
    for (const stat of upToLastGameStats) {
      stat.aMoV = Math.round(stat.tMoV / stat.gp, 2);
      stat.aCS = Math.round(stat.tCS / stat.gp, 2);
      stat.bOT = Math.round((stat.aCS * (13 + stat.aMoV)) / 10, 2);
    }
    upToLastGameStats.sort((a, b) => b.bOT - a.bOT);
    for (let i = 0; i < upToLastGameStats.length; i++) {
      if (i > 0 && upToLastGameStats[i - 1].bOT === upToLastGameStats[i].bOT) {
        upToLastGameStats[i].rank = upToLastGameStats[i - 1].rank;
      } else {
        upToLastGameStats[i].rank = i + 1;
      }
    }

    // Calculate stat difference and set text
    for (const stat of stats) {
      const upToLastGameStat = upToLastGameStats.find(
        (x) => x.name === stat.name
      );

      if (upToLastGameStat && upToLastGameStat.gp !== stat.gp) {
        stat.difference = {
          gp: Math.round(stat.gp - upToLastGameStat.gp, 2),
          aMoV: Math.round(stat.aMoV - upToLastGameStat.aMoV, 2),
          aCS: Math.round(stat.aCS - upToLastGameStat.aCS, 2),
          bOT: Math.round(stat.bOT - upToLastGameStat.bOT, 2),
          rank: Math.round(upToLastGameStat.rank - stat.rank, 2),
        };

        stat.difference.gpText = this.getDifferenceText(stat.difference.gp);
        stat.difference.aMoVText = this.getDifferenceText(stat.difference.aMoV);
        stat.difference.aCSText = this.getDifferenceText(stat.difference.aCS);
        stat.difference.bOTText = this.getDifferenceText(stat.difference.bOT);
        stat.difference.rankText = this.getDifferenceText(stat.difference.rank);
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
      let team1TotalBOT = 0;
      let team2TotalBOT = 0;
      for (const teamPlayer of tempPlayers) {
        addToTeam1
          ? (team1TotalBOT += teamPlayer.bOT)
          : (team2TotalBOT += teamPlayer.bOT);
        addToTeam1 = !addToTeam1;
      }

      if (
        !pickTeamsResult.scoreDifference ||
        Math.abs(team2TotalBOT - team1TotalBOT) <
          pickTeamsResult.scoreDifference
      ) {
        pickTeamsResult.scoreDifference = Math.round(
          Math.abs(team2TotalBOT - team1TotalBOT),
          2
        );
        pickTeamsResult.strongerTeam = team1TotalBOT > team2TotalBOT ? 1 : 2;
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

  private static getDifferenceText(num: number): string {
    if (num === 0) {
      return "";
    } else if (num > 0) {
      return '<span class="green-text">&#8593;' + Math.abs(num) + "</span>";
    } else {
      return '<span class="red-text">&#8595;' + Math.abs(num) + "</span>";
    }
  }
}
