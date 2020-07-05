const config = {
  player: '',  // Connect code of the player you would like to track (eg. TEST#123)
  slippiPath: 'C:/Users/{windows user name}/Documents/Slippi/',  // Usually C:/Users/{your windows username}/Documents/Slippi/
  monthlyFolders: true,  // Set to true if you have your slippi files organized by monthly subfolders
  outputPath: '',  // Leave blank to output to the same directory as the source files
  saveLastGame: true  // Save the last game's stats separately in the output file
}

module.exports = config;