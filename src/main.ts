import express from "express";
import favicon from "serve-favicon";
import fs from "fs";
import csvParser from "csv-parser";
import { StatService } from "./service/stat-service";
import bodyParser from "body-parser";

const app = express();
app.use("/public", express.static("public"));
app.use(favicon("public/favicon.ico"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", "views");

const port = process.env.PORT || 8080;
const maxGamesBeforeDecay = 30;

let allStats: Stat[] = [];
let latestStats: Stat[] = [];
let lastGame: string;

async function init() {
  let allFiles = fs.readdirSync("stats");
  let latestFiles = allFiles.concat();
  if (latestFiles.length > maxGamesBeforeDecay) {
    latestFiles = latestFiles.slice(latestFiles.length - maxGamesBeforeDecay, latestFiles.length);
  }
  lastGame = allFiles[allFiles.length - 1].split(".")[0];

  allStats = await getStats(allFiles);
  latestStats = await getStats(latestFiles);
}
init();

app.get("/", async (req, res) => {
  const pickTeamsResult = {};

  res.render("home.ejs", {
    stats: latestStats,
    pickTeamsResult,
    lastGame,
    showAll: false
  });
});

app.get("/all", async (req, res) => {
  const pickTeamsResult = {};

  res.render("home.ejs", {
    stats: allStats,
    pickTeamsResult,
    lastGame,
    showAll: true
  });
});

app.post("/", async (req, res) => {
  let pickTeamsResult = {};

  if (req && req.body) {
    const players = Object.keys(req.body);
    console.log(players);

    if (players.length) {
      pickTeamsResult = StatService.pickTeams(players, latestStats);
    }
  }

  res.render("home.ejs", {
    stats: latestStats,
    pickTeamsResult,
    lastGame,
    showAll: false
  });
});

async function getStats(fileNames: string[]): Promise<Stat[]> {
  let csvFiles: CSVFile[] = [];

  for (const fileName of fileNames) {
    const csvStats = await readStatsFromFile(`stats/${fileName}`);
    csvFiles.push({ csvStats });
  }

  return StatService.calculateStats(csvFiles);
}

async function readStatsFromFile(filePath: string): Promise<CSVStat[]> {
  const stats: CSVStat[] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (stat: CSVStat) => {
        stats.push(stat);
      })
      .on("end", () => {
        resolve(stats);
      });
  });
}

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
