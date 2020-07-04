const { default: SlippiGame } = require('slp-parser-js');
const chokidar = require('chokidar');
const _ = require('lodash');
const fs = require('fs');


// Config
const path = '';
const playerName = '';
const outputPath = '';

console.log(`Listening at: ${path}`);

var stats = {
  numGames: 0,
  wins: 0,
  losses: 0,
  totalDamage: 0,
  apm: 0,
  openingsPerKill: 0,
  damagePerOpening: 0,
  totalNeutral: 0,
  neutralWins: 0,
  totalConversions: 0,
  successConversions: 0,
};

const watcher = chokidar.watch(path, {
  //   ignored: "!*.slp", // TODO: This doesn't work. Use regex?
  depth: 0,
  persistent: true,
  usePolling: true,
  ignoreInitial: true,
});

const gameByPath = {};
watcher.on('change', (path) => {

  var game;
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
  } catch (err) {
    console.log(err);
    return;
  }


  if (gameEnd) {
    const gameStats = game.getStats();
    const metadata = game.getMetadata();
    const gameEnd = game.getGameEnd();
    let lastFrame = game.getLatestFrame();

    let playerIndex = -1;
    if (metadata.players['0'].names.netplay === playerName) {
      playerIndex = 0;
    }
    else if (metadata.players['1'].names.netplay === playerName) {
      playerIndex = 1;
    }
    if (playerIndex === -1) {
      console.log(`${playerName} not located in this game.`)
      return;
    }
    
    // Collect Stats
    stats.numGames++;
    
    // Determine winner
    if (gameEnd.gameEndMethod === 7 && gameEnd.lrasInitiatorIndex !== -1) {  // LRAS
      if (playerIndex == gameEnd.lrasInitiatorIndex) {
        stats.wins++;
      }
      else {
        stats.wins--;
      }
    }
    else if (gameEnd.gameEndMethod === 2) {
      if (lastFrame.players[playerIndex].post.stocksRemaining > 0) {  // Normal End
        stats.wins++;
      }
      else {
        stats.losses++;
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
        
    let output = statsToStr(stats);
    fs.writeFileSync(outputPath + 'output.txt', output);

  }
});


function statsToStr(stats) {
  return `W/L: ${stats.wins} - ${stats.losses}
APM: ${Math.round(stats.apm / stats.numGames)}
Openings Per Kill: ${(stats.openingsPerKill / stats.numGames).toFixed(2)}
Damage Per Opening: ${(stats.damagePerOpening / stats.numGames).toFixed(2)}
Neutral Win Rate: ${Math.round(stats.neutralWins / stats.totalNeutral * 100)}%
Conversation Rate: ${Math.round(stats.successConversions / stats.totalConversions * 100)}%
`;
}