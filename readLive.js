const { default: SlippiGame } = require('slp-parser-js');
const chokidar = require('chokidar');
const _ = require('lodash');
const fs = require('fs');
const config = require('./config.js');
var stats = require('./stats.json');  // Revert back to last saved stats

const playerCode = config.player;
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
      "targetPlayer": {
        "win": false,
        "totalDamage": 0,
        "apm": 0,
        "openingsPerKill": 0,
        "damagePerOpening": 0,
        "totalNeutral": 0,
        "neutralWins": 0,
        "totalConversions": 0,
        "successConversions": 0,
        "stocksRemaining": 0
      },
      "opponent": {
        "win": false,
        "totalDamage": 0,
        "apm": 0,
        "openingsPerKill": 0,
        "damagePerOpening": 0,
        "totalNeutral": 0,
        "neutralWins": 0,
        "totalConversions": 0,
        "successConversions": 0,
        "stocksRemaining": 0
      }
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
    let opponentIndex = -1;
    let playerName = '';
    let opponentName = '';
    if (metadata.players['0'].names.code === playerCode) {
      playerIndex = 0;
      opponentIndex = 1;
      playerName = metadata.players['0'].names.netplay;
      opponentName = metadata.players['1'].names.netplay;
    }
    else if (metadata.players['1'].names.code === playerCode) {
      playerIndex = 1;
      opponentIndex = 0;
      playerName = metadata.players['1'].names.netplay;
      opponentName = metadata.players['0'].names.netplay;
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
        stats.lastGame.targetPlayer.win = true;
        stats.lastGame.opponentPlayer = false;
        stats.lastGame.targetPlayer.stocksRemaining = lastFrame.players[playerIndex].post.stocksRemaining;
        stats.lastGame.opponent.stocksRemaining = 0;

      }
      else {
        stats.losses++;
        stats.lastGame.opponentPlayer.win = true;
        stats.lastGame.targetPlayer.win = false;
        stats.lastGame.opponent.stocksRemaining = lastFrame.players[opponentIndex].post.stocksRemaining;
        stats.lastGame.targetPlayer.stocksRemaining = 0;
      }
    }
    else if (gameEnd.gameEndMethod === 2) {
      if (lastFrame.players[playerIndex].post.stocksRemaining > 0) {  // Normal End
        stats.wins++;
        stats.lastGame.targetPlayer.win = true;
        stats.lastGame.opponentPlayer = false;
        stats.lastGame.targetPlayer.stocksRemaining = lastFrame.players[playerIndex].post.stocksRemaining;
        stats.lastGame.opponent.stocksRemaining = 0;
      }
      else {
        stats.losses++;
        stats.lastGame.opponentPlayer.win = true;
        stats.lastGame.targetPlayer.win = false;
        stats.lastGame.opponent.stocksRemaining = lastFrame.players[opponentIndex].post.stocksRemaining;
        stats.lastGame.targetPlayer.stocksRemaining = 0;
      }
    }
    else {  // Timeout
      // TODO
    }

    let playerOverall = gameStats.overall[playerIndex];
    let opponentOverall = gameStats.overall[opponentIndex];

    stats.totalDamage += playerOverall.totalDamage;
    stats.apm += playerOverall.inputsPerMinute.ratio;
    stats.openingsPerKill += playerOverall.openingsPerKill.ratio;
    stats.damagePerOpening += playerOverall.damagePerOpening.ratio;
    stats.totalNeutral += playerOverall.neutralWinRatio.total;
    stats.neutralWins += playerOverall.neutralWinRatio.count;
    stats.totalConversions += playerOverall.successfulConversions.total;
    stats.successConversions += playerOverall.successfulConversions.count;

    stats.lastGame.targetPlayer.totalDamage = playerOverall.totalDamage;
    stats.lastGame.targetPlayer.apm = playerOverall.inputsPerMinute.ratio;
    stats.lastGame.targetPlayer.openingsPerKill = playerOverall.openingsPerKill.ratio;
    stats.lastGame.targetPlayer.damagePerOpening = playerOverall.damagePerOpening.ratio;
    stats.lastGame.targetPlayer.totalNeutral = playerOverall.neutralWinRatio.total;
    stats.lastGame.targetPlayer.neutralWins = playerOverall.neutralWinRatio.count;
    stats.lastGame.targetPlayer.totalConversions = playerOverall.successfulConversions.total;
    stats.lastGame.targetPlayer.successConversions = playerOverall.successfulConversions.count;

    stats.lastGame.opponent.totalDamage = opponentOverall.totalDamage;
    stats.lastGame.opponent.apm = opponentOverall.inputsPerMinute.ratio;
    stats.lastGame.opponent.openingsPerKill = opponentOverall.openingsPerKill.ratio;
    stats.lastGame.opponent.damagePerOpening = opponentOverall.damagePerOpening.ratio;
    stats.lastGame.opponent.totalNeutral = opponentOverall.neutralWinRatio.total;
    stats.lastGame.opponent.neutralWins = opponentOverall.neutralWinRatio.count;
    stats.lastGame.opponent.totalConversions = opponentOverall.successfulConversions.total;
    stats.lastGame.opponent.successConversions = opponentOverall.successfulConversions.count;

    let output = statsToStr(stats, config.saveLastGame, config.headToHead, playerName, opponentName);
    fs.writeFileSync(outputPath + 'output.txt', output);
    fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));

  }

});


function statsToStr(stats, saveLastGame, headToHead, playerName, opponentName) {

  if (headToHead) {
    return `Overall Record: ${stats.wins}W - ${stats.losses}L

Previous Game Stats
${playerName}:
Outcome: ${stats.lastGame.targetPlayer.win ? `Win (${stats.lastGame.targetPlayer.stocksRemaining} stock)` : 'Loss'}
Damage Dealt: ${Math.round(stats.lastGame.targetPlayer.totalDamage)}
APM: ${Math.round(stats.lastGame.targetPlayer.apm)}
Openings Per Kill: ${stats.lastGame.targetPlayer.openingsPerKill ? (stats.lastGame.targetPlayer.openingsPerKill).toFixed(2) : 'N/A'}
Damage Per Opening: ${(stats.lastGame.targetPlayer.damagePerOpening).toFixed(2)}
Neutral Win Rate: ${Math.round(stats.lastGame.targetPlayer.neutralWins / stats.lastGame.targetPlayer.totalNeutral * 100)}%
Conversation Rate: ${Math.round(stats.lastGame.targetPlayer.successConversions / stats.lastGame.targetPlayer.totalConversions * 100)}%

${opponentName}:
Outcome: ${stats.lastGame.opponent.win ? `Win (${stats.lastGame.opponent.stocksRemaining} stock)` : 'Loss'}
Damage Dealt: ${Math.round(stats.lastGame.opponent.totalDamage)}
APM: ${Math.round(stats.lastGame.opponent.apm)}
Openings Per Kill: ${ stats.lastGame.opponent.openingsPerKill ? (stats.lastGame.opponent.openingsPerKill).toFixed(2) : 'N/A'}
Damage Per Opening: ${(stats.lastGame.opponent.damagePerOpening).toFixed(2)}
Neutral Win Rate: ${Math.round(stats.lastGame.opponent.neutralWins / stats.lastGame.opponent.totalNeutral * 100)}%
Conversation Rate: ${Math.round(stats.lastGame.opponent.successConversions / stats.lastGame.opponent.totalConversions * 100)}%   
`;
  }

  if (saveLastGame) {
    return `Last Game:
Outcome: ${stats.lastGame.targetPlayer.win ? `Win (${stats.lastGame.targetPlayer.stocksRemaining} stock)` : 'Loss'}
Damage Dealt: ${Math.round(stats.lastGame.targetPlayer.totalDamage)}
APM: ${Math.round(stats.lastGame.targetPlayer.apm)}
Openings Per Kill: ${stats.lastGame.targetPlayer.openingsPerKill ? (stats.lastGame.targetPlayer.openingsPerKill).toFixed(2) : 'N/A'}
Damage Per Opening: ${(stats.lastGame.targetPlayer.damagePerOpening).toFixed(2)}
Neutral Win Rate: ${Math.round(stats.lastGame.targetPlayer.neutralWins / stats.lastGame.targetPlayer.totalNeutral * 100)}%
Conversation Rate: ${Math.round(stats.lastGame.targetPlayer.successConversions / stats.lastGame.targetPlayer.totalConversions * 100)}%

Overall:
W/L: ${stats.wins} - ${stats.losses}
Damage Dealt: ${Math.round(stats.totalDamage)}
APM: ${Math.round(stats.apm / stats.numGames)}
Openings Per Kill: ${stats.openingsPerKill ? (stats.openingsPerKill / stats.numGames).toFixed(2) : 'N/A'}
Damage Per Opening: ${(stats.damagePerOpening / stats.numGames).toFixed(2)}
Neutral Win Rate: ${Math.round(stats.neutralWins / stats.totalNeutral * 100)}%
Conversation Rate: ${Math.round(stats.successConversions / stats.totalConversions * 100)}%
`;
  }

    return `Overall:
W/L: ${stats.wins} - ${stats.losses}
APM: ${Math.round(stats.apm / stats.numGames)}
Openings Per Kill: ${stats.openingsPerKill ? (stats.openingsPerKill / stats.numGames).toFixed(2) : 'N/A'}
Damage Per Opening: ${(stats.damagePerOpening / stats.numGames).toFixed(2)}
Neutral Win Rate: ${Math.round(stats.neutralWins / stats.totalNeutral * 100)}%
Conversation Rate: ${Math.round(stats.successConversions / stats.totalConversions * 100)}%
`;

}