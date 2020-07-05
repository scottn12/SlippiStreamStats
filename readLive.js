const { default: SlippiGame } = require('slp-parser-js');
const chokidar = require('chokidar');
const _ = require('lodash');
const fs = require('fs');
const config = require('./config.js');
var stats = require('./stats.json');  // Revert back to last saved stats

const playerName = config.player;
const outputPath = config.outputPath;
var path = config.slippiPath;

// Reset
if (process.argv[2] && process.argv[2].toLowerCase() === 'reset') {
  console.log('Past stats reset.');
  fs.writeFileSync(outputPath + 'output.txt', '');
  stats = {
    "numGames": 0,
    "wins": 0,
    "losses": 0,
    "totalDamage": 0,
    "apm": 0,
    "openingsPerKill": 0,
    "damagePerOpening": 0,
    "totalNeutral": 0,
    "neutralWins": 0,
    "totalConversions": 0,
    "successConversions": 0,
    "lastGame": {
      "wins": 0,
      "losses": 0,
      "totalDamage": 0,
      "apm": 0,
      "openingsPerKill": 0,
      "damagePerOpening": 0,
      "totalNeutral": 0,
      "neutralWins": 0,
      "totalConversions": 0,
      "successConversions": 0
    }
  };
  fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
}

// Get this month's subfolder
if (config.monthlyFolders) {
  let now = new Date();
  let subFolder = `${new Date().getFullYear()}-${('0' + (now.getMonth() + 1).toString()).slice(-2)}`;
  path = path + subFolder + '/';
}

console.log(`Listening at: ${path}`);

const watcher = chokidar.watch(path, {
  // ignored: "!*.slp", // TODO: This doesn't work. Use regex?
  depth: 0,
  persistent: true,
  usePolling: true,
  ignoreInitial: true,
});

const gameByPath = {};
watcher.on('change', (path) => {

  var game, gameEnd;
  try {
    game = _.get(gameByPath, [path, 'game']);
    if (!game) {
      game = new SlippiGame(path);
      gameByPath[path] = {
        game: game,
        state: {
          settings: null,
          detectedPunishes: {},
        }
      };
    }
    gameEnd = game.getGameEnd();
  } 
  catch (err) {
    console.log(err);
    return;
  }

  if (gameEnd) {
  
    const gameStats = game.getStats();
    const metadata = game.getMetadata();
    let lastFrame = game.getLatestFrame();

    let playerIndex = -1;
    if (metadata.players['0'].names.code === playerName) {
      playerIndex = 0;
    }
    else if (metadata.players['1'].names.code === playerName) {
      playerIndex = 1;
    }
    if (playerIndex === -1) {
      console.log(`${playerName} not located in this game.`)
      return;
    }

    stats.numGames++;

    // Determine winner
    if (gameEnd.gameEndMethod === 7 && gameEnd.lrasInitiatorIndex !== -1) {  // LRAS
      if (playerIndex == gameEnd.lrasInitiatorIndex) {
        stats.wins++;
        stats.lastGame.wins = 1;
        stats.lastGame.losses = 0;
      }
      else {
        stats.losses++;
        stats.lastGame.losses = 1;
        stats.lastGame.wins = 0;
      }
    }
    else if (gameEnd.gameEndMethod === 2) {
      if (lastFrame.players[playerIndex].post.stocksRemaining > 0) {  // Normal End
        stats.wins++;
        stats.lastGame.wins = 1;
        stats.lastGame.losses = 0;
      }
      else {
        stats.losses++;
        stats.lastGame.losses = 1;
        stats.lastGame.wins = 0;
      }
    }
    else {  // Timeout
      // TODO
    }

    let overall = gameStats.overall[playerIndex];  // Target player's stats

    stats.totalDamage += overall.totalDamage;
    stats.apm += overall.inputsPerMinute.ratio;
    stats.openingsPerKill += overall.openingsPerKill.ratio;
    stats.damagePerOpening += overall.damagePerOpening.ratio;
    stats.totalNeutral += overall.neutralWinRatio.total;
    stats.neutralWins += overall.neutralWinRatio.count;
    stats.totalConversions += overall.successfulConversions.total;
    stats.successConversions += overall.successfulConversions.count;

    stats.lastGame.totalDamage = overall.totalDamage;
    stats.lastGame.apm = overall.inputsPerMinute.ratio;
    stats.lastGame.openingsPerKill = overall.openingsPerKill.ratio;
    stats.lastGame.damagePerOpening = overall.damagePerOpening.ratio;
    stats.lastGame.totalNeutral = overall.neutralWinRatio.total;
    stats.lastGame.neutralWins = overall.neutralWinRatio.count;
    stats.lastGame.totalConversions = overall.successfulConversions.total;
    stats.lastGame.successConversions = overall.successfulConversions.count;

    let output = statsToStr(stats, config.saveLastGame);
    fs.writeFileSync(outputPath + 'output.txt', output);
    fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));

  }

});


function statsToStr(stats, saveLastGame) {

  if (saveLastGame) {
    return `Last Game:
W/L: ${stats.lastGame.wins} - ${stats.lastGame.losses}
APM: ${Math.round(stats.lastGame.apm)}
Openings Per Kill: ${(stats.lastGame.openingsPerKill).toFixed(2)}
Damage Per Opening: ${(stats.lastGame.damagePerOpening).toFixed(2)}
Neutral Win Rate: ${Math.round(stats.lastGame.neutralWins / stats.lastGame.totalNeutral * 100)}%
Conversation Rate: ${Math.round(stats.lastGame.successConversions / stats.lastGame.totalConversions * 100)}%

Overall:
W/L: ${stats.wins} - ${stats.losses}
APM: ${Math.round(stats.apm / stats.numGames)}
Openings Per Kill: ${(stats.openingsPerKill / stats.numGames).toFixed(2)}
Damage Per Opening: ${(stats.damagePerOpening / stats.numGames).toFixed(2)}
Neutral Win Rate: ${Math.round(stats.neutralWins / stats.totalNeutral * 100)}%
Conversation Rate: ${Math.round(stats.successConversions / stats.totalConversions * 100)}%
`;
  }

    return `Overall:
W/L: ${stats.wins} - ${stats.losses}
APM: ${Math.round(stats.apm / stats.numGames)}
Openings Per Kill: ${(stats.openingsPerKill / stats.numGames).toFixed(2)}
Damage Per Opening: ${(stats.damagePerOpening / stats.numGames).toFixed(2)}
Neutral Win Rate: ${Math.round(stats.neutralWins / stats.totalNeutral * 100)}%
Conversation Rate: ${Math.round(stats.successConversions / stats.totalConversions * 100)}%
`;

}