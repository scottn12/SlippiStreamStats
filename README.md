# Scott's Stats

Uses [Slippi](https://github.com/project-slippi/slp-parser-js).

Will compile real time stats of your [Slippi Online](https://slippi.gg/) games and output to `output.txt`. This can then be used to display on a live stream using OBS.

### Instructions

1. Run `npm install`.
2. Set the values in `config.js` depending on your setup.
3. Run `node readLive.js`. You can also use `node readLive.js reset` to clear any previously collected data.
4. Setup a Text source on OBS reading from the newly generated `output.txt` file.