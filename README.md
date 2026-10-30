# Piggy Run

A standalone, free PiggyBank endless runner made with Phaser 3.86.0.

## Play

Open the published URL on desktop or phone. Press **Space**, **Up**, or tap the game to jump. Collect USDT coins, avoid red candles, bears, down arrows and rug pulls, and try to beat your best score. Each coin adds 25 points; surviving adds 9 points per second. Three collisions end the run. The score screen creates a branded PNG with the run's score and player name. On phones that support file sharing, **Share Score Card** opens the native share menu so the image can be sent to Telegram without taking a screenshot. **Save Score Image** downloads the PNG, and the text-only Telegram link remains available. Cards say whether a score was server-verified or a personal run; only the public leaderboard is authoritative.

The **WORLD** record and public top-ten board are stored by the PiggyBank score API. Each browser gets a private player key, and players can add their public display name after a verified run. A generated Piggy name appears until they do. The board shows each player's best verified run. A run receives a random server seed, and the API replays its jump timings using the same fixed-step rules before it updates the board. Spawn times and obstacle types vary by seed. Coins and obstacles use a multi-frame overlap window that matches their visible hitboxes, and missed objects leave the screen before being removed. Scores from previous game rules are preserved; the varied-pattern rules have their own world record and board. **MY BEST** stays on the current device. If the API is unavailable, the game still runs casually and labels the result unverified. Automated play remains possible; this system prevents a browser-edited score from being accepted as a record.

Occasional five-coin arcs can be collected with one well timed jump for 125 coin points. The arc rules use a new verified leaderboard; earlier records remain archived.

The current rules increase movement speed by 6% every 2,000 points, up to 48% faster at 16,000 points. Ground hazards retain enough spacing for a full jump at top pace. USDT bags add 100 points, and flying red candle drones are safe to pass beneath. Coin opportunities become more frequent over longer runs. The version-five verified board is separate from earlier rules, whose records remain archived.

## Local preview

Serve this directory with any static HTTP server, for example python -m http.server 8765, then open http://localhost:8765/.

## Deployment

Publish the repository root as a static site. There is no build command, wallet connection, account, paid service, or real-money reward. The static game remains in its separate repository on GitHub Pages. Its score API runs on the existing PiggyBank PHP host, with SQLite storage outside the web root.

The Phaser 3.86.0 runtime is included in vendor/phaser.min.js under the MIT license. PiggyBank mascot branding is used with permission from the project. Generated game art and code-drawn objects are specific to this game.
