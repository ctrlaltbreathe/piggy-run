# Piggy Run

A standalone, free PiggyBank endless runner made with Phaser 3.86.0.

## Play

Open the published URL on desktop or phone. Press **Space**, **Up**, or tap the game to jump. Collect USDT coins, avoid red candles and bears, and try to beat your best score. Three collisions end the run. The score screen offers a Telegram share link.

The **WORLD** record is stored by the PiggyBank score API. A run receives a random server seed, and the API replays its jump timings using the same fixed-step rules before it updates the record. **MY BEST** stays on the current device. If the API is unavailable, the game still runs casually and labels the result unverified. Automated play remains possible; this system prevents a browser-edited score from being accepted as the world record.

## Local preview

Serve this directory with any static HTTP server, for example python -m http.server 8765, then open http://localhost:8765/.

## Deployment

Publish the repository root as a static site. There is no build command, wallet connection, account, paid service, or real-money reward. The static game remains in its separate repository on GitHub Pages. Its score API runs on the existing PiggyBank PHP host, with SQLite storage outside the web root.

The Phaser 3.86.0 runtime is included in vendor/phaser.min.js under the MIT license. PiggyBank mascot branding is used with permission from the project. Generated game art and code-drawn objects are specific to this game.
