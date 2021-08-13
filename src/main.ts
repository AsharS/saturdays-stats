import dotenv from 'dotenv';
import express from 'express';
import { Firestore } from '@google-cloud/firestore';
import favicon from 'serve-favicon';
import fs from 'fs';
import csvParser from 'csv-parser';
import { StatService } from './service/stat-service';
import bodyParser from 'body-parser';
import nodeCron from 'node-cron';

dotenv.config();

const app = express();
app.use('/public', express.static('public'));
app.use(favicon('public/favicon.ico'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', 'views');

const port = process.env.PORT || 8080;

const db = new Firestore({
  projectId: process.env.PROJECT_ID,
  keyFilename: process.env.KEY_FILENAME
});

let allPlayers: Player[];
let stats: Stat[] = [];
let lastUpdated = new Date().getTime();

const initData = async function (req: any, res: any, next: () => void) {
  if (!allPlayers) {
    await init();
  }
  next();
};
app.use(initData);

app.get('/', async (req, res) => {
  res.render('home.ejs', {
    stats,
    pickTeamsResult: {},
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
    stats,
    pickTeamsResult,
    lastUpdated
  });
});

async function init() {
  allPlayers = await readStatsFromFile('data/players.csv');

  const docs = await db.collection('stats').get();
  const oldStats: Stat[] = [];
  docs.forEach(async (doc) => {
    const stat = doc.data() as Stat;

    // add stat only if player is found, otherwise delete stat
    const playerMatch = allPlayers.find(
      (player) => player.name === stat.name && player.tag === stat.tag
    );
    if (playerMatch) {
      oldStats.push(stat);
    } else {
      console.warn(`Player not found, deleting: ${stat.name}#${stat.tag}`);
      await db
        .collection('stats')
        .doc(stat.name + '#' + stat.tag)
        .delete();
    }
  });

  StatService.sortStats(oldStats);
  stats = oldStats;

  updateStats();
}

async function updateStats() {
  const newStats = await StatService.calculateStats(allPlayers);

  stats = newStats;
  lastUpdated = new Date().getTime();

  stats.forEach(async (stat) => {
    await db
      .collection('stats')
      .doc(stat.name + '#' + stat.tag)
      .set(stat, { merge: true });
  });

  console.log('Updated stats...');
}

console.log('Starting cron job...');
nodeCron.schedule('*/15 * * * *', async () => {
  updateStats();
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
