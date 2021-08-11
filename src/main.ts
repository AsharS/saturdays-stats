import express from 'express';
import favicon from 'serve-favicon';
import fs from 'fs';
import csvParser from 'csv-parser';
import { StatService } from './service/stat-service';
import bodyParser from 'body-parser';
import nodeCron from 'node-cron';

const app = express();
app.use('/public', express.static('public'));
app.use(favicon('public/favicon.ico'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', 'views');

const port = process.env.PORT || 8080;
const maxGamesBeforeDecay = 30;

let stats: Stat[] = [];
let lastGame: string;
let lastUpdated = new Date().getTime();

async function init() {
  let allPlayers = await readStatsFromFile('data/players.csv');

  stats = await StatService.calculateStats(allPlayers);
  lastUpdated = new Date().getTime();
}
init();

console.log('Starting cron job...');
nodeCron.schedule('*/15 * * * *', async () => {
  init();
});

app.get('/', async (req, res) => {
  const pickTeamsResult = {};

  res.render('home.ejs', {
    stats: stats,
    pickTeamsResult,
    lastUpdated
  });
});

app.post('/', async (req, res) => {
  let pickTeamsResult = {};

  if (req && req.body) {
    const players = Object.keys(req.body);
    console.log(players);

    if (players.length) {
      pickTeamsResult = StatService.pickTeams(players, stats);
    }
  }

  res.render('home.ejs', {
    stats: stats,
    pickTeamsResult,
    lastUpdated
  });
});

async function readStatsFromFile(filePath: string): Promise<Player[]> {
  const players: Player[] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (player: Player) => {
        players.push(player);
      })
      .on('end', () => {
        resolve(players);
      });
  });
}

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
